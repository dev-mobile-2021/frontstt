import { createContext, useContext, useState, useCallback } from "react";
import { factures as initialFactures } from "../data/factures";

const FacturesContext = createContext(null);

export function FacturesProvider({ children }) {
  const [factures, setFactures] = useState(() => [...initialFactures]);

  const addFacture = useCallback((facture) => setFactures(prev => [...prev, facture]), []);

  const updateFacture = useCallback((id, changes) => {
    setFactures(prev => prev.map(f => f.id === id ? { ...f, ...changes } : f));
  }, []);

  return (
    <FacturesContext.Provider value={{ factures, addFacture, updateFacture }}>
      {children}
    </FacturesContext.Provider>
  );
}

export function useFactures() {
  const ctx = useContext(FacturesContext);
  if (!ctx) throw new Error("useFactures must be used inside FacturesProvider");
  return ctx;
}
