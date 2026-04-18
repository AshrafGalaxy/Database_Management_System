"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { Users, Shield, Clock, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";

type Beneficiary = {
  beneficiary_id: number;
  payee_account_number: string;
  nickname: string;
  added_at: string;
  penny_drop_verified: boolean;
  cooling_period_active: boolean;
  hours_since_added: number;
  first_name?: string;
  last_name?: string;
};

export default function BeneficiariesPage() {
  const { customerId } = useDashboard();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ account: "", nickname: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBeneficiaries = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/beneficiaries/${customerId}`);
      const data = await res.json();
      setBeneficiaries(data.beneficiaries || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [customerId]);

  useEffect(() => { fetchBeneficiaries(); }, [fetchBeneficiaries]);

  const addBeneficiary = async () => {
    if (!form.account || !form.nickname) return;
    setAdding(true); setError(""); setSuccess("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/beneficiaries/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: parseInt(customerId), payee_account_number: form.account, nickname: form.nickname }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to add beneficiary."); return; }
      setSuccess(data.message || "Beneficiary added. 24-hr RBI cooling period is now active.");
      setForm({ account: "", nickname: "" });
      await fetchBeneficiaries();
    } catch (e) { setError("Network error."); }
    finally { setAdding(false); }
  };

  const deleteBeneficiary = async (id: number, nick: string) => {
    if (!confirm(`Remove "${nick}" from saved beneficiaries?`)) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/beneficiaries/${id}`, { method: "DELETE" });
      await fetchBeneficiaries();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-2">Saved Beneficiaries</h1>
        <p className="text-slate-500 text-sm mb-8">Manage your saved payees. Transfers above ₹10,000 unlock after 24-hour RBI cooling period.</p>

        {/* Add Form */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-5">
            <Plus className="w-4 h-4 text-emerald-400" /> Add New Beneficiary
          </h2>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">{success}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Payee Account Number</label>
              <input
                placeholder="e.g. ACC0000000002"
                value={form.account}
                onChange={e => setForm(p => ({ ...p, account: e.target.value.toUpperCase() }))}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Nickname / Label</label>
              <input
                placeholder="e.g. Priya Rent, Office EMI"
                value={form.nickname}
                onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
              />
            </div>
          </div>
          <div className="flex items-start gap-3 mb-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-300">RBI Mandate: A 24-hour cooling period applies to new beneficiaries. High-value transfers (above ₹10,000) will only be available after this period expires.</p>
          </div>
          <button
            onClick={addBeneficiary}
            disabled={adding || !form.account || !form.nickname}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm rounded-lg transition"
          >
            {adding ? "Adding…" : "Add Beneficiary"}
          </button>
        </div>

        {/* List */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Users className="w-4 h-4" /> Saved Payees ({beneficiaries.length})
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" /></div>
        ) : beneficiaries.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-3 text-slate-700" />
            <p className="text-sm">No saved beneficiaries yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {beneficiaries.map(b => (
              <div key={b.beneficiary_id} className="glass-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {b.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-slate-200 font-semibold">{b.nickname}</p>
                    <p className="text-slate-500 text-xs font-mono">{b.payee_account_number}</p>
                    {b.first_name && <p className="text-slate-600 text-xs">{b.first_name} {b.last_name}</p>}
                    <p className="text-slate-600 text-[10px] mt-0.5">Added: {new Date(b.added_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {b.cooling_period_active ? (
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                      <Clock className="w-3 h-3" />
                      <span>{24 - (b.hours_since_added || 0)}h remaining</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active</span>
                    </div>
                  )}
                  <button
                    onClick={() => deleteBeneficiary(b.beneficiary_id, b.nickname)}
                    className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
