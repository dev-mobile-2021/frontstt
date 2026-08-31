/**
 * Dossiers d'attachement — constat terrain + devis STT.
 * Alimentent le Poste A du décompte (via voletCSE.totalValorise sur Validé).
 *
 * Structure voletCSE.lignes :
 *   { id, source:"DQE"|"Libre", refDQE, designation, unite,
 *     quantitePrevueDQE (null si Libre), prixUnitaireHT,
 *     quantiteRealisee, montant (calculé) }
 *
 * Structure voletSTT :
 *   { statut:"Vide"|"Chargé", fichiers:[{ id, nom, type, dateUpload, uploadePar, apercu:"simulé" }] }
 */

export const ARTICLES = [
  { id:"a1", refDQE:"a1", designation:"Pieux forés Ø 600 mm béton armé B30",        unite:"ml",  prixUnitaireHT:850,     quantitePrevueDQE:15000 },
  { id:"a2", refDQE:"a2", designation:"Poteaux, poutres et refends béton B25",       unite:"m³",  prixUnitaireHT:1200,    quantitePrevueDQE:8000  },
  { id:"a3", refDQE:"a3", designation:"Planchers (hourdis + dalle) béton B25",       unite:"m²",  prixUnitaireHT:1850,    quantitePrevueDQE:7000  },
  { id:"a4", refDQE:"a4", designation:"Escaliers béton armé (volées + paliers)",     unite:"ml",  prixUnitaireHT:2200,    quantitePrevueDQE:500   },
  { id:"a5", refDQE:"a5", designation:"Rampes d'accès au sous-sol (béton armé)",     unite:"m²",  prixUnitaireHT:2400,    quantitePrevueDQE:350   },
  { id:"a6", refDQE:"a6", designation:"Installation de chantier et frais généraux",  unite:"ff",  prixUnitaireHT:1000000, quantitePrevueDQE:1     },
];

function dqe(refDQE, qteRealisee) {
  const art = ARTICLES.find(a => a.refDQE === refDQE);
  return {
    id: `l-${refDQE}`,
    source: "DQE",
    refDQE: art.refDQE,
    designation: art.designation,
    unite: art.unite,
    quantitePrevueDQE: art.quantitePrevueDQE,
    prixUnitaireHT: art.prixUnitaireHT,
    quantiteRealisee: qteRealisee,
    montant: Math.round(qteRealisee * art.prixUnitaireHT),
  };
}

let _lseq = 1;
function libre(id, designation, unite, qte, pu) {
  return {
    id: `libre-${id}`,
    source: "Libre",
    refDQE: null,
    designation,
    unite,
    quantitePrevueDQE: null,
    prixUnitaireHT: pu,
    quantiteRealisee: qte,
    montant: Math.round(qte * pu),
  };
}

// ── ATT-2026-001 : Validé — mai 2026 (M04) ──────────────────────────────────
// DQE : 22 690 000  |  Libre : 7 830 000  |  Total : 30 520 000
const att001_lignes = [
  dqe("a1", 8500),   //  7 225 000
  dqe("a2", 5200),   //  6 240 000
  dqe("a3", 4500),   //  8 325 000
  dqe("a4", 250),    //    550 000
  dqe("a5", 0),      //          0
  dqe("a6", 0.35),   //    350 000
  libre("mai-1", "Béton de propreté sous semelles",          "m³", 120, 28000),  // 3 360 000
  libre("mai-2", "Terrassement en terrain rocheux (aléa)",   "m³",  85, 42000),  // 3 570 000
  libre("mai-3", "Garde-corps provisoire de chantier",       "ml", 200,  4500),  //   900 000
];

// ── ATT-2026-002 : En rapprochement — juin 2026 ──────────────────────────────
// DQE : 24 886 000  |  Libre : 4 405 000  |  Total : 29 291 000
const att002_lignes = [
  dqe("a1", 9200),   //  7 820 000
  dqe("a2", 5800),   //  6 960 000
  dqe("a3", 4800),   //  8 880 000
  dqe("a4", 280),    //    616 000
  dqe("a5", 150),    //    360 000
  dqe("a6", 0.25),   //    250 000
  libre("juin-1", "Dallage parking niveau -1",                "m²", 450,  6500),  // 2 925 000
  libre("juin-2", "Regard de visite béton armé type V3",      "u",    8, 185000), // 1 480 000
];

