import { createContext, useContext, useState, useCallback } from "react";
import { decomptes as initialDecomptes } from "../data/decomptes";

const DecomptesContext = createContext(null);

export function DecomptesProvider({ children }) {
  const [decomptes, setDecomptes] = useState(() => [...initialDecomptes]);

  const addDecompte = useCallback((d) => setDecomptes(prev => [...prev, d]), []);

  const updateDecompte = useCallback((id, changes) => {
    setDecomptes(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d));
  }, []);

  const addFilMessage = useCallback((decompteId, message) => {
    setDecomptes(prev => prev.map(d =>
      d.id === decompteId
        ? { ...d, fil_discussion: [...(d.fil_discussion || []), message] }
        : d
    ));
  }, []);

  return (
    <DecomptesContext.Provider value={{ decomptes, addDecompte, updateDecompte, addFilMessage }}>
      {children}
    </DecomptesContext.Provider>
  );
}

export function useDecomptes() {
  const ctx = useContext(DecomptesContext);
  if (!ctx) throw new Error("useDecomptes must be used inside DecomptesProvider");
  return ctx;
}
