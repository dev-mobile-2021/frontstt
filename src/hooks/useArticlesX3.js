import { useQuery } from "@tanstack/react-query";
import { x3Service } from "../services/x3Service";

export function useArticlesX3({ search = "", classe = "", limit = 50, enabled = true } = {}) {
  return useQuery({
    queryKey: ["articles-x3", { search, classe, limit }],
    queryFn: () => x3Service.articles({ search, classe, limit }),
    enabled,
    staleTime: 60 * 1000,
  });
}
