let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (baseUrl && !baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
  baseUrl = baseUrl.replace(/\/$/, '') + '/api';
}
const API_BASE_URL = baseUrl;

export async function fetchGroups() {
  const response = await fetch(`${API_BASE_URL}/groups`);
  if (!response.ok) {
    throw new Error('Failed to fetch groups');
  }
  return response.json();
}

export async function fetchGroupDetails(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch group details');
  }
  return response.json();
}

export async function createGroup(groupData) {
  // groupData: { name, description, members: [name1, name2, ...] }
  const response = await fetch(`${API_BASE_URL}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(groupData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create group');
  }
  return response.json();
}

export async function addExpense(groupId, expenseData) {
  // expenseData: { paidByMemberId, amount, description, category, splitType, date, splits }
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expenseData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to add expense');
  }
  return response.json();
}

export async function deleteExpense(expenseId) {
  const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete expense');
  }
  return response.json();
}

export async function fetchSettlements(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/settlements`);
  if (!response.ok) {
    throw new Error('Failed to fetch settlements');
  }
  return response.json();
}

export async function fetchInsights(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/insights`);
  if (!response.ok) {
    throw new Error('Failed to fetch insights');
  }
  return response.json();
}

export async function recordSettlement(groupId, settlementData) {
  // settlementData: { fromMemberId, toMemberId, amount, date }
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/settlements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settlementData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to record settlement');
  }
  return response.json();
}

export async function fetchSettlementsHistory(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/settlements/history`);
  if (!response.ok) {
    throw new Error('Failed to fetch settlements history');
  }
  return response.json();
}

export async function deleteSettlement(settlementId) {
  const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete settlement');
  }
  return response.json();
}

export async function fetchActivities(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/activities`);
  if (!response.ok) {
    throw new Error('Failed to fetch activity logs');
  }
  return response.json();
}

export async function createRecurring(groupId, templateData) {
  // templateData: { paidByMemberId, amount, description, category, frequency, nextDueDate }
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/recurring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(templateData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create recurring template');
  }
  return response.json();
}

export async function fetchRecurring(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/recurring`);
  if (!response.ok) {
    throw new Error('Failed to fetch recurring templates');
  }
  return response.json();
}

export async function approveSettlement(settlementId) {
  const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}/approve`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to approve settlement');
  }
  return response.json();
}

export async function rejectSettlement(settlementId) {
  const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}/reject`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to reject settlement');
  }
  return response.json();
}

