const POSTE_REMBOURSEMENT = { MTX: "H", MTL: "J", RH: "L" };
const POSTE_INFO_CESSION = { MTX: "G", MTL: "I", RH: "K" };
const STATUTS_CUMUL = ["Approuvé", "Payé"];
const NATURES = ["MTX", "MTL", "RH"];

/** États de cession d'un contrat, tous statuts confondus. */
export function getEtatsDuContrat(contratId, etats) {
  return etats.filter(e => e.contratId === contratId);
}

/** États déjà consommés par ce décompte précis. */
export function getEtatsConsommesParDecompte(decompteId, etats) {
  return etats.filter(e => (e.decomptesConsommateurs || []).includes(decompteId));
}

/** Total valorisé d'une section (MTX/MTL/RH) sur l'ensemble des états consommés par un décompte. */
export function getTotalSectionConsommee(decompteId, categorie, etats) {
  return getEtatsConsommesParDecompte(decompteId, etats)
    .reduce((s, e) => s + (e.sections[categorie]?.totalValorise || 0), 0);
}

/** États arrêtés d'un contrat pas encore consommés par un décompte. */
export function getEtatsArretesNonConsommes(etats, contratId = null) {
  return etats.filter(e =>
    e.statutGlobal === "Arrêté" &&
    (e.decomptesConsommateurs || []).length === 0 &&
    (!contratId || e.contratId === contratId)
  );
}

/** Total valorisé (toutes sections, tous statuts) — pour un contrat ou global. */
export function getTotalValorise(etats, { contratId } = {}) {
  return etats
    .filter(e => !contratId || e.contratId === contratId)
    .reduce((s, e) => s + NATURES.reduce((s2, cat) => s2 + (e.sections[cat]?.totalValorise || 0), 0), 0);
}

/** Nombre d'anomalies actives (non résolues) dans une section. */
export function countAnomalies(section) {
  return (section?.lignes || []).filter(l => l.anomalie?.statut === "Active").length;
}

/** Nombre d'anomalies justifiées (non bloquantes) dans une section. */
export function countAnomaliesJustifiees(section) {
  return (section?.lignes || []).filter(l => l.anomalie?.statut === "Justifiée").length;
}

/** Une section a-t-elle des données (donc doit être visée pour que l'état s'arrête) ? */
export function sectionRenseignee(section) {
  return section && section.statut !== "Non renseignée";
}

/** Toutes les sections renseignées d'un état ont-elles reçu leurs deux visas (statut "Validée") ? */
export function toutesSectionsValidees(etat) {
  return NATURES.every(cat => {
    const s = etat.sections[cat];
    return !sectionRenseignee(s) || s.statut === "Validée";
  });
}

/** Au moins une section renseignée dans l'état (sinon l'arrêté n'a pas de sens). */
export function auMoinsUneSectionRenseignee(etat) {
  return NATURES.some(cat => sectionRenseignee(etat.sections[cat]));
}

/**
 * Cumul déjà remboursé (poste H/J/L) sur les décomptes antérieurs Approuvé/Payé
 * d'un contrat, pour une nature donnée — sert de repère à la saisie du remboursement.
 */
export function getCumulRembourseAnterieur(contratId, categorie, dateFinReference, allDecomptes) {
  return getCumulPosteAnterieur(contratId, POSTE_REMBOURSEMENT[categorie], dateFinReference, allDecomptes);
}

/** Cumul cédé (poste G/I/K) reconnu sur les décomptes antérieurs Approuvé/Payé d'un contrat. */
export function getCumulCedeAnterieur(contratId, categorie, dateFinReference, allDecomptes) {
  return getCumulPosteAnterieur(contratId, POSTE_INFO_CESSION[categorie], dateFinReference, allDecomptes);
}

function getCumulPosteAnterieur(contratId, poste, dateFinReference, allDecomptes) {
  return allDecomptes
    .filter(d => d.contratId === contratId && d.dateFin < dateFinReference && STATUTS_CUMUL.includes(d.statut))
    .reduce((s, d) => s + (d.lignes?.find(l => l.codePoste === poste)?.mensuel || 0), 0);
}
