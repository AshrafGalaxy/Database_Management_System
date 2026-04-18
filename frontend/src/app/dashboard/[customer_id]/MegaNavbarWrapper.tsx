"use client";
import MegaNavbar from "@/components/MegaNavbar";
import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

export default function MegaNavbarWrapper() {
  const params = useParams();
  const customerId = params.customer_id as string;
  const [username, setUsername] = useState("User");
  const [lastLogin, setLastLogin] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUsername(localStorage.getItem("username") || "User");
      const stored = localStorage.getItem("last_login");
      if (stored) {
        setLastLogin(new Date(stored).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        }));
      } else {
        setLastLogin("First login");
      }
    }
  }, []);

  return <MegaNavbar customerId={customerId} username={username} lastLogin={lastLogin} />;
}
