import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { circuitService } from "../services/circuitService";

export function useCircuitEtapes(filters = {}) {
  return useQuery({
    queryKey: ["circuit_etapes", filters],
    queryFn: () => circuitService.list(filters),
    keepPreviousData: true,
  });
}

export function useSaveCircuitEtape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p) => circuitService.save(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["circuit_etapes"] }),
  });
}

export function useReorderCircuit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => circuitService.reorder(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["circuit_etapes"] }),
  });
}

export function useDeleteCircuitEtape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => circuitService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["circuit_etapes"] }),
  });
}
