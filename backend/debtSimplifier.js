/**
 * Debt Simplification Algorithm (Min Cash Flow among friends)
 * 
 * Concept:
 * 1. Compute net balance for each group member: Balance = (Paid) - (Owed).
 * 2. Members with Balance < 0 are "Debtors" (they owe money).
 * 3. Members with Balance > 0 are "Creditors" (they are owed money).
 * 4. We greedily match the largest debtor with the largest creditor:
 *    - Let the largest debtor owe D, and the largest creditor be owed C.
 *    - Settle the amount S = min(D, C).
 *    - This debtor pays S to this creditor.
 *    - Update their balances. If either balance becomes 0, remove them.
 *    - Repeat until all balances are settled.
 * 
 * Note for Viva/Interview:
 * - This greedy algorithm runs in O(N log N) time (due to sorting) or O(N^2) depending on sorting strategy.
 * - While finding the absolute theoretical minimum transactions in all edge cases is NP-Complete (reducible to Subset Sum),
 *   this greedy heuristic works extremely well, guarantees at most N-1 transactions, and is the standard industry approach.
 */
export function simplifyDebts(balances) {
  // Input: Array of { memberId, name, balance }
  
  const debtors = [];
  const creditors = [];
  
  for (const m of balances) {
    const roundedBalance = Math.round(m.balance * 100) / 100;
    if (roundedBalance < -0.01) {
      // Store balance as a positive value representing debt
      debtors.push({ 
        memberId: m.memberId, 
        name: m.name, 
        balance: -roundedBalance 
      });
    } else if (roundedBalance > 0.01) {
      creditors.push({ 
        memberId: m.memberId, 
        name: m.name, 
        balance: roundedBalance 
      });
    }
  }
  
  // Sort descending by balance to settle larger debts/credits first
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);
  
  const settlements = [];
  
  let i = 0; // Debtor pointer
  let j = 0; // Creditor pointer
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    // Settle the minimum of the two balances
    const settleAmount = Math.min(debtor.balance, creditor.balance);
    
    settlements.push({
      fromId: debtor.memberId,
      fromName: debtor.name,
      toId: creditor.memberId,
      toName: creditor.name,
      amount: Math.round(settleAmount * 100) / 100
    });
    
    // Deduct settled amount
    debtor.balance -= settleAmount;
    creditor.balance -= settleAmount;
    
    // Move pointers if balance is settled
    if (debtor.balance < 0.01) {
      i++;
    }
    if (creditor.balance < 0.01) {
      j++;
    }
  }
  
  return settlements;
}
