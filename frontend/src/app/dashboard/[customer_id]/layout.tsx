import ProtectedRoute from "@/components/ProtectedRoute";
import { DashboardProvider } from "@/context/DashboardContext";
import { SessionProvider } from "@/context/SessionContext";
import { MaskingProvider } from "@/context/MaskingContext";
import MegaNavbarWrapper from "./MegaNavbarWrapper";

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['user']}>
      <SessionProvider>
        <MaskingProvider>
          <DashboardProvider>
            <MegaNavbarWrapper />
            {children}
          </DashboardProvider>
        </MaskingProvider>
      </SessionProvider>
    </ProtectedRoute>
  );
}
