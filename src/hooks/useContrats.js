import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contratService } from "../services/contratService";

export function useContratsPaginated(filters = {}) {
  return useQuery({
    queryKey: ["contrats", filters],
    queryFn: () => contratService.list(filters),
    keepPreviousData: true,
  });
}

export function useContrat(id) {
  return useQuery({
    queryKey: ["contrat", String(id)],
    queryFn: () => contratService.getById(id),
    enabled: !!id,
  });
}

export function useSaveContrat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => contratService.save(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contrats"] }),
  });
}

export function useContratStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut, motif }) => contratService.setStatut(id, statut, motif),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["contrats"] });
      qc.invalidateQueries({ queryKey: ["contrat", String(id)] });
    },
  });
}

export function useDeleteContrat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contratService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contrats"] }),
  });
}

export function useContratCircuit() {
  return useQuery({
    queryKey: ["contrat_circuit"],
    queryFn: () => contratService.getCircuit(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSoumettreContrat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contratService.soumettre(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["contrats"] });
      qc.invalidateQueries({ queryKey: ["contrat", String(id)] });
    },
  });
}

export function useValiderContrat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contratService.valider(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["contrats"] });
      qc.invalidateQueries({ queryKey: ["contrat", String(id)] });
    },
  });
}

export function useRejeterContrat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motif }) => contratService.rejeter(id, motif),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["contrats"] });
      qc.invalidateQueries({ queryKey: ["contrat", String(id)] });
    },
  });
}
