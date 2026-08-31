import { contrats } from "./contrats";
import { buildMontantsFromLignes } from "../utils/decompteCalcul";

const contratMap = Object.fromEntries(contrats.map(c => [c.id, c]));

// ─── Helpers ────────────────────────────────────────────────────
export function buildLignesFromContrat(contrat, montantsMois = {}, cumulsPrecedents = {}) {
  if (!contrat) return [];
  const tauxRG = contrat.tauxRG || 5;
  const tauxAD = contrat.tauxAD || 15;
  const tauxB  = contrat.tauxRevisionPrix || 0;
  const travauxMois = montantsMois["A"] || 0;

  return (contrat.modeleDecompte || [])
    .filter(p => p.actif)
    .map(p => {
      const cumulPrev = cumulsPrecedents[p.code] || 0;
      if (p.code === "C") {
        const mensuel = Math.round(travauxMois * tauxAD / 100);
        const cumulPrevRemb = cumulsPrecedents["C_remb"] || 0;
        return {
          codePoste: "C", poste: p.poste, signe: p.signe, type: p.type,
          enAttente: p.enAttente || false, obligatoire: p.verrouille || false,
          mensuel,
          remboursement: mensuel,
          cumulMoins1: cumulPrev,
          cumulM: cumulPrev + mensuel,
          cumulMoins1Remb: cumulPrevRemb,
          cumulRembM: cumulPrevRemb + mensuel,
        };
      }
      let mensuel;
      if (p.code === "D") {
        mensuel = Math.round(travauxMois * tauxRG / 100);
      } else if (p.code === "B" && tauxB > 0) {
        mensuel = Math.round(travauxMois * tauxB / 100);
      } else {
        mensuel = montantsMois[p.code] || 0;
      }
      return {
        codePoste:   p.code,
        poste:       p.poste,
        signe:       p.signe,
        type:        p.type,
        enAttente:   p.enAttente || false,
        obligatoire: p.verrouille || false,
        mensuel,
        cumulMoins1: cumulPrev,
        cumulM:      cumulPrev + mensuel,
      };
    });
}

const STATUTS_CUMUL = ["Approuvé", "Payé"];

export function getCumulsPrecedents(contratId, dateFin, decList) {
  const cumuls = {};
  decList
    .filter(d => d.contratId === contratId && d.dateFin < dateFin && STATUTS_CUMUL.includes(d.statut))
    .forEach(d => {
      (d.lignes || []).forEach(l => {
        cumuls[l.codePoste] = (cumuls[l.codePoste] || 0) + (l.mensuel || 0);
        if (l.codePoste === "C" && l.remboursement != null) {
          cumuls["C_remb"] = (cumuls["C_remb"] || 0) + l.remboursement;
        }
      });
    });
  return cumuls;
}

function cumulsPrecedentsLocal(contratId, dateFin, decList) {
  return getCumulsPrecedents(contratId, dateFin, decList);
}

const PJ = (code) => [
  { id: "pj1", nom: `Bordereau_attachement_${code}.pdf`, type: "pdf", taille: "1.4 MB", dateAjout: "2026-02-10", categorie: "Bordereau d'attachement signé" },
  { id: "pj2", nom: `PV_constat_${code}.pdf`, type: "pdf", taille: "880 KB", dateAjout: "2026-02-12", categorie: "PV de réception" },
];

const decList = [];

// Note : les cessions ne sont plus portées par le décompte — le décompte consomme des
// ÉTATS DE CESSION arrêtés (cf. data/etatsCession.js + EtatsCessionContext) — un éventuel
// paramètre "cessions" ici serait ignoré.
function mkDec({ id, contratId, type = "provisoire", dateDebut, dateFin, statut,
  validationEtape, modeRenseignement = "saisie", montantsMois = {},
  fil_discussion = [], historique = [], pieceJointes = [], note }) {
  const contrat = contratMap[contratId];
  const cumulsPrecedents = cumulsPrecedentsLocal(contratId, dateFin, decList);
  const lignes = buildLignesFromContrat(contrat, montantsMois, cumulsPrecedents);
  const montantsCalcules = buildMontantsFromLignes(lignes);
  const d = {
    id, code: id, contratId, type, dateDebut, dateFin, statut,
    validationEtape, modeRenseignement, lignes,
    montantsCalcules, fil_discussion, historique, pieceJointes,
    ...(note ? { note } : {}),
  };
  decList.push(d);
  return d;
}

