/**
 * Bon de commande — document pivot du suivi financier.
 * Un seul BC par contrat (relation 1:1). Émis à la signature DACC (statut
 * "Approuvé final"), actualisé par les avenants validés, alimenté par une
 * réception partielle à chaque décompte approuvé.
 *
 * Généré programmatiquement depuis contrats.js + decomptes.js pour rester
 * cohérent avec l'état réel des décomptes (y compris ceux créés dynamiquement).
 */
import { contrats } from "./contrats";
import { decomptes } from "./decomptes";

const STATUTS_AVEC_BC = ["Approuvé final", "En cours d'exécution", "Clôturé", "Suspendu"];
const STATUTS_RECEPTION = ["Approuvé", "Payé"];

function findDaccDate(contrat) {
  const daccStep = (contrat.circuitValidation || []).find(s => s.profil === "DACC" && s.statut === "validé");
  return daccStep?.date || contrat.dateDebut;
}

function findApprobationDate(decompte) {
  const evt = (decompte.historique || []).find(h => h.action?.includes("Approbation"));
  return (evt?.date || decompte.dateFin + "T00:00:00").slice(0, 10);
}

// Compteur séquentiel par année pour le format BC-2026-0XX
const compteurParAnnee = {};
function nextCode(annee) {
  compteurParAnnee[annee] = (compteurParAnnee[annee] || 0) + 1;
  return `BC-${annee}-${String(compteurParAnnee[annee]).padStart(3, "0")}`;
}

function buildBC(contrat) {
  const annee = contrat.code.match(/CTR-(\d{4})-/)?.[1] || "2026";
  const avenantsValides = (contrat.avenants || []).filter(a => a.statutValidationDFC === "Validé");
  const avenantsIntegres = avenantsValides.map(a => ({
    avenantId: a.id,
    numero: a.numero,
    montant: a.montant,
    dateIntegration: a.dateSignature,
  }));

  const decomptesContrat = decomptes
    .filter(d => d.contratId === contrat.id && STATUTS_RECEPTION.includes(d.statut))
    .sort((a, b) => a.dateFin.localeCompare(b.dateFin));

  const receptions = decomptesContrat.map(d => ({
    decompteId: d.id,
    codeDecompte: d.code,
    montantNetHT: d.montantsCalcules?.net_ht || 0,
    dateReception: findApprobationDate(d),
  }));

  const montantInitial = contrat.montantInitialHT ?? contrat.montantHT;
  const montantBC = montantInitial + avenantsIntegres.reduce((s, a) => s + (a.montant || 0), 0);
  const totalReceptions = receptions.reduce((s, r) => s + (r.montantNetHT || 0), 0);
  const solde = montantBC - totalReceptions;

  return {
    id: `bc-${contrat.id}`,
    code: nextCode(annee),
    contratId: contrat.id,
    dateEmission: findDaccDate(contrat),
    montantInitial,
    avenantsIntegres,
    receptions,
    statut: contrat.statut === "Clôturé" ? "Clôturé" : solde <= 0 ? "Soldé" : "Actif",
  };
}

export const bonsCommande = contrats
  .filter(c => STATUTS_AVEC_BC.includes(c.statut))
  .map(buildBC);
