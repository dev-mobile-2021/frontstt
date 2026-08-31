/**
 * Référentiel général des barèmes tarifaires de cession — matériaux (MTX),
 * matériel (MTL) et personnel (RH) mis à disposition des sous-traitants.
 *
 * Sage X3 fournit les QUANTITÉS de cession MTX (sorties de stock "Cession STT")
 * mais ne détient PAS les prix unitaires — cette tarification est portée par la
 * plateforme. La GMAO n'est que le référentiel des matériels et de leurs tarifs
 * (base des engins) : les cessions MTL elles-mêmes proviennent du pointage
 * journalier terrain, jamais de la GMAO. RH : tarifs des états de paie DCH,
 * cessions importées depuis le fichier de paie.
 */

// ──────────────────────────────────────────────────────────────────────────
// BARÈME MTX — matériaux (source : X3 référentiel articles pour la liste,
// prix unitaire propre à la plateforme)
// ──────────────────────────────────────────────────────────────────────────
export const BAREME_MTX = [
  { id: "mtx-01", codeArticleX3: "X3-CIM-001", designation: "Ciment CEM I 42.5", famille: "Ciments", unite: "sac", prixUnitaireReference: 4500, coefficientRendementDefaut: 0.98, actif: true },
  { id: "mtx-02", codeArticleX3: "X3-CIM-002", designation: "Ciment CEM II 32.5", famille: "Ciments", unite: "sac", prixUnitaireReference: 3800, coefficientRendementDefaut: 0.97, actif: true },
  { id: "mtx-03", codeArticleX3: "X3-CIM-003", designation: "Ciment CEM II 42.5", famille: "Ciments", unite: "sac", prixUnitaireReference: 4200, coefficientRendementDefaut: 0.97, actif: true },
  { id: "mtx-04", codeArticleX3: "X3-CIM-004", designation: "Ciment CEM III", famille: "Ciments", unite: "sac", prixUnitaireReference: 4600, coefficientRendementDefaut: 0.96, actif: true },
  { id: "mtx-05", codeArticleX3: "X3-ACR-006", designation: "Acier HA Ø 6 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 650000, coefficientRendementDefaut: 0.95, actif: true },
  { id: "mtx-06", codeArticleX3: "X3-ACR-008", designation: "Acier HA Ø 8 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 640000, coefficientRendementDefaut: 0.95, actif: true },
  { id: "mtx-07", codeArticleX3: "X3-ACR-010", designation: "Acier HA Ø 10 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 630000, coefficientRendementDefaut: 0.96, actif: true },
  { id: "mtx-08", codeArticleX3: "X3-ACR-012", designation: "Acier HA Ø 12 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 625000, coefficientRendementDefaut: 0.96, actif: true },
  { id: "mtx-09", codeArticleX3: "X3-ACR-014", designation: "Acier HA Ø 14 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 620000, coefficientRendementDefaut: 0.97, actif: true },
  { id: "mtx-10", codeArticleX3: "X3-ACR-016", designation: "Acier HA Ø 16 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 615000, coefficientRendementDefaut: 0.97, actif: true },
  { id: "mtx-11", codeArticleX3: "X3-ACR-020", designation: "Acier HA Ø 20 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 610000, coefficientRendementDefaut: 0.98, actif: true },
  { id: "mtx-12", codeArticleX3: "X3-ACR-025", designation: "Acier HA Ø 25 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 605000, coefficientRendementDefaut: 0.98, actif: true },
  { id: "mtx-13", codeArticleX3: "X3-ACR-032", designation: "Acier HA Ø 32 mm", famille: "Aciers HA", unite: "tonne", prixUnitaireReference: 600000, coefficientRendementDefaut: 0.98, actif: true },
  { id: "mtx-14", codeArticleX3: "X3-BPE-150", designation: "Béton prêt à l'emploi B150", famille: "Béton prêt à l'emploi", unite: "m³", prixUnitaireReference: 45000, coefficientRendementDefaut: 1, actif: true },
  { id: "mtx-15", codeArticleX3: "X3-BPE-250", designation: "Béton prêt à l'emploi B250", famille: "Béton prêt à l'emploi", unite: "m³", prixUnitaireReference: 55000, coefficientRendementDefaut: 1, actif: true },
  { id: "mtx-16", codeArticleX3: "X3-BPE-350", designation: "Béton prêt à l'emploi B350", famille: "Béton prêt à l'emploi", unite: "m³", prixUnitaireReference: 65000, coefficientRendementDefaut: 1, actif: true },
  { id: "mtx-17", codeArticleX3: "X3-GAS-001", designation: "Gas-oil", famille: "Gas-oil", unite: "litre", prixUnitaireReference: 750, coefficientRendementDefaut: 1, actif: true },
  { id: "mtx-18", codeArticleX3: "X3-SAB-001", designation: "Sable de dune lavé", famille: "Sable et agrégats", unite: "m³", prixUnitaireReference: 8500, coefficientRendementDefaut: 0.99, actif: true },
  { id: "mtx-19", codeArticleX3: "X3-GRA-614", designation: "Gravier concassé 6/14", famille: "Sable et agrégats", unite: "m³", prixUnitaireReference: 12000, coefficientRendementDefaut: 0.99, actif: true },
  { id: "mtx-20", codeArticleX3: "X3-GRA-1525", designation: "Gravier concassé 15/25", famille: "Sable et agrégats", unite: "m³", prixUnitaireReference: 11500, coefficientRendementDefaut: 0.99, actif: true },
];

// ──────────────────────────────────────────────────────────────────────────
// BARÈME MTL — matériel et engins (source : GMAO Atelier Central — tarif
// à la durée d'utilisation, pas à la quantité)
// ──────────────────────────────────────────────────────────────────────────
export const BAREME_MTL = [
  { id: "mtl-01", codeMateriel: "GMAO-PEL-20T", designation: "Pelle hydraulique 20T", categorie: "Terrassement", uniteFacturation: "heure", tarifHoraire: 25000, tarifJournalier: 180000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-02", codeMateriel: "GMAO-TRC-001", designation: "Tractopelle", categorie: "Terrassement", uniteFacturation: "heure", tarifHoraire: 18000, tarifJournalier: 130000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-03", codeMateriel: "GMAO-CHG-001", designation: "Chargeur sur pneus", categorie: "Terrassement", uniteFacturation: "jour", tarifHoraire: 22000, tarifJournalier: 160000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-04", codeMateriel: "GMAO-BUL-D6", designation: "Bulldozer D6", categorie: "Terrassement", uniteFacturation: "jour", tarifHoraire: 35000, tarifJournalier: 250000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-05", codeMateriel: "GMAO-GRD-001", designation: "Grader", categorie: "Terrassement", uniteFacturation: "jour", tarifHoraire: 28000, tarifJournalier: 200000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-06", codeMateriel: "GMAO-BET-350", designation: "Bétonnière 350L", categorie: "Béton", uniteFacturation: "jour", tarifHoraire: 8000, tarifJournalier: 55000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-07", codeMateriel: "GMAO-PVB-001", designation: "Pervibrateur", categorie: "Béton", uniteFacturation: "jour", tarifHoraire: 3500, tarifJournalier: 25000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-08", codeMateriel: "GMAO-CAM-10M3", designation: "Camion benne 10m³", categorie: "Transport", uniteFacturation: "heure", tarifHoraire: 15000, tarifJournalier: 110000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-09", codeMateriel: "GMAO-CGR-001", designation: "Camion grue", categorie: "Levage", uniteFacturation: "heure", tarifHoraire: 30000, tarifJournalier: 220000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-10", codeMateriel: "GMAO-GRT-001", designation: "Grue à tour", categorie: "Levage", uniteFacturation: "jour", tarifHoraire: 40000, tarifJournalier: 300000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-11", codeMateriel: "GMAO-PLT-001", designation: "Plateau porte-char", categorie: "Transport", uniteFacturation: "jour", tarifHoraire: 20000, tarifJournalier: 150000, sourceBareme: "GMAO - Atelier Central", actif: true },
  { id: "mtl-12", codeMateriel: "GMAO-CMP-001", designation: "Compacteur monocylindre", categorie: "Compactage", uniteFacturation: "jour", tarifHoraire: 16000, tarifJournalier: 115000, sourceBareme: "GMAO - Atelier Central", actif: true },
];

// ──────────────────────────────────────────────────────────────────────────
// BARÈME RH — personnel mis à disposition (source : États de paie DCH)
// Deux régimes : journalier (coût/jour-homme) et permanent (salaire brut
// mensuel + charges sociales, appliqué au prorata des jours affectés)
// ──────────────────────────────────────────────────────────────────────────
export const BAREME_RH = [
  { id: "rh-01", qualification: "Manœuvre", typePersonnel: "journalier", coutJournalier: 5000, salaireBrutMensuel: null, tauxChargesSociales: null, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-02", qualification: "Maçon", typePersonnel: "journalier", coutJournalier: 7500, salaireBrutMensuel: null, tauxChargesSociales: null, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-03", qualification: "Coffreur", typePersonnel: "journalier", coutJournalier: 8000, salaireBrutMensuel: null, tauxChargesSociales: null, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-04", qualification: "Ferrailleur", typePersonnel: "journalier", coutJournalier: 8500, salaireBrutMensuel: null, tauxChargesSociales: null, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-05", qualification: "Conducteur d'engin", typePersonnel: "journalier", coutJournalier: 12000, salaireBrutMensuel: null, tauxChargesSociales: null, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-06", qualification: "Électricien", typePersonnel: "journalier", coutJournalier: 9000, salaireBrutMensuel: null, tauxChargesSociales: null, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-07", qualification: "Chef d'équipe", typePersonnel: "permanent", coutJournalier: null, salaireBrutMensuel: 350000, tauxChargesSociales: 23, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-08", qualification: "Ingénieur travaux", typePersonnel: "permanent", coutJournalier: null, salaireBrutMensuel: 650000, tauxChargesSociales: 23, sourceBareme: "États de paie DCH", actif: true },
  { id: "rh-09", qualification: "Chef de chantier", typePersonnel: "permanent", coutJournalier: null, salaireBrutMensuel: 450000, tauxChargesSociales: 23, sourceBareme: "États de paie DCH", actif: true },
];

/** Calcule le coût-jour effectif d'une entrée RH permanente (prorata des jours affectés dans le mois). */
export function coutJourPermanent(entree, joursOuvresMois = 26) {
  if (entree.typePersonnel !== "permanent") return entree.coutJournalier || 0;
  const brut = entree.salaireBrutMensuel || 0;
  const charges = brut * ((entree.tauxChargesSociales || 0) / 100);
  return Math.round((brut + charges) / joursOuvresMois);
}
