/**
 * Catalogue de référence des 14 postes du modèle de décompte CSE.
 * Ce catalogue est la source canonique utilisée à la création d'un contrat.
 * Chaque contrat reçoit une COPIE INDÉPENDANTE (via buildModeleContrat()).
 *
 * signe: "+" | "-" | "info"
 *   "info" = ligne de suivi uniquement, jamais incluse dans le calcul du net HT.
 *   Seuls les postes de type "montant" ou "pourcentage" avec signe "+" ou "-" participent au calcul.
 *
 * enAttente: true = poste en attente de clarification client (Moussa BA), affiché avec badge orange.
 */

export const POSTES_CATALOGUE = [
  {
    id: "p1", code: "A", ordre: 1,
    poste: "Travaux exécutés",
    signe: "+", type: "montant",
    actifDefaut: true, verrouille: true, enAttente: false,
    description: "Montant brut des travaux réalisés au cours de la période",
  },
  {
    id: "p2", code: "B", ordre: 2,
    poste: "Révisions de prix",
    signe: "+", type: "pourcentage",
    actifDefaut: false, verrouille: false, enAttente: true,
    tauxDefaut: 11,
    description: "Indexation contractuelle sur variation des coûts (indices BTP Sénégal)",
  },
  {
    id: "p3", code: "B'", ordre: 3,
    poste: "Sommes à faire valoir",
    signe: "+", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: true,
    description: "Provisions contractuelles pour imprévus ou travaux non définis à la signature",
  },
  {
    id: "p4", code: "C", ordre: 4,
    poste: "Avances démarrage (info)",
    signe: "info", type: "pourcentage",
    actifDefaut: true, verrouille: false, enAttente: false,
    tauxDefaut: 15,
    description: "Avance versée en début de contrat — ligne informative uniquement, non comptée dans le net HT",
  },
{
    id: "p5", code: "D", ordre: 5,
    poste: "Retenue de garantie",
    signe: "-", type: "pourcentage",
    actifDefaut: true, verrouille: true, enAttente: false,
    tauxDefaut: 5,
    description: "Retenue prélevée sur chaque décompte, libérée à l'événement déclencheur du contrat",
  },
  {
    id: "p6", code: "E", ordre: 6,
    poste: "Restitution RG",
    signe: "+", type: "evenementiel",
    actifDefaut: true, verrouille: false, enAttente: false,
    description: "Libération de la retenue de garantie, déclenchée par l'événement paramétré dans l'onglet Financier",
  },
  {
    id: "p7", code: "F", ordre: 7,
    poste: "Pénalités",
    signe: "-", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: true,
    description: "Pénalités de retard ou de non-conformité appliquées au décompte courant",
  },
  {
    id: "p8", code: "G", ordre: 8,
    poste: "Cessions matériaux (info)",
    signe: "info", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: false,
    description: "Valeur des matériaux mis à disposition par CSE — suivi informatif uniquement, jamais compté dans le net HT",
  },
  {
    id: "p9", code: "H", ordre: 9,
    poste: "Remboursement cessions matériaux",
    signe: "-", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: false,
    description: "Montant remboursé par le STT pour les matériaux reçus — seul poste financier MTX",
  },
  {
    id: "p10", code: "I", ordre: 10,
    poste: "Cessions matériel (info)",
    signe: "info", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: false,
    description: "Valeur du matériel mis à disposition par CSE — suivi informatif uniquement, jamais compté dans le net HT",
  },
  {
    id: "p11", code: "J", ordre: 11,
    poste: "Remboursement cessions matériel",
    signe: "-", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: false,
    description: "Montant remboursé par le STT pour le matériel reçu — seul poste financier MTL",
  },
  {
    id: "p12", code: "K", ordre: 12,
    poste: "Cessions ressources humaines (info)",
    signe: "info", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: false,
    description: "Valeur des ressources humaines mises à disposition par CSE — informatif uniquement, jamais compté dans le net HT",
  },
  {
    id: "p13", code: "L", ordre: 13,
    poste: "Remboursement RH",
    signe: "-", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: false,
    description: "Montant remboursé par le STT pour les ressources humaines mises à disposition",
  },
  {
    id: "p14", code: "M", ordre: 14,
    poste: "Autres retenues",
    signe: "-", type: "montant",
    actifDefaut: false, verrouille: false, enAttente: false,
    description: "Retenues diverses — libellé obligatoire si activé",
  },
];

/**
 * Crée une copie indépendante du modèle pour un contrat donné.
 * @param {string[]} actifIds - codes des postes à activer (ex. ["A","C","D","E","G","H"])
 * Les postes verrouillés (A, D) sont toujours actifs indépendamment de actifIds.
 */
export function buildModeleContrat(actifIds = []) {
  const actifSet = new Set(actifIds);
  return POSTES_CATALOGUE.map((p) => ({
    ...p,
    actif: p.verrouille ? true : actifSet.has(p.code),
  }));
}
