import { createContext, useContext, useState, useCallback } from "react";

const ParametresContext = createContext(null);

const DEFAULT_CESSIONS_PARAMS = {
  frequence: "quotidienne", // quotidienne | hebdomadaire | mensuelle | manuelle
  plageDefautJours: 7,
  depuisDerniereRecuperation: false,
  typeMouvementX3: "Cession STT",
  magasins: ["MAG-DKR-01", "MAG-THS-02"],
  // Jour du mois auquel un état de cession est arrêté par défaut (proposé à la création,
  // modifiable état par état).
  jourArreteMensuel: 25,
  derniereRecuperation: {
    x3:         "2026-08-20T06:00:00",
    pointageMTL: "2026-08-18T07:30:00",
    paie:       null,
  },
};

/** Paramètres globaux partagés de la plateforme (hors référentiels métier dédiés). */
export function ParametresProvider({ children }) {
  const [toleranceRapprochement, setToleranceRapprochement] = useState(0);
  const [cessionsParams, setCessionsParams] = useState(DEFAULT_CESSIONS_PARAMS);

  const updateCessionsParams = useCallback((changes) => {
    setCessionsParams(prev => ({ ...prev, ...changes }));
  }, []);

  const marquerRecuperation = useCallback((source) => {
    setCessionsParams(prev => ({
      ...prev,
      derniereRecuperation: { ...prev.derniereRecuperation, [source]: new Date().toISOString() },
    }));
  }, []);

  return (
    <ParametresContext.Provider value={{
      toleranceRapprochement, setToleranceRapprochement,
      cessionsParams, updateCessionsParams, marquerRecuperation,
    }}>
      {children}
    </ParametresContext.Provider>
  );
}

export function useParametres() {
  const ctx = useContext(ParametresContext);
  if (!ctx) throw new Error("useParametres must be used inside ParametresProvider");
  return ctx;
}
