import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { attachementService } from "../services/attachementService";

let seq = 100;
function nextCode() { return `ATT-${new Date().getFullYear()}-${String(seq++).padStart(3, "0")}`; }
function today() { return new Date().toISOString().slice(0, 10); }

// Drop-in replacement for useAttachements() from AttachementsContext.
// Provides the same { attachements, addAttachement, updateAttachement, ... } API.
export function useAttachements() {
  const [attachements, setAttachements] = useState([]);
  const qc = useQueryClient();

  const { data: remote = [], isSuccess } = useQuery({
    queryKey: ["attachements_all"],
    queryFn: () => attachementService.list(),
    staleTime: 60 * 1000,
  });

  // Sync remote → local whenever the query refreshes
  useEffect(() => {
    if (isSuccess) setAttachements(remote);
  }, [isSuccess, remote]);

  const addAttachement = useCallback(async (data) => {
    const code = nextCode();
    const id   = code;
    const auteurNom = data.initiePar?.nom ?? data.auteurCT?.nom ?? "CT";
    const nouveau = {
      id, code,
      contratId:   data.contratId,
      chantierId:  data.chantierId,
      periodeDebut: data.periodeDebut,
      periodeFin:   data.periodeFin,
      statut: "Ouvert",
      initiePar: data.initiePar ?? { nom: data.auteurCT?.nom, roleId: "CT" },
      dateCreation: today(),
      voletCSE: { lignes: data.lignesCSE ?? [], totalValorise: 0 },
      voletSTT: { statut: "Vide", fichiers: [] },
      visaDT: null, visaDacc: null, montantFinal: null,
      discussion: [
        { id: `msg-init-${id}`, auteur: auteurNom, roleId: data.initiePar?.roleId ?? "CT", date: today(), message: "Dossier créé et ouvert pour saisie.", type: "action" },
      ],
    };

    setAttachements(prev => [...prev, nouveau]);
    await attachementService.save(nouveau);
    await qc.invalidateQueries({ queryKey: ["attachements_all"] });
    return nouveau;
  }, [qc]);

  const updateAttachement = useCallback((id, updater) => {
    setAttachements(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        const updated = typeof updater === "function" ? updater(a) : { ...a, ...updater };
        attachementService.save(updated).then(() =>
          qc.invalidateQueries({ queryKey: ["attachements_all"] })
        );
        return updated;
      })
    );
  }, [qc]);

  // ── Helpers (same signatures as old context) ──────────────────────
  const getAttachementForPeriode = useCallback((contratId, periodeDebut, periodeFin) =>
    attachements.find(a =>
      a.contratId === contratId &&
      a.periodeDebut === periodeDebut &&
      a.periodeFin   === periodeFin
    ) ?? null,
  [attachements]);

  const getAttachementForPeriodeRange = useCallback((contratId, dateFin) => {
    const STATUTS = ["Validé","Soumis au DACC","En cours","Soumis au DT","Ouvert","Rejeté"];
    return attachements
      .filter(a => a.contratId === contratId && a.periodeFin <= dateFin && STATUTS.includes(a.statut))
      .sort((a, b) => b.periodeFin.localeCompare(a.periodeFin))[0] ?? null;
  }, [attachements]);

  const getAttachementsForContrat = useCallback((contratId) =>
    attachements
      .filter(a => a.contratId === contratId)
      .sort((a, b) => b.periodeDebut.localeCompare(a.periodeDebut)),
  [attachements]);

  const getPendingCount = useCallback((roleId) =>
    attachements.filter(a => {
      if (roleId === "CT")   return a.statut === "Ouvert" || a.statut === "En cours";
      if (roleId === "DT")   return a.statut === "Soumis au DT" || a.statut === "En rapprochement";
      if (roleId === "DACC") return a.statut === "Soumis au DACC";
      return false;
    }).length,
  [attachements]);

  return {
    attachements,
    addAttachement,
    updateAttachement,
    getAttachementForPeriode,
    getAttachementForPeriodeRange,
    getAttachementsForContrat,
    getPendingCount,
  };
}
