"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, AlertCircle, ArrowRight, LockKeyhole, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Database Lockout: Invalid authentication trace.");
      }

      if (data.success) {
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);
        if (data.last_login) {
          localStorage.setItem("last_login", data.last_login);
        } else {
          localStorage.removeItem("last_login"); // First ever login
        }
        if (data.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          localStorage.setItem("customer_id", data.customer_id);
          router.push(`/dashboard/${data.customer_id}`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f19] overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-emerald/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <button onClick={() => router.push('/')} className="text-slate-500 hover:text-white transition text-sm mb-8 flex items-center gap-1">
           &larr; Back to Platform
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-800/50 p-4 rounded-2xl mb-4 border border-slate-700/50 shadow-xl">
            <LockKeyhole className="w-8 h-8 text-white" />
          </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
              Nexus Bank
            </h1>
            <p className="text-slate-400 text-xs tracking-widest uppercase font-medium">Secure Net Banking Portal</p>
        </div>

        <div className="glass-card p-8 border-t-2 border-t-emerald-500">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Username</label>
              <input
                id="login-username"
                type="text"
                className="input-field bg-slate-900/50 border-slate-700"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex justify-between">
                Password
                <span className="text-emerald-500 hover:text-emerald-400 cursor-pointer transition lowercase tracking-normal font-normal">Forgot password?</span>
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="input-field bg-slate-900/50 border-slate-700 w-full pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-slate-500 hover:text-white transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-sm animate-in shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 group disabled:opacity-50"
            >
              {loading ? "Signing In…" : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              New customer?{" "}
              <button onClick={() => router.push('/auth/register')} className="text-white hover:text-emerald-400 font-medium transition cursor-pointer">
                Open an Account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
