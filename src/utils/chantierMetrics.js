const STATUTS_VALIDES = ["Payé", "Approuvé"];

/** Retourne les contrats appartenant à un chantier (source : contrat.chantierId). */
export function getContratsDuChantier(chantierId, allContrats) {
  return allContrats.filter(c => c.chantierId === chantierId);
}

export function computeEngageSTT(chantier, allDecomptes, allContrats) {
  const ids = new Set(getContratsDuChantier(chantier.id, allContrats || []).map(c => c.id));
  if (!ids.size) return 0;
  return allDecomptes
    .filter(d => ids.has(d.contratId) && STATUTS_VALIDES.includes(d.statut))
    .reduce((sum, d) => sum + (d.montantsCalcules?.net_ht || 0), 0);
}

export function computeEnValidationSTT(chantier, allDecomptes, allContrats) {
  const ids = new Set(getContratsDuChantier(chantier.id, allContrats || []).map(c => c.id));
  if (!ids.size) return 0;
  return allDecomptes
    .filter(d => ids.has(d.contratId) && d.statut === "En validation")
    .reduce((sum, d) => sum + (d.montantsCalcules?.net_ht || 0), 0);
}

export function computeBudgetFamilles(chantier, allDecomptes, allContrats) {
  const engageSTT = computeEngageSTT(chantier, allDecomptes, allContrats);
  return (chantier.budgetFamilles || []).map(f =>
    f.famille === "Sous-traitants" ? { ...f, engage: engageSTT } : f
  );
}
