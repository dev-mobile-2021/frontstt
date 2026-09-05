import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { baremeService } from "../services/baremeService";

export function useBaremesPaginated(filters = {}) {
  return useQuery({
    queryKey: ["baremes", filters],
    queryFn: () => baremeService.list(filters),
    keepPreviousData: true,
  });
}

export function useBareme(id) {
  return useQuery({
    queryKey: ["bareme", String(id)],
    queryFn: () => baremeService.getById(id),
    enabled: !!id,
  });
}

export function useSaveBareme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => baremeService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["baremes"] }),
  });
}

export function useDeleteBareme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => baremeService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["baremes"] }),
  });
}
