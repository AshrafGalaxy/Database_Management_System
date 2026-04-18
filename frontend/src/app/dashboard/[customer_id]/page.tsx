"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, CreditCard,
  RefreshCcw, AlertTriangle, ShieldCheck, ShieldAlert,
  Building, Users, Activity, ListOrdered, CalendarClock,
  Eye, EyeOff, Search, X, TrendingUp, Repeat2, ChevronRight
} from "lucide-react";
import ActionModal from "@/components/ActionModal";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import ScheduledPayments from "@/components/ScheduledPayments";
import { useMasking } from "@/context/MaskingContext";


// ─── Types ────────────────────────────────────────────────────────────────────
type Account = {
  account_number: string;
  account_type: string;
  account_category: string;
  current_balance: string;
  min_balance: string;
  overdraft_limit: string;
  customer_name: string;
  account_status: string;
  kyc_status: string;
  branch_name: string;
  branch_city: string;
  ifsc_code: string;
  member_since: string;
  customer_since: string;
  address: string;
  date_of_birth: string;
  phone: string;
  total_transactions: number;
  last_transaction_date: string;
};

type Transaction = {
  transaction_id: number;
  transaction_type: string;
  transaction_channel: string;
  amount: string;
  balance_after: string;
  status: string;
  transaction_date: string;
  description: string;
};

type Card = {
  card_id: number;
  card_number: string;
  card_type: string;
  card_network: string;
  expiry_date: string;
  issued_at: string;
  is_active: number;
  international_enabled: number;
  atm_limit: string;
  pos_limit: string;
};

type Nominee = {
  nominee_id: number;
  nominee_name: string;
  relationship: string;
  age: number;
};

type AccountTypeTab = "all" | "savings" | "current" | "fixed";
type DashSection = "transactions" | "analytics" | "scheduled";

type Beneficiary = {
  beneficiary_id: number;
  payee_account_number: string;
  nickname: string;
  added_at: string;
  penny_drop_verified: boolean;
  cooling_period_active: boolean;
  hours_since_added: number;
  first_name?: string;
  last_name?: string;
};



