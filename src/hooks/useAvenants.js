import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { avenantService } from "../services/avenantService";

/** Un contrat ou un avenant modifié change le « STT engagé » des chantiers : on rafraîchit aussi leurs caches. */
function invalidateContrats(qc) {
  qc.invalidateQueries({ queryKey: ["contrats"] });
  qc.invalidateQueries({ queryKey: ["chantiers"] });
  qc.invalidateQueries({ queryKey: ["chantier"] });
}

export function useAvenantsByContrat(contratId) {
  return useQuery({
    queryKey: ["avenants", contratId],
    queryFn: () => avenantService.list(contratId),
    enabled: !!contratId,
  });
}

export function useSaveAvenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => avenantService.save(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["avenants", String(vars.contrat_id)] });
      qc.invalidateQueries({ queryKey: ["avenants", vars.contrat_id] });
      qc.invalidateQueries({ queryKey: ["contrat"] });
      invalidateContrats(qc);
    },
  });
}

export function useValiderAvenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => avenantService.valider(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avenants"] });
      qc.invalidateQueries({ queryKey: ["contrat"] });
      invalidateContrats(qc);
    },
  });
}

export function useDeleteAvenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => avenantService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avenants"] });
      qc.invalidateQueries({ queryKey: ["contrat"] });
      invalidateContrats(qc);
    },
  });
}
