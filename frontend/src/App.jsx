import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  Receipt, 
  ShieldAlert, 
  Sparkles, 
  TrendingUp, 
  ArrowLeft, 
  Trash2, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Calendar,
  IndianRupee,
  History,
  Repeat,
  RefreshCw
} from 'lucide-react';
import { 
  fetchGroups, 
  fetchGroupDetails, 
  createGroup, 
  addExpense, 
  deleteExpense, 
  fetchSettlements, 
  fetchInsights,
  recordSettlement,
  fetchActivities,
  createRecurring,
  fetchRecurring,
  fetchSettlementsHistory,
  deleteSettlement,
  approveSettlement,
  rejectSettlement,
  login,
  register,
  logout,
  fetchCurrentUser
} from './api';

// Donut Chart Component
function DonutChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-secondary)', padding: '2rem 0', textAlign: 'center' }}>No expense data to display chart.</div>;
  }
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <div style={{ color: 'var(--text-secondary)', padding: '2rem 0', textAlign: 'center' }}>No expenses to display chart.</div>;
  }

  const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];
  
  let currentOffset = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', margin: '1rem 0' }}>
      <svg width="150" height="150" viewBox="0 0 100 100" className="donut-chart-svg">
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        {data.map((item, idx) => {
          const share = item.value / total;
          const strokeLength = share * circumference;
          const strokeOffset = currentOffset;
          currentOffset += strokeLength;
          const color = colors[idx % colors.length];
          
          return (
            <circle
              key={item.name}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="7"
              className="donut-segment"
              strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
              strokeDashoffset={-strokeOffset}
            />
          );
        })}
        <text x="50" y="47" textAnchor="middle" fill="var(--text-secondary)" fontSize="5" fontWeight="600" letterSpacing="0.05em">TOTAL</text>
        <text x="50" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="800">₹{total.toFixed(2)}</text>
      </svg>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
        {data.map((item, idx) => {
          const color = colors[idx % colors.length];
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.825rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: color, display: 'inline-block', flexShrink: 0 }}></span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>₹{item.value.toFixed(2)} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Visual Cash Flow Network Graph Component (using pure React SVG layout)
function CashFlowGraph({ members, settlements }) {
  if (!members || members.length === 0) return null;
  
  const N = members.length;
  const cx = 150;
  const cy = 130;
  const radius = 80;
  
  // Distribute nodes evenly in a circle layout
  const nodes = members.map((m, idx) => {
    const angle = (2 * Math.PI * idx) / N - Math.PI / 2; // start from top (12 o'clock)
    return {
      id: m.id,
      name: m.name,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  });
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '1rem 0' }}>
      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', fontWeight: 600 }}>Visual Cash Flow Graph</h4>
      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <svg width="300" height="250" style={{ overflow: 'visible' }}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 8 5 L 0 8 z" fill="#10b981" />
            </marker>
          </defs>
          
          {/* Draw connection arrows */}
          {settlements.map((s, idx) => {
            const fromNode = nodes.find(n => n.id === s.fromId);
            const toNode = nodes.find(n => n.id === s.toId);
            if (!fromNode || !toNode) return null;
            
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;
            
            const ux = dx / dist;
            const uy = dy / dist;
            
            const nodeRadius = 24;
            const x1 = fromNode.x + nodeRadius * ux;
            const y1 = fromNode.y + nodeRadius * uy;
            const x2 = toNode.x - nodeRadius * ux;
            const y2 = toNode.y - nodeRadius * uy;
            
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            
            return (
              <g key={idx}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--success)"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  markerEnd="url(#arrow)"
                />
                <rect
                  x={mx - 20}
                  y={my - 7}
                  width="40"
                  height="14"
                  rx="3"
                  fill="var(--bg-dark)"
                  stroke="rgba(16, 185, 129, 0.3)"
                  strokeWidth="1"
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  fill="var(--success)"
                  fontSize="8"
                  fontWeight="800"
                >
                  ₹{s.amount.toFixed(0)}
                </text>
              </g>
            );
          })}
          
          {/* Draw Nodes */}
          {nodes.map(n => (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r="22"
                fill="#111827"
                stroke="var(--primary)"
                strokeWidth="2.5"
                style={{ filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.6))' }}
              />
              <text
                x={n.x}
                y={n.y + 3}
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="9"
                fontWeight="700"
              >
                {n.name.slice(0, 6)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function App() {
  // Navigation & Loading States
  const [groups, setGroups] = useState([]);
  const [currentView, setCurrentView] = useState({ name: 'dashboard' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Group Details States
  const [groupDetails, setGroupDetails] = useState(null);
  const [settlements, setSettlements] = useState({ balances: [], settlements: [] });
  const [insights, setInsights] = useState({ alerts: [], categoryBreakdown: [] });
  const [activities, setActivities] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses');

  // Search & Filters for Expenses
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals Toggle
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);

  // Create Group Form Fields
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [members, setMembers] = useState(['', '']);

  // Add Expense Form Fields
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expCategory, setExpCategory] = useState('Food');
  const [expSplitType, setExpSplitType] = useState('equal');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [splitChecked, setSplitChecked] = useState({});
  const [splitExact, setSplitExact] = useState({});
  const [splitPercentage, setSplitPercentage] = useState({});

  // Add Recurring Template Form Fields
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recPaidBy, setRecPaidBy] = useState('');
  const [recCategory, setRecCategory] = useState('Food');
  const [recFrequency, setRecFrequency] = useState('monthly');
  const [recNextDueDate, setRecNextDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  // Initial Load: Verify Token and Load Profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setLoading(true);
      fetchCurrentUser()
        .then(data => {
          setCurrentUser(data.user);
          return fetchGroups();
        })
        .then(groupsData => {
          if (groupsData) {
            setGroups(groupsData);
          }
          setError(null);
        })
        .catch(err => {
          console.error('Session verification failed:', err);
          localStorage.removeItem('token');
          setCurrentUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
      setError(null);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('expired') || err.message.includes('Authentication')) {
        setCurrentUser(null);
        localStorage.removeItem('token');
      } else {
        setError('Could not connect to the backend server. Please make sure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (groupId) => {
    setLoading(true);
    try {
      const details = await fetchGroupDetails(groupId);
      setGroupDetails(details);
      
      const settlementsData = await fetchSettlements(groupId);
      setSettlements(settlementsData);
      
      const insightsData = await fetchInsights(groupId);
      setInsights(insightsData);

      const activitiesData = await fetchActivities(groupId);
      setActivities(activitiesData);

      const recurringData = await fetchRecurring(groupId);
      setRecurring(recurringData);

      const historyData = await fetchSettlementsHistory(groupId);
      setSettlementHistory(historyData);

      setError(null);
    } catch (err) {
      setError('Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  // Authentication Action Handlers
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      const data = await login(authEmail, authPassword);
      localStorage.setItem('token', data.token);
      setCurrentUser(data.user);
      setAuthPassword('');
      // Immediately load groups for the user
      const groupsData = await fetchGroups();
      setGroups(groupsData);
      setError(null);
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      const data = await register(authName, authEmail, authPassword);
      localStorage.setItem('token', data.token);
      setCurrentUser(data.user);
      setAuthName('');
      setAuthPassword('');
      const groupsData = await fetchGroups();
      setGroups(groupsData);
      setError(null);
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    setCurrentUser(null);
    setGroups([]);
    setGroupDetails(null);
    setCurrentView({ name: 'dashboard' });
    setLoading(false);
  };

  const handleGroupClick = (groupId) => {
    setCurrentView({ name: 'group-details', groupId });
    setActiveTab('expenses');
    loadGroupDetails(groupId);
  };

  const handleBackToDashboard = () => {
    setCurrentView({ name: 'dashboard' });
    setGroupDetails(null);
    loadGroups();
  };

  // Add/Remove Member Rows in Create Group Modal
  const handleAddMemberRow = () => {
    setMembers([...members, '']);
  };

  const handleRemoveMemberRow = (index) => {
    if (members.length <= 2) return;
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
  };

  const handleMemberNameChange = (index, value) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  // Submit Create Group
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    const validMembers = members.filter(m => m.trim() !== '');
    if (!groupName.trim() || validMembers.length < 2) {
      alert('Group name and at least 2 member names are required.');
      return;
    }

    try {
      await createGroup({
        name: groupName.trim(),
        description: groupDesc.trim(),
        members: validMembers
      });
      setIsCreateGroupOpen(false);
      setGroupName('');
      setGroupDesc('');
      setMembers(['', '']);
      loadGroups();
    } catch (err) {
      alert(err.message || 'Error creating group');
    }
  };

  // Initialize splits checkboxes when Add Expense Modal opens
  useEffect(() => {
    if (isAddExpenseOpen && groupDetails) {
      const initialChecked = {};
      const initialExact = {};
      const initialPercent = {};
      groupDetails.members.forEach(m => {
        initialChecked[m.id] = true;
        initialExact[m.id] = '';
        initialPercent[m.id] = '';
      });
      setSplitChecked(initialChecked);
      setSplitExact(initialExact);
      setSplitPercentage(initialPercent);
      setExpPaidBy(groupDetails.members[0]?.id || '');
      setExpDesc('');
      setExpAmount('');
      setExpCategory('Food');
      setExpSplitType('equal');
      setExpDate(new Date().toISOString().split('T')[0]);
    }
  }, [isAddExpenseOpen, groupDetails]);

  // Initialize recurring model fields
  useEffect(() => {
    if (isAddRecurringOpen && groupDetails) {
      setRecPaidBy(groupDetails.members[0]?.id || '');
      setRecDesc('');
      setRecAmount('');
      setRecCategory('Food');
      setRecFrequency('monthly');
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      setRecNextDueDate(d.toISOString().split('T')[0]);
    }
  }, [isAddRecurringOpen, groupDetails]);

  // Compute validation for custom exact split sum
  const exactSplitSum = Object.values(splitExact).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const amountFloat = parseFloat(expAmount) || 0;
  const isExactSplitValid = Math.abs(exactSplitSum - amountFloat) < 0.02;

  const percentageSplitSum = Object.values(splitPercentage).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const isPercentageSplitValid = Math.abs(percentageSplitSum - 100) < 0.01;

  // Submit Add Expense
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expDesc.trim() || amountFloat <= 0 || !expPaidBy) {
      alert('Please fill in description, a valid amount, and select who paid.');
      return;
    }

    let calculatedSplits = [];
    if (expSplitType === 'equal') {
      const checkedIds = Object.keys(splitChecked).filter(id => splitChecked[id]);
      if (checkedIds.length === 0) {
        alert('Please select at least one member to split with.');
        return;
      }
      
      const share = amountFloat / checkedIds.length;
      let remaining = amountFloat;

      checkedIds.forEach((id, idx) => {
        let roundedShare = Math.round(share * 100) / 100;
        if (idx === checkedIds.length - 1) {
          roundedShare = Math.round(remaining * 100) / 100;
        }
        remaining -= roundedShare;
        
        calculatedSplits.push({
          memberId: id,
          amount: roundedShare
        });
      });
    } else if (expSplitType === 'percentage') {
      if (!isPercentageSplitValid) {
        alert(`The sum of individual percentages (${percentageSplitSum.toFixed(1)}%) must equal exactly 100%.`);
        return;
      }
      groupDetails.members.forEach((m) => {
        const pct = parseFloat(splitPercentage[m.id]) || 0;
        if (pct > 0) {
          let roundedShare = Math.round((amountFloat * (pct / 100)) * 100) / 100;
          calculatedSplits.push({
            memberId: m.id,
            amount: roundedShare
          });
        }
      });
      // Adjust rounding difference
      const splitSum = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);
      const diff = amountFloat - splitSum;
      if (Math.abs(diff) > 0.001 && calculatedSplits.length > 0) {
        calculatedSplits[calculatedSplits.length - 1].amount = Math.round((calculatedSplits[calculatedSplits.length - 1].amount + diff) * 100) / 100;
      }
    } else {
      if (!isExactSplitValid) {
        alert(`The sum of individual shares (₹${exactSplitSum.toFixed(2)}) must equal the total amount (₹${amountFloat.toFixed(2)}).`);
        return;
      }
      groupDetails.members.forEach(m => {
        const shareVal = parseFloat(splitExact[m.id]) || 0;
        if (shareVal > 0) {
          calculatedSplits.push({
            memberId: m.id,
            amount: Math.round(shareVal * 100) / 100
          });
        }
      });
    }

    try {
      await addExpense(groupDetails.id, {
        paidByMemberId: expPaidBy,
        amount: amountFloat,
        description: expDesc.trim(),
        category: expCategory,
        splitType: expSplitType,
        date: expDate,
        splits: calculatedSplits
      });
      setIsAddExpenseOpen(false);
      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert(err.message || 'Failed to add expense');
    }
  };

  // Submit Add Recurring template
  const handleAddRecurringSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(recAmount) || 0;
    if (!recDesc.trim() || val <= 0 || !recPaidBy) {
      alert('Please fill in Description, valid Baseline Amount, and payer.');
      return;
    }

    try {
      await createRecurring(groupDetails.id, {
        paidByMemberId: recPaidBy,
        amount: val,
        description: recDesc.trim(),
        category: recCategory,
        frequency: recFrequency,
        nextDueDate: recNextDueDate
      });
      setIsAddRecurringOpen(false);
      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert('Failed to save recurring template.');
    }
  };

  // Record a settlement write-back
  const handleRecordSettlement = async (settlement) => {
    if (!confirm(`Mark that ${settlement.fromName} paid ₹${settlement.amount.toFixed(2)} to ${settlement.toName}? This will deduct from the debt.`)) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      await recordSettlement(groupDetails.id, {
        fromMemberId: settlement.fromId,
        toMemberId: settlement.toId,
        amount: settlement.amount,
        date: today
      });
      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert('Failed to record settlement payment.');
    }
  };

  const handleQuickLogRecurring = async (template) => {
    if (!confirm(`Do you want to log a new expense of ₹${template.amount.toFixed(2)} for "${template.description}"? It will be split equally among all group members.`)) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const memberCount = groupDetails.members.length;
      if (memberCount === 0) return;

      const share = template.amount / memberCount;
      let remaining = template.amount;
      const calculatedSplits = groupDetails.members.map((m, idx) => {
        let roundedShare = Math.round(share * 100) / 100;
        if (idx === memberCount - 1) {
          roundedShare = Math.round(remaining * 100) / 100;
        }
        remaining -= roundedShare;
        return {
          memberId: m.id,
          amount: roundedShare
        };
      });

      await addExpense(groupDetails.id, {
        paidByMemberId: template.paid_by_member_id,
        amount: template.amount,
        description: `${template.description} (Auto-Logged)`,
        category: template.category,
        splitType: 'equal',
        date: today,
        splits: calculatedSplits
      });

      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert('Failed to quick-log recurring bill: ' + err.message);
    }
  };

  const handleDeleteExpenseClick = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(expenseId);
      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  const handleDeleteSettlementClick = async (settlementId) => {
    if (!confirm('Are you sure you want to undo/delete this settlement payment? This will revert the balances.')) return;
    try {
      await deleteSettlement(settlementId);
      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert('Failed to delete settlement: ' + err.message);
    }
  };

  const handleApproveSettlement = async (settlementId) => {
    try {
      await approveSettlement(settlementId);
      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert('Failed to approve settlement: ' + err.message);
    }
  };

  const handleRejectSettlement = async (settlementId) => {
    if (!confirm('Are you sure you want to decline/reject this payment claim? This will raise a dispute alert.')) return;
    try {
      await rejectSettlement(settlementId);
      loadGroupDetails(groupDetails.id);
    } catch (err) {
      alert('Failed to reject settlement: ' + err.message);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
        {/* Top Navbar for logged out users */}
        <nav className="glass" style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="#fff" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 30%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FairSplit</span>
            </div>
          </div>
        </nav>

        {/* Auth Panel */}
        <main className="container" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="glass card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {authView === 'login' ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {authView === 'login' ? 'Log in to split bills and verify fairness.' : 'Create an account to manage your group expenses.'}
              </p>
            </div>

            {authError && (
              <div className="glass alert-card danger" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <ShieldAlert size={16} className="alert-icon" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{authError}</div>
              </div>
            )}

            {authView === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@example.com" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1.5rem' }} disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="John Doe" 
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@example.com" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1.5rem' }} disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {authView === 'login' ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button 
                type="button" 
                onClick={() => {
                  setAuthView(authView === 'login' ? 'register' : 'login');
                  setAuthError('');
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary)', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  padding: 0 
                }}
              >
                {authView === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </div>

          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      {/* Top Navbar */}
      <nav className="glass" style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={handleBackToDashboard}>
            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 30%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FairSplit</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
              Hello, <strong style={{ color: 'var(--text-primary)' }}>{currentUser.name}</strong>
            </span>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => currentView.name === 'group-details' ? loadGroupDetails(currentView.groupId) : loadGroups()}>
              <RefreshCw size={12} />
              Sync
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.1)' }} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="container">
        
        {error && (
          <div className="glass alert-card warning" style={{ marginBottom: '2rem' }}>
            <ShieldAlert size={20} className="alert-icon" />
            <div>
              <div className="alert-title">Connection Error</div>
              <div className="alert-desc">{error}</div>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '1rem' }}>
            <div style={{ border: '3px solid rgba(255,255,255,0.05)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fetching data...</p>
          </div>
        )}

        {/* 1. DASHBOARD VIEW */}
        {!loading && currentView.name === 'dashboard' && (
          <div>
            <header>
              <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Smart Expense Sharing</h1>
              <p style={{ fontSize: '1.1rem', maxWidth: '600px' }}>
                Track group expenses, minimize cash flow clutter with graph simplification, record settle-ups, and run over-billing audits.
              </p>
            </header>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={22} color="var(--primary)" />
              Your Expense Groups
            </h2>
            
            <div className="grid-cols-3">
              
              {groups.map((group) => (
                <div key={group.id} className="glass-interactive card" onClick={() => handleGroupClick(group.id)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: '190px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.25rem' }}>{group.name}</h3>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {group.member_count} members
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flexGrow: 1, marginBottom: '1.5rem' }}>
                    {group.description || 'No description provided.'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyAlignment: 'space-between', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL SPEND</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success)' }}>
                        ₹{parseFloat(group.total_expenses).toFixed(2)}
                      </div>
                    </div>
                    <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      View Details
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}

              <div 
                className="glass-interactive card" 
                onClick={() => setIsCreateGroupOpen(true)}
                style={{ 
                  cursor: 'pointer', 
                  border: '1px dashed rgba(99, 102, 241, 0.3)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minHeight: '190px',
                  gap: '1rem',
                  background: 'rgba(99, 102, 241, 0.02)'
                }}
              >
                <div style={{ background: 'var(--primary-glow)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={24} color="var(--primary)" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Create New Group</h3>
                  <p style={{ fontSize: '0.85rem' }}>Start splitting expenses with friends</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. GROUP DETAILS VIEW */}
        {!loading && currentView.name === 'group-details' && groupDetails && (
          <div>
            {/* Back Button */}
            <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); handleBackToDashboard(); }}>
              <ArrowLeft size={16} />
              Back to Groups
            </a>

            {/* Header Area */}
            <div className="glass card" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>{groupDetails.name}</h1>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{groupDetails.description || 'No description provided.'}</p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.25rem' }}>
                  {groupDetails.members.map(m => (
                    <span key={m.id} className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                <button className="btn btn-secondary" onClick={() => setIsAddRecurringOpen(true)}>
                  <Repeat size={14} />
                  Set Recurring Bill
                </button>
                <button className="btn btn-primary" onClick={() => setIsAddExpenseOpen(true)}>
                  <Plus size={16} />
                  Add Expense
                </button>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
                Expenses & Recurrence
              </button>
              <button className={`tab-btn ${activeTab === 'settlement' ? 'active' : ''}`} onClick={() => setActiveTab('settlement')}>
                Balances & Cash Flow Graph
              </button>
              <button className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
                Fairness & Insights ({insights.alerts.length})
              </button>
              <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
                Audit Activity Log ({activities.length})
              </button>
            </div>

            {/* TAB CONTENT: EXPENSES & RECURRENCE */}
            {activeTab === 'expenses' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* Left side: Expenses list */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 0 }}>Group Expenses</h3>
                    
                    {groupDetails.expenses.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ width: '180px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          placeholder="Search expenses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select 
                          className="form-select"
                          style={{ width: '120px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                          <option value="All">All Categories</option>
                          <option value="Food">Food</option>
                          <option value="Travel">Travel</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {groupDetails.expenses.length === 0 ? (
                    <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: '4rem 2rem', textAlign: 'center' }}>
                      <Receipt size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Expenses Yet</h3>
                      <button className="btn btn-primary" onClick={() => setIsAddExpenseOpen(true)}>
                        Add First Expense
                      </button>
                    </div>
                  ) : (() => {
                    const filteredExpenses = groupDetails.expenses.filter(expense => {
                      const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            expense.paid_by_name.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter;
                      return matchesSearch && matchesCategory;
                    });
                    
                    if (filteredExpenses.length === 0) {
                      return (
                        <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <p style={{ fontSize: '0.9rem' }}>No expenses match your filter criteria.</p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        {filteredExpenses.map((expense) => {
                          const shareCount = groupDetails.splits.filter(s => s.expense_id === expense.id).length;
                          return (
                            <div key={expense.id} className="list-item" style={{ padding: '1.1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ 
                                  width: '38px', 
                                  height: '38px', 
                                  borderRadius: '8px', 
                                  background: 'rgba(255,255,255,0.03)', 
                                  border: '1px solid var(--border-color)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  color: 'var(--primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 700
                                }}>
                                  {expense.category[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{expense.description}</div>
                                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                    <span>Paid by <strong style={{ color: 'var(--text-primary)' }}>{expense.paid_by_name}</strong></span>
                                    <span>•</span>
                                    <span>Split: {shareCount} ppl</span>
                                    <span>•</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                      <Calendar size={10} />
                                      {expense.date}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                  ₹{expense.amount.toFixed(2)}
                                </span>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  onClick={() => handleDeleteExpenseClick(expense.id)}
                                  style={{ color: 'var(--danger)', border: 'none', background: 'transparent', width: '28px', height: '28px' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Right side: Recurring bill templates */}
                <div className="glass card">
                  <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Repeat size={16} color="var(--primary)" />
                      Recurring Bills
                    </span>
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Track subscription items (e.g. rent, wifi) and get notified of sudden overcharge changes.
                  </p>

                  {recurring.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No recurring templates set up.</p>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', marginTop: '0.75rem' }} onClick={() => setIsAddRecurringOpen(true)}>
                        + Set Recurring Bill
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {recurring.map(rec => (
                        <div key={rec.id} style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 600 }}>{rec.description}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>₹{rec.amount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              <span>{rec.frequency}</span>
                              <span>•</span>
                              <span>Payer: {rec.paid_by_name}</span>
                              <span>•</span>
                              <span>Due: {rec.next_due_date}</span>
                            </div>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => handleQuickLogRecurring(rec)}
                            >
                              <Plus size={10} />
                              Quick Log
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: SETTLEMENTS & CASH FLOW GRAPH */}
            {activeTab === 'settlement' && (
              <div className="grid-cols-2">
                {/* Left column: Balances list + Visual SVG Cash Flow graph */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Balances List */}
                  <div className="glass card">
                    <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
                      Group Balances (Adjusted)
                    </h3>
                    
                    {settlements.balances.map((mb) => {
                      const isCreditor = mb.balance > 0.01;
                      const isDebtor = mb.balance < -0.01;
                      return (
                        <div key={mb.memberId} className="list-item" style={{ background: 'transparent', padding: '0.75rem 0', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: 0, marginBottom: 0 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{mb.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Paid ₹{mb.paid.toFixed(2)} • Owed ₹{mb.owed.toFixed(2)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: isCreditor ? 'var(--success)' : isDebtor ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            {isCreditor ? '+' : ''}₹{mb.balance.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Visual Network Graph */}
                  {settlements.settlements.length > 0 && (
                    <div className="glass card">
                      <CashFlowGraph members={groupDetails.members} settlements={settlements.settlements} />
                    </div>
                  )}
                </div>

                {/* Right column: Simplified Settle Up list + settlements history */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Settle up Suggestions */}
                  <div className="glass card">
                    <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="var(--success)" />
                        Settle Up Cash Flow
                      </span>
                    </h3>
                    
                    {settlements.settlements.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={36} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Everyone is fully settled!</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>All balances factor in recorded settlement payments.</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                          Calculate transactions using greedy simplification. Click "Mark Settled" to write back a payment record.
                        </p>
                        
                        {settlements.settlements.map((s, idx) => (
                          <div key={idx} className="settlement-card" style={{ padding: '0.9rem 1.1rem' }}>
                            <div className="settlement-flow" style={{ fontSize: '0.9rem' }}>
                              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.fromName}</span>
                              <ArrowRight size={12} className="arrow-right-anim" style={{ color: 'var(--text-secondary)' }} />
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>{s.toName}</span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                ₹{s.amount.toFixed(2)}
                              </div>
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', gap: '0.25rem' }}
                                onClick={() => handleRecordSettlement(s)}
                              >
                                <CheckCircle2 size={12} />
                                Settled
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pending Confirmations Queue */}
                  {settlementHistory.filter(s => s.status === 'pending').length > 0 && (
                    <div className="glass card" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.02)' }}>
                      <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
                        <ShieldAlert size={18} />
                        Pending Confirmations
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        These payment claims are waiting for the receiving member to confirm they actually got the money.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {settlementHistory.filter(s => s.status === 'pending').map((sh) => {
                          const loggedInMember = groupDetails?.members?.find(m => m.user_id === currentUser?.id);
                          const isRecipient = loggedInMember && loggedInMember.id === sh.to_member_id;
                          return (
                            <div key={sh.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sh.from_name}</span>
                                    <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sh.to_name}</span>
                                  </div>
                                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                    Declared {sh.date}
                                  </div>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--warning)' }}>
                                  ₹{sh.amount.toFixed(2)}
                                </span>
                              </div>
                              {isRecipient ? (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                  <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--success)', borderColor: 'var(--success)' }}
                                    onClick={() => handleApproveSettlement(sh.id)}
                                  >
                                    Confirm Received
                                  </button>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                    onClick={() => handleRejectSettlement(sh.id)}
                                  >
                                    Decline
                                  </button>
                                </div>
                              ) : (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.35rem', 
                                  fontSize: '0.75rem', 
                                  color: 'var(--warning)', 
                                  padding: '0.35rem 0.5rem', 
                                  background: 'rgba(245, 158, 11, 0.08)', 
                                  borderRadius: 'var(--radius-sm)',
                                  marginTop: '0.25rem' 
                                }}>
                                  <Info size={12} style={{ flexShrink: 0 }} />
                                  <span>Waiting for {sh.to_name} to confirm receiving this payment</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recorded Settlement History (Past Payments) */}
                  <div className="glass card">
                    <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <History size={16} color="var(--primary)" />
                      Past Settlements History
                    </h3>
                    {settlementHistory.filter(s => s.status !== 'pending').length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                        No past settlements recorded.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {settlementHistory.filter(s => s.status !== 'pending').map((sh) => {
                          const isDisputed = sh.status === 'disputed';
                          return (
                            <div key={sh.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sh.from_name}</span>
                                  <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sh.to_name}</span>
                                  {isDisputed && (
                                    <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', marginLeft: '0.25rem' }}>
                                      Disputed
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  {sh.date}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontWeight: 700, color: isDisputed ? 'var(--danger)' : 'var(--success)' }}>
                                  ₹{sh.amount.toFixed(2)}
                                </span>
                                <button 
                                  className="btn btn-secondary btn-icon"
                                  style={{ border: 'none', background: 'transparent', padding: 0, width: '24px', height: '24px', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => handleDeleteSettlementClick(sh.id)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>
            )}

            {/* TAB CONTENT: INSIGHTS & FAIRNESS CHECKS */}
            {activeTab === 'insights' && (
              <div className="grid-cols-2">
                <div className="glass card">
                  <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
                    Category Breakdown
                  </h3>
                  <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DonutChart data={insights.categoryBreakdown} />
                  </div>
                </div>

                <div className="glass card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                    Fairness Engine Insights
                  </h3>
                  
                  <div style={{ flexGrow: 1 }}>
                    {insights.alerts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={36} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Fairness Check Passed</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>No payment anomalies, duplicate claims, or overcharges found.</p>
                      </div>
                    ) : (
                      <div>
                        {insights.alerts.map((alert, idx) => (
                          <div key={idx} className={`alert-card ${alert.severity}`}>
                            <ShieldAlert size={20} className="alert-icon" />
                            <div>
                              <div className="alert-title">{alert.title}</div>
                              <div className="alert-desc">{alert.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Contribution Distribution</h4>
                    {settlements.balances.map(mb => {
                      const totalPaid = settlements.balances.reduce((s, b) => s + b.paid, 0);
                      const share = totalPaid > 0 ? (mb.paid / totalPaid) * 100 : 0;
                      return (
                        <div key={mb.memberId} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 500 }}>{mb.name}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>₹{mb.paid.toFixed(2)} ({Math.round(share)}%)</span>
                          </div>
                          <div className="progress-bar-container">
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${share}%`, 
                                backgroundColor: share > 75 ? 'var(--warning)' : share === 0 ? 'var(--text-muted)' : 'var(--primary)' 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AUDIT ACTIVITY LOG */}
            {activeTab === 'activity' && (
              <div className="glass card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <History size={20} color="var(--primary)" />
                    Immutable Audit Trail
                  </span>
                </h3>
                
                {activities.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>No activity logged yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)', margin: '1rem 0.5rem' }}>
                    {activities.map((log, idx) => (
                      <div key={log.id} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                        {/* Bullet indicator */}
                        <span style={{ 
                          position: 'absolute', 
                          left: '-29.5px', 
                          top: '4px', 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          backgroundColor: log.action_type === 'record_payment' ? 'var(--success)' : log.action_type === 'delete_expense' ? 'var(--danger)' : 'var(--primary)',
                          border: '2.5px solid var(--bg-dark)',
                          boxShadow: '0 0 0 3px rgba(255,255,255,0.02)'
                        }} />
                        
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {log.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* --- MODAL 1: CREATE GROUP --- */}
      {isCreateGroupOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateGroupOpen(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={22} color="var(--primary)" />
              Create New Group
            </h3>
            
            <form onSubmit={handleCreateGroupSubmit}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Roommates 2026, Summer Roadtrip"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-textarea" 
                  rows="2"
                  placeholder="e.g. Shared expenses for Apartment 4B"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Group Members</span>
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={handleAddMemberRow}>
                    + Add Member
                  </button>
                </label>
                
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                  {members.map((name, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={`Member #${index + 1}`}
                        value={name}
                        onChange={(e) => handleMemberNameChange(index, e.target.value)}
                        required={index < 2} 
                      />
                      {members.length > 2 && (
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-icon" 
                          style={{ flexShrink: 0, color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.1)' }}
                          onClick={() => handleRemoveMemberRow(index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsCreateGroupOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD EXPENSE --- */}
      {isAddExpenseOpen && groupDetails && (
        <div className="modal-overlay" onClick={() => setIsAddExpenseOpen(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={22} color="var(--primary)" />
              Add Expense
            </h3>
            
            <form onSubmit={handleAddExpenseSubmit}>
              <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Pizza party, Electricity Bill"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Amount (₹)</label>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      className="form-input" 
                      placeholder="0.00"
                      style={{ paddingLeft: '2rem' }}
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Paid By</label>
                  <select 
                    className="form-select"
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                  >
                    {groupDetails.members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                  >
                    <option value="Food">Food</option>
                    <option value="Travel">Travel</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Split Type</label>
                  <select 
                    className="form-select"
                    value={expSplitType}
                    onChange={(e) => setExpSplitType(e.target.value)}
                  >
                    <option value="equal">Split Equally</option>
                    <option value="percentage">Split by Percentage</option>
                    <option value="exact">Split Unequally (Exact)</option>
                  </select>
                </div>
              </div>

              {/* SPLIT CONTROLS SECTION */}
              <div className="form-group" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <label className="form-label" style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
                  {expSplitType === 'equal' ? 'Split Among Whom?' : expSplitType === 'percentage' ? 'Enter Percentages (%)' : 'Enter Exact Shares (₹)'}
                </label>
                
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.25rem' }}>
                  {groupDetails.members.map(m => {
                    const isChecked = splitChecked[m.id] ?? true;
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.name}</span>
                        
                        {expSplitType === 'equal' ? (
                          <input 
                            type="checkbox" 
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            checked={isChecked}
                            onChange={(e) => setSplitChecked({ ...splitChecked, [m.id]: e.target.checked })}
                          />
                        ) : expSplitType === 'percentage' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input 
                              type="number" 
                              step="1"
                              min="0"
                              max="100"
                              placeholder="0"
                              className="form-input"
                              style={{ width: '80px', padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.85rem' }}
                              value={splitPercentage[m.id] ?? ''}
                              onChange={(e) => setSplitPercentage({ ...splitPercentage, [m.id]: e.target.value })}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>₹</span>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              className="form-input"
                              style={{ width: '90px', padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.85rem' }}
                              value={splitExact[m.id] ?? ''}
                              onChange={(e) => setSplitExact({ ...splitExact, [m.id]: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {expSplitType === 'exact' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
                    <span style={{ color: isExactSplitValid ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                      <Info size={12} />
                      Sum: ₹{exactSplitSum.toFixed(2)} of ₹{amountFloat.toFixed(2)}
                    </span>
                    {!isExactSplitValid && (
                      <span style={{ color: 'var(--danger)' }}>
                        Difference: ₹{(amountFloat - exactSplitSum).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                {expSplitType === 'percentage' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
                    <span style={{ color: isPercentageSplitValid ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                      <Info size={12} />
                      Total: {percentageSplitSum.toFixed(1)}% of 100%
                    </span>
                    {!isPercentageSplitValid && (
                      <span style={{ color: 'var(--danger)' }}>
                        Remaining: {(100 - percentageSplitSum).toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddExpenseOpen(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={(expSplitType === 'exact' && !isExactSplitValid) || (expSplitType === 'percentage' && !isPercentageSplitValid)}
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD RECURRING BILL TEMPLATE --- */}
      {isAddRecurringOpen && groupDetails && (
        <div className="modal-overlay" onClick={() => setIsAddRecurringOpen(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Repeat size={20} color="var(--primary)" />
              Set Recurring Bill
            </h3>
            
            <form onSubmit={handleAddRecurringSubmit}>
              <div className="form-group">
                <label className="form-label">Template Description (e.g. WiFi Bill, Rent)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. WiFi Bill"
                  value={recDesc}
                  onChange={(e) => setRecDesc(e.target.value)}
                  required 
                />
              </div>

              <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Baseline Amount (₹)</label>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      className="form-input" 
                      placeholder="0.00"
                      style={{ paddingLeft: '2rem' }}
                      value={recAmount}
                      onChange={(e) => setRecAmount(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payer</label>
                  <select 
                    className="form-select"
                    value={recPaidBy}
                    onChange={(e) => setRecPaidBy(e.target.value)}
                  >
                    {groupDetails.members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Food">Food</option>
                    <option value="Travel">Travel</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Frequency</label>
                  <select 
                    className="form-select"
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Next Due Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={recNextDueDate}
                  onChange={(e) => setRecNextDueDate(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsAddRecurringOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