// ─── Account Card Component ───────────────────────────────────────────────────
function AccountCard({ acc, isActive, onClick }: { acc: Account; isActive: boolean; onClick: () => void }) {
  const { isMasked, maskValue, toggleMask } = useMasking();

  const accentColor = acc.account_type === "savings" ? "emerald" : acc.account_type === "current" ? "blue" : "amber";
  const accentMap: Record<string, string> = {
    emerald: "ring-emerald-500 shadow-emerald-500/10",
    blue: "ring-blue-500 shadow-blue-500/10",
    amber: "ring-amber-500 shadow-amber-500/10",
  };
  const badgeMap: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-400",
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 cursor-pointer transition-all duration-300 relative overflow-hidden ${
        isActive ? `ring-2 ${accentMap[accentColor]} shadow-xl transform -translate-y-1 bg-slate-800/80` : "hover:bg-slate-800/60"
      }`}
    >
      {/* Type badge + category */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeMap[accentColor]}`}>
            {acc.account_type === "fixed" ? "Fixed Deposit" : `${acc.account_type} A/C`}
          </span>
          {acc.account_category && acc.account_category !== "standard" && (
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              {acc.account_category}
            </span>
          )}
          <p className="font-mono text-slate-400 text-xs mt-1 flex items-center gap-1">
            {maskValue(acc.account_number, 4)}
            <button
              onClick={(e) => { e.stopPropagation(); toggleMask(); }}
              className="ml-1 text-slate-600 hover:text-slate-300 transition"
            >
              {isMasked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-bold ${acc.account_status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {acc.account_status}
        </span>
      </div>

      {/* Balance */}
      <div>
        <p className="text-slate-500 text-xs mb-0.5">Available Balance</p>
        <p className="text-2xl font-bold text-white tracking-tight">
          {isMasked
            ? "₹ ••••••"
            : `₹${parseFloat(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        </p>
        {acc.account_type === "current" && parseFloat(acc.overdraft_limit) > 0 && (
          <p className="text-[10px] text-blue-400/70 mt-0.5">OD Limit: ₹{parseFloat(acc.overdraft_limit).toLocaleString("en-IN")}</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-700/40 flex justify-between items-center text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><Building className="w-3 h-3" />{acc.branch_name}{acc.branch_city ? `, ${acc.branch_city}` : ""}</span>
        <span>{acc.total_transactions} txns</span>
      </div>
      {acc.member_since && (
        <p className="text-[10px] text-slate-600 mt-1">Opened: {new Date(acc.member_since).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const customerId = params.customer_id as string;
  const urlSection = searchParams.get("section") as DashSection | null;
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTxns, setFilteredTxns] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [txnSearch, setTxnSearch] = useState("");
  const [accountTypeTab, setAccountTypeTab] = useState<AccountTypeTab>("all");
  const [repeatTxn, setRepeatTxn] = useState<{ amount: number } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"deposit" | "withdraw" | "transfer" | null>(null);
  const [activeSection, setActiveSection] = useState<DashSection>(urlSection || "transactions");

  useEffect(() => {
    if (urlSection && urlSection !== activeSection) {
      setActiveSection(urlSection);
    }
  }, [urlSection]);
  const [snapshots, setSnapshots] = useState<{snapshot_date:string;closing_balance:string}[]>([]);
  const [profile, setProfile] = useState<{address:string;date_of_birth:string;phone:string;customer_since:string;account_types:string}|null>(null);


  const [backendError, setBackendError] = useState(false);
  const [username, setUsername] = useState("User");
  const [lastLoginDisplay, setLastLoginDisplay] = useState("—");

  // Read localStorage only on client (avoids SSR hydration mismatch)
  useEffect(() => {
    setUsername(localStorage.getItem("username") || "User");
    const raw = localStorage.getItem("last_login");
    setLastLoginDisplay(raw
      ? new Date(raw).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "First login"
    );
  }, []);

  const fetchDashboard = useCallback(async () => {
    setBackendError(false);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/dashboard/${customerId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.accounts?.length) {
        setAccounts(data.accounts);
        setActiveAccount((prev) => {
          const updated = data.accounts.find((a: Account) => a.account_number === prev?.account_number);
          return updated || data.accounts[0];
        });
      }
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setBackendError(true);
    }
  }, [customerId]);

  const fetchTransactions = useCallback(async (accountNumber: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/transactions/${accountNumber}`);
      const data = await res.json();
      if (data.transactions) {
        setTransactions(data.transactions);
        setFilteredTxns(data.transactions);
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchCards = useCallback(async (accountNumber: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cards/${accountNumber}`);
      const data = await res.json();
      if (data.cards) setCards(data.cards);
    } catch (err) { console.error(err); }
  }, []);

  const fetchNominees = useCallback(async (accountNumber: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/nominees/${accountNumber}`);
      const data = await res.json();
      if (data.nominees) setNominees(data.nominees);
    } catch (err) { console.error(err); }
  }, []);

  const fetchBeneficiaries = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/beneficiaries/${customerId}`);
      const data = await res.json();
      if (data.beneficiaries) setBeneficiaries(data.beneficiaries);
    } catch (err) { console.error(err); }
  }, [customerId]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/profile/${customerId}`);
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
    } catch (err) { console.error(err); }
  }, [customerId]);

  const fetchSnapshots = useCallback(async (accountNumber: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/snapshots/${accountNumber}`);
      const data = await res.json();
      if (data.snapshots) setSnapshots(data.snapshots);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboard().finally(() => setLoading(false));
  }, [customerId, fetchDashboard]);

  useEffect(() => {
    if (activeAccount) {
      fetchTransactions(activeAccount.account_number);
      fetchCards(activeAccount.account_number);
      fetchNominees(activeAccount.account_number);
      fetchSnapshots(activeAccount.account_number);
    }
  }, [activeAccount, fetchTransactions, fetchCards, fetchNominees, fetchSnapshots]);

  useEffect(() => {
    fetchBeneficiaries();
    fetchProfile();
  }, [fetchBeneficiaries, fetchProfile]);

  // Live search filter
  useEffect(() => {
    if (!txnSearch.trim()) {
      setFilteredTxns(transactions);
    } else {
      const q = txnSearch.toLowerCase();
      setFilteredTxns(
        transactions.filter(
          (t) =>
            t.description?.toLowerCase().includes(q) ||
            t.transaction_type.toLowerCase().includes(q) ||
            t.transaction_channel?.toLowerCase().includes(q) ||
            t.status.toLowerCase().includes(q)
        )
      );
    }
  }, [txnSearch, transactions]);

  const filteredAccounts = accountTypeTab === "all"
    ? accounts
    : accounts.filter((a) => a.account_type === accountTypeTab);

  const displayedActiveAccount = filteredAccounts.find(a => a.account_number === activeAccount?.account_number)
    ?? filteredAccounts[0] ?? null;

  const customerName = accounts[0]?.customer_name || "Customer";
  const kycStatus = accounts[0]?.kyc_status || "Pending";

  const openActionModal = (type: "deposit" | "withdraw" | "transfer") => {
    setActionType(type);
    setModalOpen(true);
  };

  const loadData = async () => {
    await fetchDashboard();
    await fetchBeneficiaries();
    await fetchProfile();
    if (activeAccount) {
      await fetchTransactions(activeAccount.account_number);
      await fetchCards(activeAccount.account_number);
      await fetchNominees(activeAccount.account_number);
      await fetchSnapshots(activeAccount.account_number);
    }
  };

  const handleRepeatTxn = (t: Transaction) => {
    setRepeatTxn({ amount: parseFloat(t.amount) });
    setActionType("transfer");
    setModalOpen(true);
  };

  if (backendError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="glass-card p-8 max-w-md w-full mx-4 text-center border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-slate-400 text-sm mb-6">Unable to connect to the banking servers. Please ensure the backend is running and try again.</p>
          <button onClick={() => { setBackendError(false); setLoading(true); fetchDashboard().finally(() => setLoading(false)); }} className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition shadow-lg shadow-red-500/20">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading && !accounts.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
          <p className="text-slate-500 text-sm">Loading your accounts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] pb-16">
      {/* ── Breadcrumb Bar ── */}
      <div className="bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="text-slate-500 font-medium">Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300 font-semibold capitalize">
            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ── Greeting & KYC Strip ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, {customerName.split(" ")[0]} 👋</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Last login: <span className="text-slate-400">{lastLoginDisplay}</span>
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${kycStatus === "Verified" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
            {kycStatus === "Verified" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            KYC {kycStatus}
          </div>
        </div>

        {/* ── Low Balance / AMB Alert ── */}
        {activeAccount?.account_type === "savings" && (() => {
          const bal    = parseFloat(activeAccount.current_balance);
          const minBal = parseFloat(activeAccount.min_balance);
          if (bal >= minBal) return null;

          const isAtZero = bal <= 0;

          return (
            <div className={`border rounded-xl p-4 flex items-start gap-3 ${
              isAtZero
                ? "bg-red-500/5 border-red-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            }`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isAtZero ? "text-red-400" : "text-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${isAtZero ? "text-red-400" : "text-amber-400"}`}>
                  {isAtZero ? "Balance at ₹0 — Penalties Suspended" : "Low Balance — AMB Penalty Alert"}
                </p>
                {isAtZero ? (
                  <p className="text-red-500/70 text-xs mt-1 leading-relaxed">
                    Your account balance is <strong className="text-red-400">₹0</strong>. Per RBI guidelines, no further penalty
                    deductions are possible on a zero-balance savings account. Deposit funds to resume normal operation.
                  </p>
                ) : (
                  <p className="text-amber-500/70 text-xs mt-1 leading-relaxed">
                    Current balance{" "}
                    <strong className="text-amber-400">₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>{" "}
                    is below the minimum required balance of{" "}
                    <strong className="text-amber-300">₹{minBal.toLocaleString("en-IN")}</strong>.{" "}
                    A <strong className="text-amber-400">₹200 AMB penalty</strong> will be assessed at the end of this billing
                    cycle based on your Average Monthly Balance. No immediate deduction is applied.
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAtZero ? "bg-red-500" : "bg-amber-500"}`} />
                  RBI/NPCI Savings Account Protection Active
                </div>
              </div>
            </div>
          );
        })()}


        {/* ── Account Type Tabs ── */}
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["all", "savings", "current", "fixed"] as AccountTypeTab[]).map((tab) => {
              const count = tab === "all" ? accounts.length : accounts.filter(a => a.account_type === tab).length;
              if (tab !== "all" && count === 0) return null;
              return (
                <button
                  key={tab}
                  onClick={() => setAccountTypeTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    accountTypeTab === tab
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {tab === "all" ? "All Accounts" : tab === "fixed" ? "Fixed Deposits" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${accountTypeTab === tab ? "bg-white/20" : "bg-slate-700"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAccounts.map((acc) => (
              <AccountCard
                key={acc.account_number}
                acc={acc}
                isActive={activeAccount?.account_number === acc.account_number}
                onClick={() => setActiveAccount(acc)}
              />
            ))}
          </div>
        </div>

        {/* ── KPI Summary Strip (HDFC-style) ── */}
        {activeAccount && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Available Balance",
                value: `₹${parseFloat(activeAccount.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                sub: `Min Balance: ₹${parseFloat(activeAccount.min_balance).toLocaleString("en-IN")}`,
                accent: "emerald",
                icon: <TrendingUp className="w-5 h-5" />,
              },
              {
                label: "Total Transactions",
                value: activeAccount.total_transactions,
                sub: activeAccount.last_transaction_date ? `Last: ${new Date(activeAccount.last_transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : "No transactions yet",
                accent: "blue",
                icon: <Activity className="w-5 h-5" />,
              },
              {
                label: "Branch",
                value: activeAccount.branch_name,
                sub: `IFSC: ${activeAccount.ifsc_code}`,
                accent: "indigo",
                icon: <Building className="w-5 h-5" />,
              },
              {
                label: "Cards Linked",
                value: cards.length,
                sub: cards.filter(c => c.is_active).length + " active",
                accent: "purple",
                icon: <CreditCard className="w-5 h-5" />,
              },
            ].map(({ label, value, sub, accent, icon }) => (
              <div key={label} className={`glass-card p-5 border-l-2 border-l-${accent}-500/50`}>
                <div className={`flex items-center gap-2 text-${accent}-400 mb-3`}>
                  {icon}
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{label}</span>
                </div>
                <p className="text-white font-bold text-lg leading-tight truncate">{value}</p>
                <p className="text-slate-600 text-[11px] mt-1 truncate">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Main Content Grid ── */}
        {activeAccount && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column ── */}
            <div className="space-y-4">

              {/* Quick Actions — HDFC style prominent tile */}
              <div className="glass-card p-5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Deposit", type: "deposit" as const, icon: <ArrowDownCircle className="w-6 h-6" />, color: "emerald" },
                    { label: "Withdraw", type: "withdraw" as const, icon: <ArrowUpCircle className="w-6 h-6" />, color: "red" },
                    { label: "Transfer", type: "transfer" as const, icon: <ArrowRightLeft className="w-6 h-6" />, color: "indigo" },
                  ].map(({ label, type, icon, color }) => (
                    <button
                      key={type}
                      onClick={() => openActionModal(type)}
                      disabled={activeAccount.account_status !== "active"}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-${color}-500/10 hover:bg-${color}-500/20 border border-${color}-500/20 text-${color}-400 transition group disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="group-hover:scale-110 transition-transform">{icon}</span>
                      <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* My Cards Widget */}
              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-slate-200">My Cards</h3>
                    {cards.length > 0 && <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full font-bold">{cards.length}</span>}
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/${customerId}/cards`)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition flex items-center gap-1"
                  >
                    Manage <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {cards.length === 0 ? (
                    <div className="text-center py-4">
                      <CreditCard className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No cards linked.</p>
                      <button onClick={() => router.push(`/dashboard/${customerId}/cards`)} className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold">+ Link a Card</button>
                    </div>
                  ) : cards.slice(0, 2).map((card) => (
                    <div key={card.card_id} className={`p-3.5 rounded-xl border relative overflow-hidden ${card.is_active ? "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700" : "bg-slate-900/30 border-slate-800 opacity-60"}`}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{card.card_network}</span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${card.card_type === "credit" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-slate-700 text-slate-400 border-slate-600"}`}>{card.card_type}</span>
                        </div>
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold border ${card.is_active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}>
                          {card.is_active ? "Active" : "Blocked"}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-slate-300 tracking-widest">•••• •••• •••• {card.card_number.slice(-4)}</p>
                      <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                        <span>Exp: {new Date(card.expiry_date).toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" })}</span>
                        {!!card.international_enabled && <span className="text-blue-400">🌐 Intl On</span>}
                      </div>
                    </div>
                  ))}
                  {cards.length > 2 && <p className="text-center text-[10px] text-slate-600">+{cards.length - 2} more · <button onClick={() => router.push(`/dashboard/${customerId}/cards`)} className="text-emerald-500 hover:text-emerald-400">view all</button></p>}
                </div>
              </div>

              {/* Account Nominees Widget */}
              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-400" />
                    <h3 className="text-sm font-semibold text-slate-200">Account Nominees</h3>
                    {nominees.length > 0 && <span className="text-[9px] bg-teal-500/20 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-full font-bold">{nominees.length}</span>}
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/${customerId}/nominees`)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition flex items-center gap-1"
                  >
                    Manage <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {nominees.length === 0 ? (
                    <div className="text-center py-4">
                      <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No nominees registered.</p>
                      <button onClick={() => router.push(`/dashboard/${customerId}/nominees`)} className="mt-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold">+ Add Nominee</button>
                    </div>
                  ) : nominees.slice(0, 2).map((nom) => (
                    <div key={nom.nominee_id} className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-bold">{nom.nominee_name.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-200 leading-tight">{nom.nominee_name}</p>
                          <p className="text-[10px] text-slate-500">{nom.relationship} · {nom.age} yrs</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {nominees.length > 2 && <p className="text-center text-[10px] text-slate-600">+{nominees.length - 2} more</p>}
                </div>
              </div>

            </div>

            {/* ── Right Column: Tabs Panel ── */}
            <div className="lg:col-span-2 space-y-0">

              {/* AXIS/HDFC-style Tab Bar — bottom border indicator */}
              <div className="flex items-center border-b border-slate-800 mb-5">
                {[
                  { id: "transactions", icon: <ListOrdered className="w-4 h-4" />, label: "Transactions" },
                  { id: "analytics", icon: <Activity className="w-4 h-4" />, label: "Analytics" },
                  { id: "scheduled", icon: <CalendarClock className="w-4 h-4" />, label: "Scheduled" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id as DashSection)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${
                      activeSection === tab.id
                        ? "text-emerald-400"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tab.icon} {tab.label}
                    {activeSection === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Transaction Panel */}
              {activeSection === "transactions" && (
                <div className="glass-card overflow-hidden animate-in fade-in duration-300">
                  <div className="p-4 border-b border-slate-800 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search transactions…"
                        value={txnSearch}
                        onChange={(e) => setTxnSearch(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-sm text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
                      />
                      {txnSearch && (
                        <button onClick={() => setTxnSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => fetchTransactions(activeAccount.account_number)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                    </button>
                  </div>

                  {filteredTxns.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-sm">
                      {txnSearch ? `No results for "${txnSearch}"` : "No transactions found for this account."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="p-4 text-left font-medium">Details</th>
                            <th className="p-4 text-left font-medium">Channel</th>
                            <th className="p-4 text-right font-medium">Amount</th>
                            <th className="p-4 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {filteredTxns.map((t) => {
                            const isIn = t.transaction_type === "deposit" || t.transaction_type === "transfer_in";
                            const isOutgoing = t.transaction_type === "transfer_out";
                            return (
                              <tr key={t.transaction_id} className="hover:bg-slate-800/20 transition group">
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isIn ? "bg-emerald-500/10" : "bg-slate-700/50"}`}>
                                      {isIn ? <ArrowDownCircle className="w-4 h-4 text-emerald-400" /> : <ArrowUpCircle className="w-4 h-4 text-slate-400" />}
                                    </div>
                                    <div>
                                      <p className="text-slate-200 font-medium capitalize">{t.transaction_type.replace("_", " ")}</p>
                                      <p className="text-slate-500 text-xs truncate max-w-[170px]">{t.description}</p>
                                      <p className="text-slate-600 text-[10px]">{new Date(t.transaction_date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${t.transaction_channel === "System" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : t.transaction_channel === "RTGS" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                                    {t.transaction_channel || "UPI"}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className={`font-bold ${isIn ? "text-emerald-400" : "text-slate-200"}`}>
                                    {isIn ? "+" : "−"}₹{parseFloat(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </span>
                                  <p className="text-[10px] text-slate-600 mt-0.5">Bal: ₹{parseFloat(t.balance_after).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${t.status === "Success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : t.status === "Failed" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                      {t.status}
                                    </span>
                                    {isOutgoing && t.status === "Success" && (
                                      <button
                                        onClick={() => handleRepeatTxn(t)}
                                        title="Repeat transfer"
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-indigo-400 hover:bg-indigo-500/10 transition"
                                      >
                                        <Repeat2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredTxns.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-slate-800 flex justify-between items-center text-xs text-slate-600">
                      <span>Showing {filteredTxns.length} records</span>
                      <span>{activeAccount.account_number}</span>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "analytics" && (
                <AnalyticsPanel accountNumber={activeAccount.account_number} />
              )}

              {activeSection === "scheduled" && (
                <ScheduledPayments accountNumber={activeAccount.account_number} />
              )}

            </div>
          </div>
        )}
      </main>

      {/* ── Action Modal ── */}
      {activeAccount && (
        <ActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          actionType={actionType}
          accountNumber={activeAccount.account_number}
          activeAccount={activeAccount}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