// ════════════════════════════════════════════════════════════════
// CTR-2026-001 — Gros œuvre R+4  (A C D E G H I J)
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR001-M01", contratId: "CTR-2026-001",
  dateDebut: "2026-02-01", dateFin: "2026-02-28", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 48500000 },
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Moussa BA", role: "DACC", initiales: "AD" }, date: "2026-03-02T10:15:00", message: "Décompte M01 validé. Paiement en cours de traitement.", type: "validation" },
  ],
  historique: [
    { date: "2026-03-01T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte mensuel février 2026 créé" },
    { date: "2026-03-02T10:15:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé par le DG" },
    { date: "2026-03-08T14:00:00", utilisateur: "DFC", action: "Paiement", details: "Virement CBAO réf. VIR-2026-1148" },
  ],
  pieceJointes: PJ("CTR001-M01"),
});

mkDec({
  id: "DEC-2026-CTR001-M02", contratId: "CTR-2026-001",
  dateDebut: "2026-03-01", dateFin: "2026-03-31", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 55000000 },
  fil_discussion: [],
  historique: [
    { date: "2026-04-02T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte mars 2026" },
    { date: "2026-04-10T11:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé — paiement CBAO VIR-2026-1231" },
  ],
  pieceJointes: PJ("CTR001-M02"),
});

// HERO DÉCOMPTE — cessions MTX + remboursement partiel
mkDec({
  id: "DEC-2026-CTR001-M03", contratId: "CTR-2026-001",
  dateDebut: "2026-04-01", dateFin: "2026-04-30", statut: "En validation",
  validationEtape: { actuelle: 1, total: 5, profilEnAttente: "DEXA", dateDebutEtape: "2026-08-22" },
  montantsMois: { A: 62000000, G: 12720000, H: 3885000 },
  // net_ht = 62 000 000 (A) − 9 300 000 (C 15%) − 3 100 000 (D 5%) − 3 885 000 (H) = 45 715 000
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Moussa BA", role: "DACC", initiales: "AD" }, date: "2026-05-14T09:30:00", message: "Décompte soumis. La cession ciment inclut un remboursement partiel à 50% conformément à l'accord du 15/03.", type: "commentaire" },
    { id: "msg2", auteur: { nom: "Ibrahima SECK", role: "DEX", initiales: "IS" }, date: "2026-05-15T11:20:00", message: "Validé côté DEX. Les quantités de gravier (120 m³) dépassent le BC initial (95 m³). Avenant en cours ?", type: "validation" },
    { id: "msg3", auteur: { nom: "Moussa BA", role: "DACC", initiales: "AD" }, date: "2026-05-15T14:45:00", message: "Avenant n°1 en cours de signature. Différence 25 m³ × 28 500 = 712 500 FCFA provisionnée.", type: "commentaire" },
    { id: "msg4", auteur: { nom: "Fatou NDIAYE", role: "DEXA", initiales: "FN" }, date: "2026-05-17T08:00:00", message: "En attente de l'avenant signé avant validation DEXA.", type: "action" },
  ],
  historique: [
    { date: "2026-05-05T08:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte mensuel avril 2026 créé en mode saisie" },
    { date: "2026-05-13T16:30:00", utilisateur: "Moussa BA", action: "Envoi en validation", details: "Soumis au circuit de validation 5 niveaux" },
    { date: "2026-05-14T10:00:00", utilisateur: "Moussa BA", action: "Validation N1 (DACC)", details: "Validé avec commentaire cessions ciment" },
    { date: "2026-05-15T11:20:00", utilisateur: "Ibrahima SECK", action: "Validation N2 (DEX)", details: "Validé sous réserve avenant gravier" },
  ],
  pieceJointes: [
    ...PJ("CTR001-M03"),
    { id: "pj3", nom: "Bon_cession_gravier_avril.pdf", type: "pdf", taille: "420 KB", dateAjout: "2026-05-06", categorie: "Justificatifs de cession" },
    { id: "pj4", nom: "Rapport_atelier_materiel_avril.xlsx", type: "xlsx", taille: "310 KB", dateAjout: "2026-05-06", categorie: "Justificatifs de cession" },
  ],
});

