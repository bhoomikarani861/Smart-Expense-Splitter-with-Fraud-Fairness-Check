let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// baseUrl = 'https://metal-points-repeat.loca.lt/api';

if (baseUrl && !baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
  baseUrl = baseUrl.replace(/\/$/, '') + '/api';
}
const API_BASE_URL = baseUrl;

// Helper to get headers with Auth token and tunnel-bypass attached
function getHeaders(contentType = 'application/json') {
  const token = localStorage.getItem('token');
  const headers = {
    'Bypass-Tunnel-Reminder': 'true',
    'ngrok-skip-browser-warning': 'true'
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Authentication API methods
export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Login failed');
  }
  return response.json();
}

export async function register(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Registration failed');
  }
  return response.json();
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
}

export async function logout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(null)
    });
  } catch (err) {
    console.error('Logout request failed:', err);
  }
  localStorage.removeItem('token');
}

export async function searchUsersByEmail(query) {
  const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to search users');
  }
  return response.json();
}

// Group & Expense API methods
export async function fetchGroups() {
  const response = await fetch(`${API_BASE_URL}/groups`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch groups');
  }
  return response.json();
}

export async function fetchGroupDetails(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch group details');
  }
  return response.json();
}

export async function createGroup(groupData) {
  const response = await fetch(`${API_BASE_URL}/groups`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(groupData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create group');
  }
  return response.json();
}

export async function addExpense(groupId, expenseData) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/expenses`, {
    method: 'POST',
    headers: getHeaders(),
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
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to delete expense');
  }
  return response.json();
}

export async function fetchSettlements(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/settlements`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch settlements');
  }
  return response.json();
}

export async function fetchInsights(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/insights`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch insights');
  }
  return response.json();
}

export async function recordSettlement(groupId, settlementData) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/settlements`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(settlementData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to record settlement');
  }
  return response.json();
}

export async function fetchSettlementsHistory(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/settlements/history`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch settlements history');
  }
  return response.json();
}

export async function deleteSettlement(settlementId) {
  const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}`, {
    method: 'DELETE',
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to delete settlement');
  }
  return response.json();
}

export async function fetchActivities(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/activities`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch activity logs');
  }
  return response.json();
}

export async function createRecurring(groupId, templateData) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/recurring`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(templateData),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create recurring template');
  }
  return response.json();
}

export async function fetchRecurring(groupId) {
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/recurring`, {
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to fetch recurring templates');
  }
  return response.json();
}

export async function approveSettlement(settlementId) {
  const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}/approve`, {
    method: 'POST',
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to approve settlement');
  }
  return response.json();
}

export async function rejectSettlement(settlementId) {
  const response = await fetch(`${API_BASE_URL}/settlements/${settlementId}/reject`, {
    method: 'POST',
    headers: getHeaders(null)
  });
  if (!response.ok) {
    throw new Error('Failed to reject settlement');
  }
  return response.json();
}
