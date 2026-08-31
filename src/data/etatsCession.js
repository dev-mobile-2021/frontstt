/**
 * États de cession — remplace la base de cessions ligne à ligne du lot précédent.
 * Un état = un contrat × une période (mois calendaire), arrêté par défaut le 25 du
 * mois suivant (cf. ParametresContext.cessionsParams.jourArreteMensuel). Il comporte
 * trois sections indépendantes (MTX, MTL, RH), chacune avec sa propre source, son
 * propre cycle d'alimentation et son propre double visa (DCG quantités → DACC prix).
 *
 * Migration du lot précédent : les cessions historiques déjà consommées par un
 * décompte ont été regroupées en états "Arrêté" (un état par couple contrat/mois
 * effectivement consommé). Les cessions encore disponibles ont été redistribuées
 * pour illustrer les différents stades du cycle (voir commentaires par état).
 * Le remboursement (poste H/J/L) n'est plus une donnée de la cession : c'est une
 * saisie du décompte (cf. DecompteFormPage) — le cumul déjà remboursé se lit dans
 * les lignes de décompte existantes, pas ici.
 */

const SECTION_VIDE = () => ({
  statut: "Non renseignée",
  lignes: [],
  pieceJointesSection: [],
  pieceJointesBR: [],
  totalValorise: 0,
  visaQuantites: null,
  visaMontants: null,
  derniereRecuperation: null,
});

