import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { factureService } from "../services/factureService";

export function useFacturesPaginated(filters = {}) {
  return useQuery({
    queryKey: ["factures", filters],
    queryFn: () => factureService.list(filters),
    keepPreviousData: true,
  });
}

export function useFacture(id) {
  return useQuery({
    queryKey: ["facture", String(id)],
    queryFn: () => factureService.getById(id),
    enabled: !!id,
  });
}

export function useSaveFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => factureService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["factures"] }),
  });
}

export function useFactureStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut }) => factureService.setStatut(id, statut),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["factures"] });
      qc.invalidateQueries({ queryKey: ["facture", String(id)] });
    },
  });
}

export function useDeleteFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => factureService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["factures"] }),
  });
}
