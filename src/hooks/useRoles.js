import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "../services/roleService";

export function useRolesPaginated(filters = {}) {
  return useQuery({
    queryKey: ["roles_list", filters],
    queryFn: () => roleService.list(filters),
    keepPreviousData: true,
  });
}

export function useSaveRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p) => roleService.save(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles_list"] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => roleService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles_list"] }),
  });
}
