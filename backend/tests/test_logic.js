import { simplifyDebts } from '../debtSimplifier.js';
import { runFairnessCheck } from '../fairnessCheck.js';

console.log('========================================');
console.log('RUNNING LOGIC TESTS FOR SMART EXPENSE SPLITTER');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// ----------------------------------------------------
// TEST 1: Debt Simplification (Min Cash Flow)
// Scenario:
// Alice, Bob, Charlie.
// Alice paid 120, Bob paid 90, Charlie paid 30. Total = 240.
// Shared equally (80 each).
// Balances: Alice: +40, Bob: +10, Charlie: -50.
// Correct Settlements:
// Charlie pays Alice 40.
// Charlie pays Bob 10.
// ----------------------------------------------------
try {
  const balances = [
    { memberId: '1', name: 'Alice', balance: 40 },
    { memberId: '2', name: 'Bob', balance: 10 },
    { memberId: '3', name: 'Charlie', balance: -50 }
  ];
  
  const settlements = simplifyDebts(balances);
  
  assert(settlements.length === 2, 'Settlement should require exactly 2 transactions');
  
  const tx1 = settlements.find(t => t.fromName === 'Charlie' && t.toName === 'Alice');
  const tx2 = settlements.find(t => t.fromName === 'Charlie' && t.toName === 'Bob');
  
  assert(!!tx1, 'Should contain Charlie paying Alice');
  assert(tx1 && tx1.amount === 40, 'Charlie should pay Alice exactly $40');
  
  assert(!!tx2, 'Should contain Charlie paying Bob');
  assert(tx2 && tx2.amount === 10, 'Charlie should pay Bob exactly $10');
} catch (e) {
  console.error(e);
  failCount++;
}

