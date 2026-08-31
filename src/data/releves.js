/**
 * Relevé de compte sous-traitant — document contradictoire remis avant
 * facturation, correspond au rapport R1 "Fiche de validation décompte"
 * du cahier des charges (les deux ne font qu'un).
 */
export const releves = [
  {
    id: "rel-2026-001",
    code: "REL-2026-001",
    decompteId: "DEC-2026-CTR001-M01",
    contratId: "CTR-2026-001",
    dateGeneration: "2026-03-01",
    statut: "Accepté",
    dateEnvoi: "2026-03-01",
    dateReponse: "2026-03-03",
    motifContestation: null,
    ligneContestee: null,
  },
  {
    id: "rel-2026-002",
    code: "REL-2026-002",
    decompteId: "DEC-2026-CTR002-M01",
    contratId: "CTR-2026-002",
    dateGeneration: "2026-04-02",
    statut: "Contesté",
    dateEnvoi: "2026-04-02",
    dateReponse: "2026-04-05",
    motifContestation: "Le cumul des travaux (poste A) ne correspond pas à notre propre décompte des attachements de mars — écart de 1 800 000 FCFA constaté sur les quantités de menuiseries posées.",
    ligneContestee: "A — Travaux exécutés",
  },
];
