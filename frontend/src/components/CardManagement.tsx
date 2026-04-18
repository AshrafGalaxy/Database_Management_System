"use client";
import { useState } from "react";
import {
  CreditCard, Globe, Ban, AlertTriangle, CheckCircle,
  AlertCircle, Shield, Sliders, Wifi
} from "lucide-react";

type Card = {
  card_id: number;
  card_number: string;
  card_type: string;
  card_network: string;
  expiry_date: string;
  issued_at: string;
  is_active: number;
  international_enabled: number;
  atm_limit: string;
  pos_limit: string;
};

interface CardManagementProps {
  cards: Card[];
  onRefresh: () => void;
}

function CardSettingsModal({
  card,
  onClose,
  onRefresh,
}: {
  card: Card;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [international, setInternational] = useState(!!card.international_enabled);
  const [atmLimit, setAtmLimit] = useState(parseFloat(card.atm_limit || "50000"));
  const [posLimit, setPosLimit] = useState(parseFloat(card.pos_limit || "100000"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cards/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.card_id,
          international_enabled: international,
          atm_limit: atmLimit,
          pos_limit: posLimit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Update failed");
      setSuccess(true);
      setTimeout(() => { onRefresh(); onClose(); }, 1500);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Card Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition text-sm">✕</button>
        </div>
        <div className="p-5 space-y-5">
          {success ? (
            <div className="text-center py-4 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-white text-sm font-medium">Settings saved successfully.</p>
            </div>
          ) : (
            <>
              {/* International Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">International Usage</p>
                    <p className="text-[10px] text-slate-500">Enable payments outside India</p>
                  </div>
                </div>
                <button
                  onClick={() => setInternational(!international)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-300 ${international ? "bg-blue-500" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${international ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* ATM Limit */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Daily ATM Limit</label>
                  <span className="text-xs text-emerald-400 font-semibold">₹{atmLimit.toLocaleString("en-IN")}</span>
                </div>
                <input type="range" min={5000} max={200000} step={5000} value={atmLimit}
                  onChange={(e) => setAtmLimit(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                  <span>₹5,000</span><span>₹2,00,000</span>
                </div>
              </div>

              {/* POS Limit */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Daily POS / Online Limit</label>
                  <span className="text-xs text-emerald-400 font-semibold">₹{posLimit.toLocaleString("en-IN")}</span>
                </div>
                <input type="range" min={10000} max={500000} step={10000} value={posLimit}
                  onChange={(e) => setPosLimit(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                  <span>₹10,000</span><span>₹5,00,000</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
                </div>
              )}

              <button onClick={handleSave} disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50">
                {loading ? "Saving…" : "Save Settings"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CardManagement({ cards, onRefresh }: CardManagementProps) {
  const [hotlistTarget, setHotlistTarget] = useState<number | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<Card | null>(null);
  const [hotlistLoading, setHotlistLoading] = useState(false);
  const [hotlistError, setHotlistError] = useState<string | null>(null);
  const [hotlistSuccess, setHotlistSuccess] = useState<number | null>(null);

  const handleHotlist = async (cardId: number) => {
    setHotlistLoading(true); setHotlistError(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/cards/hotlist/${cardId}`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Hotlist failed");
      setHotlistSuccess(cardId);
      setHotlistTarget(null);
      setTimeout(() => { setHotlistSuccess(null); onRefresh(); }, 1800);
    } catch (err: any) { setHotlistError(err.message); }
    finally { setHotlistLoading(false); }
  };

  if (cards.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-500 text-sm">
        No cards linked to this account.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {cards.map((card) => (
          <div key={card.card_id} className={`glass-card p-5 transition-all ${!card.is_active ? "opacity-60" : ""}`}>
            {/* Card Visual */}
            <div className={`relative rounded-xl p-4 mb-4 overflow-hidden ${card.is_active ? "bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600" : "bg-slate-900 border border-slate-800"}`}>
              <div className="absolute top-2 right-3 opacity-40">
                <Wifi className="w-5 h-5 text-slate-300" />
              </div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{card.card_network} {card.card_type}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${card.is_active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"}`}>
                  {card.is_active ? "ACTIVE" : "HOTLISTED"}
                </span>
              </div>
              <p className="font-mono text-base text-white tracking-widest">**** **** **** {card.card_number.slice(-4)}</p>
              <div className="flex justify-between mt-3 text-[10px] text-slate-500">
                <span>Exp: {new Date(card.expiry_date).toLocaleDateString("en-US", { month: "2-digit", year: "2-digit" })}</span>
                <span className="opacity-70">Issued: {card.issued_at ? new Date(card.issued_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : '—'}</span>
                {card.international_enabled ? (
                  <span className="text-blue-400 flex items-center gap-1"><Globe className="w-3 h-3" /> International ON</span>
                ) : (
                  <span>Domestic Only</span>
                )}
              </div>
            </div>

            {/* Limits Info */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">ATM Limit</p>
                <p className="text-sm font-bold text-slate-200">₹{parseFloat(card.atm_limit || "50000").toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">POS / Online Limit</p>
                <p className="text-sm font-bold text-slate-200">₹{parseFloat(card.pos_limit || "100000").toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Actions */}
            {card.is_active ? (
              <div className="flex gap-2">
                <button onClick={() => setSettingsTarget(card)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700">
                  <Sliders className="w-3.5 h-3.5" /> Manage Limits
                </button>
                <button onClick={() => setHotlistTarget(card.card_id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition border border-red-500/20">
                  <Ban className="w-3.5 h-3.5" /> Block Card
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-red-400/70 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4" />
                This card has been permanently hotlisted and cannot be reactivated.
              </div>
            )}

            {/* Success flash */}
            {hotlistSuccess === card.card_id && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                <CheckCircle className="w-4 h-4" /> Card successfully blocked.
              </div>
            )}
            {hotlistError && (
              <p className="mt-2 text-xs text-red-400 text-center">{hotlistError}</p>
            )}
          </div>
        ))}
      </div>

      {/* Hotlist Confirmation Dialog */}
      {hotlistTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-bold mb-2">Block This Card?</h3>
            <p className="text-slate-400 text-xs mb-5">
              This is <span className="text-red-400 font-semibold">irreversible</span>. The card will be permanently hotlisted and cannot be used for any transactions.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setHotlistTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={() => handleHotlist(hotlistTarget)} disabled={hotlistLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition disabled:opacity-50">
                {hotlistLoading ? "Blocking…" : "Yes, Block Card"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsTarget && (
        <CardSettingsModal card={settingsTarget} onClose={() => setSettingsTarget(null)} onRefresh={onRefresh} />
      )}
    </>
  );
}
