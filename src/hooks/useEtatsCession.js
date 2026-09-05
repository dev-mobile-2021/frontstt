import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { etatCessionService } from "../services/etatCessionService";

export function useEtatsCessionPaginated(filters = {}) {
  return useQuery({
    queryKey: ["etats_cession", filters],
    queryFn: () => etatCessionService.list(filters),
    keepPreviousData: true,
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
    mutationFn: ({ id, statut }) => etatCessionService.setStatut(id, statut),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["etats_cession"] });
      qc.invalidateQueries({ queryKey: ["etat_cession", String(id)] });
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
