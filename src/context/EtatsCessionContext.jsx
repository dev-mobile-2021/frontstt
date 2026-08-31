import { createContext, useContext, useState, useCallback } from "react";
import { etatsCession as initialEtats } from "../data/etatsCession";
import { toutesSectionsValidees, auMoinsUneSectionRenseignee } from "../utils/etatCessionMetrics";

const EtatsCessionContext = createContext(null);

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

function today() { return new Date().toISOString().slice(0, 10); }

/** Recalcule statutGlobal (et dateArrete) à partir de l'état des 3 sections. */
function recomputeGlobal(etat) {
  if (!auMoinsUneSectionRenseignee(etat)) {
    return { ...etat, statutGlobal: "Ouvert" };
  }
  if (toutesSectionsValidees(etat)) {
    return { ...etat, statutGlobal: "Arrêté", dateArrete: etat.dateArrete || today() };
  }
  return { ...etat, statutGlobal: "En contrôle", dateArrete: null };
}

let seq = 1000;
function nextCode(periodeDebut) {
  return `ETC-${periodeDebut.slice(0, 4)}-${String(seq++).padStart(4, "0")}`;
}

// Anomalie déterministe injectée sur la première ligne récupérée, pour rendre la
// démonstration reproductible (au lieu d'un tirage aléatoire).
function detecterAnomalieDemo(ligne, index) {
  if (index === 0) {
    return {
      type: "Sous-traitant divergent",
      description: `Bon de sortie X3 émis pour ${ligne.sousTraitantBonSortie}, bon de réception chantier signé par un autre sous-traitant.`,
      statut: "Active",
      resolution: null,
      historique: [],
    };
  }
  return null;
}