// ── ATT-2026-003 : Ouvert — juillet 2026 — CSE partiel ───────────────────────
// DQE : 7 045 000  |  Libre : 540 000  |  Total : 7 585 000
const att003_lignes = [
  dqe("a1", 3500),   //  2 975 000
  dqe("a2", 0),
  dqe("a3", 2200),   //  4 070 000
  dqe("a4", 0),
  dqe("a5", 0),
  dqe("a6", 0),
  libre("juil-1", "Démolition muret existant (aléa de chantier)", "ml", 45, 12000), // 540 000
];

// ── ATT-2026-004 : Validé — septembre 2026 ──────────────────────────────────
// DQE : 26 900 000  |  Libre : 4 200 000  |  Total : 31 100 000
const att004_lignes = [
  dqe("a1", 9800),   //  8 330 000
  dqe("a2", 6200),   //  7 440 000
  dqe("a3", 5200),   //  9 620 000
  dqe("a4", 300),    //    660 000
  dqe("a5", 200),    //    480 000
  dqe("a6", 0.37),   //    370 000
  libre("sept-1", "Béton de remplissage et ragréage (aléa terrain)", "m³", 70, 35000), // 2 450 000
  libre("sept-2", "Traitement hydrofuge des parois enterrées",        "m²", 700,  2500), // 1 750 000
];

