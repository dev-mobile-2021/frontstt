const STATUTS_VALIDES = ["Approuvé", "Payé"];

/** Somme des net_ht des décomptes Approuvé ou Payé pour ce contrat. */
export function computeMontantRealise(contratId, allDecomptes) {
  return allDecomptes
    .filter((d) => d.contratId === contratId && STATUTS_VALIDES.includes(d.statut))
    .reduce((sum, d) => sum + (d.montantsCalcules?.net_ht || 0), 0);
}

/** Somme des net_ht des décomptes En validation pour ce contrat. */
export function computeMontantEnValidation(contratId, allDecomptes) {
  return allDecomptes
    .filter((d) => d.contratId === contratId && d.statut === "En validation")
    .reduce((sum, d) => sum + (d.montantsCalcules?.net_ht || 0), 0);
}

/** Nombre de décomptes actifs (hors Rejeté) pour ce contrat. */
export function computeNombreDecomptes(contratId, allDecomptes) {
  return allDecomptes.filter((d) => d.contratId === contratId && d.statut !== "Rejeté").length;
}

/** Décomposition lisible : { total, payés, approuvés, enValidation, brouillons, rejetés } */
export function computeDecompteBreakdown(contratId, allDecomptes) {
  const dec = allDecomptes.filter((d) => d.contratId === contratId);
  return {
    total:        dec.length,
    payés:        dec.filter(d => d.statut === "Payé").length,
    approuvés:    dec.filter(d => d.statut === "Approuvé").length,
    enValidation: dec.filter(d => d.statut === "En validation").length,
    brouillons:   dec.filter(d => d.statut === "Brouillon").length,
    rejetés:      dec.filter(d => d.statut === "Rejeté").length,
  };
}

/**
 * Le barème de cessions est un référentiel de prix, pas un engagement de périmètre (contrairement au DQE) :
 * il reste éditable tant que le contrat est actif, verrouillé seulement à la clôture/résiliation.
 * "Suspendu" reste inclus : un contrat suspendu peut porter un décompte Rejeté encore à corriger,
 * qui a besoin du barème pour ses cessions — le verrouiller créerait un cul-de-sac.
 */
export function isBaremeEditable(contrat) {
  if (!contrat) return true;
  return ["Brouillon", "Approuvé final", "En cours d'exécution", "Suspendu"].includes(contrat.statut);
}

/** Montant HT actualisé = montantInitialHT + somme des avenants validés. */
export function getMontantActualise(contrat) {
  const base = contrat.montantInitialHT ?? contrat.montantHT;
  const avenants = contrat.avenants ?? [];
  const delta = avenants
    .filter((a) => a.statutValidationDFC === "Validé")
    .reduce((s, a) => s + (a.montant || 0), 0);
  return base + delta;
}

/** Solde restant = montantHT actualisé − montantRealise calculé. */
export function computeSoldeRestant(contrat, allDecomptes) {
  const realise = computeMontantRealise(contrat.id, allDecomptes);
  return getMontantActualise(contrat) - realise;
}
