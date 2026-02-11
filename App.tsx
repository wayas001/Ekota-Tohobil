
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Wallet, TrendingUp, TrendingDown, Download, Trash2, 
  Sparkles, User, PieChart as PieChartIcon, BarChart3, Search, 
  CheckCircle2, AlertCircle, MessageSquare, LogOut, Settings, 
  HeartHandshake, Send, Cloud, Users, Leaf, Coins, FileText, Printer, ChevronRight
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- REPORT STATE ---
  const [reportFilter, setReportFilter] = useState({
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear().toString()
  });

  // --- FORM STATE ---
  const [txForm, setTxForm] = useState({
    memberName: config.members[0],
    amount: '500',
    type: 'Income' as TransactionType,
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear().toString(),
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
    return transactions.filter(t => t.month === reportFilter.month && t.year === reportFilter.year)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
      {/* Printable Report Root (Only visible during printing) */}
      <div id="printable-report" className="text-black bg-white p-8">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Ekota Tohobil</h1>
            <p className="text-sm font-bold text-slate-600">Community Unity Fund • Financial Report</p>
            <p className="text-xs text-slate-500 mt-1">Generated by {currentUser.name} ({currentUser.role})</p>
          </div>
          <div className="text-right">
            <div className="bg-slate-100 px-4 py-2 rounded-lg inline-block mb-2">
              <p className="text-[10px] font-black uppercase text-slate-500">Report Period</p>
              <p className="text-lg font-black text-slate-900">{reportFilter.month} {reportFilter.year}</p>
            </div>
            <p className="text-[10px] font-bold">Print Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="border-2 border-slate-200 p-4 rounded-xl">
            <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Total Collections</p>
            <p className="text-2xl font-black text-emerald-600">৳ {reportTransactions.filter(t => t.type === 'Income').reduce((s,t) => s+t.amount, 0).toLocaleString()}</p>
          </div>
          <div className="border-2 border-slate-200 p-4 rounded-xl">
            <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Total Outflow</p>
            <p className="text-2xl font-black text-rose-600">৳ {reportTransactions.filter(t => t.type === 'Expense' || t.type === 'Investment').reduce((s,t) => s+t.amount, 0).toLocaleString()}</p>
          </div>
          <div className="border-2 border-slate-900 p-4 rounded-xl bg-slate-900 text-white">
            <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Net Monthly Balance</p>
            <p className="text-2xl font-black">৳ {(reportTransactions.filter(t => t.type === 'Income').reduce((s,t) => s+t.amount, 0) - reportTransactions.filter(t => t.type === 'Expense' || t.type === 'Investment').reduce((s,t) => s+t.amount, 0)).toLocaleString()}</p>
          </div>
        </div>

        <table className="w-full mb-10">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Date</th>
              <th className="py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Member/Description</th>
              <th className="py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Method</th>
              <th className="py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Type</th>
              <th className="py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportTransactions.map(tx => (
              <tr key={tx.id}>
                <td className="py-3 text-xs font-bold">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="py-3">
                  <div className="text-xs font-black">{tx.memberName}</div>
                  <div className="text-[10px] text-slate-400 font-bold">{tx.category}</div>
                </td>
                <td className="py-3 text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{tx.paymentMethod}</td>
                <td className="py-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type}</span>
                </td>
                <td className="py-3 text-right text-xs font-black">৳ {tx.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-auto pt-10 grid grid-cols-3 gap-10">
          <div className="text-center border-t-2 border-slate-900 pt-3">
            <p className="text-[10px] font-black uppercase">Support In-Charge</p>
            <p className="text-[8px] text-slate-400 mt-1">Wayas IT Solutions</p>
          </div>
          <div className="text-center border-t-2 border-slate-900 pt-3">
            <p className="text-[10px] font-black uppercase">General Auditor</p>
          </div>
          <div className="text-center border-t-2 border-slate-900 pt-3">
            <p className="text-[10px] font-black uppercase">Organization Admin</p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 no-print">
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
            <button onClick={() => setIsReportOpen(true)} className="p-3 rounded-xl glass-card hover:bg-white/10 text-emerald-400 flex items-center gap-2 text-sm font-bold transition-all">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 no-print">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
        {/* Ledger Table */}
        <div className="lg:col-span-8 space-y-8">
          <div className="glass rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg flex items-center gap-2"><Users size={20} className="text-emerald-400" /> Member Ledger</h3>
              <div className="flex items-center gap-3">
                {config.googleDriveLink && (
                  <a href={config.googleDriveLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                    <Cloud size={14} /> Backup
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
                      <td className="px-6 py-4 text-sm text-slate-400">
                        <span className="font-bold">{tx.date}</span>
                        <br/>
                        <span className="text-[9px] uppercase font-black text-slate-600">{tx.month} {tx.year}</span>
                      </td>
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

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-8 no-print">
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
             <h4 className="font-bold text-slate-200 uppercase text-xs tracking-widest">Powered by Wayas IT</h4>
             <p className="text-[10px] text-slate-500 mt-2 mb-4 leading-relaxed">Unity management software specialized for community funds and collaborative savings.</p>
          </div>
        </div>
      </div>

      {/* Entry Modal */}
      {isAddingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsAddingTx(false)}></div>
          <div className="relative glass p-8 rounded-[2.5rem] w-full max-w-lg animate-in zoom-in duration-200 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
              <div className="bg-emerald-500 text-white rounded-xl p-2">
                <Plus size={24} />
              </div>
              New Entry
            </h2>
            <form onSubmit={handleAddTx} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTxForm({...txForm, type: 'Income', amount: '500', category: 'Subscription'})} className={`py-3 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${txForm.type === 'Income' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Collection</button>
                <button type="button" onClick={() => setTxForm({...txForm, type: 'Expense', amount: '', category: 'General'})} className={`py-3 rounded-2xl border-2 font-black uppercase text-[9px] transition-all ${txForm.type === 'Expense' ? 'bg-rose-500 border-rose-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Expense</button>
                <button type="button" onClick={() => setTxForm({...txForm, type: 'Investment', amount: '', category: 'Business'})} className={`py-3 rounded-2xl border-2 font-black uppercase text-[9px] transition-all col-span-2 ${txForm.type === 'Investment' ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Business Re-Investment</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Name</label>
                  {txForm.type === 'Income' ? (
                    <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white text-xs" value={txForm.memberName} onChange={e => setTxForm({...txForm, memberName: e.target.value})}>
                      {config.members.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none" placeholder="Description" value={txForm.memberName} onChange={e => setTxForm({...txForm, memberName: e.target.value})} />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Method</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white text-xs" value={txForm.paymentMethod} onChange={e => setTxForm({...txForm, paymentMethod: e.target.value as PaymentMethod})}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Amount (৳)</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black text-xs" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</label>
                  <input type="date" className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white text-xs" value={txForm.date} onChange={e => {
                    const d = new Date(e.target.value);
                    setTxForm({...txForm, date: e.target.value, month: MONTHS[d.getMonth()], year: d.getFullYear().toString()});
                  }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Month</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white text-xs" value={txForm.month} onChange={e => setTxForm({...txForm, month: e.target.value})}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Year</label>
                   <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white text-xs" value={txForm.year} onChange={e => setTxForm({...txForm, year: e.target.value})}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddingTx(false)} className="flex-1 py-4 glass-card text-slate-400 rounded-xl font-black uppercase text-[10px]">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] transition-all">Submit Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Filter Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsReportOpen(false)}></div>
          <div className="relative glass p-8 rounded-[2.5rem] w-full max-w-md animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3 tracking-tighter">
              <FileText className="text-emerald-400" /> Monthly Audit
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Month</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-xs" value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: e.target.value})}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Year</label>
                  <select className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-xs" value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: e.target.value})}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase mb-3 text-slate-500">
                    <span>Records Found</span>
                    <span className="text-emerald-400">{reportTransactions.length} Entries</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-black text-white">
                    <span>Monthly Surplus</span>
                    <span className="text-emerald-400">৳ {(reportTransactions.filter(t => t.type === 'Income').reduce((s,t) => s+t.amount, 0) - reportTransactions.filter(t => t.type === 'Expense' || t.type === 'Investment').reduce((s,t) => s+t.amount, 0)).toLocaleString()}</span>
                 </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsReportOpen(false)} className="flex-1 py-4 glass-card text-slate-400 rounded-xl font-black uppercase text-[10px]">Close</button>
                <button 
                  onClick={printReport}
                  disabled={reportTransactions.length === 0}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  <Printer size={16} /> Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Settings (Management) */}
      {isManagementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsManagementOpen(false)}></div>
          <div className="relative glass p-8 rounded-[2.5rem] w-full max-w-3xl overflow-y-auto max-h-[90vh] shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black logo-gradient tracking-tighter flex items-center gap-3 uppercase">
                <Settings className="text-blue-400" /> Admin
              </h2>
              <button onClick={() => setIsManagementOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            
            <section className="mb-8 p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Cloud Synchronization</h3>
              <input 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-xs text-blue-300 outline-none" 
                placeholder="Google Drive Link"
                value={config.googleDriveLink}
                onChange={e => setConfig({...config, googleDriveLink: e.target.value})}
              />
            </section>

            <section className="mb-8 p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-4">Member Directory</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {config.members.map((m, i) => (
                  <input key={i} className="bg-black/20 border border-white/5 rounded-lg px-2 py-2 text-[10px] text-slate-300" value={m} onChange={e => {
                    const newM = [...config.members];
                    newM[i] = e.target.value;
                    setConfig({...config, members: newM});
                  }} />
                ))}
              </div>
            </section>

            <section className="p-6 rounded-3xl bg-white/5 border border-white/10">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">System Users</h3>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-3 glass-card rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[8px] font-black">{u.role[0]}</div>
                      <span className="text-xs font-bold">{u.name} <span className="text-slate-600 font-medium">@{u.username}</span></span>
                    </div>
                    {u.username !== 'support' && (
                      <button onClick={() => setUsers(users.filter(usr => usr.id !== u.id))} className="text-rose-500 hover:text-rose-400"><Trash2 size={14}/></button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const name = prompt('Name:');
                    const user = prompt('Username:');
                    const pass = prompt('Password:');
                    const role = prompt('Role (ADMIN/CO_AUDITOR/CUSTOMER):') as Role;
                    if (name && user && pass && role) setUsers([...users, { id: crypto.randomUUID(), name, username: user, password: pass, role }]);
                  }}
                  className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white mt-4"
                >
                  + Create User Account
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Floating Unity Chat */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 h-[500px] glass rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom no-print">
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
            <div className="flex items-center gap-3">
               <MessageSquare size={16} className="text-emerald-400" />
               <span className="font-black text-[10px] uppercase tracking-widest">Unity Chat</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === currentUser.name ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] font-black text-slate-500 mb-1">{msg.sender}</span>
                <div className={`px-4 py-2.5 rounded-2xl text-[11px] max-w-[90%] ${msg.sender === currentUser.name ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-200 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChatMessage} className="p-4 border-t border-white/10 flex gap-2">
            <input className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white" placeholder="Message..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
            <button className="p-3 bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-600/20"><Send size={14} /></button>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