export const etatsCession = [
  // ── A. CTR-2025-013 / mai 2025 — Arrêté, consommé par DEC-2025-CTR013-M02 ──
  {
    id: "etc-2025-013-05", code: "ETC-2025-001",
    contratId: "CTR-2025-013", chantierId: "CH-2025-018",
    periodeDebut: "2025-05-01", periodeFin: "2025-05-31", dateArrete: "2025-06-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeArticleX3: "X3-CIM-001", designation: "Pieux préfabriqués 35×35 cm", quantiteSortie: 28, quantiteReceptionnee: 28, unite: "ml", prixUnitaireBareme: 350000, montantValorise: 9800000, dateSortie: "2025-05-16", refBonSortieX3: "BS-X3-2025-013-009", refBonReceptionChantier: "BR-2025-013-009", sousTraitantBonSortie: "SAHEL TRAVAUX PUBLICS", sousTraitantBonReception: "SAHEL TRAVAUX PUBLICS", anomalie: null },
        ],
        totalValorise: 9800000,
        visaQuantites: { par: "Mansour BOYE", date: "2025-06-10" },
        visaMontants: { par: "Moussa BA", date: "2025-06-12" },
        derniereRecuperation: "2025-06-05T07:00:00",
      },
      MTL: SECTION_VIDE(),
      RH: SECTION_VIDE(),
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: ["DEC-2025-CTR013-M02"],
  },

  // ── B. CTR-2025-011 / octobre 2025 — Arrêté, consommé par DEC-2025-CTR011-M02 ──
  {
    id: "etc-2025-011-10", code: "ETC-2025-002",
    contratId: "CTR-2025-011", chantierId: "CH-2025-015",
    periodeDebut: "2025-10-01", periodeFin: "2025-10-31", dateArrete: "2025-11-25",
    sections: {
      MTX: SECTION_VIDE(),
      MTL: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeMateriel: "GMAO-CAM-10M3", designation: "Finisseur à enrobé VOGELE 1800-3i", dateUtilisation: "2025-10-16", dureeUtilisee: 25, uniteFacturation: "jour", tarifApplique: 168000, montantValorise: 4200000, refPointage: "PJ-2025-011-010", operateur: "Cheikh NIANG" },
        ],
        totalValorise: 4200000,
        visaQuantites: { par: "Mansour BOYE", date: "2025-11-08" },
        visaMontants: { par: "Moussa BA", date: "2025-11-10" },
        derniereRecuperation: null,
      },
      RH: SECTION_VIDE(),
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: ["DEC-2025-CTR011-M02"],
  },

  // ── C. CTR-2026-001 / avril 2026 — Arrêté, consommé par DEC-2026-CTR001-M03 ──
  // MTX 26 lignes (6 articles × 3–5 sorties), MTL 41 lignes (3 engins × 12–15 j), RH 15 lignes (3 qualif + 1 permanent)
  {
    id: "etc-2026-001-04", code: "ETC-2026-001",
    contratId: "CTR-2026-001", chantierId: "CH-2025-016",
    periodeDebut: "2026-04-01", periodeFin: "2026-04-30", dateArrete: "2026-05-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          // BS-LIV1-2026-04 — 01/04 — CEM I + CEM II + Gravier — 952 800
          { id: "l1",  refBonSortieX3: "BS-LIV1-2026-04", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",    quantiteSortie: 48, unite: "sac",    prixUnitaireApplique: 4800,   montantValorise: 230400,  dateSortie: "2026-04-01", refBonReceptionChantier: "BR-CTR001-04-001", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0001.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-01" }] },
          { id: "l6",  refBonSortieX3: "BS-LIV1-2026-04", codeArticleX3: "mtx-03", designation: "Ciment CEM II 42.5",   quantiteSortie: 72, unite: "sac",    prixUnitaireApplique: 4200,   montantValorise: 302400,  dateSortie: "2026-04-01", refBonReceptionChantier: "BR-CTR001-04-001", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0006.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-01" }] },
          { id: "l23", refBonSortieX3: "BS-LIV1-2026-04", codeArticleX3: "mtx-19", designation: "Gravier concassé 6/14", quantiteSortie: 35, unite: "m³",  prixUnitaireApplique: 12000,  montantValorise: 420000,  dateSortie: "2026-04-01", refBonReceptionChantier: "BR-CTR001-04-001", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0023.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-01" }] },
          // BS-LIV2-2026-04 — 04/04 — Acier Ø12 + Acier Ø16 + Béton — 3 545 000
          { id: "l10", refBonSortieX3: "BS-LIV2-2026-04", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",       quantiteSortie: 3,  unite: "tonne", prixUnitaireApplique: 625000, montantValorise: 1875000, dateSortie: "2026-04-04", refBonReceptionChantier: "BR-CTR001-04-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0010.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-04" }] },
          { id: "l15", refBonSortieX3: "BS-LIV2-2026-04", codeArticleX3: "mtx-10", designation: "Acier HA Ø 16 mm",       quantiteSortie: 2,  unite: "tonne", prixUnitaireApplique: 615000, montantValorise: 1230000, dateSortie: "2026-04-04", refBonReceptionChantier: "BR-CTR001-04-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0015.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-04" }] },
          { id: "l19", refBonSortieX3: "BS-LIV2-2026-04", codeArticleX3: "mtx-15", designation: "Béton prêt à l'emploi B250", quantiteSortie: 8, unite: "m³", prixUnitaireApplique: 55000, montantValorise: 440000, dateSortie: "2026-04-04", refBonReceptionChantier: "BR-CTR001-04-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0019.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-04" }] },
          // BS-LIV3-2026-04 — 08/04 — CEM I + CEM II + Gravier — 710 400
          { id: "l2",  refBonSortieX3: "BS-LIV3-2026-04", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",    quantiteSortie: 36, unite: "sac",    prixUnitaireApplique: 4800,   montantValorise: 172800,  dateSortie: "2026-04-08", refBonReceptionChantier: "BR-CTR001-04-003", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0002.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-08" }] },
          { id: "l7",  refBonSortieX3: "BS-LIV3-2026-04", codeArticleX3: "mtx-03", designation: "Ciment CEM II 42.5",   quantiteSortie: 48, unite: "sac",    prixUnitaireApplique: 4200,   montantValorise: 201600,  dateSortie: "2026-04-08", refBonReceptionChantier: "BR-CTR001-04-003", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0007.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-08" }] },
          { id: "l24", refBonSortieX3: "BS-LIV3-2026-04", codeArticleX3: "mtx-19", designation: "Gravier concassé 6/14", quantiteSortie: 28, unite: "m³",  prixUnitaireApplique: 12000,  montantValorise: 336000,  dateSortie: "2026-04-08", refBonReceptionChantier: "BR-CTR001-04-003", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0024.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-08" }] },
          // BS-LIV4-2026-04 — 12/04 — Acier Ø12 + Acier Ø16 + Béton — 3 755 000
          { id: "l11", refBonSortieX3: "BS-LIV4-2026-04", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",       quantiteSortie: 2,  unite: "tonne", prixUnitaireApplique: 625000, montantValorise: 1250000, dateSortie: "2026-04-12", refBonReceptionChantier: "BR-CTR001-04-004", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0011.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-12" }] },
          { id: "l16", refBonSortieX3: "BS-LIV4-2026-04", codeArticleX3: "mtx-10", designation: "Acier HA Ø 16 mm",       quantiteSortie: 3,  unite: "tonne", prixUnitaireApplique: 615000, montantValorise: 1845000, dateSortie: "2026-04-12", refBonReceptionChantier: "BR-CTR001-04-004", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0016.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-12" }] },
          { id: "l20", refBonSortieX3: "BS-LIV4-2026-04", codeArticleX3: "mtx-15", designation: "Béton prêt à l'emploi B250", quantiteSortie: 12, unite: "m³", prixUnitaireApplique: 55000, montantValorise: 660000, dateSortie: "2026-04-12", refBonReceptionChantier: "BR-CTR001-04-004", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0020.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-12" }] },
          // BS-LIV5-2026-04 — 16/04 — CEM I + CEM II + Gravier — 1 106 400
          { id: "l3",  refBonSortieX3: "BS-LIV5-2026-04", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",    quantiteSortie: 52, unite: "sac",    prixUnitaireApplique: 4800,   montantValorise: 249600,  dateSortie: "2026-04-16", refBonReceptionChantier: "BR-CTR001-04-005", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0003.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-16" }] },
          { id: "l8",  refBonSortieX3: "BS-LIV5-2026-04", codeArticleX3: "mtx-03", designation: "Ciment CEM II 42.5",   quantiteSortie: 84, unite: "sac",    prixUnitaireApplique: 4200,   montantValorise: 352800,  dateSortie: "2026-04-16", refBonReceptionChantier: "BR-CTR001-04-005", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0008.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-16" }] },
          { id: "l25", refBonSortieX3: "BS-LIV5-2026-04", codeArticleX3: "mtx-19", designation: "Gravier concassé 6/14", quantiteSortie: 42, unite: "m³",  prixUnitaireApplique: 12000,  montantValorise: 504000,  dateSortie: "2026-04-16", refBonReceptionChantier: "BR-CTR001-04-005", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0025.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-16" }] },
          // BS-LIV6-2026-04 — 20/04 — Acier Ø12 + Acier Ø16 + Béton — 5 510 000
          { id: "l12", refBonSortieX3: "BS-LIV6-2026-04", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",       quantiteSortie: 4,  unite: "tonne", prixUnitaireApplique: 625000, montantValorise: 2500000, dateSortie: "2026-04-20", refBonReceptionChantier: "BR-CTR001-04-006", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0012.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-20" }] },
          { id: "l17", refBonSortieX3: "BS-LIV6-2026-04", codeArticleX3: "mtx-10", designation: "Acier HA Ø 16 mm",       quantiteSortie: 4,  unite: "tonne", prixUnitaireApplique: 615000, montantValorise: 2460000, dateSortie: "2026-04-20", refBonReceptionChantier: "BR-CTR001-04-006", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0017.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-20" }] },
          { id: "l21", refBonSortieX3: "BS-LIV6-2026-04", codeArticleX3: "mtx-15", designation: "Béton prêt à l'emploi B250", quantiteSortie: 10, unite: "m³", prixUnitaireApplique: 55000, montantValorise: 550000, dateSortie: "2026-04-20", refBonReceptionChantier: "BR-CTR001-04-006", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0021.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-20" }] },
          // BS-LIV7-2026-04 — 25/04 — CEM I + Acier Ø12 + Acier Ø16 + Gravier — 3 676 200
          { id: "l4",  refBonSortieX3: "BS-LIV7-2026-04", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",    quantiteSortie: 44, unite: "sac",    prixUnitaireApplique: 4800,   montantValorise: 211200,  dateSortie: "2026-04-25", refBonReceptionChantier: "BR-CTR001-04-007", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0004.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-25" }] },
          { id: "l13", refBonSortieX3: "BS-LIV7-2026-04", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",       quantiteSortie: 3,  unite: "tonne", prixUnitaireApplique: 625000, montantValorise: 1875000, dateSortie: "2026-04-25", refBonReceptionChantier: "BR-CTR001-04-007", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0013.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-25" }] },
          { id: "l18", refBonSortieX3: "BS-LIV7-2026-04", codeArticleX3: "mtx-10", designation: "Acier HA Ø 16 mm",       quantiteSortie: 2,  unite: "tonne", prixUnitaireApplique: 615000, montantValorise: 1230000, dateSortie: "2026-04-25", refBonReceptionChantier: "BR-CTR001-04-007", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0018.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-25" }] },
          { id: "l26", refBonSortieX3: "BS-LIV7-2026-04", codeArticleX3: "mtx-19", designation: "Gravier concassé 6/14", quantiteSortie: 30, unite: "m³",  prixUnitaireApplique: 12000,  montantValorise: 360000,  dateSortie: "2026-04-25", refBonReceptionChantier: "BR-CTR001-04-007", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0026.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-25" }] },
          // BS-LIV8-2026-04 — 29/04 — CEM I + CEM II + Acier Ø12 + Béton — 2 615 000
          { id: "l5",  refBonSortieX3: "BS-LIV8-2026-04", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",    quantiteSortie: 60, unite: "sac",    prixUnitaireApplique: 4800,   montantValorise: 288000,  dateSortie: "2026-04-29", refBonReceptionChantier: "BR-CTR001-04-008", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0005.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-29" }] },
          { id: "l9",  refBonSortieX3: "BS-LIV8-2026-04", codeArticleX3: "mtx-03", designation: "Ciment CEM II 42.5",   quantiteSortie: 60, unite: "sac",    prixUnitaireApplique: 4200,   montantValorise: 252000,  dateSortie: "2026-04-29", refBonReceptionChantier: "BR-CTR001-04-008", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0009.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-29" }] },
          { id: "l14", refBonSortieX3: "BS-LIV8-2026-04", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",       quantiteSortie: 2,  unite: "tonne", prixUnitaireApplique: 625000, montantValorise: 1250000, dateSortie: "2026-04-29", refBonReceptionChantier: "BR-CTR001-04-008", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0014.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-29" }] },
          { id: "l22", refBonSortieX3: "BS-LIV8-2026-04", codeArticleX3: "mtx-15", designation: "Béton prêt à l'emploi B250", quantiteSortie: 15, unite: "m³", prixUnitaireApplique: 55000, montantValorise: 825000, dateSortie: "2026-04-29", refBonReceptionChantier: "BR-CTR001-04-008", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_2026_04_0022.pdf", type: "Bon de sortie X3", dateAjout: "2026-04-29" }] },
        ],
        pieceJointesSection: [{ nom: "BS_recapitulatif_MTX_avril_2026.pdf", type: "Récapitulatif bons de sortie", nbLignes: 26, dateImport: "2026-05-02" }],
        pieceJointesBR: [],
        totalValorise: 21870800,
        visaQuantites: { par: "Mansour BOYE", date: "2026-05-10" },
        visaMontants: { par: "Moussa BA", date: "2026-05-12" },
        derniereRecuperation: "2026-05-02T06:00:00",
      },
      MTL: {
        statut: "Validée",
        pieceJointesSection: [{ nom: "pointage_2026_04_001.pdf", type: "Pointage journalier MTL", nbLignes: 41, dateImport: "2026-05-02" }],
        pieceJointesBR: [],
        lignes: [
          // Pelle hydraulique 20T — 15 jours — total 3 125 000
          { id: "l1",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-01", dureeUtilisee: 8,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-001-04-01-E0", operateur: "Oumar DIALLO" },
          { id: "l2",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-02", dureeUtilisee: 10, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 250000, refPointage: "PT-001-04-02-E0", operateur: "Oumar DIALLO" },
          { id: "l3",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-03", dureeUtilisee: 7,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 175000, refPointage: "PT-001-04-03-E0", operateur: "Oumar DIALLO" },
          { id: "l4",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-04", dureeUtilisee: 9,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 225000, refPointage: "PT-001-04-04-E0", operateur: "Oumar DIALLO" },
          { id: "l5",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-06", dureeUtilisee: 8,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-001-04-06-E0", operateur: "Oumar DIALLO" },
          { id: "l6",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-07", dureeUtilisee: 10, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 250000, refPointage: "PT-001-04-07-E0", operateur: "Oumar DIALLO" },
          { id: "l7",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-08", dureeUtilisee: 6,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 150000, refPointage: "PT-001-04-08-E0", operateur: "Oumar DIALLO" },
          { id: "l8",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-09", dureeUtilisee: 8,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-001-04-09-E0", operateur: "Oumar DIALLO" },
          { id: "l9",  codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-10", dureeUtilisee: 9,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 225000, refPointage: "PT-001-04-10-E0", operateur: "Oumar DIALLO" },
          { id: "l10", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-11", dureeUtilisee: 8,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-001-04-11-E0", operateur: "Oumar DIALLO" },
          { id: "l11", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-14", dureeUtilisee: 7,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 175000, refPointage: "PT-001-04-14-E0", operateur: "Oumar DIALLO" },
          { id: "l12", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-15", dureeUtilisee: 10, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 250000, refPointage: "PT-001-04-15-E0", operateur: "Oumar DIALLO" },
          { id: "l13", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-16", dureeUtilisee: 8,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-001-04-16-E0", operateur: "Oumar DIALLO" },
          { id: "l14", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-17", dureeUtilisee: 9,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 225000, refPointage: "PT-001-04-17-E0", operateur: "Oumar DIALLO" },
          { id: "l15", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-18", dureeUtilisee: 8,  uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-001-04-18-E0", operateur: "Oumar DIALLO" },
          // Bétonnière 350L — 14 jours — total 770 000
          { id: "l16", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-02", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-02-E1", operateur: "Modou FAYE" },
          { id: "l17", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-03", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-03-E1", operateur: "Modou FAYE" },
          { id: "l18", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-04", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-04-E1", operateur: "Modou FAYE" },
          { id: "l19", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-06", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-06-E1", operateur: "Modou FAYE" },
          { id: "l20", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-07", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-07-E1", operateur: "Modou FAYE" },
          { id: "l21", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-08", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-08-E1", operateur: "Modou FAYE" },
          { id: "l22", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-09", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-09-E1", operateur: "Modou FAYE" },
          { id: "l23", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-10", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-10-E1", operateur: "Modou FAYE" },
          { id: "l24", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-13", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-13-E1", operateur: "Modou FAYE" },
          { id: "l25", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-14", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-14-E1", operateur: "Modou FAYE" },
          { id: "l26", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-15", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-15-E1", operateur: "Modou FAYE" },
          { id: "l27", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-16", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-16-E1", operateur: "Modou FAYE" },
          { id: "l28", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-21", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-21-E1", operateur: "Modou FAYE" },
          { id: "l29", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-04-22", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-001-04-22-E1", operateur: "Modou FAYE" },
          // Grue à tour — 12 jours — total 3 600 000
          { id: "l30", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-06", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-06-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l31", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-07", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-07-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l32", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-08", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-08-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l33", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-09", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-09-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l34", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-13", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-13-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l35", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-14", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-14-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l36", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-15", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-15-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l37", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-20", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-20-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l38", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-21", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-21-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l39", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-22", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-22-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l40", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-27", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-27-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l41", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-04-28", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-001-04-28-E2", operateur: "Ibrahima NDIAYE" },
        ],
        totalValorise: 7495000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-05-10" },
        visaMontants: { par: "Moussa BA", date: "2026-05-12" },
        derniereRecuperation: "2026-05-02T07:00:00",
      },
      RH: {
        statut: "Validée",
        pieceJointesSection: [{ nom: "paie_2026_04_001.pdf", type: "Fichier de paie RH", nbLignes: 15, dateImport: "2026-05-02" }],
        pieceJointesBR: [],
        lignes: [
          // Maçon journalier — 5 entrées — total 165 000
          { id: "l1",  qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500, montantValorise: 30000,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-00" },
          { id: "l2",  qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 7500, montantValorise: 37500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-01" },
          { id: "l3",  qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 7500, montantValorise: 37500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-02" },
          { id: "l4",  qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 7500, montantValorise: 37500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-03" },
          { id: "l5",  qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 3, coutUnitaireApplique: 7500, montantValorise: 22500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-04" },
          // Coffreur journalier — 4 entrées — total 160 000
          { id: "l6",  qualification: "Coffreur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8000, montantValorise: 40000, periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-05" },
          { id: "l7",  qualification: "Coffreur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8000, montantValorise: 40000, periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-06" },
          { id: "l8",  qualification: "Coffreur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8000, montantValorise: 40000, periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-07" },
          { id: "l9",  qualification: "Coffreur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8000, montantValorise: 40000, periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-08" },
          // Ferrailleur journalier — 5 entrées — total 187 000
          { id: "l10", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8500, montantValorise: 34000,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-09" },
          { id: "l11", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500, montantValorise: 42500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-10" },
          { id: "l12", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500, montantValorise: 42500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-11" },
          { id: "l13", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500, montantValorise: 42500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-12" },
          { id: "l14", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 3, coutUnitaireApplique: 8500, montantValorise: 25500,  periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-13" },
          // Chef ferrailleur permanent — 1 entrée — total 187 000
          { id: "l15", qualification: "Chef ferrailleur", typePersonnel: "permanent", nombreJoursHomme: 22, coutUnitaireApplique: 8500, montantValorise: 187000, periodePaie: "2026-04", refImportPaie: "PAIE-001-202604-PM" },
        ],
        totalValorise: 699000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-05-10" },
        visaMontants: { par: "Moussa BA", date: "2026-05-12" },
        derniereRecuperation: "2026-05-02T08:00:00",
      },
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: ["DEC-2026-CTR001-M03"],
  },

  // ── D. CTR-2026-001 / mai 2026 — Arrêté, consommé par DEC-2026-CTR001-M04 ──
  // Note: MTL et RH non renseignées ce mois
  {
    id: "etc-2026-001-05", code: "ETC-2026-002",
    contratId: "CTR-2026-001", chantierId: "CH-2025-016",
    periodeDebut: "2026-05-01", periodeFin: "2026-05-31", dateArrete: "2026-06-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeArticleX3: "X3-BPE-150", designation: "Béton de propreté dosé 150 kg/m³", quantiteSortie: 250, unite: "m³", prixUnitaireApplique: 20000, montantValorise: 5000000, dateSortie: "2026-05-16", refBonSortieX3: "BS-X3-2026-001-004", refBonReceptionChantier: "BR-2026-001-004", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_X3_2026_001_004.pdf", type: "Bon de sortie X3", dateAjout: "2026-05-16" }] },
        ],
        pieceJointesSection: [{ nom: "BS_recapitulatif_MTX_mai_2026.pdf", type: "Récapitulatif bons de sortie", nbLignes: 1, dateImport: "2026-06-02" }],
        pieceJointesBR: [],
        totalValorise: 5000000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-06-09" },
        visaMontants: { par: "Moussa BA", date: "2026-06-11" },
        derniereRecuperation: "2026-06-02T06:00:00",
      },
      MTL: SECTION_VIDE(),
      RH: SECTION_VIDE(),
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: ["DEC-2026-CTR001-M04"],
  },

  // ── E. CTR-2026-005 / avril 2026 — Arrêté, consommé par DEC-2026-CTR005-M01 ──
  {
    id: "etc-2026-005-04", code: "ETC-2026-003",
    contratId: "CTR-2026-005", chantierId: "CH-2026-017",
    periodeDebut: "2026-04-01", periodeFin: "2026-04-30", dateArrete: "2026-05-25",
    sections: {
      MTX: SECTION_VIDE(),
      MTL: SECTION_VIDE(),
      RH: {
        statut: "Validée",
        lignes: [
          { id: "l1", qualification: "Technicien réseaux HTA mis à disposition", typePersonnel: "journalier", nombreJoursHomme: 1, coutUnitaireApplique: 3200000, montantValorise: 3200000, periodePaie: "2026-04", refImportPaie: "PAIE-2026-005-005" },
        ],
        totalValorise: 3200000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-05-11" },
        visaMontants: { par: "Moussa BA", date: "2026-05-13" },
        derniereRecuperation: null,
      },
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: ["DEC-2026-CTR005-M01"],
  },

  // ── F. CTR-2026-006 / avril 2026 — Arrêté, consommé par DEC-2026-CTR006-M01 ──
  {
    id: "etc-2026-006-04", code: "ETC-2026-004",
    contratId: "CTR-2026-006", chantierId: "CH-2026-017",
    periodeDebut: "2026-04-01", periodeFin: "2026-04-30", dateArrete: "2026-05-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeArticleX3: "X3-GRA-1525", designation: "Béton armé C35 fourni par CSE", quantiteSortie: 45, quantiteReceptionnee: 45, unite: "m³", prixUnitaireBareme: 185000, montantValorise: 8325000, dateSortie: "2026-04-15", refBonSortieX3: "BS-X3-2026-006-006", refBonReceptionChantier: "BR-2026-006-006", sousTraitantBonSortie: "BÂTIR ENSEMBLE SA", sousTraitantBonReception: "BÂTIR ENSEMBLE SA", anomalie: null },
          { id: "l2", codeArticleX3: "X3-GRA-1525", designation: "Acier HA ø16 ml façonné", quantiteSortie: 12, quantiteReceptionnee: 12, unite: "T", prixUnitaireBareme: 246000, montantValorise: 2952000, dateSortie: "2026-04-15", refBonSortieX3: "BS-X3-2026-006-007", refBonReceptionChantier: "BR-2026-006-007", sousTraitantBonSortie: "BÂTIR ENSEMBLE SA", sousTraitantBonReception: "BÂTIR ENSEMBLE SA", anomalie: null },
        ],
        totalValorise: 11277000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-05-09" },
        visaMontants: { par: "Moussa BA", date: "2026-05-11" },
        derniereRecuperation: "2026-05-02T06:00:00",
      },
      MTL: SECTION_VIDE(),
      RH: SECTION_VIDE(),
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: ["DEC-2026-CTR006-M01"],
  },

  // ── G. CTR-2025-010 / mars 2026 — sections partielles (MTL non renseignée) ──
  {
    id: "etc-2025-010-03", code: "ETC-2026-005",
    contratId: "CTR-2025-010", chantierId: "CH-2025-015",
    periodeDebut: "2026-03-01", periodeFin: "2026-03-31", dateArrete: null,
    sections: {
      MTX: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", codeArticleX3: "X3-CIM-003", designation: "Ciment CEM II 42.5", quantiteSortie: 24, quantiteReceptionnee: 24, unite: "sac", prixUnitaireBareme: 4200, montantValorise: 100800, dateSortie: "2026-03-10", refBonSortieX3: "BS-X3-2025-010-028", refBonReceptionChantier: "BR-2025-010-028", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null },
          { id: "l2", codeArticleX3: "X3-ACR-010", designation: "Acier HA Ø 10 mm", quantiteSortie: 28, quantiteReceptionnee: 28, unite: "tonne", prixUnitaireBareme: 630000, montantValorise: 17640000, dateSortie: "2026-03-20", refBonSortieX3: "BS-X3-2025-010-029", refBonReceptionChantier: "BR-2025-010-029", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null },
        ],
        totalValorise: 17740800,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: "2026-03-22T06:00:00",
      },
      MTL: SECTION_VIDE(),
      RH: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 3, coutUnitaireApplique: 7500, montantValorise: 22500, periodePaie: "2026-03", refImportPaie: "PAIE-2025-010-031" },
        ],
        totalValorise: 22500,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
    },
    statutGlobal: "En contrôle",
    decomptesConsommateurs: [],
  },

  // ── G2. CTR-2025-010 / avril 2026 — MTL seule renseignée (import pointage suivant) ──
  {
    id: "etc-2025-010-04", code: "ETC-2026-006",
    contratId: "CTR-2025-010", chantierId: "CH-2025-015",
    periodeDebut: "2026-04-01", periodeFin: "2026-04-30", dateArrete: null,
    sections: {
      MTX: SECTION_VIDE(),
      MTL: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", codeMateriel: "GMAO-PEL-20T", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-04-15", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PJ-2025-010-030", operateur: "Modou FAYE" },
        ],
        totalValorise: 300000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
      RH: SECTION_VIDE(),
    },
    statutGlobal: "En contrôle",
    decomptesConsommateurs: [],
  },

  // ── H. CTR-2025-011 / mai 2026 — anomalie détectée sur MTX (sous-traitant divergent) ──
  {
    id: "etc-2025-011-05", code: "ETC-2026-007",
    contratId: "CTR-2025-011", chantierId: "CH-2025-015",
    periodeDebut: "2026-05-01", periodeFin: "2026-05-31", dateArrete: null,
    sections: {
      MTX: {
        statut: "Anomalies détectées",
        lignes: [
          { id: "l1", codeArticleX3: "X3-CIM-002", designation: "Ciment CEM II 32.5", quantiteSortie: 25, quantiteReceptionnee: 25, unite: "sac", prixUnitaireBareme: 3800, montantValorise: 95000, dateSortie: "2026-05-15", refBonSortieX3: "BS-X3-2025-011-032", refBonReceptionChantier: "BR-2025-011-032", sousTraitantBonSortie: "TERRASSEMENT MODERNE", sousTraitantBonReception: "OUEST AFRIQUE CONSTRUCTION", anomalie: { type: "Sous-traitant divergent", description: "Bon de sortie X3 émis pour TERRASSEMENT MODERNE, bon de réception chantier signé par OUEST AFRIQUE CONSTRUCTION." } },
        ],
        totalValorise: 95000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: "2026-05-20T06:00:00",
      },
      MTL: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", codeMateriel: "GMAO-CAM-10M3", designation: "Camion benne 10m³", dateUtilisation: "2026-05-15", dureeUtilisee: 13, uniteFacturation: "heure", tarifApplique: 15000, montantValorise: 195000, refPointage: "PJ-2025-011-033", operateur: "Ibrahima DIALLO" },
        ],
        totalValorise: 195000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
      RH: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", qualification: "Électricien", typePersonnel: "journalier", nombreJoursHomme: 3, coutUnitaireApplique: 9000, montantValorise: 27000, periodePaie: "2026-05", refImportPaie: "PAIE-2025-011-034" },
        ],
        totalValorise: 27000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
    },
    statutGlobal: "En contrôle",
    decomptesConsommateurs: [],
  },

  // ── I. CTR-2026-001 / juin 2026 — quantités validées (DCG), montants en attente (DACC) ──
  {
    id: "etc-2026-001-06", code: "ETC-2026-008",
    contratId: "CTR-2026-001", chantierId: "CH-2025-016",
    periodeDebut: "2026-06-01", periodeFin: "2026-06-30", dateArrete: null,
    sections: {
      MTX: {
        statut: "Quantités validées",
        lignes: [
          { id: "l1", codeArticleX3: "X3-CIM-001", designation: "Ciment CEM I 42.5", quantiteSortie: 30, quantiteReceptionnee: 30, unite: "sac", prixUnitaireBareme: 4800, montantValorise: 144000, dateSortie: "2026-06-10", refBonSortieX3: "BS-X3-2026-001-010", refBonReceptionChantier: "BR-2026-001-010", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null },
          { id: "l2", codeArticleX3: "X3-CIM-003", designation: "Ciment CEM II 42.5", quantiteSortie: 48, quantiteReceptionnee: 48, unite: "sac", prixUnitaireBareme: 4200, montantValorise: 201600, dateSortie: "2026-06-20", refBonSortieX3: "BS-X3-2026-001-011", refBonReceptionChantier: "BR-2026-001-011", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null },
        ],
        totalValorise: 345600,
        visaQuantites: { par: "Mansour BOYE", date: "2026-07-08" },
        visaMontants: null,
        derniereRecuperation: "2026-06-22T06:00:00",
      },
      MTL: {
        statut: "Quantités validées",
        lignes: [
          { id: "l1", codeMateriel: "GMAO-PEL-20T", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-06-15", dureeUtilisee: 11, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 275000, refPointage: "PJ-2026-001-012", operateur: "Modou FAYE" },
        ],
        totalValorise: 275000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-07-08" },
        visaMontants: null,
        derniereRecuperation: null,
      },
      RH: {
        statut: "Quantités validées",
        lignes: [
          { id: "l1", qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 2, coutUnitaireApplique: 7500, montantValorise: 15000, periodePaie: "2026-06", refImportPaie: "PAIE-2026-001-013" },
        ],
        totalValorise: 15000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-07-08" },
        visaMontants: null,
        derniereRecuperation: null,
      },
    },
    statutGlobal: "En contrôle",
    decomptesConsommateurs: [],
  },

  // ── J. CTR-2026-002 / juin 2026 — juste alimenté, aucun visa (état "Ouvert") ──
  {
    id: "etc-2026-002-06", code: "ETC-2026-009",
    contratId: "CTR-2026-002", chantierId: "CH-2025-016",
    periodeDebut: "2026-06-01", periodeFin: "2026-06-30", dateArrete: null,
    sections: {
      MTX: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", codeArticleX3: "X3-CIM-002", designation: "Ciment CEM II 32.5", quantiteSortie: 24, quantiteReceptionnee: 24, unite: "sac", prixUnitaireBareme: 3800, montantValorise: 91200, dateSortie: "2026-06-15", refBonSortieX3: "BS-X3-2026-002-014", refBonReceptionChantier: "BR-2026-002-014", sousTraitantBonSortie: "CONSTRUCTIONS NDIAYE", sousTraitantBonReception: "CONSTRUCTIONS NDIAYE", anomalie: null },
        ],
        totalValorise: 91200,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: "2026-06-21T06:00:00",
      },
      MTL: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", codeMateriel: "GMAO-CAM-10M3", designation: "Camion benne 10m³", dateUtilisation: "2026-06-15", dureeUtilisee: 13, uniteFacturation: "heure", tarifApplique: 15000, montantValorise: 195000, refPointage: "PJ-2026-002-015", operateur: "Ibrahima DIALLO" },
        ],
        totalValorise: 195000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
      RH: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", qualification: "Manœuvre", typePersonnel: "journalier", nombreJoursHomme: 3, coutUnitaireApplique: 5000, montantValorise: 15000, periodePaie: "2026-06", refImportPaie: "PAIE-2026-002-016" },
        ],
        totalValorise: 15000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
    },
    statutGlobal: "Ouvert",
    decomptesConsommateurs: [],
  },

  // ── K. CTR-2026-007 / juin 2026 — Arrêté mais PAS ENCORE consommé (aucun décompte sur juin) ──
  {
    id: "etc-2026-007-06", code: "ETC-2026-010",
    contratId: "CTR-2026-007", chantierId: "CH-2026-017",
    periodeDebut: "2026-06-01", periodeFin: "2026-06-30", dateArrete: "2026-07-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeArticleX3: "X3-CIM-001", designation: "Ciment CEM I 42.5", quantiteSortie: 46, quantiteReceptionnee: 46, unite: "sac", prixUnitaireBareme: 4500, montantValorise: 207000, dateSortie: "2026-06-10", refBonSortieX3: "BS-X3-2026-007-021", refBonReceptionChantier: "BR-2026-007-021", sousTraitantBonSortie: "DRAGAGES MARITIMES ATLANTIQUE", sousTraitantBonReception: "DRAGAGES MARITIMES ATLANTIQUE", anomalie: null },
          { id: "l2", codeArticleX3: "X3-ACR-020", designation: "Acier HA Ø 20 mm", quantiteSortie: 19, quantiteReceptionnee: 19, unite: "tonne", prixUnitaireBareme: 610000, montantValorise: 11590000, dateSortie: "2026-06-20", refBonSortieX3: "BS-X3-2026-007-022", refBonReceptionChantier: "BR-2026-007-022", sousTraitantBonSortie: "DRAGAGES MARITIMES ATLANTIQUE", sousTraitantBonReception: "DRAGAGES MARITIMES ATLANTIQUE", anomalie: null },
        ],
        totalValorise: 11797000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-07-15" },
        visaMontants: { par: "Moussa BA", date: "2026-07-17" },
        derniereRecuperation: "2026-06-22T06:00:00",
      },
      MTL: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeMateriel: "GMAO-BET-350", designation: "Bétonnière 350L", dateUtilisation: "2026-06-15", dureeUtilisee: 6, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 330000, refPointage: "PJ-2026-007-023", operateur: "Modou FAYE" },
        ],
        totalValorise: 330000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-07-15" },
        visaMontants: { par: "Moussa BA", date: "2026-07-17" },
        derniereRecuperation: null,
      },
      RH: {
        statut: "Validée",
        lignes: [
          { id: "l1", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 2, coutUnitaireApplique: 8500, montantValorise: 17000, periodePaie: "2026-06", refImportPaie: "PAIE-2026-007-024" },
        ],
        totalValorise: 17000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-07-15" },
        visaMontants: { par: "Moussa BA", date: "2026-07-17" },
        derniereRecuperation: null,
      },
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: [],
  },

  // ── L. CTR-2026-008 / juin 2026 — MTX visée quantités, MTL/RH encore alimentées seules ──
  {
    id: "etc-2026-008-06", code: "ETC-2026-011",
    contratId: "CTR-2026-008", chantierId: "CH-2026-017",
    periodeDebut: "2026-06-01", periodeFin: "2026-06-30", dateArrete: null,
    sections: {
      MTX: {
        statut: "Quantités validées",
        lignes: [
          { id: "l1", codeArticleX3: "X3-CIM-002", designation: "Ciment CEM II 32.5", quantiteSortie: 9, quantiteReceptionnee: 9, unite: "sac", prixUnitaireBareme: 3800, montantValorise: 34200, dateSortie: "2026-06-15", refBonSortieX3: "BS-X3-2026-008-025", refBonReceptionChantier: "BR-2026-008-025", sousTraitantBonSortie: "ÉLECTRICITÉ INDUSTRIELLE SÉNÉGAL", sousTraitantBonReception: "ÉLECTRICITÉ INDUSTRIELLE SÉNÉGAL", anomalie: null },
        ],
        totalValorise: 34200,
        visaQuantites: { par: "Mansour BOYE", date: "2026-07-05" },
        visaMontants: null,
        derniereRecuperation: "2026-06-20T06:00:00",
      },
      MTL: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", codeMateriel: "GMAO-CAM-10M3", designation: "Camion benne 10m³", dateUtilisation: "2026-06-15", dureeUtilisee: 14, uniteFacturation: "heure", tarifApplique: 15000, montantValorise: 210000, refPointage: "PJ-2026-008-026", operateur: "Ibrahima DIALLO" },
        ],
        totalValorise: 210000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
      RH: {
        statut: "Alimentée",
        lignes: [
          { id: "l1", qualification: "Manœuvre", typePersonnel: "journalier", nombreJoursHomme: 2, coutUnitaireApplique: 5000, montantValorise: 10000, periodePaie: "2026-06", refImportPaie: "PAIE-2026-008-027" },
        ],
        totalValorise: 10000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: null,
      },
    },
    statutGlobal: "En contrôle",
    decomptesConsommateurs: [],
  },

  // ── M. CTR-2026-001 / juillet 2026 — Arrêté, pas encore consommé ──
  {
    id: "etc-2026-001-07", code: "ETC-2026-012",
    contratId: "CTR-2026-001", chantierId: "CH-2025-016",
    periodeDebut: "2026-07-01", periodeFin: "2026-07-31", dateArrete: "2026-08-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          { id: "l1", refBonSortieX3: "BS-X3-CTR001-07-001", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",    quantiteSortie: 120, unite: "sac",    prixUnitaireApplique: 4800,   montantValorise: 576000,  dateSortie: "2026-07-05", refBonReceptionChantier: "BR-CTR001-07-001", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_07_001.pdf", type: "Bon de sortie X3", dateAjout: "2026-07-05" }] },
          { id: "l2", refBonSortieX3: "BS-X3-CTR001-07-002", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",       quantiteSortie: 8,   unite: "tonne",  prixUnitaireApplique: 625000, montantValorise: 5000000, dateSortie: "2026-07-10", refBonReceptionChantier: "BR-CTR001-07-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_07_002.pdf", type: "Bon de sortie X3", dateAjout: "2026-07-10" }] },
          { id: "l3", refBonSortieX3: "BS-X3-CTR001-07-003", codeArticleX3: "mtx-10", designation: "Acier HA Ø 16 mm",       quantiteSortie: 5,   unite: "tonne",  prixUnitaireApplique: 615000, montantValorise: 3075000, dateSortie: "2026-07-15", refBonReceptionChantier: "BR-CTR001-07-003", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_07_003.pdf", type: "Bon de sortie X3", dateAjout: "2026-07-15" }] },
          { id: "l4", refBonSortieX3: "BS-X3-CTR001-07-004", codeArticleX3: "mtx-15", designation: "Béton prêt à l'emploi B250", quantiteSortie: 20, unite: "m³",   prixUnitaireApplique: 55000,  montantValorise: 1100000, dateSortie: "2026-07-20", refBonReceptionChantier: "BR-CTR001-07-004", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_07_004.pdf", type: "Bon de sortie X3", dateAjout: "2026-07-20" }] },
        ],
        pieceJointesSection: [{ nom: "BS_recapitulatif_MTX_juillet_2026.pdf", type: "Récapitulatif bons de sortie", nbLignes: 4, dateImport: "2026-08-01" }],
        pieceJointesBR: [],
        totalValorise: 9751000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-08-10" },
        visaMontants: { par: "Moussa BA", date: "2026-08-12" },
        derniereRecuperation: "2026-08-01T06:00:00",
      },
      MTL: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-07", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-01-E0", operateur: "Oumar DIALLO" },
          { id: "l2", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-08", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-02-E0", operateur: "Oumar DIALLO" },
          { id: "l3", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-09", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-03-E0", operateur: "Oumar DIALLO" },
          { id: "l4", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-10", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-04-E0", operateur: "Oumar DIALLO" },
          { id: "l5", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-14", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-05-E0", operateur: "Oumar DIALLO" },
          { id: "l6", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-15", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-06-E0", operateur: "Oumar DIALLO" },
          { id: "l7", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-16", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-07-E0", operateur: "Oumar DIALLO" },
          { id: "l8", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-17", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-08-E0", operateur: "Oumar DIALLO" },
          { id: "l9", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-21", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-09-E0", operateur: "Oumar DIALLO" },
          { id: "l10", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-22", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-10-E0", operateur: "Oumar DIALLO" },
          { id: "l11", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-23", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-11-E0", operateur: "Oumar DIALLO" },
          { id: "l12", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-24", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-12-E0", operateur: "Oumar DIALLO" },
          { id: "l13", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-28", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-13-E0", operateur: "Oumar DIALLO" },
          { id: "l14", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-29", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-14-E0", operateur: "Oumar DIALLO" },
          { id: "l15", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-07-30", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-07-15-E0", operateur: "Oumar DIALLO" },
          { id: "l16", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-07-07", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-07-01-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l17", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-07-08", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-07-02-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l18", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-07-09", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-07-03-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l19", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-07-10", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-07-04-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l20", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-07-14", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-07-05-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l21", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-15", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-01-E1", operateur: "Modou FAYE" },
          { id: "l22", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-16", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-02-E1", operateur: "Modou FAYE" },
          { id: "l23", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-17", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-03-E1", operateur: "Modou FAYE" },
          { id: "l24", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-21", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-04-E1", operateur: "Modou FAYE" },
          { id: "l25", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-22", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-05-E1", operateur: "Modou FAYE" },
          { id: "l26", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-23", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-06-E1", operateur: "Modou FAYE" },
          { id: "l27", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-24", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-07-E1", operateur: "Modou FAYE" },
          { id: "l28", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-07-28", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-07-08-E1", operateur: "Modou FAYE" },
        ],
        pieceJointesSection: [{ nom: "pointage_2026_07_CTR001.pdf", type: "Pointage journalier MTL", nbLignes: 28, dateImport: "2026-08-01" }],
        pieceJointesBR: [],
        totalValorise: 4940000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-08-10" },
        visaMontants: { par: "Moussa BA", date: "2026-08-12" },
        derniereRecuperation: "2026-08-01T07:00:00",
      },
      RH: {
        statut: "Validée",
        lignes: [
          { id: "l1", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-00" },
          { id: "l2", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-01" },
          { id: "l3", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-02" },
          { id: "l4", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-03" },
          { id: "l5", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-04" },
          { id: "l6", qualification: "Coffreur",       typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8000,  montantValorise: 32000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-05" },
          { id: "l7", qualification: "Coffreur",       typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8000,  montantValorise: 32000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-06" },
          { id: "l8", qualification: "Coffreur",       typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8000,  montantValorise: 32000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-07" },
          { id: "l9", qualification: "Coffreur",       typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8000,  montantValorise: 32000,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-08" },
          { id: "l10", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500,  montantValorise: 42500,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-09" },
          { id: "l11", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500,  montantValorise: 42500,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-10" },
          { id: "l12", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500,  montantValorise: 42500,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-11" },
          { id: "l13", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500,  montantValorise: 42500,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-12" },
          { id: "l14", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500,  montantValorise: 42500,  periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-13" },
          { id: "l15", qualification: "Chef ferrailleur", typePersonnel: "permanent", nombreJoursHomme: 22, coutUnitaireApplique: 8500, montantValorise: 187000, periodePaie: "2026-07", refImportPaie: "PAIE-CTR001-202607-PM" },
        ],
        pieceJointesSection: [{ nom: "paie_2026_07_CTR001.pdf", type: "Fichier de paie RH", nbLignes: 15, dateImport: "2026-08-01" }],
        pieceJointesBR: [],
        totalValorise: 677500,
        visaQuantites: { par: "Mansour BOYE", date: "2026-08-10" },
        visaMontants: { par: "Moussa BA", date: "2026-08-12" },
        derniereRecuperation: "2026-08-01T08:00:00",
      },
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: [],
  },

  // ── N. CTR-2026-001 / août 2026 — Arrêté, pas encore consommé ──
  {
    id: "etc-2026-001-08", code: "ETC-2026-013",
    contratId: "CTR-2026-001", chantierId: "CH-2025-016",
    periodeDebut: "2026-08-01", periodeFin: "2026-08-31", dateArrete: "2026-09-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          { id: "l1", refBonSortieX3: "BS-X3-CTR001-08-001", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",    quantiteSortie: 80,  unite: "sac",    prixUnitaireApplique: 4800,   montantValorise: 384000,  dateSortie: "2026-08-05", refBonReceptionChantier: "BR-CTR001-08-001", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_08_001.pdf", type: "Bon de sortie X3", dateAjout: "2026-08-05" }] },
          { id: "l2", refBonSortieX3: "BS-X3-CTR001-08-002", codeArticleX3: "mtx-03", designation: "Ciment CEM II 42.5",   quantiteSortie: 100, unite: "sac",    prixUnitaireApplique: 4200,   montantValorise: 420000,  dateSortie: "2026-08-05", refBonReceptionChantier: "BR-CTR001-08-001", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_08_002.pdf", type: "Bon de sortie X3", dateAjout: "2026-08-05" }] },
          { id: "l3", refBonSortieX3: "BS-X3-CTR001-08-003", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",       quantiteSortie: 6,   unite: "tonne",  prixUnitaireApplique: 625000, montantValorise: 3750000, dateSortie: "2026-08-12", refBonReceptionChantier: "BR-CTR001-08-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_08_003.pdf", type: "Bon de sortie X3", dateAjout: "2026-08-12" }] },
          { id: "l4", refBonSortieX3: "BS-X3-CTR001-08-004", codeArticleX3: "mtx-10", designation: "Acier HA Ø 16 mm",       quantiteSortie: 3,   unite: "tonne",  prixUnitaireApplique: 615000, montantValorise: 1845000, dateSortie: "2026-08-12", refBonReceptionChantier: "BR-CTR001-08-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_08_004.pdf", type: "Bon de sortie X3", dateAjout: "2026-08-12" }] },
          { id: "l5", refBonSortieX3: "BS-X3-CTR001-08-005", codeArticleX3: "mtx-19", designation: "Gravier concassé 6/14", quantiteSortie: 50,  unite: "m³",    prixUnitaireApplique: 12000,  montantValorise: 600000,  dateSortie: "2026-08-20", refBonReceptionChantier: "BR-CTR001-08-003", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [{ nom: "BS_CTR001_08_005.pdf", type: "Bon de sortie X3", dateAjout: "2026-08-20" }] },
        ],
        pieceJointesSection: [{ nom: "BS_recapitulatif_MTX_aout_2026.pdf", type: "Récapitulatif bons de sortie", nbLignes: 5, dateImport: "2026-09-01" }],
        pieceJointesBR: [],
        totalValorise: 6999000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-09-10" },
        visaMontants: { par: "Moussa BA", date: "2026-09-12" },
        derniereRecuperation: "2026-09-01T06:00:00",
      },
      MTL: {
        statut: "Validée",
        lignes: [
          { id: "l1", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-04", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-01-E0", operateur: "Oumar DIALLO" },
          { id: "l2", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-05", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-02-E0", operateur: "Oumar DIALLO" },
          { id: "l3", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-06", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-03-E0", operateur: "Oumar DIALLO" },
          { id: "l4", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-07", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-04-E0", operateur: "Oumar DIALLO" },
          { id: "l5", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-11", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-05-E0", operateur: "Oumar DIALLO" },
          { id: "l6", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-12", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-06-E0", operateur: "Oumar DIALLO" },
          { id: "l7", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-13", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-07-E0", operateur: "Oumar DIALLO" },
          { id: "l8", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-08-14", dureeUtilisee: 12, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 300000, refPointage: "PT-CTR001-08-08-E0", operateur: "Oumar DIALLO" },
          { id: "l9", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-18", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-01-E1", operateur: "Modou FAYE" },
          { id: "l10", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-19", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-02-E1", operateur: "Modou FAYE" },
          { id: "l11", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-20", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-03-E1", operateur: "Modou FAYE" },
          { id: "l12", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-21", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-04-E1", operateur: "Modou FAYE" },
          { id: "l13", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-22", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-05-E1", operateur: "Modou FAYE" },
          { id: "l14", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-25", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-06-E1", operateur: "Modou FAYE" },
          { id: "l15", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-26", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-07-E1", operateur: "Modou FAYE" },
          { id: "l16", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-27", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-08-E1", operateur: "Modou FAYE" },
          { id: "l17", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-28", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-09-E1", operateur: "Modou FAYE" },
          { id: "l18", codeMateriel: "mtl-06", designation: "Bétonnière 350L", dateUtilisation: "2026-08-29", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 55000, montantValorise: 55000, refPointage: "PT-CTR001-08-10-E1", operateur: "Modou FAYE" },
          { id: "l19", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-08-04", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-08-01-E2", operateur: "Ibrahima NDIAYE" },
          { id: "l20", codeMateriel: "mtl-10", designation: "Grue à tour", dateUtilisation: "2026-08-05", dureeUtilisee: 1, uniteFacturation: "jour", tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-08-02-E2", operateur: "Ibrahima NDIAYE" },
        ],
        pieceJointesSection: [{ nom: "pointage_2026_08_CTR001.pdf", type: "Pointage journalier MTL", nbLignes: 20, dateImport: "2026-09-01" }],
        pieceJointesBR: [],
        totalValorise: 3550000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-09-10" },
        visaMontants: { par: "Moussa BA", date: "2026-09-12" },
        derniereRecuperation: "2026-09-01T07:00:00",
      },
      RH: {
        statut: "Validée",
        lignes: [
          { id: "l1", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-00" },
          { id: "l2", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-01" },
          { id: "l3", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-02" },
          { id: "l4", qualification: "Maçon",          typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 7500,  montantValorise: 30000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-03" },
          { id: "l5", qualification: "Coffreur",       typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8000,  montantValorise: 40000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-04" },
          { id: "l6", qualification: "Coffreur",       typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8000,  montantValorise: 40000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-05" },
          { id: "l7", qualification: "Coffreur",       typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8000,  montantValorise: 40000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-06" },
          { id: "l8", qualification: "Ferrailleur",    typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8500,  montantValorise: 34000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-07" },
          { id: "l9", qualification: "Ferrailleur",    typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8500,  montantValorise: 34000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-08" },
          { id: "l10", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8500,  montantValorise: 34000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-09" },
          { id: "l11", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8500,  montantValorise: 34000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-10" },
          { id: "l12", qualification: "Ferrailleur",   typePersonnel: "journalier", nombreJoursHomme: 4, coutUnitaireApplique: 8500,  montantValorise: 34000,  periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-11" },
          { id: "l13", qualification: "Chef ferrailleur", typePersonnel: "permanent", nombreJoursHomme: 22, coutUnitaireApplique: 8500, montantValorise: 187000, periodePaie: "2026-08", refImportPaie: "PAIE-CTR001-202608-PM" },
        ],
        pieceJointesSection: [{ nom: "paie_2026_08_CTR001.pdf", type: "Fichier de paie RH", nbLignes: 13, dateImport: "2026-09-01" }],
        pieceJointesBR: [],
        totalValorise: 597000,
        visaQuantites: { par: "Mansour BOYE", date: "2026-09-10" },
        visaMontants: { par: "Moussa BA", date: "2026-09-12" },
        derniereRecuperation: "2026-09-01T08:00:00",
      },
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: [],
  },

  // ── P. CTR-2026-001 / septembre 2026 — En contrôle, section MTX avec 4 cas d'anomalies tests ──
  // Scénario de démo : 2 BR manquant Active, 1 STT divergent Active, 1 Écart quantité Justifiée, 1 Levée par réactualisation
  {
    id: "etc-2026-001-09", code: "ETC-2026-014",
    contratId: "CTR-2026-001", chantierId: "CH-2025-016",
    periodeDebut: "2026-09-01", periodeFin: "2026-09-30", dateArrete: null,
    sections: {
      MTX: {
        statut: "Anomalies détectées",
        lignes: [
          // BS-X3-CTR001-09-001 — 03/09 — BR manquant (Active) sur 2 lignes
          {
            id: "la1", refBonSortieX3: "BS-X3-CTR001-09-001", codeArticleX3: "mtx-01", designation: "Ciment CEM I 42.5",
            quantiteSortie: 80, unite: "sac", prixUnitaireApplique: 4800, montantValorise: 384000, dateSortie: "2026-09-03",
            refBonReceptionChantier: null, sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: null,
            anomalie: { type: "BR manquant", description: "Bon de réception chantier non encore uploadé pour ce bon de sortie.", statut: "Active", resolution: null, historique: [] },
            pieceJointesBS: [{ nom: "BS_CTR001_09_001a.pdf", type: "Bon de sortie X3", dateAjout: "2026-09-03" }],
          },
          {
            id: "la2", refBonSortieX3: "BS-X3-CTR001-09-001", codeArticleX3: "mtx-03", designation: "Ciment CEM II 42.5",
            quantiteSortie: 60, unite: "sac", prixUnitaireApplique: 4200, montantValorise: 252000, dateSortie: "2026-09-03",
            refBonReceptionChantier: null, sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: null,
            anomalie: { type: "BR manquant", description: "Bon de réception chantier non encore uploadé pour ce bon de sortie.", statut: "Active", resolution: null, historique: [] },
            pieceJointesBS: [{ nom: "BS_CTR001_09_001b.pdf", type: "Bon de sortie X3", dateAjout: "2026-09-03" }],
          },
          // BS-X3-CTR001-09-002 — 08/09 — Sous-traitant divergent (Active)
          {
            id: "la3", refBonSortieX3: "BS-X3-CTR001-09-002", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",
            quantiteSortie: 4, unite: "tonne", prixUnitaireApplique: 625000, montantValorise: 2500000, dateSortie: "2026-09-08",
            refBonReceptionChantier: "BR-CTR001-09-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "METAL CONSTRUCT SARL",
            anomalie: { type: "Sous-traitant divergent", description: "Bon de sortie X3 émis pour ENTREPRISE FALL & FRÈRES, bon de réception chantier signé par METAL CONSTRUCT SARL.", statut: "Active", resolution: null, historique: [] },
            pieceJointesBS: [{ nom: "BS_CTR001_09_002.pdf", type: "Bon de sortie X3", dateAjout: "2026-09-08" }],
          },
          // BS-X3-CTR001-09-003 — 12/09 — Écart de quantité Justifiée (non bloquante)
          {
            id: "la4", refBonSortieX3: "BS-X3-CTR001-09-003", codeArticleX3: "mtx-15", designation: "Béton prêt à l'emploi B250",
            quantiteSortie: 15, quantiteReceptionnee: 13, unite: "m³", prixUnitaireApplique: 55000, montantValorise: 825000, dateSortie: "2026-09-12",
            refBonReceptionChantier: "BR-CTR001-09-003", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES",
            anomalie: {
              type: "Écart de quantité", quantiteReceptionnee: 13, ecart: -2,
              description: "Quantité sortie X3 : 15 m³ — Quantité réceptionnée BR : 13 m³ (écart : -2 m³).",
              statut: "Justifiée",
              resolution: { voie: "Justification documentaire", dateResolution: "2026-09-25", parUtilisateur: "Mansour BOYE", motif: "2 m³ non coulés sur cette livraison — relevé de chantier du 12/09 joint. Le surplus sera intégré dans la prochaine réactualisation.", pieceJointe: "relevé_chantier_2026-09-12.pdf" },
              historique: [{ date: "2026-09-25", action: "Anomalie justifiée (Voie 2)", resolution: { voie: "Justification documentaire", dateResolution: "2026-09-25", parUtilisateur: "Mansour BOYE", motif: "2 m³ non coulés sur cette livraison — relevé de chantier du 12/09 joint. Le surplus sera intégré dans la prochaine réactualisation.", pieceJointe: "relevé_chantier_2026-09-12.pdf" } }],
            },
            pieceJointesBS: [{ nom: "BS_CTR001_09_003.pdf", type: "Bon de sortie X3", dateAjout: "2026-09-12" }],
          },
          // BS-X3-CTR001-09-004 — 18/09 — Sous-traitant divergent levée par réactualisation (historique)
          {
            id: "la5", refBonSortieX3: "BS-X3-CTR001-09-004", codeArticleX3: "mtx-19", designation: "Gravier concassé 6/14",
            quantiteSortie: 40, unite: "m³", prixUnitaireApplique: 12000, montantValorise: 480000, dateSortie: "2026-09-18",
            refBonReceptionChantier: "BR-CTR001-09-004", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES",
            anomalie: {
              type: "Sous-traitant divergent",
              description: "Bon de sortie X3 émis pour ENTREPRISE FALL & FRÈRES, bon de réception chantier initialement signé par METAL CONSTRUCT SARL — corrigé lors de la réactualisation X3.",
              statut: "Levée par réactualisation",
              resolution: { voie: "Réactualisation X3", dateResolution: "2026-09-22", parUtilisateur: "Système X3", motif: null, pieceJointe: null },
              historique: [{ date: "2026-09-22", action: "Levée par réactualisation X3", resolution: { voie: "Réactualisation X3", dateResolution: "2026-09-22", parUtilisateur: "Système X3", motif: null, pieceJointe: null } }],
            },
            pieceJointesBS: [{ nom: "BS_CTR001_09_004.pdf", type: "Bon de sortie X3", dateAjout: "2026-09-18" }],
          },
          // Ligne saine
          {
            id: "la6", refBonSortieX3: "BS-X3-CTR001-09-005", codeArticleX3: "mtx-10", designation: "Acier HA Ø 16 mm",
            quantiteSortie: 3, unite: "tonne", prixUnitaireApplique: 615000, montantValorise: 1845000, dateSortie: "2026-09-22",
            refBonReceptionChantier: "BR-CTR001-09-005", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES",
            anomalie: null,
            pieceJointesBS: [{ nom: "BS_CTR001_09_005.pdf", type: "Bon de sortie X3", dateAjout: "2026-09-22" }],
          },
        ],
        pieceJointesSection: [{ nom: "BS_recapitulatif_MTX_septembre_2026.pdf", type: "Récapitulatif bons de sortie", nbLignes: 6, dateImport: "2026-10-02" }],
        pieceJointesBR: [],
        totalValorise: 6286000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: "2026-10-02T07:00:00",
      },
      MTL: {
        statut: "Alimentée",
        lignes: [
          { id: "lb1", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-09-10", dureeUtilisee: 8, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 200000, refPointage: "PT-CTR001-09-01-E0", operateur: "Oumar DIALLO" },
          { id: "lb2", codeMateriel: "mtl-02", designation: "Grue à tour 25T", dateUtilisation: "2026-09-15", dureeUtilisee: 6, uniteFacturation: "heure", tarifApplique: 35000, montantValorise: 210000, refPointage: "PT-CTR001-09-01-E1", operateur: "Moussa SARR" },
        ],
        pieceJointesSection: [],
        pieceJointesBR: [],
        totalValorise: 410000,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: "2026-10-02T07:00:00",
      },
      RH: {
        statut: "Alimentée",
        lignes: [
          { id: "lc1", qualification: "Maçon", typePersonnel: "journalier", nombreJoursHomme: 6, coutUnitaireApplique: 7500, montantValorise: 45000, periodePaie: "2026-09", refImportPaie: "PAIE-CTR001-202609-00" },
          { id: "lc2", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 8500, montantValorise: 42500, periodePaie: "2026-09", refImportPaie: "PAIE-CTR001-202609-01" },
        ],
        pieceJointesSection: [],
        pieceJointesBR: [],
        totalValorise: 87500,
        visaQuantites: null,
        visaMontants: null,
        derniereRecuperation: "2026-10-02T07:00:00",
      },
    },
    statutGlobal: "En contrôle",
    decomptesConsommateurs: [],
  },

  // ── Q. CTR-2026-001 / septembre 2026 — Arrêté, disponible pour décompte sept 2026 ──
  // Données propres (sans anomalies) pour le scénario bout-en-bout §6.1
  {
    id: "etc-2026-001-09b", code: "ETC-2026-015",
    contratId: "CTR-2026-001", chantierId: "CH-2025-016",
    periodeDebut: "2026-09-01", periodeFin: "2026-09-30", dateArrete: "2026-10-25",
    sections: {
      MTX: {
        statut: "Validée",
        lignes: [
          { id: "m1", refBonSortieX3: "BS-X3-CTR001-09b-001", codeArticleX3: "mtx-08", designation: "Acier HA Ø 12 mm",     quantiteSortie: 5,   unite: "tonne", prixUnitaireApplique: 625000, montantValorise: 3125000, dateSortie: "2026-09-05", refBonReceptionChantier: "BR-CTR001-09b-001", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [] },
          { id: "m2", refBonSortieX3: "BS-X3-CTR001-09b-002", codeArticleX3: "mtx-15", designation: "Béton prêt à l'emploi", quantiteSortie: 20,  unite: "m³",   prixUnitaireApplique: 55000,  montantValorise: 1100000, dateSortie: "2026-09-12", refBonReceptionChantier: "BR-CTR001-09b-002", sousTraitantBonSortie: "ENTREPRISE FALL & FRÈRES", sousTraitantBonReception: "ENTREPRISE FALL & FRÈRES", anomalie: null, pieceJointesBS: [] },
        ],
        pieceJointesSection: [],
        pieceJointesBR: [],
        totalValorise: 4225000,
        visaQuantites: { par: "Mansour BOYE",  date: "2026-10-15" },
        visaMontants:  { par: "Moussa BA", date: "2026-10-18" },
        derniereRecuperation: "2026-10-05T06:00:00",
      },
      MTL: {
        statut: "Validée",
        lignes: [
          { id: "n1", codeMateriel: "mtl-01", designation: "Pelle hydraulique 20T", dateUtilisation: "2026-09-08", dureeUtilisee: 10, uniteFacturation: "heure", tarifApplique: 25000, montantValorise: 250000, refPointage: "PT-CTR001-09b-01", operateur: "Oumar DIALLO" },
          { id: "n2", codeMateriel: "mtl-10", designation: "Grue à tour",           dateUtilisation: "2026-09-10", dureeUtilisee: 1,  uniteFacturation: "jour",  tarifApplique: 300000, montantValorise: 300000, refPointage: "PT-CTR001-09b-02", operateur: "Ibrahima NDIAYE" },
        ],
        pieceJointesSection: [],
        pieceJointesBR: [],
        totalValorise: 550000,
        visaQuantites: { par: "Mansour BOYE",  date: "2026-10-15" },
        visaMontants:  { par: "Moussa BA", date: "2026-10-18" },
        derniereRecuperation: "2026-10-05T07:00:00",
      },
      RH: {
        statut: "Validée",
        lignes: [
          { id: "o1", qualification: "Ferrailleur", typePersonnel: "journalier", nombreJoursHomme: 6, coutUnitaireApplique: 8500, montantValorise: 51000, periodePaie: "2026-09", refImportPaie: "PAIE-CTR001-202609b-00" },
          { id: "o2", qualification: "Maçon",       typePersonnel: "journalier", nombreJoursHomme: 5, coutUnitaireApplique: 7500, montantValorise: 37500, periodePaie: "2026-09", refImportPaie: "PAIE-CTR001-202609b-01" },
        ],
        pieceJointesSection: [],
        pieceJointesBR: [],
        totalValorise: 88500,
        visaQuantites: { par: "Mansour BOYE",  date: "2026-10-15" },
        visaMontants:  { par: "Moussa BA", date: "2026-10-18" },
        derniereRecuperation: "2026-10-05T08:00:00",
      },
    },
    statutGlobal: "Arrêté",
    decomptesConsommateurs: [],
  },
];