mkDec({
  id: "DEC-2026-CTR001-M04", contratId: "CTR-2026-001",
  dateDebut: "2026-05-01", dateFin: "2026-05-31", statut: "En validation",
  validationEtape: { actuelle: 0, total: 5, profilEnAttente: "DACC", dateDebutEtape: "2026-08-25" },
  montantsMois: { A: 52500000, G: 5000000 },
  fil_discussion: [],
  historique: [{ date: "2026-06-02T10:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte mai 2026 — en cours de saisie" }],
  pieceJointes: [],
});

mkDec({
  id: "DEC-2026-CTR001-M05", contratId: "CTR-2026-001",
  dateDebut: "2026-08-01", dateFin: "2026-08-31", statut: "Brouillon",
  validationEtape: { actuelle: 0, total: 5, profilEnAttente: "DACC" },
  montantsMois: { A: 0 },
  fil_discussion: [],
  historique: [{ date: "2026-08-28T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte août 2026 — brouillon initial" }],
  pieceJointes: [],
});

// ════════════════════════════════════════════════════════════════
// CTR-2026-002 — Menuiseries aluminium  (A C D E)
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR002-M01", contratId: "CTR-2026-002",
  dateDebut: "2026-04-01", dateFin: "2026-04-30", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 28000000 },
  fil_discussion: [],
  historique: [
    { date: "2026-05-03T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte avril 2026" },
    { date: "2026-05-12T14:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé" },
  ],
  pieceJointes: PJ("CTR002-M01"),
});

mkDec({
  id: "DEC-2026-CTR002-M02", contratId: "CTR-2026-002",
  dateDebut: "2026-05-01", dateFin: "2026-05-31", statut: "En validation",
  validationEtape: { actuelle: 2, total: 5, profilEnAttente: "DCG", dateDebutEtape: "2026-08-20" },
  montantsMois: { A: 34000000 },
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Fatou NDIAYE", role: "DEXA", initiales: "FN" }, date: "2026-06-08T09:30:00", message: "Validé au niveau DEXA. Transmission au DGA.", type: "validation" },
  ],
  historique: [
    { date: "2026-06-02T08:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte mai 2026" },
    { date: "2026-06-06T10:00:00", utilisateur: "Moussa BA", action: "Envoi en validation", details: "Soumis" },
    { date: "2026-06-08T09:30:00", utilisateur: "Fatou NDIAYE", action: "Validation N3 (DEXA)", details: "Validé" },
  ],
  pieceJointes: PJ("CTR002-M02"),
});

// ════════════════════════════════════════════════════════════════
// CTR-2026-004 — Transport déblais  (A C D E)  circuit réduit 4 étapes
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR004-M01", contratId: "CTR-2026-004",
  dateDebut: "2026-03-01", dateFin: "2026-03-31", statut: "Payé",
  modeRenseignement: "import",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 18000000 },
  fil_discussion: [],
  historique: [
    { date: "2026-04-03T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Import Excel — modèle T04" },
    { date: "2026-04-10T11:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé" },
  ],
  pieceJointes: PJ("CTR004-M01"),
});

mkDec({
  id: "DEC-2026-CTR004-M02", contratId: "CTR-2026-004",
  dateDebut: "2026-04-01", dateFin: "2026-04-30", statut: "Approuvé",
  modeRenseignement: "import",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 20000000 },
  fil_discussion: [],
  historique: [
    { date: "2026-05-05T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Import Excel" },
    { date: "2026-05-14T10:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé — paiement en attente DFC" },
  ],
  pieceJointes: PJ("CTR004-M02"),
});

mkDec({
  id: "DEC-2026-CTR004-M03", contratId: "CTR-2026-004",
  dateDebut: "2026-05-01", dateFin: "2026-05-31", statut: "Brouillon",
  validationEtape: { actuelle: 0, total: 5, profilEnAttente: "DACC" },
  montantsMois: { A: 17000000 },
  fil_discussion: [],
  historique: [{ date: "2026-06-03T10:00:00", utilisateur: "Moussa BA", action: "Création", details: "En cours de saisie" }],
  pieceJointes: [],
});

