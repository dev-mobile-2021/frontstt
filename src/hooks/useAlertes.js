import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { decompteService } from "../services/decompteService";

const STATUTS_PENDING = ["soumis", "valide_ct", "valide_cp", "valide_daf"];

const PENDING_LABEL = {
  soumis:     "soumis — en attente CT",
  valide_ct:  "validé CT — en attente CP",
  valide_cp:  "validé CP — en attente DAF",
  valide_daf: "validé DAF — en attente DG",
};

export function useAlertes() {
  const { data } = useQuery({
    queryKey: ["decomptes_alertes"],
    queryFn: () => decompteService.list({ count: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const decomptes = data?.data ?? [];

  return useMemo(() => {
    const result = [];

    decomptes
      .filter(d => STATUTS_PENDING.includes(d.statut))
      .forEach(d => result.push({
        id:      `pend-${d.id}`,
        type:    "warning",
        titre:   "En attente de validation",
        message: `${d.code} — ${PENDING_LABEL[d.statut] ?? d.statut}`,
        lien:    `/decomptes/${d.id}`,
      }));

    decomptes
      .filter(d => d.statut === "rejete")
      .forEach(d => result.push({
        id:      `rej-${d.id}`,
        type:    "danger",
        titre:   "Décompte rejeté",
        message: `${d.code}${d.motif_rejet ? ` — ${d.motif_rejet.slice(0, 70)}` : ""}`,
        lien:    `/decomptes/${d.id}`,
      }));

    return result;
  }, [decomptes]);
}
