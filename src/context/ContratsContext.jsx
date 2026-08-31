import { createContext, useContext, useState, useCallback } from "react";
import { contrats as initialContrats } from "../data/contrats";

const ContratsContext = createContext(null);

export function ContratsProvider({ children }) {
  const [contrats, setContrats] = useState(() => [...initialContrats]);

  const addContrat = useCallback((contrat) => {
    setContrats(prev => [...prev, contrat]);
  }, []);

  const updateContrat = useCallback((id, changes) => {
    setContrats(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }, []);

  return (
    <ContratsContext.Provider value={{ contrats, addContrat, updateContrat }}>
      {children}
    </ContratsContext.Provider>
  );
}

export function useContrats() {
  const ctx = useContext(ContratsContext);
  if (!ctx) throw new Error("useContrats must be used inside ContratsProvider");
  return ctx;
}
