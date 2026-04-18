"use client";
import { useDashboard } from "@/context/DashboardContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionModal from "@/components/ActionModal";
import { Send, Users, ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";

export default function TransfersPage() {
  const { customerId, activeAccount, refreshDashboard } = useDashboard();
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  const routingInfo = (amount = 0) => {
    if (amount > 200000) return { mode: "RTGS", desc: "High-value · Settlement within 30 min", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (amount > 10000) return { mode: "NEFT", desc: "National Electronic · Batch settlement", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    return { mode: "IMPS", desc: "Instant · 24×7 availability", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  };
  const { mode, desc, color } = routingInfo();

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-2">Fund Transfer</h1>
        <p className="text-slate-500 text-sm mb-8">
          {activeAccount ? `From: ${activeAccount.account_number}` : "Select an account from the dashboard"} · MPIN required for all transfers.
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Initiate Transfer */}
          <div className="space-y-5">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
                <Send className="w-5 h-5 text-emerald-400" /> Initiate Transfer
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Transfer funds securely to any saved beneficiary. Your 6-digit Transaction PIN (MPIN) is required to authorise the transfer.
              </p>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold mb-5 w-fit ${color}`}>
                <Zap className="w-3.5 h-3.5" />
                {mode} · {desc}
              </div>

              <button
                onClick={() => setModalOpen(true)}
                disabled={!activeAccount}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all"
              >
                Send Money Now
              </button>

              {!activeAccount && (
                <p className="text-amber-400 text-xs text-center mt-3">Please select an active account from the dashboard first.</p>
              )}
            </div>

            {/* RBI note */}
            <div className="glass-card p-4 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-blue-300">RBI Security Rules</p>
                  <p>• Transfers above ₹10,000 require a saved beneficiary with a 24-hr cooling period</p>
                  <p>• IMPS: up to ₹10,000 instantly · NEFT: ₹10k–₹2L · RTGS: above ₹2,00,000</p>
                  <p>• MPIN is required for every single transfer regardless of amount</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Access</h2>
            <button
              onClick={() => router.push(`/dashboard/${customerId}/beneficiaries`)}
              className="w-full glass-card p-5 flex items-center gap-4 hover:bg-slate-800/60 transition group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-200 font-semibold">Saved Beneficiaries</p>
                <p className="text-slate-500 text-xs">Add or manage your payees & cooling period status</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" />
            </button>

            <button
              onClick={() => router.push(`/dashboard/${customerId}/scheduled`)}
              className="w-full glass-card p-5 flex items-center gap-4 hover:bg-slate-800/60 transition group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/25 transition">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-200 font-semibold">Scheduled Payments</p>
                <p className="text-slate-500 text-xs">Manage loan EMIs and AutoPay mandates</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && activeAccount && (
        <ActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          actionType="transfer"
          accountNumber={activeAccount.account_number}
          activeAccount={activeAccount}
          onSuccess={() => { setModalOpen(false); refreshDashboard(); }}
        />
      )}
    </div>
  );
}
