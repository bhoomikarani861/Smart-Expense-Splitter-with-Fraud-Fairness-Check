import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { initDb, getDb } from './database.js';
import { simplifyDebts } from './debtSimplifier.js';
import { runFairnessCheck } from './fairnessCheck.js';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Enable CORS and JSON body parser
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Initialize Database on startup
initDb()
  .then(() => {
    console.log('SQLite database initialized successfully.');
  })
  .catch((err) => {
    console.error('Failed to initialize SQLite database:', err);
    process.exit(1);
  });

// --- API ROUTES ---

// 1. Create a group with members
app.post('/api/groups', async (req, res) => {
  const { name, description, members } = req.body;
  
  if (!name || !members || !Array.isArray(members) || members.length < 2) {
    return res.status(400).json({ error: 'Group name and at least two members are required.' });
  }

  const db = await getDb();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    const groupId = crypto.randomUUID();
    await db.run(
      'INSERT INTO groups (id, name, description) VALUES (?, ?, ?)',
      [groupId, name, description || '']
    );

    for (const memberName of members) {
      if (!memberName.trim()) continue;
      const memberId = crypto.randomUUID();
      await db.run(
        'INSERT INTO members (id, group_id, name) VALUES (?, ?, ?)',
        [memberId, groupId, memberName.trim()]
      );
    }

    await db.run('COMMIT');
    
    // Fetch the newly created group details to return
    const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
    const groupMembers = await db.all('SELECT * FROM members WHERE group_id = ?', [groupId]);
    
    res.status(201).json({ ...group, members: groupMembers });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group.' });
  }
});

// 2. Get list of all groups (with member count and total expenses)
app.get('/api/groups', async (req, res) => {
  const db = await getDb();
  try {
    const groups = await db.all(`
      SELECT g.*, 
             (SELECT COUNT(*) FROM members m WHERE m.group_id = g.id) AS member_count,
             COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.group_id = g.id), 0) AS total_expenses
      FROM groups g
      ORDER BY g.created_at DESC
    `);
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to retrieve groups.' });
  }
});

// 3. Get single group details (members, expenses, and splits)
app.get('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  
  try {
    const group = await db.get('SELECT * FROM groups WHERE id = ?', [id]);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const members = await db.all('SELECT * FROM members WHERE group_id = ?', [id]);
    const expenses = await db.all(`
      SELECT e.*, m.name AS paid_by_name 
      FROM expenses e
      JOIN members m ON e.paid_by_member_id = m.id
      WHERE e.group_id = ?
      ORDER BY e.date DESC, e.created_at DESC
    `, [id]);

    // Fetch all splits for this group's expenses
    const splits = await db.all(`
      SELECT es.* 
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ?
    `, [id]);

    res.json({
      ...group,
      members,
      expenses,
      splits
    });
  } catch (err) {
    console.error('Error fetching group details:', err);
    res.status(500).json({ error: 'Failed to retrieve group details.' });
  }
});

