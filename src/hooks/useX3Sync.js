import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { x3Service } from "../services/x3Service";

export function useX3SyncStatus() {
  return useQuery({
    queryKey: ["x3-sync-status"],
    queryFn: () => x3Service.syncStatus(),
    staleTime: 30 * 1000,
  });
}

/** Lance la synchro d'un module X3 puis rafraîchit les listes concernées. */
export function useX3Sync(module, invalidateKeys = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params) => x3Service.sync(module, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["x3-sync-status"] });
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/** Ajout unitaire depuis X3. type : "chantier" | "soustraitant" */
export function useAjouterDepuisX3(type) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codeX3) => type === "chantier" ? x3Service.ajouterChantier(codeX3) : x3Service.ajouterSoustraitant(codeX3),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [type === "chantier" ? "chantiers" : "soustraitants"] });
    },
  });
}

/** Synchronise uniquement le chantier de la fiche (aucun autre enregistrement). */
export function useSynchroniserChantier(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => x3Service.synchroniserChantier(id),
    onSuccess: () => {
      ["chantiers", "chantier"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
