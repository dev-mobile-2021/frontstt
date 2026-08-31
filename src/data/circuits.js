// ──────────────────────────────────────────────────────────────────────────
// CIRCUIT CONTRAT — 6 étapes, le DACC signe EN DERNIER
// Le DACC ferme le circuit contrat (signature) et ouvre le circuit décompte
// ──────────────────────────────────────────────────────────────────────────
export const CIRCUIT_CONTRAT = [
  {
    ordre: 1,
    profil: "ASSISTANTE_DEX",
    libelle: "Création de la demande de sous-traitance",
    delaiJours: 0,
    pointsControle: [
      { libelle: "Nature de la prestation renseignée (code 6Axx)", cible: "financier" },
      { libelle: "Chantier et sous-traitant identifiés et non blacklistés", cible: "info" },
    ],
  },
  {
    ordre: 2,
    profil: "DEX",
    libelle: "Saisie et contrôle du contrat (montant, tiers, chantier)",
    delaiJours: 2,
    pointsControle: [
      { libelle: "Montant du marché cohérent avec l'offre retenue", cible: "financier" },
      { libelle: "Tiers, chantier et articles corrects", cible: "info" },
      { libelle: "DQE joint et détaillé", cible: "modele" },
    ],
  },
  {
    ordre: 3,
    profil: "DEXA",
    libelle: "Validation contractuelle (DQE, pièces jointes, conformité)",
    delaiJours: 2,
    pointsControle: [
      { libelle: "Pièces jointes obligatoires présentes (contrat, DQE)", cible: "pj" },
      { libelle: "Attestation RC et agrément technique du sous-traitant valides", cible: "pj" },
      { libelle: "Modèle de décompte conforme aux articles du contrat", cible: "modele" },
    ],
  },
  {
    ordre: 4,
    profil: "DGA",
    libelle: "Validation du bon de commande — engagement financier et budget",
    delaiJours: 2,
    pointsControle: [
      { libelle: "Engagement financier compatible avec l'enveloppe budgétaire du chantier", cible: "financier" },
      { libelle: "Taux d'avance de démarrage et de retenue de garantie conformes", cible: "financier" },
    ],
  },
  {
    ordre: 5,
    profil: "DG",
    libelle: "Visa final du bon de commande avant signature",
    delaiJours: 2,
    pointsControle: [
      { libelle: "Ensemble des validations précédentes effectuées", cible: "circuit" },
      { libelle: "Aucune réserve majeure en suspens", cible: "circuit" },
    ],
  },
  {
    ordre: 6,
    profil: "DACC",
    libelle: "Signature du contrat et rattachement au bon de commande",
    delaiJours: 5,
    pointsControle: [
      { libelle: "Contrat signé disponible et téléversé", cible: "pj" },
      { libelle: "Rattachement au bon de commande effectué dans X3", cible: "financier" },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────
// CIRCUIT DÉCOMPTE — 5 étapes, le DACC crée EN PREMIER
// A1 (DACC) : crée, consolide attachement + cessions
// A2 (DEX/CT/DT) : exécuté en amont via module Attachements
// A3 (DEXA) : valide la cohérence avec le contrat-mère
// A4 (DCG) : validation analytique, cohérence cessions
// A5 (DGA) : engagement financier, solde bon de commande
// A6 (DG) : visa final, ordre de paiement
// ──────────────────────────────────────────────────────────────────────────
export const CIRCUIT_DECOMPTE = [
  {
    ordre: 1,
    profil: "DACC",
    libelle: "Création du décompte — consolidation attachement, cessions et calculs automatiques",
    delaiJours: 3,
    pointsControle: [
      { libelle: "Dossier d'attachement de la période validé par le DACC", cible: "attachement", dynamic: "att_validé" },
      { libelle: "États de cession de la période arrêtés et consommés dans ce décompte", cible: "cessions", dynamic: "etats_arretés" },
      { libelle: "Poste A = montant final du dossier d'attachement", cible: "attachement", dynamic: "poste_a_vs_att" },
      { libelle: "Lignes G/I/K alimentées par les totaux des états de cession", cible: "cessions", dynamic: "gik_vs_etats" },
      { libelle: "Lignes B et D calculées automatiquement depuis le Poste A", cible: "structure", dynamic: "bd_calculs" },
    ],
  },
  {
    ordre: 2,
    profil: "DEXA",
    libelle: "Contrôle de cohérence avec le contrat-mère — DQE, avenants, pièces jointes",
    delaiJours: 2,
    pointsControle: [
      { libelle: "Montants travaux cohérents avec le DQE et les avenants du contrat", cible: "decomptes" },
      { libelle: "Pièces jointes obligatoires présentes (bordereau d'attachement signé)", cible: "pj" },
      { libelle: "Poste A concordant avec le montant final du dossier d'attachement", cible: "attachement", dynamic: "poste_a_vs_att" },
    ],
  },
  {
    ordre: 3,
    profil: "DCG",
    libelle: "Validation analytique — états de cession, lignes informatives, remboursements",
    delaiJours: 2,
    pointsControle: [
      { libelle: "États de cession visés par le DCG (quantités) et le DACC (montants)", cible: "cessions", dynamic: "etats_visas" },
      { libelle: "Montants des lignes G/I/K conformes aux états de cession consommés", cible: "cessions", dynamic: "gik_vs_etats" },
      { libelle: "Remboursements H/J/L cohérents avec les cessions cumulées", cible: "cessions", dynamic: "hjl_vs_cessions" },
      { libelle: "Imputation analytique correcte (rubrique 6Axx)", cible: "structure" },
    ],
  },
  {
    ordre: 4,
    profil: "DGA",
    libelle: "Engagement financier — vérification du solde du bon de commande",
    delaiJours: 2,
    pointsControle: [
      { libelle: "Solde disponible du bon de commande suffisant pour couvrir ce décompte", cible: "decomptes", dynamic: "bc_solde" },
      { libelle: "Cumul des travaux dans l'enveloppe du marché actualisé", cible: "structure", dynamic: "cumul_vs_marche" },
    ],
  },
  {
    ordre: 5,
    profil: "DG",
    libelle: "Visa final — approbation définitive et ordre de paiement à la DFC",
    delaiJours: 2,
    pointsControle: [
      { libelle: "Toutes les étapes précédentes validées — résumé des visas", cible: "workflow", dynamic: "visa_summary" },
      { libelle: "Montant net TTC à régler confirmé", cible: "structure", dynamic: "net_ttc" },
    ],
  },
];

// Mapping cible (tab ID) → label d'onglet lisible
export const CIBLE_LABELS = {
  // Onglets décompte
  structure:   "Structure",
  cessions:    "Cessions",
  pj:          "Pièces jointes",
  workflow:    "Workflow",
  attachement: "Attachement",
  decomptes:   "Structure",
  // Onglets contrat
  info:        "Informations",
  financier:   "Paramétrage financier",
  modele:      "Modèle de décompte",
  circuit:     "Circuit de validation",
  avenants:    "Avenants",
};
