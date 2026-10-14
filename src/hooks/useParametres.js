import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parametreService } from "../services/parametreService";
import { useUser } from "../context/UserContext";
import http from "../services/http";

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

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => http.get("/permissions").then(r => r.data.data ?? []),
    staleTime: 60_000,
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cle, roles }) => http.post("/permission", { cle, roles }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions"] });
      qc.invalidateQueries({ queryKey: ["ma_permission"] });
    },
  });
}

export function usePeutFaire(action) {
  const { currentUser } = useUser();
  return useQuery({
    queryKey: ["ma_permission", action, currentUser?.id],
    queryFn: () => http.get("/permissions").then(r => {
      const roleDesig = currentUser?.role?.designation;
      if (roleDesig === "Admin") return true;
      const perm = (r.data.data ?? []).find(p => p.cle === "permission_" + action);
      if (!perm) return false;
      return perm.roles.some(r => r.designation === roleDesig && r.actif);
    }),
    enabled: !!currentUser,
    staleTime: 60_000,
  });
}