// ----------------------------------------------------
// TEST 2: Duplicate Detection
// ----------------------------------------------------
try {
  const now = new Date();
  const mockExpenses = [
    {
      id: 'e1',
      description: 'Groceries Pizza',
      amount: 45.50,
      paid_by_member_id: 'm1',
      date: now.toISOString(),
      created_at: now.toISOString()
    },
    {
      id: 'e2',
      description: 'pizza',
      amount: 45.50,
      paid_by_member_id: 'm1',
      date: new Date(now.getTime() + 10 * 60 * 1000).toISOString(), // 10 mins later
      created_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
    }
  ];
  
  const mockMembers = [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob' }];
  const mockSplits = [
    { member_id: 'm1', amount: 22.75, expense_id: 'e1' },
    { member_id: 'm2', amount: 22.75, expense_id: 'e1' },
    { member_id: 'm1', amount: 22.75, expense_id: 'e2' },
    { member_id: 'm2', amount: 22.75, expense_id: 'e2' }
  ];

  const alerts = runFairnessCheck(mockExpenses, mockMembers, mockSplits);
  
  const dupAlert = alerts.find(a => a.type === 'duplicate');
  assert(!!dupAlert, 'Should detect potential duplicate expense');
  assert(dupAlert && dupAlert.severity === 'warning', 'Duplicate alert should have warning severity');
} catch (e) {
  console.error(e);
  failCount++;
}

// ----------------------------------------------------
// TEST 3: High Payment Imbalance
// Scenario: Alice pays $100, Bob $0, Charlie $0.
// Alice share of total: 100% (Threshold is >75% for groups of size >=3)
// ----------------------------------------------------
try {
  const now = new Date();
  const mockExpenses = [
    { id: 'e1', description: 'Rent contribution', amount: 100.00, paid_by_member_id: 'm1', date: now.toISOString() }
  ];
  const mockMembers = [
    { id: 'm1', name: 'Alice' },
    { id: 'm2', name: 'Bob' },
    { id: 'm3', name: 'Charlie' }
  ];
  const mockSplits = [
    { member_id: 'm1', amount: 33.33, expense_id: 'e1' },
    { member_id: 'm2', amount: 33.33, expense_id: 'e1' },
    { member_id: 'm3', amount: 33.34, expense_id: 'e1' }
  ];

  const alerts = runFairnessCheck(mockExpenses, mockMembers, mockSplits);
  
  const imbalanceAlert = alerts.find(a => a.type === 'payment_imbalance');
  assert(!!imbalanceAlert, 'Should detect high payment imbalance');
  assert(imbalanceAlert && imbalanceAlert.message.includes('Alice'), 'Imbalance alert should flag Alice');
} catch (e) {
  console.error(e);
  failCount++;
}

// ----------------------------------------------------
// TEST 4: Outlier Detection
// Scenario: 3 expenses. Two around $20, one is $250.
// ----------------------------------------------------
try {
  const now = new Date();
  const mockExpenses = [
    { id: 'e1', description: 'Snacks', amount: 15.00, paid_by_member_id: 'm1', date: now.toISOString() },
    { id: 'e2', description: 'Drinks', amount: 20.00, paid_by_member_id: 'm2', date: now.toISOString() },
    { id: 'e3', description: 'Gold Plated Toilet Seat', amount: 350.00, paid_by_member_id: 'm1', date: now.toISOString() }
  ];
  const mockMembers = [
    { id: 'm1', name: 'Alice' },
    { id: 'm2', name: 'Bob' }
  ];
  const mockSplits = [
    { member_id: 'm1', amount: 7.50, expense_id: 'e1' },
    { member_id: 'm2', amount: 7.50, expense_id: 'e1' },
    { member_id: 'm1', amount: 10.00, expense_id: 'e2' },
    { member_id: 'm2', amount: 10.00, expense_id: 'e2' },
    { member_id: 'm1', amount: 175.00, expense_id: 'e3' },
    { member_id: 'm2', amount: 175.00, expense_id: 'e3' }
  ];

  const alerts = runFairnessCheck(mockExpenses, mockMembers, mockSplits);
  const outlierAlert = alerts.find(a => a.type === 'expense_outlier');
  assert(!!outlierAlert, 'Should detect outlier expense');
  assert(outlierAlert && outlierAlert.message.includes('Gold Plated Toilet Seat'), 'Should identify the Gold Plated Toilet Seat as the outlier');
} catch (e) {
  console.error(e);
  failCount++;
}

// ----------------------------------------------------
// TEST 5: Recurring Overcharge Detection
// Scenario: Template of $15.00 for Netflix. Expense of $18.00 Netflix.
// ----------------------------------------------------
try {
  const now = new Date();
  const mockExpenses = [
    { id: 'e1', description: 'Netflix premium plan', amount: 18.00, paid_by_member_id: 'm1', date: now.toISOString(), category: 'Entertainment' }
  ];
  const mockMembers = [{ id: 'm1', name: 'Alice' }];
  const mockSplits = [{ member_id: 'm1', amount: 18.00, expense_id: 'e1' }];
  const mockTemplates = [
    { id: 't1', description: 'netflix', amount: 15.00, category: 'Entertainment' }
  ];

  const alerts = runFairnessCheck(mockExpenses, mockMembers, mockSplits, mockTemplates);
  const overchargeAlert = alerts.find(a => a.type === 'recurring_overcharge');
  
  assert(!!overchargeAlert, 'Should detect recurring subscription overcharge');
  assert(overchargeAlert && overchargeAlert.message.includes('20%'), 'Should calculate correct overcharge percentage (20%)');
} catch (e) {
  console.error(e);
  failCount++;
}

// ----------------------------------------------------
// TEST 6: Balances adjustment with settlements history
// Scenario: Alice starts +80, Bob -80.
// A settlement of $30 is recorded: Bob pays Alice $30.
// Expected adjusted balances: Alice +50, Bob -50.
// ----------------------------------------------------
try {
  // Mock the db logic of settlements adjustment
  const balances = [
    { memberId: 'm1', name: 'Alice', balance: 80 },
    { memberId: 'm2', name: 'Bob', balance: -80 }
  ];

  const settlementsHistory = [
    { from_member_id: 'm2', to_member_id: 'm1', amount: 30 }
  ];

  settlementsHistory.forEach(s => {
    const debtor = balances.find(b => b.memberId === s.from_member_id);
    const creditor = balances.find(b => b.memberId === s.to_member_id);
    if (debtor) debtor.balance += s.amount;
    if (creditor) creditor.balance -= s.amount;
  });

  assert(balances.find(b => b.memberId === 'm1').balance === 50, 'Alice adjusted balance should be +50');
  assert(balances.find(b => b.memberId === 'm2').balance === -50, 'Bob adjusted balance should be -50');
  
  const settlements = simplifyDebts(balances);
  assert(settlements.length === 1, 'Should resolve to exactly 1 settlement');
  assert(settlements[0].fromName === 'Bob' && settlements[0].toName === 'Alice' && settlements[0].amount === 50, 'Bob should pay Alice $50 after factoring in settlement history');
} catch (e) {
  console.error(e);
  failCount++;
}

console.log('\n========================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('========================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
