"use client";

import { useState } from "react";
import {
  CheckCircle, AlertCircle, ArrowRight, ArrowLeft,
  Loader2, UserPlus, ShieldCheck, Clock, Trash2, X
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Beneficiary {
  beneficiary_id: number;
  payee_account_number: string;
  nickname: string;
  added_at: string;
  penny_drop_verified: boolean;
  cooling_period_active: boolean;
  hours_since_added: number;
  first_name?: string;
  last_name?: string;
}

interface Props {
  customerId: string;
  beneficiaries: Beneficiary[];
  onSuccess: () => void;
}

const STEPS = ["Account Details", "Set Nickname", "Confirm & Add"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddBeneficiaryWizard({ customerId, beneficiaries, onSuccess }: Props) {
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);

  // Form state
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const resetWizard = () => {
    setStep(0);
    setAccountNumber("");
    setIfscCode("");
    setNickname("");
    setError("");
    setSuccess("");
    setShowWizard(false);
  };

  const handleNext = () => {
    setError("");
    if (step === 0) {
      if (!accountNumber.trim()) { setError("Account number is required."); return; }
      if (accountNumber.trim().length < 5) { setError("Enter a valid account number."); return; }
    }
    if (step === 1) {
      if (!nickname.trim()) { setError("Please enter a nickname for this payee."); return; }
      if (nickname.trim().length < 2) { setError("Nickname must be at least 2 characters."); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/beneficiaries/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          payee_account_number: accountNumber.trim(),
          nickname: nickname.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to add beneficiary.");
        setStep(0);
        return;
      }
      setSuccess(data.message);
      onSuccess();
      setTimeout(resetWizard, 3500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Remove "${name}" from your saved beneficiaries?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/beneficiaries/${id}`, { method: "DELETE" });
      if (res.ok) onSuccess();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Saved Beneficiaries</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage payees for fund transfers. RBI 24-hr cooling applies to new payees.</p>
        </div>
        <button
          onClick={() => { setShowWizard(true); setStep(0); setError(""); setSuccess(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/20 transition"
        >
          <UserPlus className="w-4 h-4" /> Add Payee
        </button>
      </div>

      {/* ── Wizard Modal ── */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Add New Payee</h2>
                <p className="text-xs text-slate-500 mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
              </div>
              <button onClick={resetWizard} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-6 py-3">
              <div className="flex gap-2">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex-1 flex flex-col gap-1">
                    <div className={`h-1 rounded-full transition-all duration-300 ${i <= step ? "bg-indigo-500" : "bg-slate-700"}`} />
                    <span className={`text-[10px] font-medium ${i === step ? "text-indigo-400" : i < step ? "text-emerald-400" : "text-slate-600"}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* Error/Success feedback */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {success}
                </div>
              )}

              {/* ── Step 0: Account Details ── */}
              {step === 0 && !success && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="payee-acc" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Payee Account Number</label>
                    <input
                      id="payee-acc"
                      type="text"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.toUpperCase())}
                      placeholder="ACC0000000002"
                      className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
                    />
                    <p className="text-[10px] text-slate-600 mt-1">Enter the exact account number of the recipient.</p>
                  </div>
                  <div>
                    <label htmlFor="payee-ifsc" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Bank IFSC Code <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                    <input
                      id="payee-ifsc"
                      type="text"
                      value={ifscCode}
                      onChange={e => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                      className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> RBI 24-Hour Security Cooling Period
                    </p>
                    <p className="text-[11px] text-amber-500/70 mt-1">Transfers above ₹10,000 to this payee will be blocked for 24 hours after adding. This is mandatory per RBI/NPCI guidelines.</p>
                  </div>
                </div>
              )}

              {/* ── Step 1: Set Nickname ── */}
              {step === 1 && !success && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-sm">
                    <p className="text-slate-500 text-xs mb-1">Payee Account</p>
                    <p className="text-white font-mono font-semibold">{accountNumber}</p>
                    {ifscCode && <p className="text-slate-500 text-xs mt-0.5">IFSC: {ifscCode}</p>}
                  </div>
                  <div>
                    <label htmlFor="payee-nick" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Nickname / Label</label>
                    <input
                      id="payee-nick"
                      type="text"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      placeholder="e.g. Priya Rent, Home Loan EMI"
                      className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-600 mt-1">This label helps you identify the payee in transfer flows.</p>
                  </div>
                </div>
              )}

              {/* ── Step 2: Confirm ── */}
              {step === 2 && !success && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-700 overflow-hidden divide-y divide-slate-800">
                    {[
                      { label: "Account Number", value: accountNumber, mono: true },
                      { label: "IFSC Code", value: ifscCode || "Not provided" },
                      { label: "Nickname", value: nickname },
                      { label: "Cooling Period", value: "24 hours (RBI Mandate)" },
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <span className="text-slate-500">{label}</span>
                        <span className={`text-white font-medium ${mono ? "font-mono tracking-wider" : ""}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    By confirming, you authorise Nexus Wealth to add this account as a trusted payee. This action is logged for security audit purposes.
                  </div>
                </div>
              )}

              {/* ── Wizard Actions ── */}
              {!success && (
                <div className="flex gap-3 pt-2">
                  {step > 0 && (
                    <button onClick={() => { setStep(s => s - 1); setError(""); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button onClick={handleNext} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition shadow-lg shadow-indigo-500/20">
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-60">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding Payee…</> : <><CheckCircle className="w-4 h-4" /> Confirm & Add Payee</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Beneficiary List ── */}
      {beneficiaries.length === 0 ? (
        <div className="text-center py-12 text-slate-600 bg-slate-900/40 rounded-2xl border border-slate-800">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-500">No saved beneficiaries yet</p>
          <p className="text-xs mt-1">Click "Add Payee" to register your first payee.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {beneficiaries.map(b => {
            const payeeName = b.first_name ? `${b.first_name} ${b.last_name}` : null;
            const hoursLeft = Math.max(0, 24 - (b.hours_since_added || 0));
            return (
              <div key={b.beneficiary_id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-slate-700 transition">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400 font-bold text-sm">
                    {b.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{b.nickname}</p>
                    {payeeName && <p className="text-xs text-slate-500">{payeeName}</p>}
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{b.payee_account_number}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {b.cooling_period_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <Clock className="w-2.5 h-2.5" /> {hoursLeft}h cooling
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-2.5 h-2.5" /> Cleared
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(b.beneficiary_id, b.nickname)}
                  disabled={deleting === b.beneficiary_id}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0 disabled:opacity-40"
                  title="Remove beneficiary"
                >
                  {deleting === b.beneficiary_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
