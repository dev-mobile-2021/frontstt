const STATUTS_VALIDES = ["Approuvé", "Payé"];

export function computeMontantEngageSTT(sttId, allContrats, allDecomptes) {
  const contratIds = new Set(
    allContrats.filter(c => c.sousTraitantId === sttId).map(c => c.id)
  );
  return allDecomptes
    .filter(d => contratIds.has(d.contratId) && STATUTS_VALIDES.includes(d.statut))
    .reduce((sum, d) => sum + (d.montantsCalcules?.net_ht || 0), 0);
}
