import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bonCommandeService } from "../services/bonCommandeService";

export function useBonsCommandePaginated(filters = {}) {
  return useQuery({
    queryKey: ["bons_commande", filters],
    queryFn: () => bonCommandeService.list(filters),
    keepPreviousData: true,
  });
}

export function useBonCommande(id) {
  return useQuery({
    queryKey: ["bon_commande", String(id)],
    queryFn: () => bonCommandeService.getById(id),
    enabled: !!id,
  });
}

export function useSaveBonCommande() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => bonCommandeService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}

export function useSaveLigneBC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => bonCommandeService.saveLigne(payload),
    onSuccess: (_data, payload) => {
      if (payload?.bon_commande_id) {
        qc.invalidateQueries({ queryKey: ["bon_commande", String(payload.bon_commande_id)] });
      }
    },
  });
}

export function useDeleteLigneBC() {
  return useMutation({
    mutationFn: (id) => bonCommandeService.deleteLigne(id),
  });
}

export function useBonCommandeStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut, motif }) => bonCommandeService.setStatut(id, statut, motif),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["bons_commande"] });
      qc.invalidateQueries({ queryKey: ["bon_commande", String(id)] });
    },
  });
}

export function useDeleteBonCommande() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => bonCommandeService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}
