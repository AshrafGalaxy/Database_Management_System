"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "next/navigation";

// Define Global Architecture Interfaces
type Account = {
  account_number: string;
  account_type: string;
  current_balance: string;
  min_balance: string;
  overdraft_limit: string;
  customer_name: string;
  account_status: string;
  kyc_status: string;
  branch_name: string;
  ifsc_code: string;
};

interface DashboardContextType {
  customerId: string;
  accounts: Account[];
  activeAccount: Account | null;
  setActiveAccount: (account: Account) => void;
  refreshDashboard: () => Promise<void>;
  loading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const customerId = params.customer_id as string;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshDashboard = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/dashboard/${customerId}`);
      const data = await res.json();
      if (data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        if (!activeAccount) {
          setActiveAccount(data.accounts[0]);
        } else {
          // Re-sync active account with fresh DB bounds
          const updatedActive = data.accounts.find((a: Account) => a.account_number === activeAccount.account_number);
          if (updatedActive) setActiveAccount(updatedActive);
        }
      }
    } catch (err) {
      console.error("Dashboard DB fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, [customerId]);

  return (
    <DashboardContext.Provider value={{ customerId, accounts, activeAccount, setActiveAccount, refreshDashboard, loading }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be mounted within a DashboardProvider");
  }
  return context;
}
