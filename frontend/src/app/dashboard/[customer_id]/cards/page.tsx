"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  CreditCard, Globe, Gauge, ShoppingCart, ShieldOff, AlertTriangle,
  ShieldCheck, Plus, X, Eye, EyeOff, ChevronRight, Wifi, CheckCircle2, Clock
} from "lucide-react";

type Card = {
  card_id: number;
  card_number: string;
  card_type: string;
  card_network: string;
  expiry_date: string;
  is_active: number;
  international_enabled: number;
  atm_limit: string;
  pos_limit: string;
  issued_at: string;
};

type CardRequest = {
  request_id: number;
  card_number: string;
  card_type: string;
  card_network: string;
  expiry_date: string;
  status: "Pending" | "Approved" | "Rejected";
  admin_note: string | null;
  requested_at: string;
  actioned_at: string | null;
};

const NETWORK_GRADIENTS: Record<string, string> = {
  Visa:       "from-[#1a1f71] to-[#0d1147]",
  Mastercard: "from-[#eb001b]/80 to-[#f79e1b]/80",
  RuPay:      "from-[#1b4332] to-[#0a2218]",
  Amex:       "from-[#007bc0] to-[#005a99]",
};

const NETWORK_ACCENT: Record<string, string> = {
  Visa: "text-blue-300", Mastercard: "text-orange-300",
  RuPay: "text-emerald-300", Amex: "text-sky-300",
};

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear + i);

type LinkStep = "idle" | "form" | "success";

