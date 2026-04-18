"use client";
import { useState, useEffect, useRef } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { User, Shield, Edit3, Check, X, Eye, EyeOff, Phone, Mail, MapPin, Fingerprint, CreditCard, Hash, Calendar, BadgeCheck, AlertCircle } from "lucide-react";

type Profile = {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  kyc_status: string;
  customer_since: string;
  pan_number: string | null;
  aadhaar_number: string | null;
  aadhaar_linked: boolean;
  cif_number: string | null;
  account_types: string | null;
};

type EditField = "email" | "phone" | "address" | null;

export default function ProfilePage() {
  const { customerId, accounts } = useDashboard();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditField>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showPan, setShowPan] = useState(false);

  const fetchProfile = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/profile/${customerId}`);
      const data = await res.json();
      setProfile(data.profile);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, [customerId]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const startEdit = (field: EditField) => {
    if (!profile || !field) return;
    setEditing(field);
    setEditValue(profile[field] as string);
  };

  const cancelEdit = () => { setEditing(null); setEditValue(""); };

  const saveEdit = async () => {
    if (!editing || !customerId) return;
    setSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/profile/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editing]: editValue }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.detail || "Update failed.", "error"); return; }
      showToast("Profile updated successfully.", "success");
      setEditing(null);
      await fetchProfile();
    } catch { showToast("Network error.", "error"); }
    finally { setSaving(false); }
  };

  const maskPan = (pan: string | null) => {
    if (!pan) return "—";
    return showPan ? pan : `${pan.slice(0, 2)}XXX${pan.slice(5, 7)}XX${pan.slice(9)}`;
  };
  
  const maskAadhaar = (aad: string | null) => {
    if (!aad) return "—";
    return showPan ? aad : `XXXX-XXXX-${aad.slice(-4)}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-500">Profile not found.</div>
  );

  const kycColor = profile.kyc_status === "Verified" ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
    profile.kyc_status === "Rejected" ? "text-red-400 bg-red-500/15 border-red-500/30" : "text-amber-400 bg-amber-500/15 border-amber-500/30";

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"} text-white animate-in slide-in-from-right-5`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-emerald-500/20">
            {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.first_name} {profile.last_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${kycColor}`}>{profile.kyc_status === "Verified" ? "✓ KYC Verified" : profile.kyc_status}</span>
              <span className="text-slate-500 text-xs">Customer ID: {profile.customer_id}</span>
              {profile.cif_number && <span className="text-slate-500 text-xs">CIF: {profile.cif_number}</span>}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Personal Information */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
              <User className="w-3.5 h-3.5" /> Personal Information
            </h2>

            {/* Read-only fields */}
            {[
              { label: "Full Name", value: `${profile.first_name} ${profile.last_name}`, icon: <User className="w-4 h-4" />, readonly: true },
              { label: "Date of Birth", value: new Date(profile.date_of_birth).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), icon: <Calendar className="w-4 h-4" />, readonly: true },
              { label: "Customer Since", value: new Date(profile.customer_since).toLocaleDateString("en-IN", { month: "long", year: "numeric" }), icon: <Hash className="w-4 h-4" />, readonly: true },
              { label: "Account Types", value: profile.account_types || "—", icon: <CreditCard className="w-4 h-4" />, readonly: true },
            ].map(f => (
              <div key={f.label} className="glass-card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                  {f.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">{f.label}</p>
                  <p className="text-slate-200 text-sm font-medium">{f.value}</p>
                </div>
                <span className="text-[9px] text-slate-600 uppercase tracking-wider">Read-only</span>
              </div>
            ))}

            {/* Editable: Phone */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500"><Phone className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Mobile Number</p>
                  {editing === "phone" ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="tel"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        maxLength={10}
                        className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button onClick={saveEdit} disabled={saving} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={cancelEdit} className="p-1.5 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <p className="text-slate-200 text-sm font-medium">{profile.phone}</p>
                  )}
                </div>
                {editing !== "phone" && (
                  <button onClick={() => startEdit("phone")} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition"><Edit3 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>

            {/* Editable: Email */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500"><Mail className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Email Address</p>
                  {editing === "email" ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="email"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button onClick={saveEdit} disabled={saving} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition disabled:opacity-50"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={cancelEdit} className="p-1.5 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <p className="text-slate-200 text-sm font-medium">{profile.email}</p>
                  )}
                </div>
                {editing !== "email" && (
                  <button onClick={() => startEdit("email")} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition"><Edit3 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>

            {/* Editable: Address */}
            <div className="glass-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 mt-0.5"><MapPin className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Registered Address</p>
                  {editing === "address" ? (
                    <div className="mt-1 space-y-2">
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-400 transition disabled:opacity-50 font-semibold">Save</button>
                        <button onClick={cancelEdit} className="px-3 py-1.5 bg-slate-700 text-slate-400 text-xs rounded-lg hover:bg-slate-600 transition font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-200 text-sm leading-relaxed">{profile.address}</p>
                  )}
                </div>
                {editing !== "address" && (
                  <button onClick={() => startEdit("address")} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition"><Edit3 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          </div>

          {/* Right: KYC & Document Status */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Shield className="w-3.5 h-3.5" /> KYC & Document Status
            </h2>

            {/* KYC Status */}
            <div className={`glass-card p-5 border ${kycColor.includes("emerald") ? "border-emerald-500/20" : kycColor.includes("red") ? "border-red-500/20" : "border-amber-500/20"}`}>
              <div className="flex items-center gap-3">
                <BadgeCheck className={`w-6 h-6 ${profile.kyc_status === "Verified" ? "text-emerald-400" : "text-amber-400"}`} />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">KYC Status</p>
                  <p className={`font-bold text-sm ${profile.kyc_status === "Verified" ? "text-emerald-400" : "text-amber-400"}`}>{profile.kyc_status}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{profile.kyc_status === "Verified" ? "Your identity has been verified." : "Complete KYC to enable all features."}</p>
                </div>
              </div>
            </div>

            {/* PAN Card */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">PAN Card Number</p>
                  <p className="text-slate-200 font-mono text-sm tracking-widest">{maskPan(profile.pan_number)}</p>
                  <p className="text-slate-600 text-xs mt-0.5">Linked with your bank account</p>
                </div>
                <div className="flex items-center gap-2">
                  {profile.pan_number && (
                    <button onClick={() => setShowPan(p => !p)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition">
                      {showPan ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <span className="text-[9px] text-slate-600 uppercase tracking-wider">Read-only</span>
                </div>
              </div>
            </div>

            {/* Aadhaar Seeding */}
            <div className={`glass-card p-5 border ${profile.aadhaar_linked ? "border-emerald-500/20" : "border-amber-500/20"}`}>
              <div className="flex items-center gap-3">
                <Fingerprint className={`w-5 h-5 ${profile.aadhaar_linked ? "text-emerald-400" : "text-amber-400"}`} />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">UIDAI Aadhaar Number</p>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-slate-200 font-mono text-sm tracking-widest">{maskAadhaar(profile.aadhaar_number)}</p>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${profile.aadhaar_linked ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {profile.aadhaar_linked ? "Seeded" : "Unverified"}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {profile.aadhaar_linked ? "Aadhaar is actively linked to your bank account." : "Identity unverified. Visit your branch to link Aadhaar for DBT eligibility."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {profile.aadhaar_number && (
                    <button onClick={() => setShowPan(p => !p)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition">
                      {showPan ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <span className="text-[9px] text-slate-600 uppercase tracking-wider">Read-only</span>
                </div>
              </div>
            </div>

            {/* Nominee Notice */}
            <div className="glass-card p-5 border border-indigo-500/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Nominee Registration</p>
                  <p className="text-slate-300 text-sm">Ensure your nominees are up to date.</p>
                  <a href="nominees" className="text-indigo-400 hover:text-indigo-300 text-xs underline mt-1 inline-block">Manage Nominees →</a>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="glass-card p-4 bg-slate-800/30">
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Fields marked as "Read-only" are protected by RBI mandate and cannot be changed online. To update PAN or Name, visit your nearest branch with supporting documents. All data is encrypted and stored per applicable data protection laws.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
