"use client";
import { useState, useEffect } from "react";
import { Shield, CheckCircle, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";

interface MpinSetupProps {
  customerId: number | string;
}

export default function MpinSetup({ customerId }: MpinSetupProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/mpin/status/${customerId}`)
      .then(r => r.json())
      .then(d => setIsConfigured(d.mpin_configured))
      .catch(() => setIsConfigured(false));
  }, [customerId]);

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mpin.length !== 6 || !/^\d{6}$/.test(mpin)) {
      setError("MPIN must be exactly 6 numeric digits."); return;
    }
    if (mpin !== confirmMpin) {
      setError("PINs do not match. Please re-enter."); return;
    }
    // Block trivial PINs
    const trivial = ["123456", "654321", "000000", "111111", "222222", "333333",
      "444444", "555555", "666666", "777777", "888888", "999999", "123123"];
    if (trivial.includes(mpin)) {
      setError("This PIN is too simple. Please choose a stronger 6-digit Transaction PIN."); return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/mpin/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: Number(customerId), mpin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to set MPIN");
      setSuccess(true);
      setIsConfigured(true);
      setMpin(""); setConfirmMpin("");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="glass-card p-6 max-w-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Transaction PIN (MPIN)</h3>
          <p className="text-slate-500 text-xs">Required for all fund transfers</p>
        </div>
        <div className="ml-auto">
          {isConfigured === null ? (
            <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-slate-400 animate-spin" />
          ) : isConfigured ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle className="w-3 h-3" /> Configured
            </span>
          ) : (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
              Not Set
            </span>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 mb-5 text-xs text-indigo-300 flex items-start gap-2">
        <Lock className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
        <p>Your Transaction PIN is a 6-digit numeric code, separate from your login password. It is required as a second authentication factor before any fund transfer can be executed.</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3 mb-4 text-xs font-medium">
          <CheckCircle className="w-4 h-4" />
          Transaction PIN {isConfigured ? "updated" : "set"} successfully. All transfers are now protected.
        </div>
      )}

      <form onSubmit={handleSet} className="space-y-4">
        {/* PIN Input */}
        <div>
          <label className="text-xs font-medium text-slate-300 mb-1.5 block">
            {isConfigured ? "New Transaction PIN" : "Set Transaction PIN"}
          </label>
          <div className="relative">
            <input
              type={showMpin ? "text" : "password"}
              maxLength={6}
              value={mpin}
              onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • • • •"
              className="w-full bg-slate-900 border border-slate-700 text-white text-center text-xl tracking-[0.5em] font-mono rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="button" onClick={() => setShowMpin(!showMpin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
              {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* PIN Strength Dots */}
          <div className="flex gap-1.5 mt-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all duration-200 ${i < mpin.length ? "bg-indigo-500" : "bg-slate-700"}`} />
            ))}
          </div>
        </div>

        {/* Confirm Input */}
        <div>
          <label className="text-xs font-medium text-slate-300 mb-1.5 block">Confirm Transaction PIN</label>
          <input
            type="password" maxLength={6}
            value={confirmMpin}
            onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ""))}
            placeholder="• • • • • •"
            className={`w-full bg-slate-900 border text-white text-center text-xl tracking-[0.5em] font-mono rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
              confirmMpin && confirmMpin !== mpin ? "border-red-500/60" : confirmMpin && confirmMpin === mpin ? "border-emerald-500/50" : "border-slate-700"
            }`}
          />
          {confirmMpin && confirmMpin === mpin && mpin.length === 6 && (
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> PINs match</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || mpin.length !== 6 || confirmMpin !== mpin}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? "Setting…" : isConfigured ? "Update Transaction PIN" : "Set Transaction PIN"}
        </button>
      </form>

      <p className="text-center text-[10px] text-slate-600 mt-4">
        Your MPIN is stored securely using bcrypt hashing and is never visible to bank staff.
      </p>
    </div>
  );
}
