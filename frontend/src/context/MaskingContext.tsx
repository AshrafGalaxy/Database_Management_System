"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface MaskingContextType {
  isMasked: boolean;
  toggleMask: () => void;
  maskValue: (value: string, keepLast?: number) => string;
}

const MaskingContext = createContext<MaskingContextType | undefined>(undefined);

export function MaskingProvider({ children }: { children: ReactNode }) {
  const [isMasked, setIsMasked] = useState(true);

  const toggleMask = () => setIsMasked((prev) => !prev);

  /**
   * Masks a value, showing only the last `keepLast` characters.
   * Example: maskValue("ACC0000000001", 4) => "XXXXXXXXX0001"
   */
  const maskValue = (value: string, keepLast: number = 4): string => {
    if (!isMasked) return value;
    if (value.length <= keepLast) return value;
    return "X".repeat(value.length - keepLast) + value.slice(-keepLast);
  };

  return (
    <MaskingContext.Provider value={{ isMasked, toggleMask, maskValue }}>
      {children}
    </MaskingContext.Provider>
  );
}

export function useMasking() {
  const context = useContext(MaskingContext);
  if (!context) throw new Error("useMasking must be used within a MaskingProvider");
  return context;
}
