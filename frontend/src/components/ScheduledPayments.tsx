"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarClock, Landmark, RefreshCcw, Ban, ExternalLink, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface ScheduledPaymentsProps {
  accountNumber: string;
}

export default function ScheduledPayments({ accountNumber }: ScheduledPaymentsProps) {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.customer_id as string;

  const [loans, setLoans]       = useState<any[]>([]);
  const [autoPays, setAutoPays] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lr, ar] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/loans/${accountNumber}`).then(r => r.json()),
        fetch(`http://127.0.0.1:8000/api/autopay/${accountNumber}`).then(r => r.json()),
      ]);
      setLoans(lr.loans || []);
      setAutoPays(ar.autopays || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [accountNumber]);

  const cancelAutoPay = async (id: number, name: string) => {
    if (!window.confirm(`Cancel AutoPay for "${name}"? This will stop future deductions.`)) return;
    await fetch(`http://127.0.0.1:8000/api/autopay/cancel/${id}`, { method: "PUT" });
    fetchData();
  };

  const daysUntilDue = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

  const activeLoans   = loans.filter(l => l.status === "Active");
  const pendingLoans  = loans.filter(l => l.status === "Pending");
  const activeAutoPay = autoPays.filter(a => a.status === "Active");
  const cancelledAP   = autoPays.filter(a => a.status === "Cancelled");

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">

      {/* ── AutoPay / Subscriptions ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Active Subscriptions (AutoPay)</h2>
            {activeAutoPay.length > 0 && (
              <span className="text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-bold">
                {activeAutoPay.length}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push(`/dashboard/${customerId}/scheduled`)}
            className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/30 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition"
          >
            <ExternalLink className="w-3 h-3" /> Manage AutoPay
          </button>
        </div>

        <div className="p-5 space-y-3">
          {activeAutoPay.length === 0 ? (
            <div className="text-center py-6">
              <RefreshCcw className="w-7 h-7 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No active AutoPay mandates.</p>
              <button
                onClick={() => router.push(`/dashboard/${customerId}/scheduled`)}
                className="mt-3 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                + Set up AutoPay →
              </button>
            </div>
          ) : (
            activeAutoPay.slice(0, 3).map(ap => {
              const days = daysUntilDue(ap.next_due_date);
              return (
                <div key={ap.autopay_id} className="flex items-center gap-3 p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <RefreshCcw className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{ap.merchant_name}</p>
                    <p className="text-[11px] text-slate-500">
                      ₹{parseFloat(ap.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} · Monthly ·{" "}
                      <span className={days <= 3 ? "text-red-400 font-semibold" : "text-slate-500"}>
                        Due {new Date(ap.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {days >= 0 ? ` (${days}d)` : " · Overdue"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                    <button
                      onClick={() => cancelAutoPay(ap.autopay_id, ap.merchant_name)}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Cancel"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {activeAutoPay.length > 3 && (
            <button
              onClick={() => router.push(`/dashboard/${customerId}/scheduled`)}
              className="w-full text-center text-[11px] text-indigo-400 hover:text-indigo-300 py-1.5"
            >
              +{activeAutoPay.length - 3} more · View all →
            </button>
          )}
        </div>
      </div>

      {/* ── Active Debt & Loans ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Landmark className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Active Debt & Loans</h2>
            {(activeLoans.length + pendingLoans.length) > 0 && (
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                {activeLoans.length + pendingLoans.length}
              </span>
            )}
          </div>
          <button
            onClick={() => router.push(`/dashboard/${customerId}/loans`)}
            className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold border border-emerald-500/30 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition"
          >
            <ExternalLink className="w-3 h-3" /> Request Loan
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Pending applications first */}
          {pendingLoans.map(loan => (
            <div key={loan.loan_id} className="flex items-center gap-3 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">
                  Loan #{loan.loan_id} · ₹{parseFloat(loan.total_amount).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-slate-500">
                  EMI: ₹{parseFloat(loan.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}/mo · Awaiting admin approval
                </p>
              </div>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" /> Pending
              </span>
            </div>
          ))}

          {activeLoans.length === 0 && pendingLoans.length === 0 ? (
            <div className="text-center py-6">
              <Landmark className="w-7 h-7 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No active loans on this account.</p>
              <button
                onClick={() => router.push(`/dashboard/${customerId}/loans`)}
                className="mt-3 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Apply for a Loan →
              </button>
            </div>
          ) : (
            activeLoans.slice(0, 2).map(loan => {
              const paidPct = ((parseFloat(loan.total_amount) - parseFloat(loan.remaining_amount)) / parseFloat(loan.total_amount)) * 100;
              const days = daysUntilDue(loan.next_due_date);
              return (
                <div key={loan.loan_id} className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Loan #{loan.loan_id} · ₹{parseFloat(loan.emi_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}/mo
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Remaining: ₹{parseFloat(loan.remaining_amount).toLocaleString("en-IN")} ·{" "}
                        <span className={days <= 3 ? "text-red-400 font-semibold" : "text-slate-500"}>
                          Due {new Date(loan.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {days >= 0 ? ` (${days}d)` : " · Overdue"}
                        </span>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">{paidPct.toFixed(0)}% paid</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full" style={{ width: `${paidPct}%` }} />
                  </div>
                </div>
              );
            })
          )}
          {activeLoans.length > 2 && (
            <button
              onClick={() => router.push(`/dashboard/${customerId}/loans`)}
              className="w-full text-center text-[11px] text-emerald-400 hover:text-emerald-300 py-1.5"
            >
              +{activeLoans.length - 2} more · View all →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
