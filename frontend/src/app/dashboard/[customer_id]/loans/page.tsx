"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  BarChart3, ChevronDown, ChevronUp, Clock, CheckCircle,
  XCircle, Plus, X, Landmark, TrendingDown, CalendarCheck,
  IndianRupee, Percent, Timer, ArrowRight, AlertCircle
} from "lucide-react";

type Loan = {
  loan_id: number;
  total_amount: string;
  emi_amount: string;
  remaining_amount: string;
  next_due_date: string;
  status: "Pending" | "Active" | "Closed" | "Rejected";
  created_at: string;
};
type AmorRow = { installment: number; emi_amount: number; balance_after: number; status: string };

const LOAN_TYPES = [
  { id: "Personal",  label: "Personal Loan",   icon: "👤", rate: 12.5, desc: "Quick funds for personal needs" },
  { id: "Home",      label: "Home Loan",        icon: "🏠", rate: 8.5,  desc: "Finance your dream home" },
  { id: "Car",       label: "Car Loan",         icon: "🚗", rate: 9.0,  desc: "Drive home your new vehicle" },
  { id: "Education", label: "Education Loan",   icon: "🎓", rate: 7.5,  desc: "Invest in your future" },
  { id: "Business",  label: "Business Loan",    icon: "💼", rate: 14.0, desc: "Grow your enterprise" },
];

const TENURES = [
  { months: 12,  label: "1 Year"   },
  { months: 24,  label: "2 Years"  },
  { months: 36,  label: "3 Years"  },
  { months: 60,  label: "5 Years"  },
  { months: 84,  label: "7 Years"  },
  { months: 120, label: "10 Years" },
  { months: 180, label: "15 Years" },
  { months: 240, label: "20 Years" },
];

