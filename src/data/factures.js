/**
 * Factures — trois types coexistent :
 *  - "avance"        : rattachée au CONTRAT, une seule fois, ligne unique positive
 *  - "cse"           : générée par la plateforme depuis un décompte approuvé
 *  - "sous_traitant" : importée depuis la facture papier du sous-traitant, à rapprocher de la facture CSE
 *
 * Générées programmatiquement depuis contrats.js / decomptes.js pour rester
 * cohérentes avec les montants réels (buildLignesFactureDepuisDecompte / Avance).
 */
import { contrats } from "./contrats";
import { decomptes } from "./decomptes";
import {
  buildLignesFactureDepuisDecompte,
  buildLignesFactureAvance,
  computeMontantHTFacture,
} from "../utils/factureCalcul";

const contratMap = Object.fromEntries(contrats.map(c => [c.id, c]));
const decompteMap = Object.fromEntries(decomptes.map(d => [d.id, d]));

const compteurs = {};
function nextCode(type, annee = 2026) {
  const key = `${type}-${annee}`;
  compteurs[key] = (compteurs[key] || 0) + 1;
  const prefix = type === "avance" ? "FAC-AVA" : type === "cse" ? "FAC-CSE" : "FAC-STT";
  return `${prefix}-${annee}-${String(compteurs[key]).padStart(3, "0")}`;
}

// ── Facture d'avance de démarrage ─────────────────────────────────
function mkFactureAvance({ contratId, statut, dateEmission, datePaiement, referenceReglement }) {
  const contrat = contratMap[contratId];
  const lignes = buildLignesFactureAvance(contrat);
  const montantHT = computeMontantHTFacture(lignes);
  const tauxTVA = contrat.tauxTVA ?? 18;
  const montantTVA = Math.round(montantHT * (tauxTVA / 100));
  return {
    id: `fac-ava-${contratId}`,
    code: nextCode("avance"),
    type: "avance",
    contratId,
    decompteId: null,
    releveId: null,
    factureLieeId: null,
    dateEmission,
    lignes,
    montantHT,
    tauxTVA,
    montantTVA,
    montantTTC: montantHT + montantTVA,
    statut,
    ecartRapprochement: null,
    motifRejet: null,
    dateControleDACC: null,
    dateValidationDFC: null,
    datePaiement: datePaiement || null,
    referenceReglement: referenceReglement || null,
  };
}

// ── Facture CSE depuis un décompte ────────────────────────────────
function mkFactureCSE(decompteId, statut, extra = {}) {
  const decompte = decompteMap[decompteId];
  const lignes = buildLignesFactureDepuisDecompte(decompte);
  const montantHT = computeMontantHTFacture(lignes);
  const tauxTVA = decompte.tauxTVA ?? 18;
  const montantTVA = Math.round(montantHT * (tauxTVA / 100));
  return {
    id: `fac-cse-${decompteId}`,
    code: nextCode("cse"),
    type: "cse",
    contratId: decompte.contratId,
    decompteId,
    releveId: null,
    factureLieeId: `fac-stt-${decompteId}`,
    dateEmission: decompte.dateFin,
    lignes,
    montantHT,
    tauxTVA,
    montantTVA,
    montantTTC: montantHT + montantTVA,
    statut,
    ecartRapprochement: null,
    motifRejet: null,
    dateControleDACC: null,
    dateValidationDFC: null,
    datePaiement: null,
    referenceReglement: null,
    ...extra,
  };
}

// ── Facture sous-traitant, en miroir de la facture CSE ────────────
function mkFactureSTT(decompteId, statut, { montantTTCOverride, ecart, motifRejet, ...extra } = {}) {
  const decompte = decompteMap[decompteId];
  const cse = factures.find(f => f.id === `fac-cse-${decompteId}`);
  const montantTTC = montantTTCOverride ?? cse.montantTTC;
  const montantHT = Math.round(montantTTC / (1 + (cse.tauxTVA / 100)));
  return {
    id: `fac-stt-${decompteId}`,
    code: nextCode("sous_traitant"),
    type: "sous_traitant",
    contratId: decompte.contratId,
    decompteId,
    releveId: null,
    factureLieeId: `fac-cse-${decompteId}`,
    dateEmission: decompte.dateFin,
    lignes: cse.lignes,
    montantHT,
    tauxTVA: cse.tauxTVA,
    montantTVA: montantTTC - montantHT,
    montantTTC,
    statut,
    ecartRapprochement: ecart ?? null,
    motifRejet: motifRejet ?? null,
    dateControleDACC: null,
    dateValidationDFC: null,
    datePaiement: null,
    referenceReglement: null,
    ...extra,
  };
}

export const factures = [];

// Factures d'avance — une par contrat, jamais recréées
factures.push(mkFactureAvance({
  contratId: "CTR-2026-001", statut: "Payée",
  dateEmission: "2025-11-05", datePaiement: "2025-11-12", referenceReglement: "VIR-2025-0891",
}));
factures.push(mkFactureAvance({
  contratId: "CTR-2026-005", statut: "Émise",
  dateEmission: "2026-03-05",
}));

// ── Paires CSE / STT sur décomptes déjà Payé — cycle complet ──────
[
  { decId: "DEC-2026-CTR001-M01", dacc: "2026-03-05", dfc: "2026-03-07", pay: "2026-03-08", ref: "VIR-2026-1148" },
  { decId: "DEC-2026-CTR001-M02", dacc: "2026-04-05", dfc: "2026-04-08", pay: "2026-04-10", ref: "VIR-2026-1231" },
  { decId: "DEC-2026-CTR002-M01", dacc: "2026-05-08", dfc: "2026-05-10", pay: "2026-05-12", ref: "VIR-2026-1355" },
].forEach(({ decId, dacc, dfc, pay, ref }) => {
  factures.push(mkFactureCSE(decId, "Payée", { dateControleDACC: dacc, dateValidationDFC: dfc, datePaiement: pay, referenceReglement: ref }));
  factures.push(mkFactureSTT(decId, "Payée", { dateControleDACC: dacc, dateValidationDFC: dfc, datePaiement: pay, referenceReglement: ref }));
});

// ── Paire en cours de circuit — rapprochée, en attente de contrôle DACC ──
factures.push(mkFactureCSE("DEC-2026-CTR004-M02", "Rapprochée"));
factures.push(mkFactureSTT("DEC-2026-CTR004-M02", "Rapprochée"));

// ── Paire contrôlée DACC — en attente de validation DFC ──
factures.push(mkFactureCSE("DEC-2025-CTR012-RGP", "Contrôlée DACC", { dateControleDACC: "2026-06-20" }));
factures.push(mkFactureSTT("DEC-2025-CTR012-RGP", "Contrôlée DACC", { dateControleDACC: "2026-06-20" }));

// ── Paire en écart — illustration du rejet ──
const ECART_MONTANT = 1800000;
const cseEcart = mkFactureCSE("DEC-2025-CTR011-DEF", "Écart détecté");
factures.push(cseEcart);
factures.push(mkFactureSTT("DEC-2025-CTR011-DEF", "Écart détecté", {
  montantTTCOverride: cseEcart.montantTTC + ECART_MONTANT,
  ecart: ECART_MONTANT,
  motifRejet: `Écart de ${new Intl.NumberFormat("fr-FR").format(ECART_MONTANT)} FCFA entre le net TTC facturé par le sous-traitant et celui de la facture CSE.`,
}));
// Répercuter l'écart sur la facture CSE également (les deux affichent le même diagnostic)
cseEcart.ecartRapprochement = ECART_MONTANT;