export default function CardsPage() {
  const { activeAccount } = useDashboard();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [hotlisting, setHotlisting] = useState<number | null>(null);
  const [unblocking, setUnblocking] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showCvv, setShowCvv] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" }[]>([]);

  // Card Request Tracker state
  const [cardRequests, setCardRequests] = useState<CardRequest[]>([]);


  // Link Card state
  const [linkStep, setLinkStep] = useState<LinkStep>("idle");
  const [linkForm, setLinkForm] = useState({
    card_number: "", cvv: "", expiry_month: "01",
    expiry_year: String(currentYear), card_type: "debit", card_network: "Visa"
  });
  const [linkError, setLinkError] = useState("");
  const [linking, setLinking] = useState(false);

  const addToast = (msg: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  const fetchCards = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cards/${activeAccount.account_number}`);
      const data = await res.json();
      const fetched = data.cards || [];
      setCards(fetched);
      if (fetched.length > 0 && selectedCard === null) setSelectedCard(fetched[0].card_id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeAccount]);

  const fetchCardRequests = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cards/requests/${activeAccount.account_number}`);
      const data = await res.json();
      setCardRequests(data.requests || []);
    } catch (e) { console.error(e); }
  }, [activeAccount]);

  useEffect(() => { fetchCards(); fetchCardRequests(); }, [fetchCards, fetchCardRequests]);

  const updateCard = async (card_id: number, payload: Record<string, unknown>) => {
    setUpdating(card_id);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cards/update", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.detail || "Update failed.", "error"); return; }
      addToast(data.message || "Card updated.", "success");
      await fetchCards();
    } catch { addToast("Network error.", "error"); }
    finally { setUpdating(null); }
  };

  const hotlistCard = async (card_id: number, card_number: string) => {
    if (!confirm(`⚠️ Permanently block card ending in ${card_number.slice(-4)}? This action is IRREVERSIBLE.`)) return;
    setHotlisting(card_id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cards/hotlist/${card_id}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) { addToast(data.detail || "Failed.", "error"); return; }
      addToast("Card permanently blocked (Hotlisted).", "success");
      await fetchCards();
    } catch { addToast("Network error.", "error"); }
    finally { setHotlisting(null); }
  };

  const unblockCard = async (card_id: number) => {
    setUnblocking(card_id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cards/unblock/${card_id}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) { addToast(data.detail || "Failed to unblock.", "error"); return; }
      addToast("Card unblocked successfully.", "success");
      await fetchCards();
    } catch { addToast("Network error.", "error"); }
    finally { setUnblocking(null); }
  };

  const handleLinkCard = async () => {
    setLinkError("");
    const { card_number, cvv, expiry_month, expiry_year, card_type, card_network } = linkForm;
    if (!/^\d{16}$/.test(card_number.replace(/\s/g, ""))) {
      setLinkError("Card number must be 16 digits."); return;
    }
    const cvvLen = card_network === "Amex" ? 4 : 3;
    if (cvv.length !== cvvLen || !/^\d+$/.test(cvv)) {
      setLinkError(`CVV must be ${cvvLen} digits for ${card_network}.`); return;
    }
    setLinking(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cards/link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: activeAccount?.account_number,
          card_number: card_number.replace(/\s/g, ""),
          cvv, expiry_month: parseInt(expiry_month),
          expiry_year: parseInt(expiry_year), card_type, card_network
        }),
      });
      const data = await res.json();
      if (!res.ok) { setLinkError(data.detail || "Card linking failed."); return; }
      setLinkStep("success");
      await fetchCards();
      await fetchCardRequests();
    } catch { setLinkError("Network error. Please try again."); }
    finally { setLinking(false); }
  };

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const maskCard = (n: string) => `•••• •••• •••• ${n.slice(-4)}`;

  const activeCardObj = cards.find(c => c.card_id === selectedCard) ?? null;

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      {/* Toasts */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-sm font-semibold shadow-xl animate-in slide-in-from-right-5 ${t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {t.msg}
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Card Management</h1>
            <p className="text-slate-500 text-sm">
              {activeAccount ? `Account ${activeAccount.account_number}` : "Select an account"} · Control limits, international access & card blocking.
            </p>
          </div>
          {activeAccount && (
            <button
              onClick={() => { setLinkStep("form"); setLinkError(""); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm"
            >
              <Plus className="w-4 h-4" /> Link New Card
            </button>
          )}
        </div>

        {/* ── Card Request Tracker (only visible when requests exist) ── */}
        {cardRequests.length > 0 && (
          <div className="mb-8 glass-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <h3 className="text-sm font-semibold text-slate-200">Card Link Requests</h3>
              <span className="ml-auto text-[10px] text-slate-500 font-medium">
                {cardRequests.filter(r => r.status === "Pending").length} pending · {cardRequests.filter(r => r.status === "Approved").length} approved
              </span>
            </div>
            <div className="divide-y divide-slate-800/60">
              {cardRequests.map(req => {
                const isApproved = req.status === "Approved";
                const isRejected = req.status === "Rejected";
                const statusStyle = isApproved
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : isRejected
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20";
                const dotStyle  = isApproved ? "bg-emerald-400" : isRejected ? "bg-red-400" : "bg-amber-400 animate-pulse";
                return (
                  <div key={req.request_id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-200 font-mono tracking-wider">
                          •••• •••• •••• {req.card_number.slice(-4)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                          {req.card_network} · {req.card_type} card · Submitted {new Date(req.requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        {req.admin_note && (
                          <p className="text-[11px] text-red-400 mt-0.5 font-medium">⚠ Admin Note: {req.admin_note}</p>
                        )}
                        {isApproved && (
                          <p className="text-[11px] text-emerald-400 mt-0.5">✓ Card activated and ready to use</p>
                        )}
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusStyle}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyle}`} />
                      {req.status === "Pending" ? "Pending Review" : req.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Link Card Modal */}

        {linkStep !== "idle" && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-lg border-t-2 border-t-emerald-500 animate-in zoom-in-95 duration-200">
              {linkStep === "success" ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Request Submitted!</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Your card link request has been submitted for <span className="text-amber-400 font-semibold">admin verification</span>.
                    You can track its status in the <span className="text-white font-semibold">Card Link Requests</span> section above.
                    Once approved, the card will appear in your Card Management.
                  </p>
                  <button
                    onClick={() => { setLinkStep("idle"); setLinkForm({ card_number: "", cvv: "", expiry_month: "01", expiry_year: String(currentYear), card_type: "debit", card_network: "Visa" }); }}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition"
                  >
                    Got it
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">Link a Card to Your Account</h2>
                      <p className="text-slate-500 text-sm mt-0.5">Enter the details on the physical card exactly as printed.</p>
                    </div>
                    <button onClick={() => setLinkStep("idle")} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Live Card Preview */}
                  <div className={`relative h-44 rounded-2xl bg-gradient-to-br ${NETWORK_GRADIENTS[linkForm.card_network] || "from-slate-700 to-slate-900"} p-5 mb-6 overflow-hidden shadow-xl`}>
                    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
                    <div className="absolute -left-4 -bottom-10 w-44 h-44 rounded-full bg-white/5" />
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-widest ${NETWORK_ACCENT[linkForm.card_network]}`}>{linkForm.card_network}</p>
                          <p className="text-white/60 text-xs capitalize mt-0.5">{linkForm.card_type} Card</p>
                        </div>
                        <Wifi className="w-5 h-5 text-white/40 rotate-90" />
                      </div>
                      <div>
                        <p className="font-mono text-white text-lg tracking-widest mb-3">
                          {linkForm.card_number ? formatCardNumber(linkForm.card_number.replace(/\s/g, "")) || "•••• •••• •••• ••••" : "•••• •••• •••• ••••"}
                        </p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-white/40 text-[10px] uppercase tracking-wider">Valid Thru</p>
                            <p className="text-white font-mono text-sm">{linkForm.expiry_month}/{linkForm.expiry_year.slice(-2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white/40 text-[10px] uppercase tracking-wider">CVV</p>
                            <p className="text-white font-mono text-sm">{showCvv ? (linkForm.cvv || "•••") : "•".repeat(linkForm.cvv.length || 3)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {linkError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {linkError}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Card Number */}
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">Card Number</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0000 0000 0000 0000"
                        value={formatCardNumber(linkForm.card_number)}
                        onChange={e => setLinkForm(f => ({ ...f, card_number: e.target.value.replace(/\D/g, "").slice(0, 16) }))}
                        className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-base rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 tracking-widest"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Expiry */}
                      <div>
                        <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">Expiry Date</label>
                        <div className="flex gap-2">
                          <select value={linkForm.expiry_month} onChange={e => setLinkForm(f => ({ ...f, expiry_month: e.target.value }))} className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <select value={linkForm.expiry_year} onChange={e => setLinkForm(f => ({ ...f, expiry_year: e.target.value }))} className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* CVV */}
                      <div>
                        <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">
                          CVV {linkForm.card_network === "Amex" ? "(4 digits)" : "(3 digits)"}
                        </label>
                        <div className="relative">
                          <input
                            type={showCvv ? "text" : "password"}
                            inputMode="numeric"
                            maxLength={linkForm.card_network === "Amex" ? 4 : 3}
                            placeholder={linkForm.card_network === "Amex" ? "••••" : "•••"}
                            value={linkForm.cvv}
                            onChange={e => setLinkForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, linkForm.card_network === "Amex" ? 4 : 3) }))}
                            className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-base rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-1 focus:ring-emerald-500 tracking-widest"
                          />
                          <button onClick={() => setShowCvv(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                            {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Card Type */}
                      <div>
                        <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">Card Type</label>
                        <div className="flex rounded-xl overflow-hidden border border-slate-700">
                          {["debit", "credit"].map(t => (
                            <button key={t} onClick={() => setLinkForm(f => ({ ...f, card_type: t }))}
                              className={`flex-1 py-3 text-sm font-semibold capitalize transition ${linkForm.card_type === t ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Network */}
                      <div>
                        <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">Card Network</label>
                        <select value={linkForm.card_network} onChange={e => setLinkForm(f => ({ ...f, card_network: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                          {["Visa", "Mastercard", "RuPay", "Amex"].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                      <p className="text-amber-400/80 text-xs">Your CVV is never stored in plain text. It is immediately hashed using bcrypt for security.</p>
                    </div>

                    <button onClick={handleLinkCard} disabled={linking}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm">
                      {linking ? "Verifying & Linking…" : "Verify & Link Card"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : cards.length === 0 ? (
          <div className="glass-card p-16 text-center border-dashed border-slate-700">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-semibold mb-2">No cards linked to this account</p>
            <p className="text-slate-600 text-sm mb-6">Link your existing debit or credit card to manage limits, international access and more.</p>
            <button onClick={() => { setLinkStep("form"); setLinkError(""); }}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition text-sm flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Link First Card
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left: Card Selector */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Cards</p>
              {cards.map(card => (
                <button key={card.card_id} onClick={() => setSelectedCard(card.card_id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${selectedCard === card.card_id ? "border-emerald-500/40 bg-emerald-500/5 shadow-md shadow-emerald-500/10" : "border-slate-800 bg-slate-900/50 hover:border-slate-700"}`}>
                  <div className="flex items-center gap-3">
                    {/* Mini card visual */}
                    <div className={`w-12 h-8 rounded-lg bg-gradient-to-br ${NETWORK_GRADIENTS[card.card_network] || "from-slate-700 to-slate-900"} flex items-center justify-center shrink-0`}>
                      <Wifi className="w-3 h-3 text-white/50 rotate-90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold">•••• {card.card_number.slice(-4)}</p>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${card.is_active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}>
                          {card.is_active ? "Active" : "Blocked"}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {card.card_network} · <span className="capitalize">{card.card_type}</span> · Exp {new Date(card.expiry_date).toLocaleDateString("en-IN", { month: "2-digit", year: "2-digit" })}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition ${selectedCard === card.card_id ? "text-emerald-400" : "text-slate-700"}`} />
                  </div>
                </button>
              ))}
            </div>

            {/* Right: Card Detail */}
            {activeCardObj && (
              <div className="lg:col-span-3 space-y-5">
                {/* Premium Card Visual */}
                <div className={`relative rounded-3xl p-7 bg-gradient-to-br ${NETWORK_GRADIENTS[activeCardObj.card_network] || "from-slate-700 to-slate-900"} shadow-2xl overflow-hidden aspect-[16/9]`}>
                  <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/5" />
                  <div className="absolute -left-8 -bottom-16 w-56 h-56 rounded-full bg-white/5" />
                  <div className="absolute right-5 bottom-5 w-24 h-24 rounded-full bg-white/3" />
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-[0.3em] ${NETWORK_ACCENT[activeCardObj.card_network]}`}>{activeCardObj.card_network}</p>
                        <span className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${activeCardObj.card_type === "credit" ? "bg-amber-400/20 text-amber-300 border border-amber-400/20" : "bg-white/10 text-white/70 border border-white/10"}`}>
                          {activeCardObj.card_type} Card
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!activeCardObj.is_active && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Blocked</span>
                        )}
                        <Globe className={`w-5 h-5 ${activeCardObj.international_enabled ? "text-white/70" : "text-white/20"}`} />
                        <Wifi className="w-5 h-5 text-white/40 rotate-90" />
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-white text-xl tracking-[0.25em] mb-5">{maskCard(activeCardObj.card_number)}</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Valid Thru</p>
                          <p className="text-white font-mono">{new Date(activeCardObj.expiry_date).toLocaleDateString("en-IN", { month: "2-digit", year: "2-digit" })}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">ATM Limit</p>
                          <p className="text-white text-sm font-semibold">₹{parseFloat(activeCardObj.atm_limit).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">POS Limit</p>
                          <p className="text-white text-sm font-semibold">₹{parseFloat(activeCardObj.pos_limit).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="glass-card p-5 space-y-4">
                  {!activeCardObj.is_active ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <ShieldOff className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-red-300 font-semibold text-sm">Card Blocked</p>
                          <p className="text-red-400/70 text-xs mt-0.5">This card is currently blocked. You can unblock it or permanently hotlist it below.</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => unblockCard(activeCardObj.card_id)} disabled={unblocking === activeCardObj.card_id}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl transition text-sm disabled:opacity-50">
                          <ShieldCheck className="w-4 h-4" />
                          {unblocking === activeCardObj.card_id ? "Unblocking…" : "Unblock Card"}
                        </button>
                        <button onClick={() => hotlistCard(activeCardObj.card_id, activeCardObj.card_number)} disabled={hotlisting === activeCardObj.card_id}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-xl transition text-sm disabled:opacity-50">
                          <ShieldOff className="w-4 h-4" />
                          {hotlisting === activeCardObj.card_id ? "Blocking…" : "Hotlist (Permanent)"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* International */}
                      <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-blue-400" />
                          <div>
                            <p className="text-slate-200 font-semibold text-sm">International Transactions</p>
                            <p className="text-slate-500 text-xs">Online & POS payments outside India</p>
                          </div>
                        </div>
                        <button onClick={() => updateCard(activeCardObj.card_id, { international_enabled: !activeCardObj.international_enabled })}
                          disabled={updating === activeCardObj.card_id}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${activeCardObj.international_enabled ? "bg-emerald-500" : "bg-slate-600"}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${activeCardObj.international_enabled ? "translate-x-6" : "translate-x-0"}`} />
                        </button>
                      </div>

                      {/* ATM Limit */}
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <Gauge className="w-5 h-5 text-amber-400" />
                          <div>
                            <p className="text-slate-200 font-semibold text-sm">ATM Withdrawal Limit</p>
                            <p className="text-slate-500 text-xs">Current: ₹{parseFloat(activeCardObj.atm_limit).toLocaleString("en-IN")} · Max allowed: ₹2,00,000/day</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <input type="number" defaultValue={parseFloat(activeCardObj.atm_limit)}
                            id={`atm-${activeCardObj.card_id}`} min={0} max={200000} step={1000}
                            className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          <button onClick={() => { const v = (document.getElementById(`atm-${activeCardObj.card_id}`) as HTMLInputElement)?.valueAsNumber; updateCard(activeCardObj.card_id, { atm_limit: v }); }}
                            disabled={updating === activeCardObj.card_id}
                            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-semibold rounded-xl transition disabled:opacity-50">
                            Update
                          </button>
                        </div>
                      </div>

                      {/* POS Limit */}
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <ShoppingCart className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-slate-200 font-semibold text-sm">Online / POS Purchase Limit</p>
                            <p className="text-slate-500 text-xs">Current: ₹{parseFloat(activeCardObj.pos_limit).toLocaleString("en-IN")} · Max allowed: ₹5,00,000/day</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <input type="number" defaultValue={parseFloat(activeCardObj.pos_limit)}
                            id={`pos-${activeCardObj.card_id}`} min={0} max={500000} step={1000}
                            className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                          <button onClick={() => { const v = (document.getElementById(`pos-${activeCardObj.card_id}`) as HTMLInputElement)?.valueAsNumber; updateCard(activeCardObj.card_id, { pos_limit: v }); }}
                            disabled={updating === activeCardObj.card_id}
                            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-semibold rounded-xl transition disabled:opacity-50">
                            Update
                          </button>
                        </div>
                      </div>

                      {/* Danger Zone — Hotlist */}
                      <div className="pt-1 border-t border-slate-700/50">
                        <div className="flex items-start gap-3 mb-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          <p className="text-red-300/80 text-xs">
                            <strong>Permanent Block (Hotlisting):</strong> If your card is lost or stolen, use this option. This action is <strong>irreversible</strong> — your card cannot be reactivated. Contact your branch for a replacement.
                          </p>
                        </div>
                        <button onClick={() => hotlistCard(activeCardObj.card_id, activeCardObj.card_number)}
                          disabled={hotlisting === activeCardObj.card_id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-semibold rounded-xl transition disabled:opacity-50">
                          <ShieldOff className="w-4 h-4" />
                          {hotlisting === activeCardObj.card_id ? "Processing…" : "Block Card Permanently (Hotlist)"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
