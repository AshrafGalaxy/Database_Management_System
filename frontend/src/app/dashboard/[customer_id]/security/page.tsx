"use client";
import { useState, useEffect } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { Shield, Eye, EyeOff, CheckCircle2, XCircle, KeyRound, Lock, Fingerprint } from "lucide-react";

type MpinStep = "idle" | "verify" | "set" | "done";
type PasswordStep = "idle" | "set" | "done";
type ActiveTab = "mpin" | "password";

export default function SecurityPage() {
  const { customerId } = useDashboard();
  const [activeTab, setActiveTab] = useState<ActiveTab>("mpin");

  // MPIN State
  const [mpinSet, setMpinSet] = useState<boolean | null>(null);
  const [mpinStep, setMpinStep] = useState<MpinStep>("idle");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [mpinConfirm, setMpinConfirm] = useState("");
  
  // Login Password State
  const [pwStep, setPwStep] = useState<PasswordStep>("idle");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showMpin, setShowMpin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!customerId) return;
    fetch(`http://127.0.0.1:8000/api/mpin/status/${customerId}`)
      .then(r => r.json())
      .then(d => setMpinSet(d.mpin_configured))
      .catch(console.error);
  }, [customerId]);

  const resetAll = () => {
    setMpinStep("idle"); setPwStep("idle");
    setVerifyPassword(""); setMpin(""); setMpinConfirm("");
    setOldPassword(""); setNewPassword(""); setConfirmNewPassword("");
    setError("");
  };

  // --- MPIN FLOW ---
  const handleVerifyPasswordForMpin = async () => {
    if (!verifyPassword) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/verify-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: parseInt(customerId!), password: verifyPassword }),
      });
      if (!res.ok) { setError("Incorrect password."); return; }
      setMpinStep("set");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const handleSetMpin = async () => {
    if (mpin.length !== 6 || !/^\d{6}$/.test(mpin)) { setError("MPIN must be exactly 6 digits."); return; }
    if (mpin !== mpinConfirm) { setError("PINs do not match."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/mpin/set", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: parseInt(customerId!), mpin }),
      });
      if (!res.ok) { setError("Failed to set MPIN."); return; }
      setMpinSet(true);
      setMpinStep("done");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  // --- PASSWORD FLOW ---
  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) { setError("All fields are required."); return; }
    if (newPassword !== confirmNewPassword) { setError("New passwords do not match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    
    setLoading(true); setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/update-password", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: parseInt(customerId!), old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to update password."); return; }
      setPwStep("done");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Security & Credentials</h1>
        </div>
        <p className="text-slate-500 text-sm mb-8">Manage your Internet Banking Password and Transaction Authorisation PIN independently.</p>

        {/* Custom Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl mb-8 border border-slate-800">
           <button 
              onClick={() => { setActiveTab("mpin"); resetAll(); }}
              className={`flex-1 flex gap-2 justify-center items-center py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'mpin' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
              <Fingerprint className="w-4 h-4" /> Transaction MPIN
           </button>
           <button 
              onClick={() => { setActiveTab("password"); resetAll(); }}
              className={`flex-1 flex gap-2 justify-center items-center py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'password' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}>
              <Lock className="w-4 h-4" /> Internet Banking Password
           </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: MPIN                                            */}
        {/* ---------------------------------------------------- */}
        {activeTab === "mpin" && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            {/* Status Banner */}
            <div className={`glass-card p-5 flex items-center gap-4 mb-8 border ${mpinSet ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              {mpinSet === null ? (
                <div className="w-5 h-5 rounded-full border-2 border-slate-600 animate-spin" />
              ) : mpinSet ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              )}
              <div>
                <p className={`font-semibold text-sm ${mpinSet ? "text-emerald-300" : "text-amber-300"}`}>
                  {mpinSet === null ? "Checking status…" : mpinSet ? "Transaction MPIN is configured" : "Transaction MPIN not set"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {mpinSet ? "Your 6-digit transaction PIN is active. You can safely reset it below." : "Set up your 6-digit MPIN to enable all fund transfers."}
                </p>
              </div>
            </div>

            {/* MPIN FLOW: IDLE */}
            {mpinStep === "idle" && (
              <div className="glass-card p-8 border-t-2 border-t-teal-500 text-center">
                <KeyRound className="w-12 h-12 mx-auto mb-4 text-teal-500/50" />
                <p className="text-white font-semibold mb-2">{mpinSet ? "Reset your Transaction PIN" : "Set up Transaction PIN"}</p>
                <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">For security reasons, you must authorize this action using your current Internet Banking Password.</p>
                <button
                  onClick={() => { setMpinStep("verify"); setError(""); }}
                  className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition shadow-lg shadow-teal-500/20"
                >
                  {mpinSet ? "Verify Password to Reset" : "Verify Password to Setup"}
                </button>
              </div>
            )}

            {/* MPIN FLOW: VERIFY */}
            {mpinStep === "verify" && (
              <div className="glass-card p-6 border-t-2 border-t-teal-500">
                <h2 className="text-white font-bold text-lg mb-1">Verify Login Password</h2>
                <p className="text-slate-400 text-sm mb-6">Enter your internet banking login password to proceed to MPIN update.</p>
                
                {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">{error}</div>}
                
                <div className="relative mb-6">
                  <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Login Password</label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={verifyPassword}
                    onChange={e => setVerifyPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-3 pr-10 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-9 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="flex gap-3">
                  <button onClick={resetAll} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-lg text-sm font-semibold transition">Cancel</button>
                  <button
                    onClick={handleVerifyPasswordForMpin}
                    disabled={loading || !verifyPassword}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition"
                  >
                    {loading ? "Verifying…" : "Continue To MPIN →"}
                  </button>
                </div>
              </div>
            )}

            {/* MPIN FLOW: SET */}
            {mpinStep === "set" && (
              <div className="glass-card p-6 border-t-2 border-t-teal-500">
                <h2 className="text-slate-200 font-bold text-lg mb-1">Set New Transaction PIN</h2>
                <p className="text-slate-500 text-sm mb-6">Choose a 6-digit numeric PIN. This will instantly activate.</p>
                
                {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">{error}</div>}
                
                <div className="mb-4">
                  <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">New 6-Digit MPIN</label>
                  <div className="relative">
                    <input
                      type={showMpin ? "text" : "password"}
                      maxLength={6}
                      placeholder="••••••"
                      value={mpin}
                      onChange={e => setMpin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xl text-center tracking-[0.5em] rounded-lg px-3 py-3 pr-10 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <button onClick={() => setShowMpin(!showMpin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="mb-8">
                  <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Confirm New MPIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={mpinConfirm}
                    onChange={e => setMpinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xl text-center tracking-[0.5em] rounded-lg px-3 py-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button onClick={resetAll} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-lg text-sm font-semibold transition">Cancel</button>
                  <button
                    onClick={handleSetMpin}
                    disabled={loading || mpin.length !== 6 || mpinConfirm.length !== 6}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition"
                  >
                    {loading ? "Processing…" : "Confirm & Set MPIN"}
                  </button>
                </div>
              </div>
            )}

            {/* MPIN FLOW: DONE */}
            {mpinStep === "done" && (
              <div className="glass-card p-8 border-t-2 border-t-teal-500 text-center bg-teal-500/5">
                <CheckCircle2 className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                <p className="text-teal-300 font-bold text-lg mb-2">Transaction PIN Updated</p>
                <p className="text-slate-500 text-sm mb-6">Your MPIN is now active and ready for fund transfers.</p>
                <button onClick={resetAll} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-sm transition">Back to Security</button>
              </div>
            )}
          </div>
        )}


        {/* ---------------------------------------------------- */}
        {/* TAB 2: LOGIN PASSWORD                                  */}
        {/* ---------------------------------------------------- */}
        {activeTab === "password" && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
             {pwStep === "idle" && (
                <div className="glass-card p-6 border-t-2 border-t-indigo-500">
                  <h2 className="text-white font-bold text-lg mb-1">Change Login Password</h2>
                  <p className="text-slate-400 text-sm mb-6">Regularly updating your password ensures your account remains secure.</p>
                  
                  {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">{error}</div>}
                  
                  <div className="space-y-4 mb-8">
                     <div className="relative">
                        <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Current Password</label>
                        <input
                           type={showPw ? "text" : "password"}
                           value={oldPassword}
                           onChange={e => setOldPassword(e.target.value)}
                           className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-3 pr-10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                           <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">New Password</label>
                           <input
                              type={showPw ? "text" : "password"}
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                           />
                        </div>
                        <div className="relative">
                           <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Confirm New</label>
                           <input
                              type={showPw ? "text" : "password"}
                              value={confirmNewPassword}
                              onChange={e => setConfirmNewPassword(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                           />
                        </div>
                     </div>
                     <button onClick={() => setShowPw(!showPw)} className="text-xs text-indigo-400 hover:text-indigo-300 py-1 font-semibold flex items-center gap-1">
                        {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showPw ? "Hide Passwords" : "Show Passwords"}
                     </button>
                  </div>

                  <div className="flex gap-3">
                     <button onClick={resetAll} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-lg text-sm font-semibold transition">Cancel</button>
                     <button
                        onClick={handleUpdatePassword}
                        disabled={loading || !oldPassword || !newPassword || !confirmNewPassword}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition"
                     >
                        {loading ? "Updating…" : "Update Login Password"}
                     </button>
                  </div>
                </div>
             )}

             {pwStep === "done" && (
               <div className="glass-card p-8 border-t-2 border-t-indigo-500 text-center bg-indigo-500/5">
                 <CheckCircle2 className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                 <p className="text-indigo-300 font-bold text-lg mb-2">Login Password Updated Successfully</p>
                 <p className="text-slate-500 text-sm mb-6">Your new internet banking password is now active. Please use it for future logins.</p>
                 <button onClick={resetAll} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-sm transition">Done</button>
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
}