export const attachements = [
  {
    id: "ATT-2026-001",
    code: "ATT-2026-001",
    contratId: "CTR-2026-001",
    chantierId: "CH-2025-016",
    periodeDebut: "2026-05-01",
    periodeFin:   "2026-05-31",
    statut: "Validé",
    initiePar: { nom: "Mamadou SARR", roleId: "CT" },
    dateCreation: "2026-06-01",
    voletCSE: {
      lignes: att001_lignes,
      totalValorise: 30520000,
      pieceJointes: [],
    },
    voletSTT: {
      statut: "Chargé",
      fichiers: [
        { id:"f001", nom:"Devis_FALL_FRERES_mai2026.pdf", type:"pdf", dateUpload:"2026-06-05", uploadePar:"Pape DIOP", apercu:"simulé" },
      ],
    },
    visaDT:   { par: "Pape DIOP",     date: "2026-06-18", commentaire: "CSE conforme au constat contradictoire de mai." },
    visaDacc: { par: "Moussa BA", date: "2026-06-20", commentaire: "Poste A figé à 30 520 000 FCFA." },
    montantFinal: 30520000,
    discussion: [
      { id:"d001", auteur:"Mamadou SARR", roleId:"CT",   date:"2026-06-01", message:"Dossier mai 2026 soumis au DT pour vérification.", type:"action" },
      { id:"d002", auteur:"Pape DIOP",    roleId:"DT",   date:"2026-06-15", message:"Tableau CSE vérifié — conforme au PV de réception. Soumission au DACC.", type:"action" },
      { id:"d003", auteur:"Moussa BA",roleId:"DACC", date:"2026-06-20", message:"Dossier complet, validé. Poste A figé à 30 520 000 FCFA.", type:"action" },
    ],
  },

  {
    id: "ATT-2026-002",
    code: "ATT-2026-002",
    contratId: "CTR-2026-001",
    chantierId: "CH-2025-016",
    periodeDebut: "2026-06-01",
    periodeFin:   "2026-06-30",
    statut: "Soumis au DACC",
    initiePar: { nom: "Mamadou SARR", roleId: "CT" },
    dateCreation: "2026-07-02",
    voletCSE: {
      lignes: att002_lignes,
      totalValorise: 29291000,
      pieceJointes: [],
    },
    voletSTT: {
      statut: "Chargé",
      fichiers: [
        { id:"f002", nom:"Devis_FALL_FRERES_juin2026.pdf", type:"pdf", dateUpload:"2026-07-03", uploadePar:"Pape DIOP", apercu:"simulé" },
      ],
    },
    visaDT:   null,
    visaDacc: null,
    montantFinal: null,
    discussion: [
      { id:"d101", auteur:"Mamadou SARR", roleId:"CT", date:"2026-07-02", message:"Dossier juin 2026 soumis au DT. Les regards de visite (Hors DQE, ligne juin-2) ont été intégrés suite au constat complémentaire.", type:"action" },
    ],
  },

  {
    id: "ATT-2026-003",
    code: "ATT-2026-003",
    contratId: "CTR-2026-001",
    chantierId: "CH-2025-016",
    periodeDebut: "2026-07-01",
    periodeFin:   "2026-07-31",
    statut: "Ouvert",
    initiePar: { nom: "Mamadou SARR", roleId: "CT" },
    dateCreation: "2026-08-01",
    voletCSE: {
      lignes: att003_lignes,
      totalValorise: 7585000,
      pieceJointes: [],
    },
    voletSTT: {
      statut: "Vide",
      fichiers: [],
    },
    visaDT:   null,
    visaDacc: null,
    montantFinal: null,
    discussion: [
      { id:"d201", auteur:"Mamadou SARR", roleId:"CT", date:"2026-08-01", message:"Dossier juillet 2026 créé et ouvert pour saisie CT.", type:"action" },
    ],
  },

  {
    id: "ATT-2026-004",
    code: "ATT-2026-004",
    contratId: "CTR-2026-001",
    chantierId: "CH-2025-016",
    periodeDebut: "2026-09-01",
    periodeFin:   "2026-09-30",
    statut: "Validé",
    initiePar: { nom: "Mamadou SARR", roleId: "CT" },
    dateCreation: "2026-10-01",
    voletCSE: {
      lignes: att004_lignes,
      totalValorise: 31100000,
      pieceJointes: [],
    },
    voletSTT: {
      statut: "Chargé",
      fichiers: [
        { id:"f004", nom:"Devis_FALL_FRERES_sept2026.pdf", type:"pdf", dateUpload:"2026-10-04", uploadePar:"Pape DIOP", apercu:"simulé" },
      ],
    },
    visaDT:   { par: "Pape DIOP",     date: "2026-10-10", commentaire: "CSE conforme au constat contradictoire de septembre." },
    visaDacc: { par: "Moussa BA", date: "2026-10-12", commentaire: "Poste A figé à 31 100 000 FCFA." },
    montantFinal: 31100000,
    discussion: [
      { id:"d301", auteur:"Mamadou SARR", roleId:"CT",   date:"2026-10-01", message:"Dossier septembre 2026 soumis au DT.", type:"action" },
      { id:"d302", auteur:"Pape DIOP",    roleId:"DT",   date:"2026-10-08", message:"Tableau CSE vérifié — conforme. Soumission au DACC.", type:"action" },
      { id:"d303", auteur:"Moussa BA",roleId:"DACC", date:"2026-10-12", message:"Dossier validé. Poste A figé à 31 100 000 FCFA.", type:"action" },
    ],
  },
];

/** Construit les lignes DQE initiales pour un nouveau dossier (source DQE, qteRealisee=0) */
export function getDQELignes(contratId) {
  if (contratId === "CTR-2026-001") {
    return ARTICLES.map(a => ({
      id: `l-${a.refDQE}`,
      source: "DQE",
      refDQE: a.refDQE,
      designation: a.designation,
      unite: a.unite,
      quantitePrevueDQE: a.quantitePrevueDQE,
      prixUnitaireHT: a.prixUnitaireHT,
      quantiteRealisee: 0,
      montant: 0,
    }));
  }
  return [];
}

// Alias rétrocompat (plus utilisé en interne — gardé si import existant quelque part)
export { ARTICLES as dqeArticlesCtR001 };
