"use client";
import { useDashboard } from "@/context/DashboardContext";
import ScheduledPayments from "@/components/ScheduledPayments";
import { TrendingUp, FileText } from "lucide-react";
import { useState } from "react";

function FDCalculatorWidget() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.5);
  const [tenure, setTenure] = useState(1);
  const n = 4;
  const maturity = principal * Math.pow(1 + rate / 100 / n, n * tenure);
  const interest = maturity - principal;

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
        <TrendingUp className="w-4 h-4 text-emerald-400" /> FD Returns Calculator
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Principal Investment (₹)</label>
          <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Interest Rate (%/yr)</label>
            <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Lock-in Tenure (yrs)</label>
            <input type="number" step="0.5" value={tenure} onChange={e => setTenure(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="border-t border-slate-700 pt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Cumulative Interest Earned</span>
            <span className="text-emerald-400 font-semibold">₹{interest.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">Final Maturity Amount</span>
            <span className="text-white font-bold">₹{maturity.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1">Calculates using Native Quarterly Back-End compound modeling boundaries (RBI standard).</p>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { activeAccount } = useDashboard();

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Banking Services & Financial Tools</h1>
        
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-indigo-400" /> AutoPay & Loan EMI Engine
              </h2>
              <p className="text-sm text-slate-400 mb-6">Manage your active banking subscriptions. Ensure your balance remains above the required threshold prior to the scheduled next due date to explicitly prevent penalty traces.</p>
              {activeAccount ? (
                <ScheduledPayments accountNumber={activeAccount.account_number} />
              ) : (
                <p className="text-slate-500 text-sm">Please select an account from the dashboard to manage services.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <FDCalculatorWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
