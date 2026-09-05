import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parametreService } from "../services/parametreService";

export function useParametresPaginated(filters = {}) {
  return useQuery({
    queryKey: ["parametres", filters],
    queryFn: () => parametreService.list(filters),
    keepPreviousData: true,
  });
}

export function useUpdateParametre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cle, valeur }) => parametreService.update(cle, valeur),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parametres"] }),
  });
}