// ════════════════════════════════════════════════════════════════
// CTR-2026-005 — Terrassement réseaux HTA Thiès  (A C D E G H I J K L)
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR005-M01", contratId: "CTR-2026-005",
  dateDebut: "2026-04-01", dateFin: "2026-04-30", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 55000000, K: 3200000 },
  fil_discussion: [],
  historique: [
    { date: "2026-05-02T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Premier décompte réseaux HTA Thiès" },
    { date: "2026-05-15T11:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé. Paiement CBAO VIR-2026-1680." },
  ],
  pieceJointes: PJ("CTR005-M01"),
});

// ════════════════════════════════════════════════════════════════
// CTR-2026-006 — Génie civil quai n°3  (A C D E G H)
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR006-M01", contratId: "CTR-2026-006",
  dateDebut: "2026-04-01", dateFin: "2026-04-30", statut: "En validation",
  validationEtape: { actuelle: 4, total: 5, profilEnAttente: "DG", dateDebutEtape: "2026-08-24" },
  montantsMois: { A: 95000000, G: 11300000 },
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Aliou BA", role: "DGA", initiales: "MF" }, date: "2026-05-20T14:00:00", message: "Validé au niveau DGA. Montants en ligne avec le budget du chantier. Transmission au DG.", type: "validation" },
  ],
  historique: [
    { date: "2026-05-05T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte avril — inclut cessions béton armé" },
    { date: "2026-05-12T10:00:00", utilisateur: "Moussa BA", action: "Envoi en validation", details: "Circuit complet 5 niveaux" },
    { date: "2026-05-20T14:00:00", utilisateur: "Aliou BA", action: "Validation N4 (DGA)", details: "Approuvé DGA" },
  ],
  pieceJointes: [
    ...PJ("CTR006-M01"),
    { id: "pj3", nom: "Bon_cession_beton_armé_avril.pdf", type: "pdf", taille: "640 KB", dateAjout: "2026-05-06", categorie: "Justificatifs de cession" },
  ],
});

// ════════════════════════════════════════════════════════════════
// CTR-2026-007 — Câblage basse tension Thiès  (A C D E G H)
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR007-M01", contratId: "CTR-2026-007",
  dateDebut: "2026-04-01", dateFin: "2026-04-30", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 45000000 },
  fil_discussion: [],
  historique: [
    { date: "2026-05-04T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte M01 câblage BT Thiès" },
    { date: "2026-05-16T11:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé. Paiement CBAO VIR-2026-1742." },
  ],
  pieceJointes: PJ("CTR007-M01"),
});

// ════════════════════════════════════════════════════════════════
// CTR-2026-008 — Dragage chenal  (A C D E G H) — REJETÉ
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR008-M01", contratId: "CTR-2026-008",
  dateDebut: "2026-03-01", dateFin: "2026-03-31", statut: "Rejeté",
  modeRenseignement: "import",
  validationEtape: { actuelle: 1, total: 5, profilEnAttente: null },
  montantsMois: { A: 47000000 },
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Moussa BA", role: "DACC", initiales: "AD" }, date: "2026-04-12T10:00:00", message: "Décompte soumis par OUEST AFRIQUE CONSTRUCTION pour les travaux de dragage de mars 2026.", type: "commentaire" },
    { id: "msg2", auteur: { nom: "Ibrahima SECK", role: "DEX", initiales: "IS" }, date: "2026-04-14T15:30:00", message: "REJET — Les quantités de dragage (85 000 m³) ne correspondent pas aux relevés bathymétriques (62 400 m³). Écart 26%. Corriger et re-soumettre avec rapport de sondage certifié.", type: "rejet" },
    { id: "msg3", auteur: { nom: "Moussa BA", role: "DACC", initiales: "AD" }, date: "2026-04-15T09:00:00", message: "Notification envoyée au STT. Délai de correction : 10 jours ouvrés. Réf. rejet : REJ-2026-008-001.", type: "action" },
  ],
  historique: [
    { date: "2026-04-08T10:00:00", utilisateur: "Moussa BA", action: "Création", details: "Import Excel depuis OAC" },
    { date: "2026-04-11T14:00:00", utilisateur: "Moussa BA", action: "Envoi en validation", details: "Soumis" },
    { date: "2026-04-12T10:00:00", utilisateur: "Moussa BA", action: "Validation N1 (DACC)", details: "Validé" },
    { date: "2026-04-14T15:30:00", utilisateur: "Ibrahima SECK", action: "Rejet N2 (DEX)", details: "Rejeté — écart quantité dragage 26%" },
  ],
  pieceJointes: [
    { id: "pj1", nom: "Import_OAC_dragage_mars2026.xlsx", type: "xlsx", taille: "720 KB", dateAjout: "2026-04-08", categorie: "Bordereau d'attachement signé" },
    { id: "pj2", nom: "Rapport_bathymetrique_mars_DEX.pdf", type: "pdf", taille: "3.2 MB", dateAjout: "2026-04-14", categorie: "PV de réception" },
  ],
});

