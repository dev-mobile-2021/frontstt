import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import http from "../services/http";
import { circuitService } from "../services/circuitService";

// ─── Contrat-specific circuit hooks ─────────────────────────────

export function useCircuitModules() {
  return useQuery({
    queryKey: ["circuit-modules"],
    queryFn: () => http.get("/circuit/modules").then((r) => r.data?.data ?? r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useContratCircuitConfig(contratId, module) {
  return useQuery({
    queryKey: ["circuit-contrat", contratId, module],
    queryFn: () =>
      http
        .get("/circuit", { params: { contrat_id: contratId, module } })
        .then((r) => r.data?.data ?? r.data),
    enabled: !!contratId && !!module,
    retry: false,
  });
}

export function useSaveContratCircuit(contratId, module) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => http.post("/circuit", payload).then((r) => r.data?.data ?? r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["circuit-contrat", contratId, module] });
    },
  });
}

export function useCopierDefautCircuit(contratId, module) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      http.post("/circuit/copier-defaut", payload).then((r) => r.data?.data ?? r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["circuit-contrat", contratId, module] });
    },
  });
}

export function useDeleteContratEtape(contratId, module) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/circuit/etape/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["circuit-contrat", contratId, module] });
    },
  });
}

// ─── Global parametrage circuit hooks ────────────────────────────

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
