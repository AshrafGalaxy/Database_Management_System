"use client";
import { useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import MpinSetup from "@/components/MpinSetup";
import { Shield, User, MapPin, Calendar, Clock } from "lucide-react";

export default function SettingsPage() {
  const { customerId, activeAccount } = useDashboard();
  const [profile, setProfile] = useState<{address:string;date_of_birth:string;phone:string;customer_since:string;account_types:string}|null>(null);

  useEffect(() => {
    if (customerId) {
      fetch(`http://127.0.0.1:8000/api/profile/${customerId}`)
        .then(r => r.json())
        .then(d => { if (d.profile) setProfile(d.profile); })
        .catch(console.error);
    }
  }, [customerId]);

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-6">Settings & Profile</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Section */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-blue-400" /> Account Profile
            </h2>
            
            {profile ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Registered Address</p>
                    <p className="text-sm text-slate-300">{profile.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                  <Calendar className="w-4 h-4 mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Date of Birth</p>
                    <p className="text-sm text-slate-300">{new Date(profile.date_of_birth).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                  <Clock className="w-4 h-4 mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Customer Since</p>
                    <p className="text-sm text-slate-300">{new Date(profile.customer_since).toLocaleDateString("en-US", { year: 'numeric', month: 'long' })}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Loading profile...</p>
            )}
          </div>

          {/* Security & MPIN Section */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-emerald-400" /> Security Settings
            </h2>
            <div className="mb-6 border-b border-slate-700/50 pb-6">
              <p className="text-sm text-slate-400 mb-4">Set up or reset your 6-digit MPIN for quick transaction verification and secure fund transfers.</p>
              <MpinSetup customerId={customerId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
