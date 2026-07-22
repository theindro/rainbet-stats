import { createContext, useContext } from "react";

export const BetContext = createContext(null);

export function useBetContext() {
  const ctx = useContext(BetContext);
  if (!ctx) throw new Error("useBetContext must be used within BetProvider");
  return ctx;
}
