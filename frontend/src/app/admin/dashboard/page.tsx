"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, ShieldCheck, Activity, Users, DollarSign, Search,
  CheckCircle, ShieldAlert, CreditCard, X, ChevronRight,
  Landmark, Clock, XCircle
} from "lucide-react";

type AdminStats = {
  total_bank_liquidity: string;
  total_active_customers: number;
  pending_kyc_count: number;
  total_transaction_volume: string;
};
type Customer = {
  customer_id: number; name: string; email: string;
  phone: string; kyc_status: string; total_balance: string;
};
type CardRequest = {
  request_id: number; card_number: string; card_type: string;
  card_network: string; expiry_date: string; status: string;
  admin_note: string | null; requested_at: string;
  account_number: string; customer_name: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats]               = useState<AdminStats | null>(null);
  const [customers, setCustomers]       = useState<Customer[]>([]);
  const [locks, setLocks]               = useState<any[]>([]);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [employees, setEmployees]       = useState<any[]>([]);
  const [cardRequests, setCardRequests] = useState<CardRequest[]>([]);
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeTab, setActiveTab]       = useState<"customers"|"security"|"loans"|"cards"|"employees">("customers");
  const [loading, setLoading]           = useState(true);
  const [rejectNote, setRejectNote]     = useState<Record<number, string>>({});
  const [rejectOpen, setRejectOpen]     = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchAdminData = useCallback(async () => {
    try {
      const [statsR, custR, lockR, loanR, empR, cardReqR] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/admin/stats"),
        fetch("http://127.0.0.1:8000/api/admin/customers"),
        fetch("http://127.0.0.1:8000/api/admin/security"),
        fetch("http://127.0.0.1:8000/api/admin/loans/pending"),
        fetch("http://127.0.0.1:8000/api/admin/employees"),
        fetch("http://127.0.0.1:8000/api/admin/card-requests"),
      ]);
      const [sd, cd, ld, lnd, ed, crd] = await Promise.all([
        statsR.json(), custR.json(), lockR.json(), loanR.json(), empR.json(), cardReqR.json()
      ]);
      if (sd.stats) setStats(sd.stats);
      if (cd.customers) setCustomers(cd.customers);
      if (ld.locks) setLocks(ld.locks);
      if (lnd.pending_loans) setPendingLoans(lnd.pending_loans);
      if (ed.employees) setEmployees(ed.employees);
      if (crd.card_requests) setCardRequests(crd.card_requests);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  const handleLogout = () => { localStorage.clear(); router.push("/"); };

  const approveKYC = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/admin/kyc/${id}`, { method: "PUT" });
    fetchAdminData();
  };
  const unlockUser = async (username: string) => {
    await fetch(`http://127.0.0.1:8000/api/admin/security/unlock/${username}`, { method: "PUT" });
    fetchAdminData();
  };
  const approveLoan = async (id: number) => {
    setActionLoading(id);
    await fetch(`http://127.0.0.1:8000/api/admin/loans/approve/${id}`, { method: "PUT" });
    fetchAdminData();
    setActionLoading(null);
  };
  const approveCard = async (id: number) => {
    setActionLoading(id);
    await fetch(`http://127.0.0.1:8000/api/admin/card-requests/approve/${id}`, { method: "PUT" });
    fetchAdminData();
    setActionLoading(null);
  };
  const rejectCard = async (id: number) => {
    setActionLoading(id);
    await fetch(`http://127.0.0.1:8000/api/admin/card-requests/reject/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_note: rejectNote[id] || "Request rejected by admin." }),
    });
    setRejectOpen(null);
    fetchAdminData();
    setActionLoading(null);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCardReqs = cardRequests.filter(r => r.status === "Pending");

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
    </div>
  );

  const TABS: { id: "customers"|"security"|"loans"|"cards"|"employees"; label: string; count?: number }[] = [
    { id: "customers",  label: "KYC & Customer DB" },
    { id: "security",   label: "Security & Locks",    count: locks.length },
    { id: "loans",      label: "Loan Approvals",      count: pendingLoans.length },
    { id: "cards",      label: "Card Requests",        count: pendingCardReqs.length },
    { id: "employees",  label: "Employees",            count: employees.length },
  ];

  return (
    <div className="min-h-screen pb-12 bg-[#0b0f19]">
      {/* Admin Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Nexus Bank</p>
                <p className="text-indigo-400/80 text-[9px] leading-none font-semibold tracking-widest uppercase">Admin Operations</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Liquidity",    value: `₹${parseFloat(stats?.total_bank_liquidity||"0").toLocaleString("en-IN")}`, icon: <DollarSign className="w-5 h-5"/>, color: "emerald" },
            { label: "Active Customers",   value: stats?.total_active_customers || 0,                                          icon: <Users className="w-5 h-5"/>,      color: "indigo"  },
            { label: "KYC Backlog",        value: stats?.pending_kyc_count || 0,                                               icon: <ShieldAlert className="w-5 h-5"/>, color: "amber"  },
            { label: "Card Requests",      value: pendingCardReqs.length,                                                      icon: <CreditCard className="w-5 h-5"/>, color: "purple" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`glass-card p-5 border-l-2 border-l-${color}-500/60`}>
              <div className={`flex items-center gap-2 text-${color}-400 mb-3`}>{icon}
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{label}</span>
              </div>
              <p className="text-white font-bold text-xl leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-800 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition relative ${
                activeTab === tab.id ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500"
                }`}>{tab.count}</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: KYC & Customers */}
        {activeTab === "customers" && (
          <div className="glass-card overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Global Customer Database</h2>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input type="text" placeholder="Search by name or email…"
                  className="w-full bg-slate-800/80 border border-slate-700 text-sm text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Contact</th>
                    <th className="p-4 font-medium text-right">Balance</th>
                    <th className="p-4 font-medium text-center">KYC</th>
                    <th className="p-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredCustomers.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No customers found.</td></tr>
                  ) : filteredCustomers.map(c => (
                    <tr key={c.customer_id} className="hover:bg-slate-800/20 transition">
                      <td className="p-4 font-mono text-slate-500 text-sm">#{c.customer_id}</td>
                      <td className="p-4">
                        <p className="text-slate-200 font-semibold">{c.name}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-400 text-sm">{c.email}</p>
                        <p className="text-slate-500 text-xs font-mono mt-0.5">{c.phone}</p>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-200 text-sm">
                        ₹{parseFloat(c.total_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        {c.kyc_status === "Verified" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3"/>Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <ShieldAlert className="w-3 h-3"/>Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {c.kyc_status === "Pending" ? (
                          <button onClick={() => approveKYC(c.customer_id)}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-500/20">
                            Approve KYC
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No Action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Security */}
        {activeTab === "security" && (
          <div className="glass-card overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Security & Account Locks</h2>
              <p className="text-slate-500 text-sm mt-0.5">Manage brute-force lockouts and account deactivations</p>
            </div>
            <div className="p-5">
              {locks.length === 0 ? (
                <div className="text-center py-10">
                  <ShieldCheck className="w-10 h-10 text-emerald-500/30 mx-auto mb-3"/>
                  <p className="text-slate-500 text-sm">No active locks or suspended accounts.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {locks.map(lock => (
                    <div key={lock.login_id} className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                          {lock.username?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-200">{lock.username}</p>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                              lock.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>{lock.is_active ? "Active" : "Deactivated"}</span>
                          </div>
                          <p className="text-xs text-red-400 mt-0.5">
                            {lock.failed_attempts} failed attempts
                            {lock.locked_until ? ` · Locked until ${new Date(lock.locked_until).toLocaleString("en-IN")}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => unlockUser(lock.username)}
                          className="text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                          Force Unlock
                        </button>
                        <button
                          onClick={async () => { await fetch(`http://127.0.0.1:8000/api/admin/login/toggle/${lock.login_id}`,{method:"PUT"}); fetchAdminData(); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            lock.is_active ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          }`}>
                          {lock.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Loan Approvals */}
        {activeTab === "loans" && (
          <div className="glass-card overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Loan Approval Queue</h2>
              <p className="text-slate-500 text-sm mt-0.5">Review and approve pending loan applications</p>
            </div>
            <div className="p-5">
              {pendingLoans.length === 0 ? (
                <div className="text-center py-10">
                  <Landmark className="w-10 h-10 text-emerald-500/30 mx-auto mb-3"/>
                  <p className="text-slate-500 text-sm">No pending loan applications.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingLoans.map(loan => (
                    <div key={loan.loan_id} className="p-5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                              Pending Approval
                            </span>
                            <span className="text-xs text-slate-500 font-mono">Loan #{loan.loan_id}</span>
                          </div>
                          <p className="text-2xl font-bold text-white">
                            ₹{parseFloat(loan.total_amount).toLocaleString("en-IN")}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-400">
                            <span>Account ID: <span className="text-slate-300 font-mono">{loan.account_id}</span></span>
                            <span>EMI: <span className="text-slate-300 font-mono">₹{parseFloat(loan.emi_amount).toLocaleString("en-IN")}</span></span>
                            {loan.loan_type && <span>Type: <span className="text-slate-300 capitalize">{loan.loan_type}</span></span>}
                            {loan.interest_rate && <span>Rate: <span className="text-slate-300">{loan.interest_rate}% p.a.</span></span>}
                            {loan.tenure_months && <span>Tenure: <span className="text-slate-300">{loan.tenure_months} months</span></span>}
                          </div>
                        </div>
                        <button
                          onClick={() => approveLoan(loan.loan_id)}
                          disabled={actionLoading === loan.loan_id}
                          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4"/>
                          {actionLoading === loan.loan_id ? "Approving…" : "Approve Loan"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Card Requests — NEW */}
        {activeTab === "cards" && (
          <div className="glass-card overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Card Link Requests</h2>
                <p className="text-slate-500 text-sm mt-0.5">Review card verification requests from customers</p>
              </div>
              {pendingCardReqs.length > 0 && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-3 py-1 rounded-full">
                  {pendingCardReqs.length} Pending
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-800/60">
              {cardRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
                  <p className="text-slate-500 text-sm">No card link requests found.</p>
                </div>
              ) : cardRequests.map(req => {
                const isPending  = req.status === "Pending";
                const isApproved = req.status === "Approved";
                const statusStyle = isApproved
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : req.status === "Rejected"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20";
                return (
                  <div key={req.request_id} className="p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      {/* Card visual mini */}
                      <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-slate-400"/>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-200 font-mono tracking-wider text-sm">
                            •••• •••• •••• {req.card_number.slice(-4)}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                          <span>{req.customer_name}</span>
                          <span className="font-mono">{req.account_number}</span>
                          <span className="capitalize">{req.card_network} · {req.card_type}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{new Date(req.requested_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>
                        </div>
                        {req.admin_note && (
                          <p className="text-[11px] text-red-400">Note: {req.admin_note}</p>
                        )}
                      </div>
                      {/* Actions — only for pending */}
                      {isPending && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => approveCard(req.request_id)}
                            disabled={actionLoading === req.request_id}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5"/>
                            {actionLoading === req.request_id ? "Approving…" : "Approve"}
                          </button>
                          <button
                            onClick={() => setRejectOpen(req.request_id === rejectOpen ? null : req.request_id)}
                            className="text-red-400 border border-red-500/30 hover:bg-red-500/10 px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5"/> Reject
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Inline reject form */}
                    {isPending && rejectOpen === req.request_id && (
                      <div className="mt-3 ml-16 flex gap-2 items-center animate-in slide-in-from-top-2 duration-150">
                        <input
                          type="text"
                          placeholder="Rejection reason (optional)…"
                          value={rejectNote[req.request_id] || ""}
                          onChange={e => setRejectNote(p => ({ ...p, [req.request_id]: e.target.value }))}
                          className="flex-1 bg-slate-800 border border-slate-700 text-sm text-white px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-slate-600"
                        />
                        <button
                          onClick={() => rejectCard(req.request_id)}
                          disabled={actionLoading === req.request_id}
                          className="bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          {actionLoading === req.request_id ? "Rejecting…" : "Confirm Reject"}
                        </button>
                        <button onClick={() => setRejectOpen(null)} className="p-1.5 text-slate-500 hover:text-slate-300">
                          <X className="w-4 h-4"/>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Employees */}
        {activeTab === "employees" && (
          <div className="glass-card overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Employee Directory</h2>
              <p className="text-slate-500 text-sm mt-0.5">{employees.length} staff members on record</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Contact</th>
                    <th className="p-4 font-medium">Department</th>
                    <th className="p-4 font-medium">Hire Date</th>
                    <th className="p-4 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {employees.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No employees found.</td></tr>
                  ) : employees.map(emp => (
                    <tr key={emp.employee_id} className="hover:bg-slate-800/20 transition">
                      <td className="p-4">
                        <p className="text-slate-200 font-semibold">{emp.full_name}</p>
                        {emp.username && <p className="text-slate-500 text-xs font-mono">@{emp.username}</p>}
                      </td>
                      <td className="p-4">
                        <p className="text-slate-400 text-sm">{emp.email}</p>
                        <p className="text-slate-500 text-xs font-mono">{emp.phone}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">{emp.department}</span>
                      </td>
                      <td className="p-4 text-slate-400 text-sm">{emp.hire_date || "—"}</td>
                      <td className="p-4 text-center">
                        {emp.is_active != null ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            emp.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>{emp.is_active ? "Active" : "Inactive"}</span>
                        ) : <span className="text-slate-600 text-xs">No Login</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