// ════════════════════════════════════════════════════════════════
// CTR-2026-009 — Voirie portuaire  (A C D E G H) — BROUILLON
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2026-CTR009-M01", contratId: "CTR-2026-009",
  dateDebut: "2026-07-01", dateFin: "2026-07-31", statut: "Brouillon",
  validationEtape: { actuelle: 0, total: 5, profilEnAttente: "DACC" },
  montantsMois: { A: 0 },
  fil_discussion: [],
  historique: [{ date: "2026-08-01T10:00:00", utilisateur: "Moussa BA", action: "Création", details: "Premier décompte voirie portuaire — saisie en cours" }],
  pieceJointes: [],
});

// ════════════════════════════════════════════════════════════════
// CTR-2025-010 — Scarification Kaolack  (A C D E G H I J K L)
// ════════════════════════════════════════════════════════════════
[
  { s: "M01", A: 42000000, date: { d: "2025-07-01", f: "2025-07-31" }, st: "Payé",          etape: 5 },
  { s: "M02", A: 45000000, date: { d: "2025-08-01", f: "2025-08-31" }, st: "Payé",          etape: 5 },
  { s: "M03", A: 40000000, date: { d: "2025-09-01", f: "2025-09-30" }, st: "Payé",          etape: 5 },
  { s: "M04", A: 48000000, date: { d: "2025-10-01", f: "2025-10-31" }, st: "Payé",          etape: 5 },
  { s: "M05", A: 50000000, date: { d: "2025-11-01", f: "2025-11-30" }, st: "Payé",          etape: 5 },
  { s: "M06", A: 35000000, date: { d: "2025-12-01", f: "2025-12-31" }, st: "Payé",          etape: 5 },
  { s: "M07", A: 20000000, date: { d: "2026-01-01", f: "2026-01-31" }, st: "En validation", etape: 3 },
  { s: "M08", A: 20000000, date: { d: "2026-02-01", f: "2026-02-28" }, st: "Brouillon",     etape: 0 },
].forEach(({ s, A, date, st, etape }) => mkDec({
  id: `DEC-2025-CTR010-${s}`, contratId: "CTR-2025-010",
  dateDebut: date.d, dateFin: date.f, statut: st,
  validationEtape: { actuelle: etape === 5 ? 5 : etape === 3 ? 2 : etape, total: 5, profilEnAttente: etape === 3 ? "DCG" : etape === 0 ? "DACC" : null, ...(etape === 3 ? { dateDebutEtape: "2026-08-21" } : {}) },
  montantsMois: { A },
  fil_discussion: st === "En validation" ? [
    { id: "msg1", auteur: { nom: "Fatou NDIAYE", role: "DEXA", initiales: "FN" }, date: "2026-02-18T10:00:00", message: "Validé au niveau DEXA. Avancement global à 87% — dans les délais.", type: "validation" },
  ] : [],
  historique: [{ date: date.d + "T09:00:00", utilisateur: "Moussa BA", action: "Création", details: `Décompte ${s}` }],
  pieceJointes: st === "Payé" ? PJ(`CTR010-${s}`) : [],
}));

// ════════════════════════════════════════════════════════════════
// CTR-2025-011 — Enrobés Kaolack  (A C D E I J)
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2025-CTR011-M01", contratId: "CTR-2025-011",
  dateDebut: "2025-09-01", dateFin: "2025-09-30", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 75000000 },
  fil_discussion: [],
  historique: [{ date: "2025-10-02T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte M01 enrobés" }],
  pieceJointes: PJ("CTR011-M01"),
});