// 4. Add an expense to a group
app.post('/api/groups/:id/expenses', async (req, res) => {
  const groupId = req.params.id;
  const { paidByMemberId, amount, description, category, splitType, date, splits } = req.body;

  if (!paidByMemberId || !amount || !description || !category || !splitType || !date || !splits || !Array.isArray(splits)) {
    return res.status(400).json({ error: 'Missing required expense fields.' });
  }

  const db = await getDb();

  try {
    // Verify group exists
    const group = await db.get('SELECT id FROM groups WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    await db.run('BEGIN TRANSACTION');

    const expenseId = crypto.randomUUID();
    await db.run(
      `INSERT INTO expenses (id, group_id, paid_by_member_id, amount, description, category, split_type, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [expenseId, groupId, paidByMemberId, amount, description, category, splitType, date]
    );

    // Insert expense splits
    for (const split of splits) {
      const splitId = crypto.randomUUID();
      await db.run(
        `INSERT INTO expense_splits (id, expense_id, member_id, amount)
         VALUES (?, ?, ?, ?)`,
        [splitId, expenseId, split.memberId, split.amount]
      );
    }

    // Fetch payer name to log activity
    const payer = await db.get('SELECT name FROM members WHERE id = ?', [paidByMemberId]);
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, groupId, 'create_expense', `${payer ? payer.name : 'Someone'} added expense "${description}" of ₹${parseFloat(amount).toFixed(2)}.`]
    );

    await db.run('COMMIT');
    res.status(201).json({ id: expenseId, message: 'Expense added successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error adding expense:', err);
    res.status(500).json({ error: 'Failed to add expense.' });
  }
});

// 5. Delete an expense (with Activity Logging)
app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  
  try {
    const expense = await db.get('SELECT description, amount, group_id FROM expenses WHERE id = ?', [id]);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    await db.run('BEGIN TRANSACTION');
    
    await db.run('DELETE FROM expenses WHERE id = ?', [id]);
    
    // Log deletion activity
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, expense.group_id, 'delete_expense', `Expense "${expense.description}" of ₹${expense.amount.toFixed(2)} was deleted.`]
    );
    
    await db.run('COMMIT');
    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

// 6. Calculate balances and debt simplification (settlement, adjusting for history)
app.get('/api/groups/:id/settlements', async (req, res) => {
  const groupId = req.params.id;
  const db = await getDb();
  
  try {
    const members = await db.all('SELECT * FROM members WHERE group_id = ?', [groupId]);
    if (members.length === 0) {
      return res.status(404).json({ error: 'Group or members not found.' });
    }

    const expenses = await db.all('SELECT * FROM expenses WHERE group_id = ?', [groupId]);
    const splits = await db.all(`
      SELECT es.* 
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ?
    `, [groupId]);

    // Calculate paid and owed per member
    const balanceMap = {};
    members.forEach(m => {
      balanceMap[m.id] = {
        memberId: m.id,
        name: m.name,
        paid: 0,
        owed: 0,
        balance: 0
      };
    });

    expenses.forEach(e => {
      if (balanceMap[e.paid_by_member_id]) {
        balanceMap[e.paid_by_member_id].paid += e.amount;
      }
    });

    splits.forEach(s => {
      if (balanceMap[s.member_id]) {
        balanceMap[s.member_id].owed += s.amount;
      }
    });

    // Net balance = paid - owed
    const balances = Object.values(balanceMap).map(m => {
      m.balance = m.paid - m.owed;
      return m;
    });

    // Deduct/Add recorded settlements
    const settlementsHistory = await db.all('SELECT * FROM settlements_history WHERE group_id = ?', [groupId]);
    settlementsHistory.forEach(s => {
      const debtor = balances.find(b => b.memberId === s.from_member_id);
      const creditor = balances.find(b => b.memberId === s.to_member_id);
      if (debtor) {
        debtor.balance += s.amount; // reduces debt (makes negative balance closer to 0)
      }
      if (creditor) {
        creditor.balance -= s.amount; // reduces credit (makes positive balance closer to 0)
      }
    });

    // Run the debt-simplification algorithm on the remaining balances
    const settlements = simplifyDebts(balances);

    res.json({
      balances,
      settlements
    });
  } catch (err) {
    console.error('Error calculating settlements:', err);
    res.status(500).json({ error: 'Failed to calculate settlements.' });
  }
});

// 7. Get fairness check insights and analytics for group (with recurrence checks)
app.get('/api/groups/:id/insights', async (req, res) => {
  const groupId = req.params.id;
  const db = await getDb();
  
  try {
    const members = await db.all('SELECT * FROM members WHERE group_id = ?', [groupId]);
    const expenses = await db.all('SELECT * FROM expenses WHERE group_id = ?', [groupId]);
    const splits = await db.all(`
      SELECT es.* 
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = ?
    `, [groupId]);

    const recurringTemplates = await db.all('SELECT * FROM recurring_templates WHERE group_id = ?', [groupId]);

    // Run alerts check passing recurring templates
    const alerts = runFairnessCheck(expenses, members, splits, recurringTemplates);

    // Calculate Category Distribution for charts
    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const categoryBreakdown = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100
    }));

    res.json({
      alerts,
      categoryBreakdown
    });
  } catch (err) {
    console.error('Error generating insights:', err);
    res.status(500).json({ error: 'Failed to generate insights.' });
  }
});

// 8. Record a Settlement Payment (Write-back payment)
app.post('/api/groups/:id/settlements', async (req, res) => {
  const groupId = req.params.id;
  const { fromMemberId, toMemberId, amount, date } = req.body;

  if (!fromMemberId || !toMemberId || !amount || !date) {
    return res.status(400).json({ error: 'Missing settlement fields.' });
  }

  const db = await getDb();

  try {
    await db.run('BEGIN TRANSACTION');

    const settlementId = crypto.randomUUID();
    await db.run(
      `INSERT INTO settlements_history (id, group_id, from_member_id, to_member_id, amount, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [settlementId, groupId, fromMemberId, toMemberId, amount, date]
    );

    // Fetch names to create readable log
    const debtor = await db.get('SELECT name FROM members WHERE id = ?', [fromMemberId]);
    const creditor = await db.get('SELECT name FROM members WHERE id = ?', [toMemberId]);
    
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, groupId, 'record_payment', `${debtor ? debtor.name : 'Someone'} paid ₹${parseFloat(amount).toFixed(2)} to ${creditor ? creditor.name : 'someone'}.`]
    );

    await db.run('COMMIT');
    res.status(201).json({ id: settlementId, message: 'Settlement payment recorded successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error recording settlement:', err);
    res.status(500).json({ error: 'Failed to record settlement.' });
  }
});

// 9. Get Group Activity Logs (Audit Trail)
app.get('/api/groups/:id/activities', async (req, res) => {
  const groupId = req.params.id;
  const db = await getDb();
  
  try {
    const logs = await db.all(
      'SELECT * FROM activity_logs WHERE group_id = ? ORDER BY created_at DESC',
      [groupId]
    );
    res.json(logs);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Failed to fetch activities.' });
  }
});

// 10. Create a Recurring Bill Template
app.post('/api/groups/:id/recurring', async (req, res) => {
  const groupId = req.params.id;
  const { paidByMemberId, amount, description, category, frequency, nextDueDate } = req.body;

  if (!paidByMemberId || !amount || !description || !category || !frequency || !nextDueDate) {
    return res.status(400).json({ error: 'Missing recurring template fields.' });
  }

  const db = await getDb();

  try {
    await db.run('BEGIN TRANSACTION');

    const templateId = crypto.randomUUID();
    await db.run(
      `INSERT INTO recurring_templates (id, group_id, paid_by_member_id, amount, description, category, frequency, next_due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [templateId, groupId, paidByMemberId, amount, description, category, frequency, nextDueDate]
    );

    // Fetch names to create log
    const creator = await db.get('SELECT name FROM members WHERE id = ?', [paidByMemberId]);
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, groupId, 'create_template', `${creator ? creator.name : 'Someone'} created recurring template for "${description}" of ₹${parseFloat(amount).toFixed(2)} (${frequency}).`]
    );

    await db.run('COMMIT');
    res.status(201).json({ id: templateId, message: 'Recurring bill template saved successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error creating recurring template:', err);
    res.status(500).json({ error: 'Failed to create recurring template.' });
  }
});

// 11. List Recurring Bill Templates
app.get('/api/groups/:id/recurring', async (req, res) => {
  const groupId = req.params.id;
  const db = await getDb();
  
  try {
    const templates = await db.all(`
      SELECT r.*, m.name AS paid_by_name 
      FROM recurring_templates r
      JOIN members m ON r.paid_by_member_id = m.id
      WHERE r.group_id = ?
      ORDER BY r.created_at DESC
    `, [groupId]);
    res.json(templates);
  } catch (err) {
    console.error('Error fetching recurring templates:', err);
    res.status(500).json({ error: 'Failed to fetch recurring templates.' });
  }
});

app.listen(PORT, () => {
  console.log(`Smart Expense Splitter backend running on http://localhost:${PORT}`);
});
