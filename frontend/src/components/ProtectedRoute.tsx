"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("role");
    
    if (!role) {
      router.push("/auth/login");
    } else if (!allowedRoles.includes(role)) {
      // Role exists but does not match required bounds (e.g. user trying to hit /admin)
      if (role === 'admin') router.push("/admin/dashboard");
      else router.push(`/dashboard/${localStorage.getItem('customer_id')}`);
    } else {
      setIsAuthorized(true);
    }
    setLoading(false);
  }, [pathname, router]);

  if (loading) {
    return <div className="min-h-screen bg-[#0b0f19] flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
           </div>;
  }

  if (!isAuthorized) {
    return <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-center items-center text-white p-8">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
              <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
              <p className="text-slate-400">Your role-based access control (RBAC) token strictly forbids this route.</p>
           </div>;
  }

  return <>{children}</>;
}
