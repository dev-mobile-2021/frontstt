import { createContext, useContext, useState, useCallback } from "react";
import { releves as initialReleves } from "../data/releves";

const RelevesContext = createContext(null);

export function RelevesProvider({ children }) {
  const [releves, setReleves] = useState(() => [...initialReleves]);

  const addReleve = useCallback((releve) => setReleves(prev => [...prev, releve]), []);

  const updateReleve = useCallback((id, changes) => {
    setReleves(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  }, []);

  return (
    <RelevesContext.Provider value={{ releves, addReleve, updateReleve }}>
      {children}
    </RelevesContext.Provider>
  );
}

export function useReleves() {
  const ctx = useContext(RelevesContext);
  if (!ctx) throw new Error("useReleves must be used inside RelevesProvider");
  return ctx;
}
