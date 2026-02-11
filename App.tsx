
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Wallet, TrendingUp, TrendingDown, Download, Trash2, 
  Sparkles, User, PieChart as PieChartIcon, BarChart3, Search, 
  CheckCircle2, AlertCircle, MessageSquare, LogOut, Settings, 
  HeartHandshake, Send, Cloud, Users, Leaf, Coins, FileText, Printer, ChevronRight, Upload
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { 
  Transaction, TransactionType, Role, User as UserType, PaymentMethod,
  AppConfig, ChatMessage, MONTHS, YEARS, INITIAL_MEMBERS, AITip, PAYMENT_METHODS
} from './types';
import { getFinancialTips } from './geminiService';

const COLORS = ['#4ade80', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

const App: React.FC = () => {
  // --- AUTH & STATE ---
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('ekota_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [users, setUsers] = useState<UserType[]>(() => {
    const saved = localStorage.getItem('ekota_users');
    return saved ? JSON.parse(saved) : [
      { id: '1', username: 'support', password: 'wayas.it', role: 'SUPPORT', name: 'Support Admin' }
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('ekota_txs');
    return saved ? JSON.parse(saved) : [];
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('ekota_chat');
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('ekota_config');
    return saved ? JSON.parse(saved) : { googleDriveLink: '', members: INITIAL_MEMBERS };
  });

  // --- UI STATE ---
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [aiTips, setAiTips] = useState<AITip[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [importJson, setImportJson] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- REPORT STATE ---
  const [reportFilter, setReportFilter] = useState({
    month: MONTHS[new Date().getMonth()],
    year: '2025'
  });

  // --- FORM STATE ---
  const [txForm, setTxForm] = useState({
    memberName: config.members[0],
    amount: '500',
    type: 'Income' as TransactionType,
    month: MONTHS[new Date().getMonth()],
    year: '2025',
    date: new Date().toISOString().split('T')[0],
    category: 'Subscription',
    paymentMethod: 'Cash' as PaymentMethod
  });

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('ekota_users', JSON.stringify(users));
    localStorage.setItem('ekota_txs', JSON.stringify(transactions));
    localStorage.setItem('ekota_chat', JSON.stringify(chatMessages));
    localStorage.setItem('ekota_config', JSON.stringify(config));
    if (currentUser) localStorage.setItem('ekota_current_user', JSON.stringify(currentUser));
    else localStorage.removeItem('ekota_current_user');
  }, [users, transactions, chatMessages, config, currentUser]);

  useEffect(() => {
    if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const fetchTips = async () => {
      const tips = await getFinancialTips(transactions);
      setAiTips(tips);
    };
    if (transactions.length > 0) fetchTips();
  }, [transactions.length]);

  // --- CALCULATIONS ---
  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const totalInvest = transactions.filter(t => t.type === 'Investment').reduce((s, t) => s + t.amount, 0);
    return {
      currentBalance: totalIncome - totalExpense - totalInvest,
      totalInvestment: totalInvest,
      totalCapital: totalIncome - totalExpense
    };
  }, [transactions]);

  const reportTransactions = useMemo(() => {
    return transactions.filter(t => t.month === reportFilter.month && t.year === reportFilter.year);
  }, [transactions, reportFilter]);

  const trendData = useMemo(() => {
    return MONTHS.slice(0, 6).map(m => ({
      name: m.substring(0, 3),
      Collection: transactions.filter(t => t.month === m && t.type === 'Income').reduce((s, t) => s + t.amount, 0),
      Expense: transactions.filter(t => t.month === m && t.type === 'Expense').reduce((s, t) => s + t.amount, 0),
    }));
  }, [transactions]);

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) setCurrentUser(user);
    else alert('Invalid credentials');
  };

  const handleLogout = () => setCurrentUser(null);

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role === 'CUSTOMER') return;
    
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      memberName: txForm.memberName,
      amount: parseFloat(txForm.amount),
      type: txForm.type,
      month: txForm.month,
      year: txForm.year,
      date: txForm.date,
      category: txForm.category,
      paymentMethod: txForm.paymentMethod,
      recordedBy: currentUser.username
    };
    setTransactions([newTx, ...transactions]);
    setIsAddingTx(false);
  };

  const handleBulkImport = () => {
    try {
      const data = JSON.parse(importJson);
      if (!Array.isArray(data)) throw new Error("Data is not an array");

      const newTransactions: Transaction[] = data.map((item: any) => {
        const memberIdx = parseInt(item.memberIdx);
        const memberName = config.members[memberIdx] || `Member ${memberIdx + 1}`;
        
        // Map types from input JSON
        let method: PaymentMethod = 'Other';
        if (item.type === 'Bank Transfer') method = 'Bank Account';
        else if (item.type === 'Bkash') method = 'bKash';
        else if (item.type === 'Nagad') method = 'Nagad';
        else if (item.type === 'Cash') method = 'Cash';

        // Format Date: YYYY-MM-DD
        const monthNum = (MONTHS.indexOf(item.month) + 1).toString().padStart(2, '0');
        const dayFormatted = item.day.toString().padStart(2, '0');
        const dateStr = `${item.year}-${monthNum}-${dayFormatted}`;

        return {
          id: crypto.randomUUID(),
          memberName: memberName,
          amount: parseFloat(item.amount),
          type: 'Income',
          category: 'Subscription',
          month: item.month,
          year: item.year,
          date: dateStr,
          paymentMethod: method,
          recordedBy: currentUser?.username || 'system'
        };
      });

      setTransactions([...newTransactions, ...transactions]);
      setImportJson('');
      alert(`Successfully imported ${newTransactions.length} records!`);
    } catch (err) {
      alert("Error parsing JSON. Please ensure it follows the format provided.");
      console.error(err);
    }
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: currentUser.name,
      text: chatInput,
      timestamp: Date.now()
    };
    setChatMessages([...chatMessages, msg]);
    setChatInput('');
  };

  const printReport = () => {
    window.print();
  };

  const exportData = () => {
    const ws = XLSX.utils.json_to_sheet(transactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "Ekota_Tohobil_Ledger.xlsx");
  };

  const CustomLogo = ({ className = "w-16 h-16" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 border-4 border-indigo-400/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <HeartHandshake className="text-indigo-400" size={32} />
      </div>
      <div className="absolute -bottom-2 flex gap-1">
        <Coins className="text-amber-400" size={12} />
        <Leaf className="text-emerald-400" size={12} />
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-white/20">
          <div className="text-center mb-10">
            <div className="inline-flex p-5 rounded-full bg-white/5 mb-6 border border-white/10 shadow-inner">
               <CustomLogo className="w-20 h-20" />
            </div>
            <h1 className="text-4xl font-extrabold logo-gradient tracking-tighter mb-2">Ekota Tohobil</h1>
            <p className="text-slate-400 font-medium">Unity in Community Savings</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-600/30">
              Enter Dashboard
            </button>
          </form>
          <div className="mt-8 text-center text-[10px] text-slate-600 uppercase tracking-[0.2em]">
            Secured by Wayas IT Support
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      {/* Printable Report Root */}
      <div id="printable-report" className="text-black bg-white">
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ekota Tohobil</h1>
            <p className="text-sm font-medium">Monthly Financial Overview Report</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{reportFilter.month} {reportFilter.year}</p>
            <p className="text-xs">Generated on: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border p-4 rounded-lg">
            <p className="text-xs uppercase font-bold text-slate-500">Monthly Collections</p>
            <p className="text-xl font-bold">৳ {reportTransactions.filter(t => t.type === 'Income').reduce((s,t) => s+t.amount, 0).toLocaleString()}</p>
          </div>
          <div className="border p-4 rounded-lg">
            <p className="text-xs uppercase font-bold text-slate-500">Monthly Expenses</p>
            <p className="text-xl font-bold">৳ {reportTransactions.filter(t => t.type === 'Expense').reduce((s,t) => s+t.amount, 0).toLocaleString()}</p>
          </div>
          <div className="border p-4 rounded-lg bg-slate-50">
            <p className="text-xs uppercase font-bold text-slate-500">Net Surplus</p>
            <p className="text-xl font-bold">৳ {(reportTransactions.filter(t => t.type === 'Income').reduce((s,t) => s+t.amount, 0) - reportTransactions.filter(t => t.type === 'Expense').reduce((s,t) => s+t.amount, 0)).toLocaleString()}</p>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left text-xs uppercase">Date</th>
              <th className="border p-2 text-left text-xs uppercase">Description</th>
              <th className="border p-2 text-left text-xs uppercase">Type</th>
              <th className="border p-2 text-left text-xs uppercase">Method</th>
              <th className="border p-2 text-right text-xs uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {reportTransactions.map(tx => (
              <tr key={tx.id}>
                <td className="border p-2 text-xs">{tx.date}</td>
                <td className="border p-2 text-xs font-bold">{tx.memberName} <span className="text-[10px] font-normal text-slate-600">({tx.category})</span></td>
                <td className="border p-2 text-[10px] font-bold">{tx.type}</td>
                <td className="border p-2 text-[10px] font-bold">{tx.paymentMethod}</td>
                <td className="border p-2 text-xs font-bold text-right">৳ {tx.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-12 flex justify-between">
          <div className="text-center w-40 border-t border-black pt-2 text-[10px] font-bold uppercase">Admin Signature</div>
          <div className="text-center w-40 border-t border-black pt-2 text-[10px] font-bold uppercase">Co-Auditor Signature</div>
        </div>
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 rounded-2xl glass-card bg-emerald-500/10 border border-emerald-500/20">
            <Users className="text-emerald-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Ekota <span className="logo-gradient">Tohobil</span></h1>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentUser.name} ({currentUser.role})
            </p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={() => setIsReportOpen(true)} className="p-3 rounded-xl glass-card hover:bg-white/10 text-emerald-400 flex items-center gap-2 text-sm font-bold">
              <FileText size={20} /> Report
            </button>
          )}
          {currentUser.role === 'SUPPORT' && (
            <button onClick={() => setIsManagementOpen(true)} className="p-3 rounded-xl glass-card hover:bg-white/10 text-slate-300">
              <Settings size={20} />
            </button>
          )}
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-3 rounded-xl glass-card hover:bg-white/10 text-slate-300 relative">
            <MessageSquare size={20} />
            {chatMessages.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>}
          </button>
          <button onClick={exportData} className="px-4 py-2.5 rounded-xl glass-card text-sm font-medium hover:bg-white/10 flex items-center gap-2">
            <Download size={18} /> Export
          </button>
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={() => setIsAddingTx(true)} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/20">
              <Plus size={18} className="inline mr-1" /> New Entry
            </button>
          )}
          <button onClick={handleLogout} className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass p-6 rounded-3xl group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet size={120} />
          </div>
          <p className="text-emerald-300 text-sm mb-1 font-medium">Current Balance</p>
          <h2 className="text-4xl font-black tracking-tighter text-white">৳ {stats.currentBalance.toLocaleString()}</h2>
          <div className="mt-4 text-emerald-400 text-xs font-bold flex items-center gap-1">
            <CheckCircle2 size={14} /> Organization Liquid Funds
          </div>
        </div>
        <div className="glass p-6 rounded-3xl group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} />
          </div>
          <p className="text-amber-300 text-sm mb-1 font-medium">Invested (Business)</p>
          <h2 className="text-4xl font-black tracking-tighter text-white">৳ {stats.totalInvestment.toLocaleString()}</h2>
          <div className="mt-4 text-amber-400 text-xs font-bold flex items-center gap-1">
            <Leaf size={14} /> Capital in Growth
          </div>
        </div>
        <div className="glass p-6 rounded-3xl bg-emerald-500/5 group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <HeartHandshake size={120} />
          </div>
          <p className="text-blue-300 text-sm mb-1 font-medium">Total Equity</p>
          <h2 className="text-4xl font-black tracking-tighter text-blue-400">৳ {stats.totalCapital.toLocaleString()}</h2>
          <div className="mt-4 text-blue-300/60 text-xs font-bold flex items-center gap-1">
            <Sparkles size={14} /> Combined Community Worth
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Activity & Charts */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass p-6 rounded-3xl">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-emerald-400" size={20} />
              <h3 className="font-semibold text-lg uppercase tracking-wider text-slate-300">Financial Trends</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                  <Legend iconType="circle" />
                  <Bar name="Collections" dataKey="Collection" fill="#4ade80" radius={[6, 6, 0, 0]} />
                  <Bar name="Outflow" dataKey="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg flex items-center gap-2"><Users size={20} className="text-emerald-400" /> Member Ledger</h3>
              <div className="flex items-center gap-3">
                {config.googleDriveLink && (
                  <a href={config.googleDriveLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                    <Cloud size={14} /> Cloud Backup
                  </a>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] bg-white/5">
                  <tr>
                    <th className="px-6 py-5">Member / Detail</th>
                    <th className="px-6 py-5">Period</th>
                    <th className="px-6 py-5">Method</th>
                    <th className="px-6 py-5">Amount</th>
                    {currentUser.role !== 'CUSTOMER' && <th className="px-6 py-5 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{tx.memberName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{tx.category}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{tx.date} <br/> <span className="text-[10px] uppercase">{tx.month} {tx.year}</span></td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 bg-white/5 px-2 py-1 rounded">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-100">৳ {tx.amount.toLocaleString()}</td>
                      {currentUser.role !== 'CUSTOMER' && (
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => setTransactions(transactions.filter(t => t.id !== tx.id))} className="text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-600 font-medium italic">
                        Empty Ledger. Start adding member contributions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass p-6 rounded-3xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-amber-400 animate-pulse" size={24} />
              <h3 className="font-bold text-xl">Ekota Insights</h3>
            </div>
            <div className="space-y-4">
              {aiTips.length > 0 ? aiTips.map((tip, idx) => (
                <div key={idx} className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 hover:border-l-blue-500 transition-all">
                  <h4 className="font-black text-white text-xs uppercase tracking-widest mb-2">{tip.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed font-medium">{tip.advice}</p>
                </div>
              )) : (
                <div className="text-slate-600 text-xs italic p-4 text-center">Analyzing financial data for community tips...</div>
              )}
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
             <CustomLogo className="w-16 h-16 mb-4" />
             <h4 className="font-bold text-slate-200">Unity Support</h4>
             <p className="text-xs text-slate-500 mb-6">For technical assistance or profile changes, contact Wayas IT support.</p>
             <button className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
               Contact Support
             </button>
          </div>
        </div>
      </div>

      {/* Entry Modal */}
      {isAddingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsAddingTx(false)}></div>
          <div className="relative glass p-8 rounded-[2.5rem] w-full max-w-lg animate-in zoom-in duration-200 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <div className="bg-emerald-500 text-white rounded-xl p-2 shadow-lg shadow-emerald-500/30">
                <Plus size={24} />
              </div>
              New Fund Entry
            </h2>
            <form onSubmit={handleAddTx} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTxForm({...txForm, type: 'Income', amount: '500', category: 'Subscription'})} className={`py-3 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all ${txForm.type === 'Income' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Collection</button>
                <button type="button" onClick={() => setTxForm({...txForm, type: 'Expense', amount: '', category: 'General'})} className={`py-3 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all ${txForm.type === 'Expense' ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Expense</button>
                <button type="button" onClick={() => setTxForm({...txForm, type: 'Investment', amount: '', category: 'Business'})} className={`py-3 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all col-span-2 ${txForm.type === 'Investment' ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Business Re-Investment</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Member / Name</label>
                  {txForm.type === 'Income' ? (
                    <select className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-4 py-3 text-white appearance-none text-sm" value={txForm.memberName} onChange={e => setTxForm({...txForm, memberName: e.target.value})}>
                      {config.members.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none" placeholder="Description" value={txForm.memberName} onChange={e => setTxForm({...txForm, memberName: e.target.value})} />
                  )}
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Payment Method</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-4 py-3 text-white appearance-none text-sm" value={txForm.paymentMethod} onChange={e => setTxForm({...txForm, paymentMethod: e.target.value as PaymentMethod})}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Amount (৳)</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-black text-sm" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Specific Date</label>
                  <input type="date" className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm" value={txForm.date} onChange={e => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setTxForm({...txForm, date: e.target.value, month: MONTHS[d.getMonth()], year: d.getFullYear().toString()});
                    }
                  }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Apply to Month</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-4 py-3 text-white appearance-none text-sm" value={txForm.month} onChange={e => setTxForm({...txForm, month: e.target.value})}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Year</label>
                   <select className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-4 py-3 text-white appearance-none text-sm" value={txForm.year} onChange={e => setTxForm({...txForm, year: e.target.value})}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddingTx(false)} className="flex-1 py-4 glass-card text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px]">Close</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/30 transition-all">Confirm Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Report Selector Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsReportOpen(false)}></div>
          <div className="relative glass p-8 rounded-[2.5rem] w-full max-w-md animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <FileText className="text-emerald-400" /> Monthly Audit Report
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Select Month</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium" value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: e.target.value})}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Select Year</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium" value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: e.target.value})}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                 <div className="flex justify-between items-center text-xs font-bold uppercase mb-2 text-slate-400">
                    <span>Filtered Record Count</span>
                    <span className="text-emerald-400">{reportTransactions.length} Items</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-black">
                    <span>Monthly Surplus</span>
                    <span className="text-emerald-400 font-black tracking-tight">৳ {(reportTransactions.filter(t => t.type === 'Income').reduce((s,t) => s+t.amount, 0) - reportTransactions.filter(t => t.type === 'Expense').reduce((s,t) => s+t.amount, 0)).toLocaleString()}</span>
                 </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsReportOpen(false)} className="flex-1 py-4 glass-card text-slate-400 rounded-2xl font-black uppercase text-[10px]">Close</button>
                <button 
                  onClick={() => {
                    printReport();
                  }}
                  disabled={reportTransactions.length === 0}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Printer size={16} /> Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Settings */}
      {isManagementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsManagementOpen(false)}></div>
          <div className="relative glass p-8 rounded-[2.5rem] w-full max-w-3xl overflow-y-auto max-h-[90vh] shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black logo-gradient tracking-tighter flex items-center gap-3">
                <Settings className="text-blue-400" /> Admin Console
              </h2>
              <button onClick={() => setIsManagementOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            
            <section className="mb-10 p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2"><Cloud size={16}/> Cloud Synchronization</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500">Google Drive Folder / Sheet URL</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-blue-300 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="https://drive.google.com/..."
                  value={config.googleDriveLink}
                  onChange={e => setConfig({...config, googleDriveLink: e.target.value})}
                />
              </div>
            </section>

            <section className="mb-10 p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-6 flex items-center gap-2"><Upload size={16}/> Bulk Data Import</h3>
              <div className="space-y-4">
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                  Paste your JSON transaction list below. Ensure it contains "memberIdx", "day", "month", "year", "amount", and "type".
                </p>
                <textarea 
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-[10px] text-blue-300 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  placeholder='[{"memberIdx": "1", "day": "05", "month": "February", "year": "2026", "amount": "500", "type": "Bank Transfer"}]'
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                />
                <button 
                  onClick={handleBulkImport}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  Process Bulk Import
                </button>
              </div>
            </section>

            <section className="mb-10 p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-6 flex items-center gap-2"><Users size={16}/> Member Registry (20 Total)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {config.members.map((m, i) => (
                  <input 
                    key={i}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-300 focus:border-emerald-500 outline-none transition-all" 
                    value={m}
                    onChange={e => {
                      const newM = [...config.members];
                      newM[i] = e.target.value;
                      setConfig({...config, members: newM});
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center gap-2"><User size={16}/> System Access Controls</h3>
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-4 glass-card rounded-2xl border border-white/5">
                    <div className="flex gap-4 items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                        u.role === 'SUPPORT' ? 'bg-blue-500' : 
                        u.role === 'ADMIN' ? 'bg-emerald-500' : 
                        u.role === 'CO_AUDITOR' ? 'bg-amber-500' : 'bg-slate-700'
                      }`}>
                        {u.role[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{u.name}</div>
                        <div className="text-[10px] text-slate-500">@{u.username} • {u.role}</div>
                      </div>
                    </div>
                    {u.username !== 'support' && (
                      <button onClick={() => setUsers(users.filter(usr => usr.id !== u.id))} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const name = prompt('Full Name:');
                    const user = prompt('Username:');
                    const pass = prompt('Password:');
                    const role = prompt('Role (ADMIN/CO_AUDITOR/CUSTOMER):') as Role;
                    if (name && user && pass && role) {
                      setUsers([...users, { id: crypto.randomUUID(), name, username: user, password: pass, role }]);
                    }
                  }}
                  className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all"
                >
                  + Create New System User
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Community Chat */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 h-[500px] glass rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                 <MessageSquare size={16} className="text-white" />
               </div>
               <div>
                  <div className="font-black text-xs uppercase tracking-widest">Unity Chat</div>
                  <div className="text-[9px] text-emerald-400 font-bold">Active Community</div>
               </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-white font-black p-1">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === currentUser.name ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] font-black text-slate-500 mb-1 tracking-tighter">{msg.sender}</span>
                <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[90%] shadow-sm ${
                  msg.sender === currentUser.name 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white/10 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                 <MessageSquare size={40} className="mb-2" />
                 <p className="text-[10px] font-bold uppercase tracking-widest">No messages yet.<br/>Start the conversation.</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChatMessage} className="p-4 border-t border-white/10 flex gap-2 bg-white/5">
            <input 
              className="flex-1 bg-black/40 border border-white/10 rounded-full px-5 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white" 
              placeholder="Type message..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <button className="p-3 bg-emerald-600 rounded-full text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
