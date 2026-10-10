import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { x3Service } from "../services/x3Service";

/** BC Sage X3 liés à un contrat. */
export function useBonCommandesByContrat(contratId) {
  return useQuery({
    queryKey: ["bons_commande", { contrat_id: contratId }],
    queryFn: () => x3Service.bonsCommandeContrat(contratId),
    enabled: !!contratId,
  });
}

/** Recherche à la demande dans X3 (chantier + sous-traitant du contrat). */
export function useRechercheBonsCommandeX3() {
  return useMutation({
    mutationFn: (contratId) => x3Service.rechercherBonsCommande(contratId),
  });
}

export function useLierBonsCommande(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (numeros) => x3Service.lierBonsCommande(contratId, numeros),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}

export function useDelierBonCommande() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => x3Service.delierBonCommande(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bons_commande"] }),
  });
}