mkDec({
  id: "DEC-2025-CTR011-M02", contratId: "CTR-2025-011",
  dateDebut: "2025-10-01", dateFin: "2025-10-31", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 82000000, I: 4200000, J: 0 },
  fil_discussion: [],
  historique: [{ date: "2025-11-03T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte M02 enrobés" }],
  pieceJointes: PJ("CTR011-M02"),
});

mkDec({
  id: "DEC-2025-CTR011-DEF", contratId: "CTR-2025-011",
  type: "definitif_general",
  dateDebut: "2025-09-01", dateFin: "2026-04-30", statut: "Approuvé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 412000000 },
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Oumar SOW", role: "DG", initiales: "CD" }, date: "2026-05-10T10:00:00", message: "Décompte définitif approuvé. Contrat CTR-2025-011 peut être clôturé. RG à libérer dans 90 jours (délai contractuel post-réception définitive).", type: "validation" },
  ],
  historique: [
    { date: "2026-04-30T10:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte définitif — solde final contrat 011" },
    { date: "2026-05-10T10:00:00", utilisateur: "Oumar SOW", action: "Approbation finale (DG)", details: "Approuvé — clôture en cours" },
  ],
  pieceJointes: [
    { id: "pj1", nom: "Decompte_definitif_CTR011.pdf", type: "pdf", taille: "2.8 MB", dateAjout: "2026-04-30", categorie: "Bordereau d'attachement signé" },
    { id: "pj2", nom: "PV_reception_definitive_CTR011.pdf", type: "pdf", taille: "1.6 MB", dateAjout: "2026-04-28", categorie: "PV de réception" },
  ],
});

// ════════════════════════════════════════════════════════════════
// CTR-2025-012 — Glissières sécurité  (A C D E)  — CLÔTURÉ
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2025-CTR012-DEF", contratId: "CTR-2025-012",
  type: "definitif_general",
  dateDebut: "2025-09-01", dateFin: "2026-06-30", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 89000000 },
  // RG cumulée = 89 000 000 × 5% = 4 450 000 FCFA — libérable après réception définitive
  fil_discussion: [],
  historique: [
    { date: "2026-07-01T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte définitif glissières" },
    { date: "2026-07-10T11:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé et payé — contrat clôturé" },
  ],
  pieceJointes: [
    { id: "pj1", nom: "Decompte_definitif_CTR012.pdf", type: "pdf", taille: "1.9 MB", dateAjout: "2026-07-01", categorie: "Bordereau d'attachement signé" },
    { id: "pj2", nom: "PV_reception_CTR012.pdf", type: "pdf", taille: "1.1 MB", dateAjout: "2026-06-30", categorie: "PV de réception" },
  ],
});

// NOUVEAU — Restitution RG partielle (50% de la RG cumulée = 2 225 000 FCFA)
mkDec({
  id: "DEC-2025-CTR012-RGP", contratId: "CTR-2025-012",
  type: "restitution_rg_partielle",
  dateDebut: "2026-09-01", dateFin: "2026-09-30", statut: "Approuvé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { E: 2225000 },
  // E = 50% × 4 450 000 FCFA (RG cumulée) — taux 50/50 par défaut, à confirmer avec le client
  note: "Taux de répartition par défaut (50/50) — à confirmer avec le client (Moussa BA)",
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Moussa BA", role: "DACC", initiales: "AD" }, date: "2026-09-15T10:00:00", message: "Restitution provisoire de la RG suite à réception provisoire du 15/08/2026. Montant = 50% × RG cumulée (4 450 000 FCFA). Le solde (50%) sera libéré à la réception définitive.", type: "commentaire" },
    { id: "msg2", auteur: { nom: "Oumar SOW", role: "DG", initiales: "CD" }, date: "2026-09-20T14:00:00", message: "Restitution approuvée. Taux 50/50 appliqué par défaut — à valider avec Moussa BA lors de la prochaine réunion de cadrage.", type: "validation" },
  ],
  historique: [
    { date: "2026-09-10T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte de restitution RG provisoire — réception provisoire 15/08/2026" },
    { date: "2026-09-20T14:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé — virement libération RG en cours" },
  ],
  pieceJointes: [
    { id: "pj1", nom: "PV_reception_provisoire_CTR012.pdf", type: "pdf", taille: "1.4 MB", dateAjout: "2026-08-16", categorie: "PV de réception" },
  ],
});

