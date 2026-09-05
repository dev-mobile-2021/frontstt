import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { decompteService } from "../services/decompteService";

export function useDecomptesPaginated(filters = {}) {
  return useQuery({
    queryKey: ["decomptes", filters],
    queryFn: () => decompteService.list(filters),
    keepPreviousData: true,
  });
}

export function useDecompte(id) {
  return useQuery({
    queryKey: ["decompte", String(id)],
    queryFn: () => decompteService.getById(id),
    enabled: !!id,
  });
}

export function useSaveDecompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => decompteService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decomptes"] }),
  });
}

export function useValiderDecompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => decompteService.valider(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["decomptes"] });
      qc.invalidateQueries({ queryKey: ["decompte", String(id)] });
    },
  });
}

export function useRejeterDecompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }) => decompteService.rejeter(id, motif),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["decomptes"] });
      qc.invalidateQueries({ queryKey: ["decompte", String(id)] });
    },
  });
}

export function usePayerDecompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => decompteService.payer(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["decomptes"] });
      qc.invalidateQueries({ queryKey: ["decompte", String(id)] });
    },
  });
}

export function useDeleteDecompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => decompteService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decomptes"] }),
  });
}

export function useDecompteCircuit() {
  return useQuery({
    queryKey: ["decompte_circuit"],
    queryFn: () => decompteService.getCircuit(),
    staleTime: 5 * 60 * 1000, // circuit rarement modifié
  });
}
