import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chantierService } from "../services/chantierService";

export function useChantiersList() {
  return useQuery({
    queryKey: ["chantiers_list"],
    queryFn: () => chantierService.listDropdown(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useChantiersPaginated(filters = {}) {
  return useQuery({
    queryKey: ["chantiers", filters],
    queryFn: () => chantierService.list(filters),
    keepPreviousData: true,
  });
}

export function useChantier(id) {
  return useQuery({
    queryKey: ["chantier", String(id)],
    queryFn: () => chantierService.getById(id),
    enabled: !!id,
  });
}

export function useSaveChantier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => chantierService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chantiers"] }),
  });
}

export function useChantierStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut }) => chantierService.setStatut(id, statut),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["chantiers"] });
      qc.invalidateQueries({ queryKey: ["chantier", String(id)] });
    },
  });
}

export function useDeleteChantier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => chantierService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chantiers"] }),
  });
}
