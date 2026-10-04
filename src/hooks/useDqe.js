import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import http from "../services/http";

// Récupère tout le DQE d'un contrat (rubriques → postes → lignes + total)
export function useDqe(contratId) {
  return useQuery({
    queryKey: ["dqe", contratId],
    enabled: !!contratId,
    queryFn: () => http.get(`/contrat/${contratId}/dqe`).then((r) => r.data),
  });
}

export function useSaveRubrique(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      http.post(`/contrat/${contratId}/dqe/rubrique`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dqe", contratId] }),
  });
}

export function useDeleteRubrique(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/dqe/rubrique/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dqe", contratId] }),
  });
}

export function useSavePoste(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rubriqueId, data }) =>
      http.post(`/dqe/rubrique/${rubriqueId}/poste`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dqe", contratId] }),
  });
}

export function useDeletePoste(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/dqe/poste/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dqe", contratId] }),
  });
}

export function useSaveLigneDqe(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ posteId, data }) =>
      http.post(`/dqe/poste/${posteId}/ligne`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dqe", contratId] }),
  });
}

export function useDeleteLigneDqe(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/dqe/ligne/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dqe", contratId] }),
  });
}
