import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { releveService } from "../services/releveService";

export function useRelevesPaginated(filters = {}) {
  return useQuery({
    queryKey: ["releves", filters],
    queryFn: () => releveService.list(filters),
    keepPreviousData: true,
  });
}

export function useReleve(id) {
  return useQuery({
    queryKey: ["releve", String(id)],
    queryFn: () => releveService.getById(id),
    enabled: !!id,
  });
}

export function useSaveReleve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => releveService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["releves"] }),
  });
}

export function useChangerStatutReleve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut, ...extras }) => releveService.changerStatut(id, statut, extras),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["releves"] });
      qc.invalidateQueries({ queryKey: ["releve", String(id)] });
    },
  });
}

export function useDeleteReleve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => releveService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["releves"] }),
  });
}
