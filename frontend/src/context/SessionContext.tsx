"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface SessionContextType {
  isWarningVisible: boolean;
  countdown: number;
  resetTimer: () => void;
  forceLogout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes
const WARNING_DURATION_S = 30;             // 30-second countdown

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION_S);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const forceLogout = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    localStorage.removeItem("role");
    localStorage.removeItem("customer_id");
    localStorage.removeItem("username");
    window.location.href = "/auth/login?reason=timeout";
  }, []);

  const startCountdown = useCallback(() => {
    setIsWarningVisible(true);
    setCountdown(WARNING_DURATION_S);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          forceLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [forceLogout]);

  const resetTimer = useCallback(() => {
    setIsWarningVisible(false);
    setCountdown(WARNING_DURATION_S);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [startCountdown]);

  useEffect(() => {
    // Only activate if a user session exists
    const role = localStorage.getItem("role");
    if (!role) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleActivity = () => {
      if (!isWarningVisible) resetTimer();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity));
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isWarningVisible, resetTimer, startCountdown]);

  return (
    <SessionContext.Provider value={{ isWarningVisible, countdown, resetTimer, forceLogout }}>
      {children}
      {isWarningVisible && <SessionTimeoutModal countdown={countdown} onStayLoggedIn={resetTimer} onLogout={forceLogout} />}
    </SessionContext.Provider>
  );
}

function SessionTimeoutModal({
  countdown,
  onStayLoggedIn,
  onLogout,
}: {
  countdown: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-amber-500/10 text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Session Expiring</h2>
        <p className="text-slate-400 text-sm mb-6">
          Your session will automatically expire due to inactivity. You will be securely logged out in:
        </p>

        {/* Countdown Ring */}
        <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-6">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="#f59e0b" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / 30)}`}
              className="transition-all duration-1000"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-2xl font-bold text-amber-400">{countdown}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
          >
            Log Out
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition shadow-lg shadow-amber-500/20"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within a SessionProvider");
  return context;
}
