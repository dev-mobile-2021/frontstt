import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { etatCessionService } from "../services/etatCessionService";

export function useEtatsCessionPaginated(filters = {}, options = {}) {
  return useQuery({
    queryKey: ["etats_cession", filters],
    queryFn: () => etatCessionService.list(filters),
    keepPreviousData: true,
    ...options,
  });
}

export function useEtatCession(id) {
  return useQuery({
    queryKey: ["etat_cession", String(id)],
    queryFn: () => etatCessionService.getById(id),
    enabled: !!id,
  });
}

export function useSaveEtatCession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => etatCessionService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["etats_cession"] }),
  });
}

export function useSaveLigneEC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => etatCessionService.saveLigne(payload),
    onSuccess: (_data, payload) => {
      if (payload.etat_cession_id) {
        qc.invalidateQueries({ queryKey: ["etat_cession", String(payload.etat_cession_id)] });
      }
    },
  });
}

export function useDeleteLigneEC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => etatCessionService.deleteLigne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["etat_cession"] }),
  });
}

export function useEtatCessionStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut, motif }) => etatCessionService.setStatut(id, statut, motif),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["etats_cession"] });
      qc.invalidateQueries({ queryKey: ["etat_cession", String(id)] });
    },
  });
}

export function useEtatCessionStatutBloc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bloc, statut }) => etatCessionService.setStatutBloc(id, bloc, statut),
    onSuccess: (res, { id }) => {
      const updated = res?.data;
      if (updated) {
        qc.setQueryData(["etat_cession", String(id)], (old) => old ? {
          ...old,
          statut_mtx:    updated.statut_mtx,
          statut_gasoil: updated.statut_gasoil,
          statut_rh:     updated.statut_rh,
          statut_mtl:    updated.statut_mtl,
          vise_qte_par:  updated.vise_qte_par,
          vise_qte_le:   updated.vise_qte_le,
          vise_prix_par: updated.vise_prix_par,
          vise_prix_le:  updated.vise_prix_le,
        } : old);
      }
      qc.invalidateQueries({ queryKey: ["etats_cession"] });
    },
  });
}

export function useDeleteEtatCession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => etatCessionService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["etats_cession"] }),
  });
}
