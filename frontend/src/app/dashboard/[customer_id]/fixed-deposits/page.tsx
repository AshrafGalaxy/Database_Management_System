"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { TrendingUp, Lock, Calendar, IndianRupee } from "lucide-react";

export default function FixedDepositsPage() {
  const { customerId, accounts } = useDashboard();
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.5);
  const [tenure, setTenure] = useState(1);
  const [result, setResult] = useState<{ maturity_amount: number; interest_earned: number; compounding: string } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const fdAccounts = accounts?.filter(a => a.account_type === "fixed") || [];

  const calculate = async () => {
    setCalcLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/calculator/fd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principal, rate_percent: rate, tenure_years: tenure }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) { console.error(e); }
    finally { setCalcLoading(false); }
  };

  useEffect(() => { calculate(); }, []);

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-2">Fixed Deposits</h1>
        <p className="text-slate-500 text-sm mb-8">Manage your FDs and calculate maturity returns.</p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Existing FD Accounts */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4" /> Active Fixed Deposits
            </h2>
            {fdAccounts.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-500">
                <Lock className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                <p className="text-sm">No active Fixed Deposits found.</p>
                <p className="text-xs mt-1 text-slate-600">Use the calculator to plan your investment.</p>
              </div>
            ) : fdAccounts.map((acc: any) => (
              <div key={acc.account_number} className="glass-card p-5 border border-amber-500/20">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Fixed Deposit</span>
                    <p className="text-slate-500 text-xs font-mono mt-1">{acc.account_number}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${acc.account_status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                    {acc.account_status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ₹{parseFloat(acc.current_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <div className="flex gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Opened: {new Date(acc.member_since).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <span>{acc.branch_name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: FD Calculator */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" /> FD Returns Calculator
            </h2>
            <div className="glass-card p-6 space-y-5">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Principal Amount (₹)</label>
                <input
                  type="number"
                  value={principal}
                  onChange={e => setPrincipal(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rate}
                    onChange={e => setRate(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Tenure (Years)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={tenure}
                    onChange={e => setTenure(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <button
                onClick={calculate}
                disabled={calcLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {calcLoading ? "Calculating…" : "Calculate Returns"}
              </button>

              {result && (
                <div className="border-t border-slate-700 pt-5 space-y-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Calculation Result · {result.compounding} Compounding</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/60 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">Interest Earned</p>
                      <p className="text-emerald-400 font-bold text-lg">₹{result.interest_earned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-4">
                      <p className="text-slate-500 text-xs mb-1">Maturity Amount</p>
                      <p className="text-white font-bold text-lg">₹{result.maturity_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 px-1">
                    <span>Principal: ₹{principal.toLocaleString("en-IN")}</span>
                    <span>Effective Rate: {(result.interest_earned / principal * 100).toFixed(2)}% total</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
