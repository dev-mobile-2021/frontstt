/**
 * La facture n'a PAS la même structure que le décompte : elle ne porte aucune
 * ligne informative de cession (G/I/K du décompte), uniquement les postes qui
 * impactent réellement le montant dû, selon sa propre codification A à L.
 *
 * Correspondance décompte → facture (poste facture ← poste décompte) :
 * A←C, B←A, C←B, D←B', E←E, F←C', G←D, H←F, I←H, J←J, K←L, L←M
 */
export const CORRESPONDANCE_FACTURE = [
  { code: "A", decompteCode: "C",  libelle: "Avance de démarrage",                     bloc: "payer",   signe: "+" },
  { code: "B", decompteCode: "A",  libelle: "Montant mensuel travaux",                 bloc: "payer",   signe: "+" },
  { code: "C", decompteCode: "B",  libelle: "Révision de prix",                        bloc: "payer",   signe: "+" },
  { code: "D", decompteCode: "B'", libelle: "Montants à faire valoir",                 bloc: "payer",   signe: "+" },
  { code: "E", decompteCode: "E",  libelle: "Restitution partielle retenue de garantie", bloc: "payer",  signe: "+" },
  { code: "F", decompteCode: "C",  libelle: "Remboursement avances démarrage",         bloc: "deduire", signe: "-", field: "remboursement" },
  { code: "G", decompteCode: "D",  libelle: "Retenue de garantie",                     bloc: "deduire", signe: "-" },
  { code: "H", decompteCode: "F",  libelle: "Pénalités",                               bloc: "deduire", signe: "-" },
  { code: "I", decompteCode: "H",  libelle: "Remboursement avances matériaux",         bloc: "deduire", signe: "-" },
  { code: "J", decompteCode: "J",  libelle: "Remboursement mise à disposition MTL",    bloc: "deduire", signe: "-" },
  { code: "K", decompteCode: "L",  libelle: "Remboursement mise à disposition RH",     bloc: "deduire", signe: "-" },
  { code: "L", decompteCode: "M",  libelle: "Autres retenues",                         bloc: "deduire", signe: "-" },
];

/** Construit les lignes de facture CSE/STT depuis un décompte, selon la table de correspondance. */
export function buildLignesFactureDepuisDecompte(decompte) {
  return CORRESPONDANCE_FACTURE
    .map(({ code, decompteCode, libelle, signe, field }) => {
      const ligneDec = (decompte.lignes || []).find(l => l.codePoste === decompteCode);
      const montant = Math.abs(field ? (ligneDec?.[field] || 0) : (ligneDec?.mensuel || 0));
      return { code, libelle, montant, signe };
    })
    .filter(l => l.montant > 0);
}

/** Construit la ligne unique de la facture d'avance de démarrage — seule ligne positive, aucune retenue. */
export function buildLignesFactureAvance(contrat) {
  const montantInitial = contrat.montantInitialHT ?? contrat.montantHT;
  const tauxAD = contrat.tauxAD || 15;
  const montant = Math.round(montantInitial * (tauxAD / 100));
  return [{ code: "A", libelle: "Avance de démarrage", montant, signe: "+" }];
}

/** Somme signée des lignes = montant net HTVA de la facture. */
export function computeMontantHTFacture(lignes) {
  return (lignes || []).reduce((s, l) => s + (l.signe === "-" ? -l.montant : l.montant), 0);
}

/** Rapproche une facture CSE et une facture sous-traitant sur leur net TTC, à la tolérance près. */
export function rapprocherFactures(factureCSE, factureSTT, tolerance = 0) {
  const ecart = Math.abs((factureSTT?.montantTTC || 0) - (factureCSE?.montantTTC || 0));
  return { conforme: ecart <= tolerance, ecart };
}
