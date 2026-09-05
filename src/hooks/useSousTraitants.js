import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { soustraitantService } from "../services/soustraitantService";

export function useSousTraitantsPaginated(filters = {}) {
  return useQuery({
    queryKey: ["soustraitants", filters],
    queryFn: () => soustraitantService.list(filters),
    keepPreviousData: true,
  });
}

export function useSousTraitant(id) {
  return useQuery({
    queryKey: ["soustraitant", String(id)],
    queryFn: () => soustraitantService.getById(id),
    enabled: !!id,
  });
}

export function useSaveSousTraitant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => soustraitantService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["soustraitants"] }),
  });
}

export function useSousTraitantStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut, motif }) => soustraitantService.setStatut(id, statut, motif),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["soustraitants"] });
      qc.invalidateQueries({ queryKey: ["soustraitant", String(id)] });
    },
  });
}

export function useDeleteSousTraitant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => soustraitantService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["soustraitants"] }),
  });
}
