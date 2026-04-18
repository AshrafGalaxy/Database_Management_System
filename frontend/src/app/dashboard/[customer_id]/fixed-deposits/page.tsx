"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { 
  Lock, Calendar, Plus, X, ArrowRight, ShieldCheck, 
  IndianRupee, TrendingUp, AlertCircle, Edit3, Banknote, CalendarCheck
} from "lucide-react";

type FD = {
  fd_id: number;
  account_number: string;
  principal_amount: string;
  interest_rate: string;
  tenure_months: number;
  maturity_amount: string;
  maturity_date: string;
  maturity_instruction: "Auto-Renew" | "Credit to Savings";
  nominee_name: string | null;
  status: "Active" | "Closed";
  created_at: string;
  accrued_interest: number;
  current_value: number;
};

// Standard FD rates based on tenure (in months) — typical real-world tiers
const FD_RATES = [
  { months: 6, rate: 5.50 },
  { months: 12, rate: 6.80 },
  { months: 24, rate: 7.10 },
  { months: 36, rate: 7.25 },
  { months: 60, rate: 7.50 },
  { months: 120, rate: 7.00 },
];

export default function FixedDepositsPage() {
  const { activeAccount } = useDashboard();
  const [fds, setFds] = useState<FD[]>([]);
  const [loading, setLoading] = useState(true);

  // General state
  const [activeModal, setActiveModal] = useState<"open" | "manage" | "liquidate" | null>(null);
  const [selectedFd, setSelectedFd] = useState<FD | null>(null);

  // --- OPEN FD STATE ---
  const [openStep, setOpenStep] = useState<1 | 2 | 3>(1);
  const [principal, setPrincipal] = useState("");
  const [tenureTier, setTenureTier] = useState(FD_RATES[1]);
  const [instruction, setInstruction] = useState<"Credit to Savings" | "Auto-Renew">("Credit to Savings");
  const [nominee, setNominee] = useState("");
  const [password, setPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [openLoading, setOpenLoading] = useState(false);
  const [openError, setOpenError] = useState("");
  const [calcPreview, setCalcPreview] = useState<{matu: number, int: number} | null>(null);

  // --- MANAGE STATE ---
  const [manageInstruction, setManageInstruction] = useState<"Credit to Savings" | "Auto-Renew">("Credit to Savings");
  const [manageNominee, setManageNominee] = useState("");
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState("");

  // --- LIQUIDATE STATE ---
  const [liqLoading, setLiqLoading] = useState(false);
  const [liqError, setLiqError] = useState("");
  const [liqSim, setLiqSim] = useState<{payout: number, interest: number, penalty_applied: boolean} | null>(null);

  const fetchFDs = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/fd/${activeAccount.account_number}`);
      const data = await res.json();
      setFds(data.fds || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => { fetchFDs(); }, [fetchFDs]);

  // Live calculator effect
  useEffect(() => {
    const p = parseFloat(principal);
    if (p >= 1000) {
      const r = tenureTier.rate / 100;
      const n = 4; // quarterly
      const t = tenureTier.months / 12;
      const m = p * Math.pow(1 + r/n, n*t);
      setCalcPreview({ matu: m, int: m - p });
    } else {
      setCalcPreview(null);
    }
  }, [principal, tenureTier]);

  const resetOpenFD = () => {
    setActiveModal(null); setOpenStep(1); setPrincipal(""); setNominee("");
    setPassword(""); setMpin(""); setOpenError("");
    setTenureTier(FD_RATES[1]); setInstruction("Credit to Savings");
  };

  const handleOpenFD = async () => {
    setOpenError("");
    setOpenLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/fd/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: activeAccount?.account_number,
          principal_amount: parseFloat(principal),
          tenure_years: tenureTier.months / 12,
          interest_rate: tenureTier.rate,
          maturity_instruction: instruction,
          nominee_name: nominee || null,
          password,
          mpin
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to open FD");
      
      resetOpenFD();
      fetchFDs();
    } catch (err: any) {
      setOpenError(err.message);
    } finally {
      setOpenLoading(false);
    }
  };

  const openManageModal = (fd: FD) => {
    setSelectedFd(fd);
    setManageInstruction(fd.maturity_instruction);
    setManageNominee(fd.nominee_name || "");
    setManageError("");
    setActiveModal("manage");
  };

  const handleUpdateInstruction = async () => {
    if (!selectedFd) return;
    setManageError(""); setManageLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/fd/instructions/${selectedFd.fd_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maturity_instruction: manageInstruction,
          nominee_name: manageNominee || null
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail);
      }
      setActiveModal(null);
      fetchFDs();
    } catch (e: any) { setManageError(e.message); }
    finally { setManageLoading(false); }
  };

  const openLiquidateModal = async (fd: FD) => {
    setSelectedFd(fd);
    setLiqError("");
    setActiveModal("liquidate");
    
    // Calculate live penalty preview using identical logic from backend
    const p = parseFloat(fd.principal_amount);
    const start = new Date(fd.created_at);
    const today = new Date();
    const daysHeld = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / 86400000));
    
    if (daysHeld < 7) {
      setLiqSim({ payout: p, interest: 0, penalty_applied: true });
    } else {
      const yearsHeld = daysHeld / 365.0;
      const penalRate = Math.max(0, parseFloat(fd.interest_rate) - 1.0) / 100;
      const m = p * Math.pow(1 + penalRate/4, 4 * yearsHeld);
      setLiqSim({ payout: m, interest: m - p, penalty_applied: true });
    }
  };

  const handleLiquidate = async () => {
    if (!selectedFd) return;
    setLiqError(""); setLiqLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/fd/liquidate/${selectedFd.fd_id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setActiveModal(null);
      fetchFDs();
    } catch (e: any) { setLiqError(e.message); }
    finally { setLiqLoading(false); }
  };

  const activeFDs = fds.filter(f => f.status === "Active");
  const closedFDs = fds.filter(f => f.status === "Closed");

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Fixed Deposits</h1>
            <p className="text-slate-500 text-sm">
              {activeAccount ? `Account: ${activeAccount.account_number}` : "Select an account"} · Earn guaranteed stable returns.
            </p>
          </div>
          {activeAccount && (
            <button
              onClick={() => setActiveModal("open")}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm"
            >
              <Plus className="w-4 h-4" /> Open New FD
            </button>
          )}
        </div>

        {/* ── OPEN FD MODAL (3-Step Wizard) ── */}
        {activeModal === "open" && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-2xl border-t-2 border-t-emerald-500 animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Book a Fixed Deposit</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Step {openStep} of 3</p>
                  </div>
                  <button onClick={resetOpenFD} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {openStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Principal Investment (₹)</label>
                      <input
                        type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="Minimum ₹1,000"
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-2 block">Select Tenure & Rate</label>
                      <div className="grid grid-cols-3 gap-3">
                        {FD_RATES.map(tier => (
                          <button
                            key={tier.months}
                            onClick={() => setTenureTier(tier)}
                            className={`p-3 rounded-xl text-left border transition ${
                              tenureTier.months === tier.months ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                            }`}
                          >
                            <p className="text-sm font-bold text-white">{tier.months >= 12 ? `${tier.months/12} Year${tier.months > 12 ? 's': ''}` : `${tier.months} Months`}</p>
                            <p className={`text-[11px] font-semibold mt-1 ${tenureTier.months === tier.months ? "text-emerald-400" : "text-emerald-500"}`}>{tier.rate.toFixed(2)}% p.a.</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-2 block">Maturity Instructions</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                          <input type="radio" name="instruction" checked={instruction === "Credit to Savings"} onChange={() => setInstruction("Credit to Savings")} className="text-emerald-500 focus:ring-emerald-500" />
                          Credit to Savings Account
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                          <input type="radio" name="instruction" checked={instruction === "Auto-Renew"} onChange={() => setInstruction("Auto-Renew")} className="text-emerald-500 focus:ring-emerald-500" />
                          Auto-Renew Principal
                        </label>
                      </div>
                    </div>

                    {calcPreview && (
                      <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Estimated Maturity</p>
                          <p className="text-xl font-bold text-white">₹{calcPreview.matu.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Interest Earned</p>
                          <p className="text-sm font-bold text-emerald-400">+₹{calcPreview.int.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setOpenStep(2)}
                      disabled={!principal || parseFloat(principal) < 1000}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition disabled:opacity-50"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {openStep === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Nominee Name (Optional)</label>
                      <input
                        type="text" value={nominee} onChange={e => setNominee(e.target.value)} placeholder="Full Name"
                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-2">Highly recommended for seamless transfer of assets.</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setOpenStep(1)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition">Back</button>
                      <button onClick={() => setOpenStep(3)} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition">Security Check →</button>
                    </div>
                  </div>
                )}

                {openStep === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center mb-6">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-200">Double-Lock Authorization</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Deducting ₹{parseFloat(principal).toLocaleString("en-IN")} from Savings XX{activeAccount?.account_number.slice(-4)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Login Password</label>
                        <input
                          type="password" value={password} onChange={e => setPassword(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 font-semibold mb-1.5 block">6-Digit MPIN</label>
                        <input
                          type="password" value={mpin} onChange={e => setMpin(e.target.value)} maxLength={6}
                          className="w-full tracking-widest text-center bg-slate-800 border border-slate-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    
                    {openError && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0"/> {openError}
                      </div>
                    )}

                    <div className="flex gap-3 mt-4">
                      <button onClick={() => setOpenStep(2)} className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition">Back</button>
                      <button 
                        onClick={handleOpenFD} 
                        disabled={openLoading || !password || !mpin}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20"
                      >
                        {openLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> Finalize FD Booking</>}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ── MANAGE INSTRUCTIONS MODAL ── */}
        {activeModal === "manage" && selectedFd && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md border-t-2 border-t-blue-500 animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">Manage FD Returns</h2>
                  <button onClick={() => setActiveModal(null)} className="p-1 rounded text-slate-500 hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-2 block">Maturity Instructions</label>
                    <select
                      value={manageInstruction} onChange={e => setManageInstruction(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Credit to Savings">Credit to Savings at Maturity</option>
                      <option value="Auto-Renew">Auto-Renew Principal & Interest</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold mb-2 block">Registered Nominee</label>
                    <input
                      type="text" value={manageNominee} onChange={e => setManageNominee(e.target.value)} placeholder="Nominee Name"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {manageError && <p className="text-red-400 text-xs">{manageError}</p>}
                  <button 
                    onClick={handleUpdateInstruction} disabled={manageLoading}
                    className="w-full py-2.5 mt-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold rounded-xl transition"
                  >
                    {manageLoading ? "Updating..." : "Save Instructions"}
                  </button>
                  <p className="text-[10px] text-center text-slate-500">Note: Principal and Tenure are locked and strictly immutable.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LIQUIDATE FD MODAL ── */}
        {activeModal === "liquidate" && selectedFd && liqSim && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="glass-card w-full max-w-md border-t-2 border-t-red-500 animate-in zoom-in-95 duration-200">
               <div className="p-6">
                 <div className="flex items-center justify-between mb-5">
                   <h2 className="text-lg font-bold text-white flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500"/> Break Fixed Deposit</h2>
                   <button onClick={() => setActiveModal(null)} className="p-1 rounded text-slate-500 hover:bg-slate-800"><X className="w-5 h-5" /></button>
                 </div>
                 
                 <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                    <p className="text-sm text-red-100 mb-3">You are about to prematurely liquidate FD #{selectedFd.fd_id}. Bank policy enforces a <strong className="text-red-400">1% penalty</strong> on the base interest rate for the duration held.</p>
                    
                    <div className="bg-black/20 p-3 rounded-lg space-y-2">
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Principal Invested</span>
                          <span className="text-white">₹{parseFloat(selectedFd.principal_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                          <span className="text-slate-400">Penalized Interest Earned</span>
                          <span className="text-emerald-400">+ ₹{liqSim.interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between font-bold text-sm">
                          <span className="text-slate-300">Total Net Payout</span>
                          <span className="text-white">₹{liqSim.payout.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                       </div>
                    </div>
                 </div>

                 {liqError && <p className="text-red-400 text-xs mb-3">{liqError}</p>}
                 
                 <button 
                    onClick={handleLiquidate} disabled={liqLoading}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-red-500/20"
                  >
                    {liqLoading ? "Processing..." : "Confirm Liquidation"}
                  </button>
               </div>
             </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Active FDs */}
            {activeFDs.length === 0 ? (
              <div className="glass-card p-14 text-center">
                <Lock className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                <h3 className="text-slate-300 font-semibold mb-2">No Active Fixed Deposits</h3>
                <p className="text-slate-500 text-sm mb-6">Lock in guaranteed returns with a fixed deposit today.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Active Investments ({activeFDs.length})
                </p>
                <div className="grid md:grid-cols-2 gap-5">
                  {activeFDs.map(fd => {
                     const p = parseFloat(fd.principal_amount);
                     const m = parseFloat(fd.maturity_amount);
                     const progress = (fd.current_value - p) / (m - p) * 100;
                     const daysLeft = Math.max(0, Math.ceil((new Date(fd.maturity_date).getTime() - new Date().getTime()) / 86400000));
                     
                     return (
                      <div key={fd.fd_id} className="glass-card p-6 border-t-2 border-t-emerald-500/60 overflow-hidden relative group">
                        
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active FD</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{fd.interest_rate}% p.a.</span>
                              </div>
                              <p className="text-2xl font-bold text-white hover:text-emerald-400 transition cursor-default">
                                ₹{p.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                <span className="text-slate-500 text-sm font-normal"> / Principal</span>
                              </p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-0.5">Accrued</p>
                              <p className="text-emerald-400 font-bold">+₹{fd.accrued_interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                           </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-6">
                           <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                              <span>Interest Accrual Progress</span>
                              <span className="font-semibold text-white">{Math.min(100, progress).toFixed(1)}% to maturity</span>
                           </div>
                           <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                           </div>
                           <div className="flex items-center justify-between mt-2 text-xs">
                              <span className="text-slate-400 flex items-center gap-1.5"><CalendarCheck className="w-3.5 h-3.5"/> Matures: {new Date(fd.maturity_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              <span className="text-slate-300 font-semibold">₹{parseFloat(fd.maturity_amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })} Value</span>
                           </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-slate-700/50">
                           <button onClick={() => openManageModal(fd)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5">
                              <Edit3 className="w-3 h-3" /> Manage Returns
                           </button>
                           <button onClick={() => openLiquidateModal(fd)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition border border-red-500/20">
                              Liquidate
                           </button>
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>
            )}

            {/* Closed FDs */}
            {closedFDs.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3">Closed / Liquidated FDs ({closedFDs.length})</p>
                <div className="space-y-3">
                  {closedFDs.map(fd => (
                    <div key={fd.fd_id} className="glass-card px-5 py-4 flex flex-wrap items-center gap-4 opacity-50 relative group hover:opacity-100 transition">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                         <Lock className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-300">FD #{fd.fd_id} · ₹{parseFloat(fd.principal_amount).toLocaleString("en-IN")}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Booked at {fd.interest_rate}% p.a. · Liquidated/Closed</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-slate-800 text-slate-400 border-slate-700">Closed</span>
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
