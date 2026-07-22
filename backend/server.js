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
app.use(cors());
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

// --- AUTHENTICATION HELPERS & MIDDLEWARE ---

// Secure password hashing using pbkdf2Sync (native node crypto)
function hashPassword(password) {
  const salt = 'fair-split-salt-12345'; // simple static salt for demo/sqlite mapping
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Middleware to authenticate token from Bearer Authorization header
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  
  const db = await getDb();
  try {
    const session = await db.get(`
      SELECT s.token, u.id, u.name, u.email 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `, [token]);
    
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }
    
    req.user = {
      id: session.id,
      name: session.name,
      email: session.email
    };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

// --- AUTHENTICATION API ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  
  const db = await getDb();
  try {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    
    const userId = crypto.randomUUID();
    const pwdHash = hashPassword(password);
    
    await db.run(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [userId, name.trim(), email.toLowerCase().trim(), pwdHash]
    );
    
    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    await db.run(
      'INSERT INTO sessions (token, user_id) VALUES (?, ?)',
      [token, userId]
    );

    // Link any existing group member placeholders with this email
    await db.run(
      'UPDATE members SET user_id = ?, name = ? WHERE email = ?',
      [userId, name.trim(), email.toLowerCase().trim()]
    );
    
    res.status(201).json({
      token,
      user: { id: userId, name: name.trim(), email: email.toLowerCase().trim() }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  
  const db = await getDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    
    const pwdHash = hashPassword(password);
    if (user.password !== pwdHash) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    
    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    await db.run(
      'INSERT INTO sessions (token, user_id) VALUES (?, ?)',
      [token, user.id]
    );
    
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(204);
  
  const db = await getDb();
  try {
    await db.run('DELETE FROM sessions WHERE token = ?', [token]);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Failed to logout.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Search Users by Email or Name
app.get('/api/users/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  
  const db = await getDb();
  try {
    const users = await db.all(
      'SELECT id, name, email FROM users WHERE email LIKE ? OR name LIKE ? LIMIT 5',
      [`%${q.trim()}%`, `%${q.trim()}%`]
    );
    res.json(users);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

// --- API ROUTES ---

// 1. Create a group with members
app.post('/api/groups', requireAuth, async (req, res) => {
  const { name, description, members } = req.body;
  
  if (!name || !members || !Array.isArray(members) || members.length < 2) {
    return res.status(400).json({ error: 'Group name and at least two members are required.' });
  }

  const db = await getDb();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    const groupId = crypto.randomUUID();
    await db.run(
      'INSERT INTO groups (id, name, description, created_by_user_id) VALUES (?, ?, ?, ?)',
      [groupId, name, description || '', req.user.id]
    );

    // Auto-create creator as first group member
    const creatorMemberId = crypto.randomUUID();
    await db.run(
      'INSERT INTO members (id, group_id, name, user_id, email) VALUES (?, ?, ?, ?, ?)',
      [creatorMemberId, groupId, req.user.name, req.user.id, req.user.email]
    );

    for (const memberObj of members) {
      let mName = '';
      let mEmail = '';
      
      if (typeof memberObj === 'string') {
        const val = memberObj.trim();
        if (val.includes('@')) {
          mEmail = val.toLowerCase();
          mName = val.split('@')[0];
        } else {
          mName = val;
        }
      } else if (memberObj && typeof memberObj === 'object') {
        mName = memberObj.name?.trim() || '';
        mEmail = memberObj.email?.trim() || '';
      }

      if (!mName) continue;
      
      // Prevent adding creator again
      if (mName.toLowerCase() === req.user.name.toLowerCase() || (mEmail && mEmail.toLowerCase() === req.user.email.toLowerCase())) {
        continue;
      }

      let associatedUserId = null;
      if (mEmail) {
        const linkedUser = await db.get('SELECT id, name FROM users WHERE email = ?', [mEmail.toLowerCase()]);
        if (linkedUser) {
          associatedUserId = linkedUser.id;
          mName = linkedUser.name;
        }
      }

      const memberId = crypto.randomUUID();
      await db.run(
        'INSERT INTO members (id, group_id, name, user_id, email) VALUES (?, ?, ?, ?, ?)',
        [memberId, groupId, mName, associatedUserId, mEmail || null]
      );
    }

    await db.run('COMMIT');
    
    const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
    const groupMembers = await db.all('SELECT * FROM members WHERE group_id = ?', [groupId]);
    
    res.status(201).json({ ...group, members: groupMembers });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Failed to create group.' });
  }
});

// 2. Get list of all groups (scoped to user)
app.get('/api/groups', requireAuth, async (req, res) => {
  const db = await getDb();
  try {
    const groups = await db.all(`
      SELECT g.*, 
             (SELECT COUNT(*) FROM members m WHERE m.group_id = g.id) AS member_count,
             COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.group_id = g.id), 0) AS total_expenses
      FROM groups g
      JOIN members m ON m.group_id = g.id
      WHERE m.user_id = ?
      ORDER BY g.created_at DESC
    `, [req.user.id]);
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to retrieve groups.' });
  }
});

// 3. Get single group details (members, expenses, and splits)
app.get('/api/groups/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  
  try {
    // Check membership
    const membership = await db.get('SELECT id FROM members WHERE group_id = ? AND user_id = ?', [id, req.user.id]);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

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
app.post('/api/groups/:id/expenses', requireAuth, async (req, res) => {
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
app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
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
app.get('/api/groups/:id/settlements', requireAuth, async (req, res) => {
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

    // Deduct/Add recorded settlements (only count approved settlements)
    const settlementsHistory = await db.all("SELECT * FROM settlements_history WHERE group_id = ? AND status = 'approved'", [groupId]);
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
app.get('/api/groups/:id/insights', requireAuth, async (req, res) => {
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

    const settlementsHistory = await db.all(`
      SELECT s.*, f.name AS from_name, t.name AS to_name
      FROM settlements_history s
      JOIN members f ON s.from_member_id = f.id
      JOIN members t ON s.to_member_id = t.id
      WHERE s.group_id = ?
    `, [groupId]);

    // Run alerts check passing recurring templates and settlements history
    const alerts = runFairnessCheck(expenses, members, splits, recurringTemplates, settlementsHistory);

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
app.post('/api/groups/:id/settlements', requireAuth, async (req, res) => {
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
      `INSERT INTO settlements_history (id, group_id, from_member_id, to_member_id, amount, date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [settlementId, groupId, fromMemberId, toMemberId, amount, date]
    );

    // Fetch names to create readable log
    const debtor = await db.get('SELECT name FROM members WHERE id = ?', [fromMemberId]);
    const creditor = await db.get('SELECT name FROM members WHERE id = ?', [toMemberId]);
    
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, groupId, 'record_payment', `${debtor ? debtor.name : 'Someone'} declared a payment of ₹${parseFloat(amount).toFixed(2)} to ${creditor ? creditor.name : 'someone'} (pending confirmation).`]
    );

    await db.run('COMMIT');
    res.status(201).json({ id: settlementId, message: 'Settlement payment recorded successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error recording settlement:', err);
    res.status(500).json({ error: 'Failed to record settlement.' });
  }
});

// 8d. Confirm/Approve a Settlement Payment
app.post('/api/settlements/:id/approve', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  
  try {
    const settlement = await db.get('SELECT * FROM settlements_history WHERE id = ?', [id]);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found.' });
    }

    // Verify only the recipient of the payment can approve it
    const recipientMember = await db.get('SELECT * FROM members WHERE id = ?', [settlement.to_member_id]);
    if (!recipientMember || recipientMember.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Only the recipient of the payment can confirm/approve this payment.' });
    }

    await db.run('BEGIN TRANSACTION');
    
    // Update status to approved
    await db.run(
      "UPDATE settlements_history SET status = 'approved' WHERE id = ?",
      [id]
    );
    
    // Fetch names to create readable log
    const debtor = await db.get('SELECT name FROM members WHERE id = ?', [settlement.from_member_id]);
    const creditor = await db.get('SELECT name FROM members WHERE id = ?', [settlement.to_member_id]);
    
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, settlement.group_id, 'approve_payment', `${creditor ? creditor.name : 'Someone'} confirmed receiving payment of ₹${parseFloat(settlement.amount).toFixed(2)} from ${debtor ? debtor.name : 'Someone'}.`]
    );

    await db.run('COMMIT');
    res.json({ message: 'Settlement payment approved successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error approving settlement:', err);
    res.status(500).json({ error: 'Failed to approve settlement.' });
  }
});

// 8e. Decline/Reject a Settlement Payment (Dispute)
app.post('/api/settlements/:id/reject', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  
  try {
    const settlement = await db.get('SELECT * FROM settlements_history WHERE id = ?', [id]);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found.' });
    }

    // Verify only the recipient of the payment can reject it
    const recipientMember = await db.get('SELECT * FROM members WHERE id = ?', [settlement.to_member_id]);
    if (!recipientMember || recipientMember.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Only the recipient of the payment can decline/reject this payment.' });
    }

    await db.run('BEGIN TRANSACTION');
    
    // Update status to disputed
    await db.run(
      "UPDATE settlements_history SET status = 'disputed' WHERE id = ?",
      [id]
    );
    
    // Fetch names to create readable log
    const debtor = await db.get('SELECT name FROM members WHERE id = ?', [settlement.from_member_id]);
    const creditor = await db.get('SELECT name FROM members WHERE id = ?', [settlement.to_member_id]);
    
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, settlement.group_id, 'reject_payment', `${creditor ? creditor.name : 'Someone'} rejected/disputed the payment claim of ₹${parseFloat(settlement.amount).toFixed(2)} from ${debtor ? debtor.name : 'Someone'}.`]
    );

    await db.run('COMMIT');
    res.json({ message: 'Settlement payment rejected/disputed successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error rejecting settlement:', err);
    res.status(500).json({ error: 'Failed to reject settlement.' });
  }
});

// 8b. Get Recorded Settlements History
app.get('/api/groups/:id/settlements/history', requireAuth, async (req, res) => {
  const groupId = req.params.id;
  const db = await getDb();
  
  try {
    const history = await db.all(`
      SELECT s.*, f.name AS from_name, t.name AS to_name
      FROM settlements_history s
      JOIN members f ON s.from_member_id = f.id
      JOIN members t ON s.to_member_id = t.id
      WHERE s.group_id = ?
      ORDER BY s.created_at DESC
    `, [groupId]);
    res.json(history);
  } catch (err) {
    console.error('Error fetching settlements history:', err);
    res.status(500).json({ error: 'Failed to retrieve settlements history.' });
  }
});

// 8c. Delete a Settlement Payment (Undo settlement)
app.delete('/api/settlements/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  
  try {
    const settlement = await db.get('SELECT * FROM settlements_history WHERE id = ?', [id]);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found.' });
    }

    await db.run('BEGIN TRANSACTION');
    
    await db.run('DELETE FROM settlements_history WHERE id = ?', [id]);
    
    // Fetch names to create readable log
    const debtor = await db.get('SELECT name FROM members WHERE id = ?', [settlement.from_member_id]);
    const creditor = await db.get('SELECT name FROM members WHERE id = ?', [settlement.to_member_id]);
    
    const logId = crypto.randomUUID();
    await db.run(
      'INSERT INTO activity_logs (id, group_id, action_type, description) VALUES (?, ?, ?, ?)',
      [logId, settlement.group_id, 'delete_payment', `Recorded payment of ₹${parseFloat(settlement.amount).toFixed(2)} from ${debtor ? debtor.name : 'Someone'} to ${creditor ? creditor.name : 'Someone'} was undone.`]
    );

    await db.run('COMMIT');
    res.json({ message: 'Settlement payment deleted successfully.' });
  } catch (err) {
    await db.run('ROLLBACK');
    console.error('Error deleting settlement:', err);
    res.status(500).json({ error: 'Failed to delete settlement.' });
  }
});

// 9. Get Group Activity Logs (Audit Trail)
app.get('/api/groups/:id/activities', requireAuth, async (req, res) => {
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
app.post('/api/groups/:id/recurring', requireAuth, async (req, res) => {
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
app.get('/api/groups/:id/recurring', requireAuth, async (req, res) => {
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
