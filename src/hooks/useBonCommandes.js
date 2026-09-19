import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bonCommandeService } from "../services/bonCommandeService";

export function useBonCommandesByContrat(contrat_id) {
  return useQuery({
    queryKey: ["bons_commande", { contrat_id }],
    queryFn: () => bonCommandeService.list({ contrat_id, count: 50 }),
    enabled: !!contrat_id,
    select: (d) => d?.data ?? [],
  });
}

export function useSaveBonCommande() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => bonCommandeService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}

export function useSaveBonCommandeLigne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => bonCommandeService.saveLigne(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}

export function useDeleteBonCommandeLigne() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => bonCommandeService.deleteLigne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}

export function useBonCommandeStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut, motif }) => bonCommandeService.setStatut(id, statut, motif),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}

export function useDeleteBonCommande() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => bonCommandeService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}
