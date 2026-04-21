"use client";
import { useState, useEffect } from "react";
import {
  X, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft,
  CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  Shield, Zap, Building2, Lock
} from "lucide-react";

type ActionType = "deposit" | "withdraw" | "transfer" | null;

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ActionType;
  accountNumber: string;
  activeAccount?: any;
  onSuccess: () => void;
}

// ─── Routing Mode Badge ───────────────────────────────────────────────────────
function RoutingBadge({ amount }: { amount: number }) {
  if (!amount || amount <= 0) return null;
  let mode = "IMPS", color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  let desc = "Instant transfer • 24×7";
  if (amount > 200000) {
    mode = "RTGS"; color = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    desc = "High-value transfer • Settlement within 30 min";
  } else if (amount > 10000) {
    mode = "NEFT"; color = "text-blue-400 bg-blue-500/10 border-blue-500/20";
    desc = "National Electronic Transfer • Batch settlement";
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${color}`}>
      <Zap className="w-3.5 h-3.5" />
      <div>
        <span className="font-bold">{mode}</span>
        <span className="ml-1 opacity-70">— {desc}</span>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < current ? "bg-emerald-500 text-white" :
              i === current ? "bg-indigo-500 text-white ring-2 ring-indigo-500/30" :
              "bg-slate-800 text-slate-500 border border-slate-700"
            }`}>
              {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[9px] mt-1 font-medium ${i <= current ? "text-slate-300" : "text-slate-600"}`}>
              {labels[i]}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-px mx-1 mb-3 transition-all duration-300 ${i < current ? "bg-emerald-500" : "bg-slate-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Transfer Wizard ──────────────────────────────────────────────────────────
function TransferWizard({
  accountNumber, activeAccount, onSuccess, onClose
}: {
  accountNumber: string; activeAccount: any; onSuccess: () => void; onClose: () => void;
}) {
  const [step, setStep] = useState(0); // 0: Payee, 1: Amount, 2: MPIN
  const [receiverAccount, setReceiverAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingBene, setCheckingBene] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [routingMode, setRoutingMode] = useState("");
  const [beneWarning, setBeneWarning] = useState<{ nickname: string; cooling_active: boolean; cooling_ends_at: string | null } | null>(null);

  const customerId = activeAccount?.customer_id;
  const amountNum = parseFloat(amount) || 0;
  const steps = ["Choose Payee", "Set Amount", "Authenticate"];

  const willHitPenalty =
    activeAccount?.account_type === "savings" && amountNum > 0 &&
    parseFloat(activeAccount.current_balance) - amountNum < parseFloat(activeAccount.min_balance);

  // After user types receiver account and clicks Continue, lookup beneficiary status
  const handleNext = async () => {
    setError(null);
    if (step === 0 && !receiverAccount.trim()) { setError("Please enter a destination account number."); return; }
    if (step === 0 && receiverAccount.trim() === accountNumber) { setError("Cannot transfer to your own account."); return; }

    if (step === 0 && customerId) {
      setCheckingBene(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/beneficiaries/${customerId}`);
        const data = await res.json();
        const benes: any[] = data.beneficiaries || [];
        const match = benes.find((b: any) => b.payee_account_number === receiverAccount.trim());
        if (!match) {
          setError(`"${receiverAccount}" is not in your saved beneficiaries. Add them on the Beneficiaries page first.`);
          setCheckingBene(false);
          return;
        }
        // Store cooling status for the Amount step warning
        setBeneWarning({
          nickname: match.nickname,
          cooling_active: !!match.cooling_period_active,
          cooling_ends_at: match.cooling_ends_at || null,
        });
      } catch {
        // Let backend handle it — proceed anyway
        setBeneWarning(null);
      } finally {
        setCheckingBene(false);
      }
    }

    if (step === 1 && amountNum <= 0) { setError("Please enter a valid amount greater than ₹0."); return; }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (mpin.length !== 6) { setError("MPIN must be exactly 6 digits."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_account: accountNumber,
          receiver_account: receiverAccount,
          amount: amountNum,
          mpin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Transfer failed");
      setRoutingMode(data.routing_mode || "");
      setSuccessMsg(data.message);
      setTimeout(() => { onSuccess(); onClose(); }, 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <p className="text-white font-semibold">{successMsg}</p>
        {routingMode && (
          <span className="inline-block text-xs text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
            Routed via {routingMode}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepIndicator current={step} total={3} labels={steps} />

      {/* Step 0: Payee */}
      {step === 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Sending From</label>
            <input value={accountNumber} disabled
              className="w-full bg-slate-800/50 border border-slate-700 text-slate-400 font-mono text-sm rounded-lg px-3 py-2.5 opacity-60" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1.5 block">Destination Account Number *</label>
            <input
              type="text" value={receiverAccount} onChange={(e) => setReceiverAccount(e.target.value.toUpperCase())}
              placeholder="ACC0000000002"
              className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> The payee must be in your Saved Beneficiaries list and past the 24-hour cooling period.
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Amount */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
          {/* Cooling period warning banner */}
          {beneWarning?.cooling_active && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="text-amber-300 font-semibold mb-0.5">24-hr Cooling Period Active — {beneWarning.nickname}</p>
                <p className="text-amber-500">Max transfer: <span className="text-amber-300 font-bold">₹10,000</span> right now. Transfers above ₹10,000 unlock after the cooling period ends.</p>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1.5 block">Transfer Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
              <input
                type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-700 text-white text-lg font-bold rounded-lg pl-7 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {amountNum > 0 && <RoutingBadge amount={amountNum} />}

          {willHitPenalty && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>This transfer drops you below the ₹{parseFloat(activeAccount.min_balance).toLocaleString("en-IN")} minimum balance. A ₹200 penalty fee will be auto-deducted.</p>
            </div>
          )}

          <div className="bg-slate-800/40 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Transfer Amount</span><span>₹{amountNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>To Account</span><span className="font-mono">{receiverAccount}</span>
            </div>
            <div className="flex justify-between text-slate-500 border-t border-slate-700 pt-1 mt-1">
              <span>Routing Mode</span>
              <span className={amountNum > 200000 ? "text-amber-400" : amountNum > 10000 ? "text-blue-400" : "text-emerald-400"}>
                {amountNum > 200000 ? "RTGS" : amountNum > 10000 ? "NEFT" : "IMPS"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: MPIN */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-slate-200 font-medium text-sm">Confirm Transfer</p>
            <p className="text-slate-500 text-xs mt-1">₹{amountNum.toLocaleString("en-IN")} → {receiverAccount}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1.5 block flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-400" /> 6-Digit Transaction PIN (MPIN)
            </label>
            <input
              type="password" maxLength={6} value={mpin}
              onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • • • •"
              className="w-full bg-slate-900 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] font-mono rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 text-center">
              Not set yet? Configure your Transaction PIN in Cards & Services → Transaction PIN.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p>
        </div>
      )}

      {/* Nav Buttons */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => { setStep(s => s - 1); setError(null); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < 2 ? (
          <button onClick={handleNext} disabled={checkingBene}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/20">
            {checkingBene ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</> : <>Continue <ChevronRight className="w-4 h-4" /></>}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading || mpin.length !== 6}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Authorising…" : <><Shield className="w-4 h-4" /> Authorise Transfer</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Simple Deposit/Withdraw Form ─────────────────────────────────────────────
function SimpleForm({
  actionType, accountNumber, activeAccount, onSuccess, onClose
}: {
  actionType: "deposit" | "withdraw"; accountNumber: string; activeAccount: any;
  onSuccess: () => void; onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("UPI");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const isDeposit = actionType === "deposit";
  const willPenalty = !isDeposit && activeAccount?.account_type === "savings" && amountNum > 0 &&
    parseFloat(activeAccount.current_balance) - amountNum < parseFloat(activeAccount.min_balance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/${actionType}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, amount: amountNum, channel, description: description || `${actionType} via ${channel}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Transaction failed");
      setSuccessMsg(data.message);
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (successMsg) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-emerald-400" />
        </div>
        <p className="text-white font-semibold text-sm">{successMsg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Account Number</label>
        <input value={accountNumber} disabled className="w-full bg-slate-800/50 border border-slate-700 text-slate-400 font-mono text-sm rounded-lg px-3 py-2.5 opacity-60" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-300 mb-1.5 block">Amount (₹) *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
          <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00" required
            className="w-full bg-slate-900 border border-slate-700 text-white text-lg font-bold rounded-lg pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-300 mb-1.5 block">Channel</label>
        <select value={channel} onChange={(e) => setChannel(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="UPI">UPI</option>
          <option value="ATM">ATM</option>
          <option value="NEFT">NEFT</option>
          <option value="RTGS">RTGS</option>
          <option value="Cheque">Cheque</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-300 mb-1.5 block">Reference Note (Optional)</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Rent payment"
          className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
      {willPenalty && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>This amount drops you below minimum balance. A ₹200 system penalty will be applied.</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p>
        </div>
      )}
      <button type="submit" disabled={loading || amountNum <= 0}
        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-white text-sm transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
          isDeposit ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" : "bg-red-600 hover:bg-red-500 shadow-red-500/20"
        }`}>
        {loading ? "Processing…" : `Confirm ${isDeposit ? "Deposit" : "Withdrawal"}`}
      </button>
    </form>
  );
}

// ─── Root Modal ───────────────────────────────────────────────────────────────
export default function ActionModal({ isOpen, onClose, actionType, accountNumber, activeAccount, onSuccess }: ActionModalProps) {
  if (!isOpen || !actionType) return null;

  const config = {
    deposit:  { label: "Deposit Funds",    icon: <ArrowDownCircle className="w-5 h-5 text-emerald-400" />,  border: "border-emerald-500/20" },
    withdraw: { label: "Withdraw Funds",   icon: <ArrowUpCircle   className="w-5 h-5 text-red-400" />,      border: "border-red-500/20" },
    transfer: { label: "Initiate Transfer", icon: <ArrowRightLeft  className="w-5 h-5 text-indigo-400" />,  border: "border-indigo-500/20" },
  };
  const { label, icon, border } = config[actionType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`bg-slate-900 border ${border} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="font-semibold text-white">{label}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {actionType === "transfer" ? (
            <TransferWizard accountNumber={accountNumber} activeAccount={activeAccount} onSuccess={onSuccess} onClose={onClose} />
          ) : (
            <SimpleForm actionType={actionType} accountNumber={accountNumber} activeAccount={activeAccount} onSuccess={onSuccess} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
