/** Montant du bon de commande = montant initial + somme des avenants intégrés. */
export function getMontantBC(bc) {
  if (!bc) return 0;
  const avenants = bc.avenantsIntegres || [];
  return bc.montantInitial + avenants.reduce((s, a) => s + (a.montant || 0), 0);
}

/** Somme des montants nets HT déjà reçus (réceptions partielles) sur ce BC. */
export function getTotalReceptions(bc) {
  if (!bc) return 0;
  return (bc.receptions || []).reduce((s, r) => s + (r.montantNetHT || 0), 0);
}

/** Solde disponible = montant du BC − total des réceptions déjà effectuées. */
export function getSoldeDisponible(bc) {
  if (!bc) return 0;
  return getMontantBC(bc) - getTotalReceptions(bc);
}

/** Taux de consommation du BC, en pourcentage entier. */
export function getTauxConsommation(bc) {
  const montant = getMontantBC(bc);
  if (montant <= 0) return 0;
  return Math.round((getTotalReceptions(bc) / montant) * 100);
}

/** Retrouve le bon de commande unique rattaché à un contrat. */
export function getBCDuContrat(contratId, allBonsCommande) {
  return (allBonsCommande || []).find(bc => bc.contratId === contratId) || null;
}