function calcEMI(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

export default function LoansPage() {
  const { activeAccount } = useDashboard();
  const [loans, setLoans]             = useState<Loan[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [schedules, setSchedules]     = useState<Record<number, AmorRow[]>>({});
  const [schedLoading, setSchedLoading] = useState<number | null>(null);

  // Apply form
  const [showApply, setShowApply]     = useState(false);
  const [step, setStep]               = useState<1 | 2>(1);   // 1=type select, 2=details form
  const [selectedType, setSelectedType] = useState(LOAN_TYPES[0]);
  const [amount, setAmount]           = useState("");
  const [tenure, setTenure]           = useState(36);
  const [rate, setRate]               = useState(LOAN_TYPES[0].rate);
  const [applying, setApplying]       = useState(false);
  const [applyError, setApplyError]   = useState("");
  const [applyResult, setApplyResult] = useState<{ emi: number; msg: string } | null>(null);

  const emi = amount && parseFloat(amount) > 0 ? calcEMI(parseFloat(amount), rate, tenure) : 0;
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - (parseFloat(amount) || 0);

  const fetchLoans = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/loans/${activeAccount.account_number}`);
      const data = await res.json();
      setLoans(data.loans || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeAccount]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const toggleSchedule = async (loan_id: number) => {
    if (expanded === loan_id) { setExpanded(null); return; }
    setExpanded(loan_id);
    if (schedules[loan_id]) return;
    setSchedLoading(loan_id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/loans/amortization/${loan_id}`);
      const data = await res.json();
      setSchedules(s => ({ ...s, [loan_id]: data.schedule || [] }));
    } catch (e) { console.error(e); }
    finally { setSchedLoading(null); }
  };

  const handleApply = async () => {
    setApplyError("");
    const amt = parseFloat(amount);
    if (!amt || amt < 10000) { setApplyError("Minimum loan amount is ₹10,000."); return; }
    if (amt > 50000000) { setApplyError("Maximum loan amount is ₹5 Crore."); return; }
    setApplying(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/loans/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: activeAccount?.account_number,
          loan_type: selectedType.id,
          total_amount: amt,
          tenure_months: tenure,
          interest_rate: rate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setApplyError(data.detail || "Application failed."); return; }
      setApplyResult({ emi: data.emi_calculated, msg: data.message });
      await fetchLoans();
    } catch { setApplyError("Network error. Please try again."); }
    finally { setApplying(false); }
  };

  const resetApply = () => {
    setShowApply(false); setStep(1); setAmount(""); setApplyError("");
    setApplyResult(null); setSelectedType(LOAN_TYPES[0]); setRate(LOAN_TYPES[0].rate); setTenure(36);
  };

  const paidCount  = (id: number) => schedules[id]?.filter(r => r.status === "Paid").length || 0;
  const totalCount = (id: number) => schedules[id]?.length || 0;

  const pendingLoans = loans.filter(l => l.status === "Pending");
  const activeLoans  = loans.filter(l => l.status === "Active");
  const closedLoans  = loans.filter(l => l.status === "Closed" || l.status === "Rejected");

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Loan Management</h1>
            <p className="text-slate-500 text-sm">
              {activeAccount ? `Account: ${activeAccount.account_number}` : "Select an account"} · Apply, track and manage your loan portfolio.
            </p>
          </div>
          {activeAccount && (
            <button
              onClick={() => { setShowApply(true); setStep(1); setApplyResult(null); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm"
            >
              <Plus className="w-4 h-4" /> Apply for Loan
            </button>
          )}
        </div>

        {/* ── Apply Loan Modal ── */}
        {showApply && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-2xl border-t-2 border-t-emerald-500 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

              {/* Success screen */}
              {applyResult ? (
                <div className="p-8 text-center space-y-5">
                  <div className="w-16 h-16 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Application Submitted!</h2>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                    {applyResult.msg} Your calculated EMI is{" "}
                    <span className="text-white font-bold text-base">₹{applyResult.emi.toLocaleString("en-IN", { minimumFractionDigits: 2 })}/mo</span>.
                    <br /><br />
                    Track the status in the <span className="text-amber-400 font-semibold">Pending Applications</span> section below.
                  </p>
                  <button onClick={resetApply} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition">
                    Got it
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">Apply for a Loan</h2>
                      <p className="text-slate-500 text-sm mt-0.5">Step {step} of 2</p>
                    </div>
                    <button onClick={resetApply} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Step 1 — Loan Type */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-400 font-medium">Select the type of loan you need:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {LOAN_TYPES.map(lt => (
                          <button
                            key={lt.id}
                            onClick={() => { setSelectedType(lt); setRate(lt.rate); }}
                            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${
                              selectedType.id === lt.id
                                ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                                : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600"
                            }`}
                          >
                            <span className="text-2xl flex-shrink-0">{lt.icon}</span>
                            <div>
                              <p className="font-semibold text-sm">{lt.label}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{lt.desc}</p>
                              <p className="text-[11px] text-emerald-400 font-semibold mt-1">From {lt.rate}% p.a.</p>
                            </div>
                            {selectedType.id === lt.id && (
                              <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setStep(2)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition mt-2"
                      >
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Step 2 — Details & EMI Preview */}
                  {step === 2 && (
                    <div className="space-y-5">
                      {/* Selected type chip */}
                      <div className="flex items-center gap-2">
                        <button onClick={() => setStep(1)} className="text-[11px] text-slate-500 hover:text-slate-300 transition">← Change</button>
                        <span className="text-sm px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          {selectedType.icon} {selectedType.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Amount */}
                        <div>
                          <label className="text-xs text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                            <IndianRupee className="w-3.5 h-3.5"/> Loan Amount
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 500000"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <p className="text-[10px] text-slate-600 mt-1">Min ₹10,000 · Max ₹50,00,000</p>
                        </div>
                        {/* Interest Rate */}
                        <div>
                          <label className="text-xs text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5"/> Interest Rate (% p.a.)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={rate}
                            onChange={e => setRate(parseFloat(e.target.value) || selectedType.rate)}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Tenure Pills */}
                      <div>
                        <label className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                          <Timer className="w-3.5 h-3.5"/> Loan Tenure
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {TENURES.map(t => (
                            <button
                              key={t.months}
                              onClick={() => setTenure(t.months)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                tenure === t.months
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live EMI Preview */}
                      {emi > 0 && (
                        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Live EMI Preview</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-[10px] text-slate-500 mb-0.5">Monthly EMI</p>
                              <p className="text-white font-bold text-lg">₹{emi.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 mb-0.5">Total Payable</p>
                              <p className="text-slate-200 font-semibold">₹{totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 mb-0.5">Total Interest</p>
                              <p className="text-amber-400 font-semibold">₹{totalInterest.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            </div>
                          </div>
                          {/* Interest bar */}
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                              <span>Principal</span>
                              <span>Interest</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-700 overflow-hidden flex">
                              <div className="h-full bg-emerald-500 rounded-l-full"
                                style={{ width: `${(parseFloat(amount) / totalPayable * 100).toFixed(1)}%` }} />
                              <div className="h-full bg-amber-500 flex-1 rounded-r-full" />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                              <span>{((parseFloat(amount) / totalPayable) * 100).toFixed(0)}% principal</span>
                              <span>{((totalInterest / totalPayable) * 100).toFixed(0)}% interest</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {applyError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0"/> {applyError}
                        </div>
                      )}

                      <button
                        onClick={handleApply}
                        disabled={applying || !amount || parseFloat(amount) < 10000}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                      >
                        {applying ? "Submitting…" : "Submit Loan Application"}
                      </button>
                      <p className="text-center text-[11px] text-slate-600">
                        Application goes to admin for review. You will be notified once approved.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : loans.length === 0 ? (
          <div className="glass-card p-14 text-center">
            <Landmark className="w-12 h-12 mx-auto mb-4 text-slate-700" />
            <h3 className="text-slate-300 font-semibold mb-2">No Loans Yet</h3>
            <p className="text-slate-500 text-sm mb-6">Apply for a loan and track repayment, EMI schedule and amortization all in one place.</p>
            <button
              onClick={() => setShowApply(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition text-sm"
            >
              <Plus className="w-4 h-4" /> Apply for Your First Loan
            </button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── Pending Applications Tracker ── */}
            {pendingLoans.length > 0 && (
              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-200">Pending Applications</h3>
                  <span className="ml-auto text-[10px] text-slate-500">Awaiting admin approval</span>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {pendingLoans.map(loan => (
                    <div key={loan.loan_id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">₹{parseFloat(loan.total_amount).toLocaleString("en-IN")} Loan</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          EMI: ₹{parseFloat(loan.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} /mo ·
                          Applied {new Date(loan.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                        <Clock className="w-3 h-3" /> Pending Review
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Active Loans ── */}
            {activeLoans.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Active Loans ({activeLoans.length})
                </p>
                <div className="space-y-5">
                  {activeLoans.map(loan => {
                    const paid = parseFloat(loan.total_amount) - parseFloat(loan.remaining_amount);
                    const pct = (paid / parseFloat(loan.total_amount)) * 100;
                    const daysLeft = Math.ceil((new Date(loan.next_due_date).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={loan.loan_id} className="glass-card overflow-hidden">
                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">Loan #{loan.loan_id}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Active</span>
                              </div>
                              <p className="text-white text-2xl font-bold">
                                ₹{parseFloat(loan.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                <span className="text-slate-500 text-sm font-normal"> / month EMI</span>
                              </p>
                            </div>
                            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border ${
                              daysLeft <= 3 ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : daysLeft <= 7 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                              <CalendarCheck className="w-3.5 h-3.5" />
                              Next Due: {new Date(loan.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              {daysLeft >= 0 ? ` (${daysLeft}d)` : " · Overdue"}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-5">
                            {[
                              { label: "Total Loan",  value: `₹${parseFloat(loan.total_amount).toLocaleString("en-IN")}`,               color: "text-slate-200" },
                              { label: "Paid So Far", value: `₹${paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,           color: "text-emerald-400" },
                              { label: "Remaining",   value: `₹${parseFloat(loan.remaining_amount).toLocaleString("en-IN")}`,            color: "text-amber-400" },
                            ].map(kpi => (
                              <div key={kpi.label} className="bg-slate-800/50 rounded-xl p-3">
                                <p className="text-slate-500 text-[10px] mb-1 uppercase tracking-wider font-medium">{kpi.label}</p>
                                <p className={`font-bold text-sm ${kpi.color}`}>{kpi.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Progress bar */}
                          <div className="mb-5">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                              <span>Repayment Progress</span>
                              <span className="font-semibold text-white">{pct.toFixed(1)}% repaid</span>
                            </div>
                            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>

                          <button
                            onClick={() => toggleSchedule(loan.loan_id)}
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold transition"
                          >
                            <BarChart3 className="w-4 h-4" />
                            {expanded === loan.loan_id ? "Hide" : "View"} Amortization Schedule
                            {expanded === loan.loan_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Amortization Table */}
                        {expanded === loan.loan_id && (
                          <div className="border-t border-slate-800">
                            {schedLoading === loan.loan_id ? (
                              <div className="flex items-center justify-center h-20">
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <div className="px-5 py-3 bg-slate-900/60 flex items-center justify-between">
                                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Amortization Schedule</p>
                                  <p className="text-[10px] text-slate-500">{paidCount(loan.loan_id)} of {totalCount(loan.loan_id)} installments paid</p>
                                </div>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/40">
                                      {["#", "EMI Amount", "Balance After", "Status"].map((h, i) => (
                                        <th key={h} className={`px-5 py-2.5 text-slate-500 text-[10px] font-semibold uppercase tracking-wider ${i === 0 ? "text-left" : i < 3 ? "text-right" : "text-center"}`}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(schedules[loan.loan_id] || []).map(row => (
                                      <tr key={row.installment} className={`border-b border-slate-800/40 ${row.status === "Paid" ? "opacity-40" : ""} hover:bg-slate-800/20`}>
                                        <td className="px-5 py-2.5 text-slate-400 text-xs">#{row.installment}</td>
                                        <td className="px-5 py-2.5 text-right text-slate-200 font-mono text-xs">₹{row.emi_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-5 py-2.5 text-right text-slate-400 font-mono text-xs">₹{row.balance_after.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-5 py-2.5 text-center">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === "Paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{row.status}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Closed / Rejected ── */}
            {closedLoans.length > 0 && (
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5" /> Closed & Rejected ({closedLoans.length})
                </p>
                <div className="space-y-3">
                  {closedLoans.map(loan => (
                    <div key={loan.loan_id} className="glass-card px-5 py-4 flex flex-wrap items-center gap-4 opacity-60">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-300">Loan #{loan.loan_id} · ₹{parseFloat(loan.total_amount).toLocaleString("en-IN")}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">EMI: ₹{parseFloat(loan.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}/mo</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        loan.status === "Rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-slate-700 text-slate-400 border-slate-600"
                      }`}>{loan.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
