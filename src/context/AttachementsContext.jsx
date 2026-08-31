import { createContext, useContext, useState, useCallback } from "react";
import { attachements as initialData } from "../data/attachements";

const AttachementsContext = createContext(null);

let seq = 100;
function nextCode() { return `ATT-${new Date().getFullYear()}-${String(seq++).padStart(3, "0")}`; }
function today() { return new Date().toISOString().slice(0, 10); }

export function AttachementsProvider({ children }) {
  const [attachements, setAttachements] = useState(() => [...initialData]);

  const addAttachement = useCallback((data) => {
    const code = nextCode();
    const id = code;
    const auteurNom = data.initiePar?.nom ?? data.auteurCT?.nom ?? "CT";
    const nouveau = {
      id, code,
      contratId: data.contratId,
      chantierId: data.chantierId,
      periodeDebut: data.periodeDebut,
      periodeFin:   data.periodeFin,
      statut: "Ouvert",
      initiePar: data.initiePar ?? { nom: data.auteurCT?.nom, roleId: "CT" },
      dateCreation: today(),
      voletCSE: {
        lignes: data.lignesCSE ?? [],
        totalValorise: 0,
        pieceJointes: [],
      },
      voletSTT: {
        statut: "Vide",
        fichiers: [],
      },
      visaDT:   null,
      visaDacc: null,
      montantFinal: null,
      discussion: [
        { id:`msg-init-${id}`, auteur: auteurNom, roleId: data.initiePar?.roleId ?? "CT", date: today(), message: "Dossier créé et ouvert pour saisie.", type: "action" },
      ],
    };
    setAttachements(prev => [...prev, nouveau]);
    return nouveau;
  }, []);

  const updateAttachement = useCallback((id, updater) => {
    setAttachements(prev =>
      prev.map(a => a.id === id
        ? (typeof updater === "function" ? updater(a) : { ...a, ...updater })
        : a
      )
    );
  }, []);

  /** Dossier exact (correspondance dates précises) */
  const getAttachementForPeriode = useCallback((contratId, periodeDebut, periodeFin) => {
    return attachements.find(a =>
      a.contratId === contratId &&
      a.periodeDebut === periodeDebut &&
      a.periodeFin === periodeFin
    ) ?? null;
  }, [attachements]);

  /** Dossier le plus récent (tous statuts) dont la periodeFin est ≤ dateFin */
  const getAttachementForPeriodeRange = useCallback((contratId, dateFin) => {
    const STATUTS = ["Validé", "Soumis au DACC", "En cours", "Soumis au DT", "Ouvert", "Rejeté"];
    return attachements
      .filter(a =>
        a.contratId === contratId &&
        a.periodeFin <= dateFin &&
        STATUTS.includes(a.statut)
      )
      .sort((a, b) => b.periodeFin.localeCompare(a.periodeFin))[0] ?? null;
  }, [attachements]);

  /** Dossiers pour un contrat, triés par période décroissante */
  const getAttachementsForContrat = useCallback((contratId) => {
    return attachements
      .filter(a => a.contratId === contratId)
      .sort((a, b) => b.periodeDebut.localeCompare(a.periodeDebut));
  }, [attachements]);

  /** Dossiers en attente d'action par rôle */
  const getPendingCount = useCallback((roleId) => {
    return attachements.filter(a => {
      if (roleId === "CT")   return a.statut === "Ouvert" || a.statut === "En cours";
      if (roleId === "DT")   return a.statut === "Soumis au DT" || a.statut === "En rapprochement";
      if (roleId === "DACC") return a.statut === "Soumis au DACC";
      return false;
    }).length;
  }, [attachements]);

  return (
    <AttachementsContext.Provider value={{
      attachements,
      addAttachement,
      updateAttachement,
      getAttachementForPeriode,
      getAttachementForPeriodeRange,
      getAttachementsForContrat,
      getPendingCount,
    }}>
      {children}
    </AttachementsContext.Provider>
  );
}

export function useAttachements() {
  const ctx = useContext(AttachementsContext);
  if (!ctx) throw new Error("useAttachements must be used inside AttachementsProvider");
  return ctx;
}