// ════════════════════════════════════════════════════════════════
// CTR-2024-001/002/003/004 — Diamniadio (Clôturés)
// ════════════════════════════════════════════════════════════════
[
  { id: "CTR-2024-001", A: 480000000, date: { d: "2024-03-01", f: "2025-02-28" }, label: "Terrassement et fondations", reduit: false },
  { id: "CTR-2024-002", A: 440000000, date: { d: "2024-04-01", f: "2025-04-30" }, label: "Bâtiments industriels A et B", reduit: false },
  { id: "CTR-2024-003", A: 380000000, date: { d: "2024-06-01", f: "2025-05-31" }, label: "VRD et réseaux", reduit: true },
  { id: "CTR-2024-004", A: 520000000, date: { d: "2024-08-01", f: "2025-08-31" }, label: "Équipements techniques", reduit: true },
].forEach(({ id, A, date, label, reduit }) => mkDec({
  id: `DEC-${id.slice(4)}-DEF`, contratId: id,
  type: "definitif_general",
  dateDebut: date.d, dateFin: date.f, statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A },
  fil_discussion: [],
  historique: [
    { date: date.f + "T10:00:00", utilisateur: "Moussa BA", action: "Création", details: `Décompte définitif — ${label}` },
    { date: date.f + "T16:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé et payé. Contrat soldé." },
  ],
  pieceJointes: [
    { id: "pj1", nom: `Decompte_definitif_${id}.pdf`, type: "pdf", taille: "2.1 MB", dateAjout: date.f, categorie: "Bordereau d'attachement signé" },
    { id: "pj2", nom: `PV_reception_${id}.pdf`, type: "pdf", taille: "1.4 MB", dateAjout: date.f, categorie: "Autre" },
  ],
}));

// ════════════════════════════════════════════════════════════════
// CTR-2025-013 — Fondations Pont Casamance  (A C D E G H I J)
// ════════════════════════════════════════════════════════════════
mkDec({
  id: "DEC-2025-CTR013-M01", contratId: "CTR-2025-013",
  dateDebut: "2025-04-01", dateFin: "2025-04-30", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 120000000 },
  fil_discussion: [],
  historique: [
    { date: "2025-05-03T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte M01 fondations pont Casamance" },
    { date: "2025-05-15T10:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé. Paiement ECOBANK VIR-2025-0812." },
  ],
  pieceJointes: PJ("CTR013-M01"),
});

mkDec({
  id: "DEC-2025-CTR013-M02", contratId: "CTR-2025-013",
  dateDebut: "2025-05-01", dateFin: "2025-05-31", statut: "Payé",
  validationEtape: { actuelle: 5, total: 5, profilEnAttente: null },
  montantsMois: { A: 95000000, G: 9800000, H: 8500000 },
  fil_discussion: [],
  historique: [
    { date: "2025-06-03T09:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte M02 fondations pont Casamance — inclut cession pieux préfabriqués" },
    { date: "2025-06-14T11:00:00", utilisateur: "Oumar SOW", action: "Approbation finale", details: "Approuvé. Paiement ECOBANK VIR-2025-0944." },
  ],
  pieceJointes: PJ("CTR013-M02"),
});

// NOUVEAU — Décompte type "final" illustrant la clôture du contrat
mkDec({
  id: "DEC-2025-CTR013-FIN", contratId: "CTR-2025-013",
  type: "final",
  dateDebut: "2025-06-01", dateFin: "2025-06-30", statut: "Brouillon",
  validationEtape: { actuelle: 0, total: 5, profilEnAttente: "DACC" },
  montantsMois: { A: 60000000, H: 4500000, J: 2200000 },
  fil_discussion: [
    { id: "msg1", auteur: { nom: "Moussa BA", role: "DACC", initiales: "AD" }, date: "2025-07-05T09:00:00", message: "Décompte final en cours de préparation. Inclut le solde des remboursements matériaux et matériel.", type: "commentaire" },
  ],
  historique: [
    { date: "2025-07-04T10:00:00", utilisateur: "Moussa BA", action: "Création", details: "Décompte final — solde CTR-2025-013 pont Casamance" },
  ],
  pieceJointes: [],
});

export const decomptes = decList;
