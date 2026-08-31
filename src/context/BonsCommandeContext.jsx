import { createContext, useContext, useState, useCallback } from "react";
import { bonsCommande as initialBonsCommande } from "../data/bonsCommande";

const BonsCommandeContext = createContext(null);

export function BonsCommandeProvider({ children }) {
  const [bonsCommande, setBonsCommande] = useState(() => [...initialBonsCommande]);

  const addBonCommande = useCallback((bc) => setBonsCommande(prev => [...prev, bc]), []);

  const updateBonCommande = useCallback((id, changes) => {
    setBonsCommande(prev => prev.map(bc => bc.id === id ? { ...bc, ...changes } : bc));
  }, []);

  const addReception = useCallback((contratId, reception) => {
    setBonsCommande(prev => prev.map(bc =>
      bc.contratId === contratId
        ? { ...bc, receptions: [...(bc.receptions || []), reception] }
        : bc
    ));
  }, []);

  return (
    <BonsCommandeContext.Provider value={{ bonsCommande, addBonCommande, updateBonCommande, addReception }}>
      {children}
    </BonsCommandeContext.Provider>
  );
}

export function useBonsCommande() {
  const ctx = useContext(BonsCommandeContext);
  if (!ctx) throw new Error("useBonsCommande must be used inside BonsCommandeProvider");
  return ctx;
}
