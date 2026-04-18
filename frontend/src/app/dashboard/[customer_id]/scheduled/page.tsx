"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useRouter, useParams } from "next/navigation";
import {
  CalendarClock, RefreshCcw, XCircle, Landmark, Plus, X,
  Clock, CheckCircle, AlertCircle, Ban, ChevronRight, ExternalLink
} from "lucide-react";

type Loan    = { loan_id: number; total_amount: string; emi_amount: string; remaining_amount: string; next_due_date: string; status: string; created_at: string };
type AutoPay = { autopay_id: number; merchant_name: string; amount: string; next_due_date: string; status: string; created_at: string };

// Today's date in YYYY-MM-DD for the min attribute on date inputs
const TODAY = new Date().toISOString().split("T")[0];

// Frequency options (for UX clarity — we store monthly by default)
const FREQ_OPTIONS = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"] as const;
type Freq = typeof FREQ_OPTIONS[number];

const FREQ_MONTHS: Record<Freq, number> = {
  Monthly: 1, Quarterly: 3, "Half-Yearly": 6, Yearly: 12,
};

const MERCHANT_ICONS: Record<string, string> = {
  Netflix: "🎬", Spotify: "🎵", Amazon: "📦", Gym: "💪",
  Insurance: "🛡️", Electricity: "⚡", Gas: "🔥", Water: "💧",
  Internet: "📡", Mobile: "📱",
};

