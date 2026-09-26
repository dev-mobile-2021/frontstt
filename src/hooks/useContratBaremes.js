import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contratBaremeService } from "../services/contratBaremeService";

export function useContratBaremes(contratId) {
  return useQuery({
    queryKey: ["contrat-baremes", contratId],
    queryFn: () => contratBaremeService.list(contratId),
    enabled: !!contratId,
  });
}

export function useAddContratBareme(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => contratBaremeService.add(contratId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contrat-baremes", contratId] }),
  });
}

export function useUpdateContratBaremePrix(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, prix_contrat }) => contratBaremeService.updatePrix(id, prix_contrat),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contrat-baremes", contratId] }),
  });
}

export function useValiderContratBaremePrix(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contratBaremeService.validerPrix(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contrat-baremes", contratId] }),
  });
}

export function useRemoveContratBareme(contratId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contratBaremeService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contrat-baremes", contratId] }),
  });
}
