import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import http from "../services/http";

// Liste tous les DQE d'un contrat (base + avenants)
export function useDqeList(contratId) {
  return useQuery({
    queryKey: ["dqe-list", contratId],
    enabled: !!contratId,
    queryFn: () => http.get(`/contrat/${contratId}/dqe`).then((r) => r.data),
  });
}

// Contenu d'un DQE spécifique (rubriques → postes → lignes + total)
export function useDqe(dqeId) {
  return useQuery({
    queryKey: ["dqe", dqeId],
    enabled: !!dqeId,
    queryFn: () => http.get(`/dqe/${dqeId}`).then((r) => r.data),
  });
}

export function useSaveRubrique(contratId, dqeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      http.post(`/contrat/${contratId}/dqe/rubrique`, { ...data, dqe_id: dqeId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dqe", dqeId] });
      qc.invalidateQueries({ queryKey: ["dqe-list", contratId] });
    },
  });
}

export function useDeleteRubrique(contratId, dqeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/dqe/rubrique/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dqe", dqeId] });
      qc.invalidateQueries({ queryKey: ["dqe-list", contratId] });
    },
  });
}

export function useSavePoste(contratId, dqeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rubriqueId, data }) =>
      http.post(`/dqe/rubrique/${rubriqueId}/poste`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dqe", dqeId] });
      qc.invalidateQueries({ queryKey: ["dqe-list", contratId] });
    },
  });
}

export function useDeletePoste(contratId, dqeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/dqe/poste/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dqe", dqeId] });
      qc.invalidateQueries({ queryKey: ["dqe-list", contratId] });
    },
  });
}

export function useSaveLigneDqe(contratId, dqeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ posteId, data }) =>
      http.post(`/dqe/poste/${posteId}/ligne`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dqe", dqeId] });
      qc.invalidateQueries({ queryKey: ["dqe-list", contratId] });
    },
  });
}

export function useDeleteLigneDqe(contratId, dqeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/dqe/ligne/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dqe", dqeId] });
      qc.invalidateQueries({ queryKey: ["dqe-list", contratId] });
    },
  });
}

export function useValiderDqe(contratId, dqeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profil_code, observations }) =>
      http.post(`/dqe/${dqeId}/valider`, { profil_code, observations }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dqe", dqeId] });
      qc.invalidateQueries({ queryKey: ["dqe-list", contratId] });
    },
  });
}
