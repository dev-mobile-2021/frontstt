import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { baremeHierarchieService as svc } from "../services/baremeHierarchieService";

const KEYS = ["bareme-general", "bareme-chantier", "bareme-contrat", "contrat-baremes", "baremes"];

function useRefresh() {
  const qc = useQueryClient();
  return () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/** Rafraîchit les caches du barème après un import. */
export function useRefreshBareme() {
  return useRefresh();
}

// ── Général
export function useBaremeGeneral() {
  return useQuery({ queryKey: ["bareme-general"], queryFn: () => svc.listGeneral() });
}
export function useHistoriqueBaremeGeneral(id) {
  return useQuery({ queryKey: ["bareme-general", "historique", id], queryFn: () => svc.historiqueGeneral(id), enabled: !!id });
}
export function useAddBaremeGeneral() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (p) => svc.addGeneral(p), onSuccess: refresh });
}
export function useSetPrixGeneral() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, ...p }) => svc.setPrixGeneral(id, p), onSuccess: refresh });
}
export function useRemoveBaremeGeneral() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id) => svc.removeGeneral(id), onSuccess: refresh });
}

// ── Chantier
export function useBaremeChantier(chantierId) {
  return useQuery({ queryKey: ["bareme-chantier", String(chantierId)], queryFn: () => svc.listChantier(chantierId), enabled: !!chantierId });
}
export function useBaremeChantierActions(chantierId) {
  const refresh = useRefresh();
  return {
    setPrix: useMutation({ mutationFn: ({ baremeId, prix, motif }) => svc.setPrixChantier(chantierId, baremeId, { prix, motif }), onSuccess: refresh }),
    reset: useMutation({ mutationFn: (baremeId) => svc.resetChantier(chantierId, baremeId), onSuccess: refresh }),
    valider: useMutation({ mutationFn: (baremeId) => svc.validerChantier(chantierId, baremeId), onSuccess: refresh }),
  };
}

// ── Contrat
export function useBaremeContrat(contratId) {
  return useQuery({ queryKey: ["bareme-contrat", String(contratId)], queryFn: () => svc.listContrat(contratId), enabled: !!contratId });
}
export function useAddBaremeContrat(contratId) {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (p) => svc.addContrat(contratId, p), onSuccess: refresh });
}

export function useBaremeContratActions(contratId) {
  const refresh = useRefresh();
  return {
    setPrix: useMutation({ mutationFn: ({ baremeId, prix, motif, date_effet }) => svc.setPrixContrat(contratId, baremeId, { prix, motif, date_effet }), onSuccess: refresh }),
    reset: useMutation({ mutationFn: (baremeId) => svc.resetContrat(contratId, baremeId), onSuccess: refresh }),
    valider: useMutation({ mutationFn: (contratBaremeId) => svc.validerContrat(contratBaremeId), onSuccess: refresh }),
    validerBulk: useMutation({ mutationFn: (ids) => svc.validerContratBulk(ids), onSuccess: refresh }),
  };
}
