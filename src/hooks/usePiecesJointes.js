import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pieceJointeService } from "../services/pieceJointeService";

export function usePiecesJointes(contrat_id) {
  return useQuery({
    queryKey: ["pieces_jointes", contrat_id],
    queryFn: () => pieceJointeService.list(contrat_id),
    enabled: !!contrat_id,
  });
}

export function useUploadPieceJointe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contrat_id, categorie, fichier }) =>
      pieceJointeService.upload(contrat_id, categorie, fichier),
    onSuccess: (_data, { contrat_id }) =>
      qc.invalidateQueries({ queryKey: ["pieces_jointes", contrat_id] }),
  });
}

export function useDeletePieceJointe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => pieceJointeService.delete(id),
    onSuccess: (_data, { contrat_id }) =>
      qc.invalidateQueries({ queryKey: ["pieces_jointes", contrat_id] }),
  });
}