export function EtatsCessionProvider({ children }) {
  const [etats, setEtats] = useState(() => [...initialEtats]);

  const creerEtat = useCallback(({ contratId, chantierId, periodeDebut, periodeFin }) => {
    const id = `etc-${contratId}-${periodeDebut}`;
    const nouvel = {
      id, code: nextCode(periodeDebut),
      contratId, chantierId, periodeDebut, periodeFin, dateArrete: null,
      sections: { MTX: SECTION_VIDE(), MTL: SECTION_VIDE(), RH: SECTION_VIDE() },
      statutGlobal: "Ouvert",
      decomptesConsommateurs: [],
    };
    setEtats(prev => [...prev, nouvel]);
    return nouvel;
  }, []);

  /** Récupération simulée Sage X3 pour la section MTX — génère des lignes plates avec anomalies reproductibles. */
  const recupererMTX = useCallback((etatId, contrat, sousTraitantNom) => {
    const lignesBareme = contrat?.baremeCessions?.mtx || [];
    if (lignesBareme.length === 0) return [];
    const etatActuel = etats.find(e => e.id === etatId);
    const pdStr = etatActuel?.periodeDebut || new Date().toISOString().slice(0, 7) + "-01";
    const [pYear, pMonth] = pdStr.split("-").map(Number);
    const mStr = String(pMonth).padStart(2, "0");
    const ctrShort = (contrat?.code || "CTR").replace("CTR-", "");
    const sttBS = sousTraitantNom || "Sous-traitant du contrat";

    // Génère 3 groupes de sorties (BS distincts), jours distincts
    const nGroupes = 3 + Math.round(Math.random() * 2);
    const usedDays = new Set();
    let globalLineCounter = 0;
    const lignes = [];

    for (let gIdx = 0; gIdx < nGroupes; gIdx++) {
      let day, attempts = 0;
      do { day = 1 + Math.floor(Math.random() * 26); attempts++; }
      while (usedDays.has(day) && attempts < 30);
      usedDays.add(day);
      const dateSortie = `${pYear}-${mStr}-${String(day).padStart(2, "0")}`;
      const refNum = String(gIdx + 1).padStart(3, "0");
      const refBS = `BS-X3-${ctrShort}-${mStr}-G${refNum}`;
      // Groupe 0 → pas de BR (BR manquant), groupe 1 → STT divergent
      const isBRManquant = gIdx === 0;
      const isSTTDivergent = gIdx === 1;
      const refBR = isBRManquant ? null : `BR-${ctrShort}-${mStr}-${refNum}`;

      const nArticles = Math.min(2 + Math.round(Math.random() * 2), lignesBareme.length);
      const shuffled = [...lignesBareme].sort(() => Math.random() - 0.5).slice(0, nArticles);

      shuffled.forEach((l, lineIdx) => {
        const qte = Math.round(5 + Math.random() * 45);
        globalLineCounter++;
        const lineRef = String(globalLineCounter).padStart(4, "0");
        const hasEcart = gIdx === 2 && lineIdx === 0;
        const ecart = hasEcart ? -(1 + Math.round(Math.random() * 2)) : 0;
        let anomalie = null;
        if (isBRManquant) {
          anomalie = { type: "BR manquant", description: "Bon de réception chantier non encore uploadé pour ce bon de sortie.", statut: "Active", resolution: null, historique: [] };
        } else if (isSTTDivergent) {
          anomalie = { type: "Sous-traitant divergent", description: `Bon de sortie X3 émis pour ${sttBS}, bon de réception signé par un autre sous-traitant.`, statut: "Active", resolution: null, historique: [] };
        } else if (hasEcart) {
          anomalie = { type: "Écart de quantité", quantiteReceptionnee: qte + ecart, ecart, statut: "Active", resolution: null, historique: [] };
        }
        lignes.push({
          id: `l${globalLineCounter}`,
          refBonSortieX3: refBS,
          codeArticleX3: l.baremeRefId,
          designation: l.designation,
          quantiteSortie: qte,
          unite: l.unite,
          prixUnitaireApplique: l.prixContrat,
          montantValorise: Math.round(qte * l.prixContrat),
          dateSortie,
          refBonReceptionChantier: refBR,
          sousTraitantBonSortie: sttBS,
          sousTraitantBonReception: isSTTDivergent ? "Sous-traitant tiers (à vérifier)" : sttBS,
          anomalie,
          pieceJointesBS: [{ nom: `BS_${pYear}_${mStr}_${lineRef}.pdf`, type: "Bon de sortie X3", dateAjout: dateSortie }],
        });
      });
    }

    const totalValorise = lignes.reduce((s, l) => s + l.montantValorise, 0);
    const hasAnomalies = lignes.some(l => l.anomalie);

    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const section = {
        statut: hasAnomalies ? "Anomalies détectées" : "Alimentée",
        lignes, pieceJointesSection: [], pieceJointesBR: [], totalValorise,
        visaQuantites: null, visaMontants: null,
        derniereRecuperation: new Date().toISOString(),
      };
      return recomputeGlobal({ ...e, sections: { ...e.sections, MTX: section } });
    }));
    return lignes;
  }, [etats]);

  /** Réactualisation X3 — lève les anomalies STT divergent et écarts de quantité (BR manquant conservé). */
  const reactualiserMTX = useCallback((etatId, contrat, sousTraitantNom) => {
    const dateResolution = today();
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const ancien = e.sections.MTX;
      const lignes = (ancien.lignes || []).map(l => {
        if (!l.anomalie || l.anomalie.type === "BR manquant") return l;
        const resolution = { voie: "Réactualisation X3", dateResolution, parUtilisateur: "Système X3", motif: null, pieceJointe: null };
        const historique = [...(l.anomalie.historique || []), { date: dateResolution, action: "Levée par réactualisation X3", resolution }];
        return { ...l, anomalie: { ...l.anomalie, statut: "Levée par réactualisation", resolution, historique }, sousTraitantBonReception: l.sousTraitantBonSortie };
      });
      const hasActiveAnomalies = lignes.some(l => l.anomalie?.statut === "Active");
      const section = { ...ancien, statut: hasActiveAnomalies ? "Anomalies détectées" : "Alimentée", lignes, derniereRecuperation: new Date().toISOString() };
      return recomputeGlobal({ ...e, sections: { ...e.sections, MTX: section } });
    }));
  }, []);

  /** Upload du bon de réception par le DT — section MTX niveau global (plus de livraison). */
  const uploaderBR = useCallback((etatId, { refBR, dtSignataire, nomFichier }) => {
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const mtx = e.sections.MTX;
      if (!mtx) return e;
      const dateAjout = new Date().toISOString().slice(0, 10);
      // Ajoute le BR à la section
      const pieceJointesBR = [
        ...(mtx.pieceJointesBR || []),
        { nom: nomFichier, type: "Bon de réception chantier signé", dateAjout, refBR, dtSignataire: dtSignataire || "" },
      ];
      // Lève l'anomalie BR manquant sur les lignes qui n'ont pas encore de BR
      const dateResolution = new Date().toISOString().slice(0, 10);
      const lignes = (mtx.lignes || []).map(l => {
        if (l.refBonReceptionChantier) return l;
        if (l.anomalie?.type === "BR manquant") {
          const resolution = { voie: "Upload BR", dateResolution, parUtilisateur: dtSignataire || "DT", motif: null, pieceJointe: nomFichier };
          const historique = [...(l.anomalie.historique || []), { date: dateResolution, action: "BR uploadé — anomalie levée", resolution }];
          return { ...l, refBonReceptionChantier: refBR, anomalie: { ...l.anomalie, statut: "Levée par réactualisation", resolution, historique } };
        }
        return { ...l, refBonReceptionChantier: refBR };
      });
      const nAnomalies = lignes.filter(l => l.anomalie?.statut === "Active").length;
      const statut = nAnomalies > 0 ? "Anomalies détectées" : "Alimentée";
      const updated = { ...mtx, pieceJointesBR, lignes, statut };
      return recomputeGlobal({ ...e, sections: { ...e.sections, MTX: updated } });
    }));
  }, []);

  /** Import simulé du pointage journalier MTL — 12 à 18 entrées par engin (une ligne = un jour). */
  const importerPointageMTL = useCallback((etatId, contrat) => {
    const lignesBareme = contrat?.baremeCessions?.mtl || [];
    const etatActuel = etats.find(e => e.id === etatId);
    const pdStr = etatActuel?.periodeDebut || new Date().toISOString().slice(0, 7) + "-01";
    const [pYear, pMonth] = pdStr.split("-").map(Number);
    const mStr = String(pMonth).padStart(2, "0");
    const ctrShort = (contrat?.code || "CTR").replace("CTR-2026-", "").replace("CTR-2025-", "");

    const lignes = [];
    lignesBareme.forEach((l, enginIdx) => {
      const isHeure = l.unite === "heure";
      const nbJours = 12 + Math.round(Math.random() * 6);
      const usedDays = new Set();
      for (let j = 0; j < nbJours; j++) {
        let day, attempts = 0;
        do { day = 1 + Math.floor(Math.random() * 26); attempts++; }
        while (usedDays.has(day) && attempts < 30);
        usedDays.add(day);

        const duree = isHeure ? (6 + Math.round(Math.random() * 4)) : 1;
        const idx = lignes.length;
        const dayStr = String(day).padStart(2, "0");

        lignes.push({
          id: `l${idx + 1}`,
          codeMateriel: l.baremeRefId,
          designation: l.designation,
          dateUtilisation: `${pYear}-${mStr}-${dayStr}`,
          dureeUtilisee: duree,
          uniteFacturation: l.unite,
          tarifApplique: l.prixContrat,
          montantValorise: Math.round(duree * l.prixContrat),
          refPointage: `PT-${ctrShort}-${mStr}-${dayStr}-E${enginIdx}`,
          operateur: "Opérateur chantier",
          pieceJointes: [
            { nom: `pointage_${pYear}_${mStr}_E${enginIdx}.pdf`, type: "Feuille de pointage signée" },
          ],
        });
      }
    });

    const total = lignes.reduce((s, l) => s + l.montantValorise, 0);
    const dateImport = new Date().toISOString().slice(0, 10);
    const nomFichier = `pointage_${pdStr.slice(0, 7).replace("-", "_")}_${ctrShort}.pdf`;
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const prev_section = e.sections.MTL || {};
      const pieceJointesSection = [
        ...(prev_section.pieceJointesSection || []),
        { nom: nomFichier, type: "Pointage journalier MTL", nbLignes: lignes.length, dateImport },
      ];
      const section = { statut: "Alimentée", lignes, pieceJointesSection, totalValorise: total, visaQuantites: null, visaMontants: null, derniereRecuperation: new Date().toISOString() };
      return recomputeGlobal({ ...e, sections: { ...e.sections, MTL: section } });
    }));
    return lignes;
  }, [etats]);

  /** Import simulé du fichier de paie RH — 3 à 5 semaines de journaliers + 1 permanent chef de métier. */
  const importerPaieRH = useCallback((etatId, contrat) => {
    const lignesBareme = contrat?.baremeCessions?.rh || [];
    const etatActuel = etats.find(e => e.id === etatId);
    const pdStr = etatActuel?.periodeDebut || new Date().toISOString().slice(0, 7) + "-01";
    const periodePaie = pdStr.slice(0, 7);
    const ctrShort = (contrat?.code || "CTR").replace("CTR-2026-", "").replace("CTR-2025-", "");
    const SEMAINES = [[1, 5], [7, 11], [13, 17], [20, 24], [27, 30]];

    const lignes = [];
    lignesBareme.forEach((l) => {
      const nbSemaines = 3 + Math.round(Math.random() * 2);
      SEMAINES.slice(0, nbSemaines).forEach(() => {
        const nbJours = 3 + Math.round(Math.random() * 3);
        const idx = lignes.length;
        lignes.push({
          id: `l${idx + 1}`,
          qualification: l.designation,
          typePersonnel: "journalier",
          nombreJoursHomme: nbJours,
          coutUnitaireApplique: l.prixContrat,
          montantValorise: Math.round(nbJours * l.prixContrat),
          periodePaie,
          refImportPaie: `PAIE-${ctrShort}-${periodePaie.replace("-", "")}-${String(idx).padStart(2, "0")}`,
        });
      });
    });

    if (lignesBareme.length > 0) {
      const last = lignesBareme[lignesBareme.length - 1];
      const idx = lignes.length;
      lignes.push({
        id: `l${idx + 1}`,
        qualification: `Chef ${last.designation.toLowerCase()}`,
        typePersonnel: "permanent",
        nombreJoursHomme: 22,
        coutUnitaireApplique: last.prixContrat,
        montantValorise: Math.round(22 * last.prixContrat),
        periodePaie,
        refImportPaie: `PAIE-${ctrShort}-${periodePaie.replace("-", "")}-PM`,
      });
    }

    const total = lignes.reduce((s, l) => s + l.montantValorise, 0);
    const dateImport = new Date().toISOString().slice(0, 10);
    const nomFichier = `paie_${periodePaie.replace("-", "_")}_${ctrShort}.pdf`;
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const prev_section = e.sections.RH || {};
      const pieceJointesSection = [
        ...(prev_section.pieceJointesSection || []),
        { nom: nomFichier, type: "Fichier de paie RH", nbLignes: lignes.length, dateImport },
      ];
      const section = { statut: "Alimentée", lignes, pieceJointesSection, totalValorise: total, visaQuantites: null, visaMontants: null, derniereRecuperation: new Date().toISOString() };
      return recomputeGlobal({ ...e, sections: { ...e.sections, RH: section } });
    }));
    return lignes;
  }, [etats]);

  /** Justification documentaire d'une anomalie (Voie 2) — passe statut à "Justifiée". */
  const justifierAnomalie = useCallback((etatId, cat, ligneId, { motif, pieceJointe, parUtilisateur }) => {
    const dateResolution = today();
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const section = e.sections[cat];
      if (!section) return e;
      const lignes = (section.lignes || []).map(l => {
        if (l.id !== ligneId || !l.anomalie) return l;
        const resolution = { voie: "Justification documentaire", dateResolution, parUtilisateur: parUtilisateur || "DCG", motif, pieceJointe: pieceJointe || null };
        const historique = [...(l.anomalie.historique || []), { date: dateResolution, action: "Anomalie justifiée (Voie 2)", resolution }];
        return { ...l, anomalie: { ...l.anomalie, statut: "Justifiée", resolution, historique } };
      });
      const hasActiveAnomalies = lignes.some(l => l.anomalie?.statut === "Active");
      const section2 = { ...section, lignes, statut: hasActiveAnomalies ? "Anomalies détectées" : section.statut };
      return recomputeGlobal({ ...e, sections: { ...e.sections, [cat]: section2 } });
    }));
  }, []);

  /** Visa DCG — quantités. Bloqué si anomalies restantes sur les lignes. */
  const viserQuantites = useCallback((etatId, categorie, currentUser) => {
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const section = e.sections[categorie];
      if (!section) return e;
      const hasAnomalie = (section.lignes || []).some(l => l.anomalie?.statut === "Active");
      if (hasAnomalie) return e;
      const updated = { ...section, statut: "Quantités validées", visaQuantites: { par: currentUser?.nom || "Utilisateur", date: today() }, dernierRejet: null };
      return recomputeGlobal({ ...e, sections: { ...e.sections, [categorie]: updated } });
    }));
  }, []);

  /** Visa DACC — prix et montants. Ne peut intervenir qu'après le visa quantités. */
  const viserMontants = useCallback((etatId, categorie, currentUser) => {
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const section = e.sections[categorie];
      if (!section || section.statut !== "Quantités validées") return e;
      const updated = { ...section, statut: "Validée", visaMontants: { par: currentUser?.nom || "Utilisateur", date: today() }, dernierRejet: null };
      return recomputeGlobal({ ...e, sections: { ...e.sections, [categorie]: updated } });
    }));
  }, []);

  /** Rejet d'un visa (quantités ou montants) — la section revient à "Alimentée", motif conservé. */
  const rejeterVisa = useCallback((etatId, categorie, typeVisa, motif, currentUser) => {
    setEtats(prev => prev.map(e => {
      if (e.id !== etatId) return e;
      const section = e.sections[categorie];
      if (!section) return e;
      const updated = {
        ...section,
        statut: "Alimentée",
        visaQuantites: null,
        visaMontants: null,
        dernierRejet: { typeVisa, motif, par: currentUser?.nom || "Utilisateur", date: today() },
      };
      return recomputeGlobal({ ...e, sections: { ...e.sections, [categorie]: updated } });
    }));
  }, []);

  /**
   * Rattache au décompte les états Arrêté du même contrat dont la periodeFin ≤ dateFin
   * du décompte et pas déjà consommés par un autre décompte actif.
   * Détache ceux qui ne sont plus éligibles.
   */
  const consommerEtatsPourDecompte = useCallback((decompte) => {
    setEtats(prev => prev.map(e => {
      if (e.contratId !== decompte.contratId) return e;
      const eligible = e.statutGlobal === "Arrêté" && e.periodeFin <= decompte.dateFin;
      const dejaParCe = (e.decomptesConsommateurs || []).includes(decompte.id);
      const dejaParAutre = (e.decomptesConsommateurs || []).some(id => id !== decompte.id);
      if (dejaParCe && !eligible) {
        return { ...e, decomptesConsommateurs: e.decomptesConsommateurs.filter(id => id !== decompte.id) };
      }
      if (!dejaParCe && eligible && !dejaParAutre) {
        return { ...e, decomptesConsommateurs: [...(e.decomptesConsommateurs || []), decompte.id] };
      }
      return e;
    }));
  }, []);

  const detacherEtatDuDecompte = useCallback((etatId, decompteId) => {
    setEtats(prev => prev.map(e => e.id === etatId
      ? { ...e, decomptesConsommateurs: (e.decomptesConsommateurs || []).filter(id => id !== decompteId) }
      : e));
  }, []);

  return (
    <EtatsCessionContext.Provider value={{
      etats, creerEtat,
      recupererMTX, reactualiserMTX, uploaderBR, importerPointageMTL, importerPaieRH,
      justifierAnomalie,
      viserQuantites, viserMontants, rejeterVisa,
      consommerEtatsPourDecompte, detacherEtatDuDecompte,
    }}>
      {children}
    </EtatsCessionContext.Provider>
  );
}

export function useEtatsCession() {
  const ctx = useContext(EtatsCessionContext);
  if (!ctx) throw new Error("useEtatsCession must be used inside EtatsCessionProvider");
  return ctx;
}