function getMerchantIcon(name: string) {
  for (const [key, icon] of Object.entries(MERCHANT_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "🔄";
}

export default function ScheduledPage() {
  const { activeAccount }  = useDashboard();
  const params             = useParams();
  const router             = useRouter();
  const customerId         = params?.customer_id as string;

  const [loans, setLoans]       = useState<Loan[]>([]);
  const [autopays, setAutopays] = useState<AutoPay[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"loans" | "autopay">("loans");

  // AutoPay form
  const [showAPForm, setShowAPForm] = useState(false);
  const [merchant, setMerchant]     = useState("");
  const [subAmount, setSubAmount]   = useState("");
  const [subDate, setSubDate]       = useState("");
  const [subFreq, setSubFreq]       = useState<Freq>("Monthly");
  const [apError, setApError]       = useState("");
  const [apSaving, setApSaving]     = useState(false);

  const fetchAll = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const [lr, ar] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/loans/${activeAccount.account_number}`).then(r => r.json()),
        fetch(`http://127.0.0.1:8000/api/autopay/${activeAccount.account_number}`).then(r => r.json()),
      ]);
      setLoans(lr.loans || []);
      setAutopays(ar.autopays || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeAccount]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const cancelAutoPay = async (id: number, name: string) => {
    if (!confirm(`Cancel AutoPay for "${name}"? Future deductions will be stopped.`)) return;
    await fetch(`http://127.0.0.1:8000/api/autopay/cancel/${id}`, { method: "PUT" });
    fetchAll();
  };

  const handleCreateAutoPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setApError("");
    const amt = parseFloat(subAmount);
    if (!merchant.trim()) { setApError("Merchant name is required."); return; }
    if (!amt || amt < 1)  { setApError("Amount must be at least ₹1."); return; }
    if (!subDate)         { setApError("Please select a billing start date."); return; }
    if (subDate < TODAY)  { setApError("Billing date must be today or in the future."); return; }

    setApSaving(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/autopay/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: activeAccount?.account_number,
          merchant_name: merchant.trim(),
          amount: amt,
          next_due_date: subDate,
        }),
      });
      if (res.ok) {
        setShowAPForm(false);
        setMerchant(""); setSubAmount(""); setSubDate(""); setApError("");
        setSubFreq("Monthly");
        fetchAll();
      } else {
        const d = await res.json();
        setApError(d.detail || "Setup failed.");
      }
    } catch { setApError("Network error. Please try again."); }
    finally { setApSaving(false); }
  };

  const daysUntilDue = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

  const activeLoans   = loans.filter(l => l.status === "Active");
  const pendingLoans  = loans.filter(l => l.status === "Pending");
  const closedLoans   = loans.filter(l => l.status === "Closed" || l.status === "Rejected");
  const activeAP      = autopays.filter(a => a.status === "Active");
  const cancelledAP   = autopays.filter(a => a.status === "Cancelled");

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Scheduled Payments</h1>
            <p className="text-slate-500 text-sm">
              {activeAccount ? `Account: ${activeAccount.account_number}` : "Select an account"} · Manage Loan EMIs and AutoPay mandates.
            </p>
          </div>
          {tab === "autopay" && activeAccount && (
            <button
              onClick={() => { setShowAPForm(true); setApError(""); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-500/20 text-sm"
            >
              <Plus className="w-4 h-4" /> Add AutoPay
            </button>
          )}
          {tab === "loans" && (
            <button
              onClick={() => router.push(`/dashboard/${customerId}/loans`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm"
            >
              <ExternalLink className="w-4 h-4" /> Apply for Loan
            </button>
          )}
        </div>

        {/* AutoPay Add Modal */}
        {showAPForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-lg border-t-2 border-t-indigo-500 animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Set Up AutoPay Mandate</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Automatic recurring deduction from your account</p>
                  </div>
                  <button onClick={() => setShowAPForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateAutoPay} className="space-y-4">
                  {/* Merchant */}
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Merchant / Service Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Netflix, Spotify, Gym, Insurance…"
                      value={merchant}
                      onChange={e => setMerchant(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Deduction Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="199.00"
                        value={subAmount}
                        onChange={e => setSubAmount(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                        required
                      />
                    </div>
                    {/* Frequency */}
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Billing Frequency</label>
                      <select
                        value={subFreq}
                        onChange={e => setSubFreq(e.target.value as Freq)}
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* First Bill Date — enforced minimum = today */}
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-1.5 block">First Billing Date</label>
                    <input
                      type="date"
                      value={subDate}
                      min={TODAY}
                      onChange={e => {
                        if (e.target.value < TODAY) { setApError("Date cannot be in the past."); return; }
                        setApError("");
                        setSubDate(e.target.value);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                    <p className="text-[10px] text-slate-600 mt-1">Must be today or a future date</p>
                  </div>

                  {/* Summary preview */}
                  {subAmount && subDate && merchant && (
                    <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-sm">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2">AutoPay Summary</p>
                      <div className="flex justify-between text-slate-300">
                        <span>{getMerchantIcon(merchant)} {merchant}</span>
                        <span className="font-bold text-white">₹{parseFloat(subAmount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                        <span>{subFreq} deduction</span>
                        <span>Starts {new Date(subDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  )}

                  {apError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {apError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={apSaving}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold rounded-xl transition"
                  >
                    {apSaving ? "Setting up…" : "Confirm AutoPay Mandate"}
                  </button>
                  <p className="text-center text-[11px] text-slate-600">
                    You can cancel this mandate at any time from the AutoPay tab.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-1 mb-7 bg-slate-900 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab("loans")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "loans" ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-white"}`}
          >
            <Landmark className="w-4 h-4" /> Loan EMIs ({loans.length})
          </button>
          <button
            onClick={() => setTab("autopay")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "autopay" ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-white"}`}
          >
            <RefreshCcw className="w-4 h-4" /> AutoPay Mandates ({autopays.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : tab === "loans" ? (
          /* ── LOAN EMIs TAB ── */
          <div className="space-y-5">
            {/* Pending applications */}
            {pendingLoans.length > 0 && (
              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Applications</p>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {pendingLoans.map(l => (
                    <div key={l.loan_id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-200">Loan #{l.loan_id} · ₹{parseFloat(l.total_amount).toLocaleString("en-IN")}</p>
                        <p className="text-[11px] text-slate-500">EMI: ₹{parseFloat(l.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}/month · Applied {new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">Pending Review</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active loans */}
            {activeLoans.length === 0 && pendingLoans.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Landmark className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold mb-1">No Active Loans</p>
                <p className="text-slate-500 text-sm mb-5">Apply for a loan to view your EMI schedule here.</p>
                <button
                  onClick={() => router.push(`/dashboard/${customerId}/loans`)}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-sm transition"
                >
                  <ExternalLink className="w-4 h-4" /> Apply for a Loan
                </button>
              </div>
            ) : (
              activeLoans.map(l => {
                const paidPct = ((parseFloat(l.total_amount) - parseFloat(l.remaining_amount)) / parseFloat(l.total_amount)) * 100;
                const days    = daysUntilDue(l.next_due_date);
                const isOverdue = days < 0;
                const isUrgent  = !isOverdue && days <= 3;
                const isWarning = !isOverdue && !isUrgent && days <= 7;
                return (
                  <div key={l.loan_id} className="glass-card overflow-hidden">
                    <div className="p-5">
                      {/* Loan header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Loan #{l.loan_id}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                          </div>
                          <p className="text-xl font-bold text-white">
                            ₹{parseFloat(l.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            <span className="text-slate-500 text-sm font-normal"> / month EMI</span>
                          </p>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border ${
                          isOverdue  ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : isUrgent ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : isWarning? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          <CalendarClock className="w-3.5 h-3.5" />
                          {isOverdue ? "OVERDUE" : `Next EMI: ${new Date(l.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} (${days}d)`}
                        </div>
                      </div>

                      {/* 3 KPIs */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "Total Loan",   value: `₹${parseFloat(l.total_amount).toLocaleString("en-IN")}`,  color: "text-slate-200" },
                          { label: "Paid So Far",  value: `₹${(parseFloat(l.total_amount) - parseFloat(l.remaining_amount)).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`, color: "text-emerald-400" },
                          { label: "Outstanding",  value: `₹${parseFloat(l.remaining_amount).toLocaleString("en-IN")}`, color: "text-amber-400" },
                        ].map(kpi => (
                          <div key={kpi.label} className="bg-slate-800/50 rounded-xl p-3">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">{kpi.label}</p>
                            <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                          <span className="flex items-center gap-1.5"><RefreshCcw className="w-3 h-3" /> Monthly auto-deduction</span>
                          <span className="font-semibold text-white">{paidPct.toFixed(1)}% repaid</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-700"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                          <span>Deducted on {new Date(l.next_due_date).toLocaleDateString("en-IN", { day: "2-digit" })}th of each month</span>
                          <button
                            onClick={() => router.push(`/dashboard/${customerId}/loans`)}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                          >
                            View Schedule <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Closed/Rejected */}
            {closedLoans.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3">Closed & Rejected ({closedLoans.length})</p>
                <div className="space-y-2">
                  {closedLoans.map(l => (
                    <div key={l.loan_id} className="glass-card px-5 py-3.5 flex items-center gap-3 opacity-50">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-300">Loan #{l.loan_id} · ₹{parseFloat(l.total_amount).toLocaleString("en-IN")}</p>
                        <p className="text-[11px] text-slate-500">EMI ₹{parseFloat(l.emi_amount).toLocaleString("en-IN")}/mo</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        l.status === "Rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-slate-700 text-slate-400 border-slate-600"
                      }`}>{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── AUTOPAY MANDATES TAB ── */
          <div className="space-y-5">
            {activeAP.length === 0 && cancelledAP.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <RefreshCcw className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold mb-1">No AutoPay Mandates</p>
                <p className="text-slate-500 text-sm mb-5">Set up automatic recurring deductions for subscriptions, utilities and more.</p>
                <button
                  onClick={() => { setShowAPForm(true); setApError(""); }}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-sm transition"
                >
                  <Plus className="w-4 h-4" /> Add AutoPay Mandate
                </button>
              </div>
            ) : (
              <div>
                {activeAP.length > 0 && (
                  <div className="space-y-3">
                    {activeAP.map(ap => {
                      const days    = daysUntilDue(ap.next_due_date);
                      const isUrgent = days <= 3;
                      return (
                        <div key={ap.autopay_id} className="glass-card p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl flex-shrink-0">
                              {getMerchantIcon(ap.merchant_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-base font-bold text-slate-200">{ap.merchant_name}</p>
                                <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Active</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-sm font-bold text-white">₹{parseFloat(ap.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                <span className="text-[11px] text-slate-500">Monthly deduction</span>
                                <span className={`text-[11px] font-semibold flex items-center gap-1 ${isUrgent ? "text-red-400" : "text-slate-400"}`}>
                                  <CalendarClock className="w-3 h-3" />
                                  Next bill: {new Date(ap.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                  {days >= 0 ? ` (${days}d)` : " · Overdue"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-1">
                                Set up {new Date(ap.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · Auto-renews monthly
                              </p>
                            </div>
                            <button
                              onClick={() => cancelAutoPay(ap.autopay_id, ap.merchant_name)}
                              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs border border-red-500/20 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition flex-shrink-0"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {cancelledAP.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3">Cancelled Mandates ({cancelledAP.length})</p>
                    <div className="space-y-2">
                      {cancelledAP.map(ap => (
                        <div key={ap.autopay_id} className="glass-card px-5 py-3.5 flex items-center gap-3 opacity-50">
                          <span className="text-lg">{getMerchantIcon(ap.merchant_name)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-300">{ap.merchant_name}</p>
                            <p className="text-[11px] text-slate-500">₹{parseFloat(ap.amount).toLocaleString("en-IN")}/mo</p>
                          </div>
                          <span className="text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">Cancelled</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
