"use client";
import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { UserCheck, Plus, Trash2 } from "lucide-react";

type Nominee = { nominee_id: number; nominee_name: string; relationship: string; age: number };

export default function NomineesPage() {
  const { activeAccount } = useDashboard();
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", relationship: "", age: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchNominees = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/nominees/${activeAccount.account_number}`);
      const data = await res.json();
      setNominees(data.nominees || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeAccount]);

  useEffect(() => { fetchNominees(); }, [fetchNominees]);

  const addNominee = async () => {
    if (!activeAccount || !form.name || !form.relationship || !form.age) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/nominees/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: activeAccount.account_number, nominee_name: form.name, relationship: form.relationship, age: parseInt(form.age) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Failed to add nominee."); return; }
      setSuccess(data.message || "Nominee added successfully.");
      setForm({ name: "", relationship: "", age: "" });
      await fetchNominees();
    } catch (e) { setError("Network error."); }
    finally { setSaving(false); }
  };

  const removeNominee = async (id: number, name: string) => {
    if (!confirm(`Remove ${name} as nominee?`)) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/nominees/${id}`, { method: "DELETE" });
      await fetchNominees();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-2">Nominee Management</h1>
        <p className="text-slate-500 text-sm mb-8">
          {activeAccount ? `Account: ${activeAccount.account_number}` : "Select an account from the dashboard"} · Nominees receive your account assets in case of unforeseen events.
        </p>

        {/* Add Form */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-5">
            <Plus className="w-4 h-4 text-emerald-400" /> Add New Nominee
          </h2>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">{success}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Full Name</label>
              <input
                placeholder="e.g. Kavita Sharma"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Relationship</label>
              <input
                placeholder="e.g. Spouse, Mother, Son"
                value={form.relationship}
                onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Age</label>
              <input
                type="number" min="0" max="120"
                placeholder="e.g. 45"
                value={form.age}
                onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
              />
            </div>
          </div>
          <button
            onClick={addNominee}
            disabled={saving || !form.name || !form.relationship || !form.age || !activeAccount}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm rounded-lg transition"
          >
            {saving ? "Adding…" : "Add Nominee"}
          </button>
        </div>

        {/* Existing Nominees */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
          <UserCheck className="w-4 h-4" /> Registered Nominees ({nominees.length})
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" /></div>
        ) : nominees.length === 0 ? (
          <div className="glass-card p-10 text-center text-slate-500">
            <UserCheck className="w-8 h-8 mx-auto mb-3 text-slate-700" />
            <p className="text-sm">No nominees registered for this account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nominees.map(n => (
              <div key={n.nominee_id} className="glass-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {n.nominee_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-slate-200 font-semibold">{n.nominee_name}</p>
                    <p className="text-slate-500 text-xs">{n.relationship} · {n.age} years old</p>
                  </div>
                </div>
                <button
                  onClick={() => removeNominee(n.nominee_id, n.nominee_name)}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
