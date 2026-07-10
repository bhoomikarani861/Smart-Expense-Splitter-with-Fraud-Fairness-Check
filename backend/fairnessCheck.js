/**
 * Fairness and Fraud Detection Rules
 * 
 * Rules Implemented:
 * 1. Duplicate Expense Check: Flags expenses with matching amounts, similar descriptions, and dates within 24 hours.
 * 2. High Payment Imbalance: Flags if one member has paid for more than 75% of all group expenses.
 * 3. Zero Contribution: Flags if a member has paid for $0 of group expenses but has accumulated debt.
 * 4. Outlier Expense Check: Flags expenses that are statistically much larger (mean + 1.2 * standard deviation) than average.
 * 5. Recurring Overcharge: Flags recurring expenses whose actual bill is > 10% higher than the template baseline amount.
 */
export function runFairnessCheck(expenses, members, splits, recurringTemplates = []) {
  const alerts = [];

  if (!expenses || expenses.length === 0) {
    return [];
  }

  // 1. Duplicate Expense Check
  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const e1 = expenses[i];
      const e2 = expenses[j];

      // Exact amount match
      const amountMatch = Math.abs(e1.amount - e2.amount) < 0.01;
      
      // Fuzzy description match (case insensitive)
      const desc1 = e1.description.toLowerCase().trim();
      const desc2 = e2.description.toLowerCase().trim();
      const descMatch = desc1 === desc2 || desc1.includes(desc2) || desc2.includes(desc1);

      // Date check (within 24 hours)
      const d1 = new Date(e1.date);
      const d2 = new Date(e2.date);
      const timeDiff = Math.abs(d1.getTime() - d2.getTime());
      const within24Hours = timeDiff <= 24 * 60 * 60 * 1000;

      if (amountMatch && descMatch && within24Hours) {
        alerts.push({
          type: 'duplicate',
          severity: 'warning',
          title: 'Potential Duplicate Expense',
          message: `Expenses "${e1.description}" and "${e2.description}" both cost ₹${e1.amount.toFixed(2)} and were created within 24 hours of each other.`,
          expenseIds: [e1.id, e2.id]
        });
      }
    }
  }

  const totalGroupExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Initialize stats per member
  const memberStats = {};
  members.forEach(m => {
    memberStats[m.id] = {
      id: m.id,
      name: m.name,
      paid: 0,
      owed: 0
    };
  });

  // Aggregate paid amounts
  expenses.forEach(e => {
    if (memberStats[e.paid_by_member_id]) {
      memberStats[e.paid_by_member_id].paid += e.amount;
    }
  });

  // Aggregate owed amounts
  splits.forEach(s => {
    if (memberStats[s.member_id]) {
      memberStats[s.member_id].owed += s.amount;
    }
  });

  const statsList = Object.values(memberStats);

  // 2. High Payment Imbalance Check
  if (totalGroupExpenses > 50 && members.length >= 3) {
    statsList.forEach(stat => {
      const share = stat.paid / totalGroupExpenses;
      if (share > 0.75) {
        alerts.push({
          type: 'payment_imbalance',
          severity: 'warning',
          title: 'High Payment Imbalance',
          message: `${stat.name} has paid ₹${stat.paid.toFixed(2)} (${Math.round(share * 100)}%) of the total ₹${totalGroupExpenses.toFixed(2)} group expenses. Consider letting others pay for future expenses to balance the load.`,
          memberId: stat.id
        });
      }
    });
  }

  // 3. Zero Contribution (Free-rider) Check
  if (totalGroupExpenses > 50 && expenses.length >= 2) {
    statsList.forEach(stat => {
      if (stat.owed > 5 && stat.paid === 0) {
        alerts.push({
          type: 'zero_contribution',
          severity: 'info',
          title: 'Zero Payment Contribution',
          message: `${stat.name} has not paid for any expenses yet, but has an active balance owing. Suggest they cover the next group expense.`,
          memberId: stat.id
        });
      }
    });
  }

  // 4. Outlier Expense Check (Statistical Anomaly)
  if (expenses.length >= 3) {
    const amounts = expenses.map(e => e.amount);
    const mean = totalGroupExpenses / expenses.length;
    const sqDiffs = amounts.map(a => Math.pow(a - mean, 2));
    const variance = sqDiffs.reduce((sum, d) => sum + d, 0) / expenses.length;
    const stdDev = Math.sqrt(variance);

    expenses.forEach(e => {
      // If amount is higher than mean + 1.2 * stdDev AND at least double the mean (prevents flagging in small variations)
      const isOutlier = stdDev > 0 
        ? (e.amount > mean + 1.2 * stdDev && e.amount > 2 * mean) 
        : false;

      if (isOutlier) {
        alerts.push({
          type: 'expense_outlier',
          severity: 'info',
          title: 'Unusual Outlier Expense',
          message: `The expense "${e.description}" of ₹${e.amount.toFixed(2)} is significantly larger than the average expense (₹${mean.toFixed(2)}) in this group.`,
          expenseId: e.id
        });
      }
    });
  }

  // 5. Recurring Overcharge Check
  if (recurringTemplates && recurringTemplates.length > 0) {
    expenses.forEach(e => {
      recurringTemplates.forEach(t => {
        const descE = e.description.toLowerCase().trim();
        const descT = t.description.toLowerCase().trim();
        
        // Check if description matches fuzzily
        const isDescMatch = descE.includes(descT) || descT.includes(descE);
        const isCategoryMatch = e.category.toLowerCase() === t.category.toLowerCase();
        
        if (isDescMatch && isCategoryMatch) {
          if (e.amount > t.amount * 1.1) {
            const pctIncrease = Math.round(((e.amount - t.amount) / t.amount) * 100);
            alerts.push({
              type: 'recurring_overcharge',
              severity: 'warning',
              title: 'Utility/Subscription Overcharge Detected',
              message: `The expense "${e.description}" of ₹${e.amount.toFixed(2)} is ${pctIncrease}% higher than the recurring template baseline of ₹${t.amount.toFixed(2)} ("${t.description}").`,
              expenseId: e.id,
              templateId: t.id
            });
          }
        }
      });
    });
  }

  return alerts;
}
