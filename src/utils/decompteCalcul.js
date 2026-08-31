/**
 * Calcule le net HT depuis les lignes d'un décompte (source canonique).
 *
 * Règles :
 *  - Poste C (Avances démarrage) : signe "info" — mensuel jamais compté,
 *    mais remboursement (C4) est déduit du net HT.
 *  - Postes G, I, K (Cessions MTX/MTL/RH) : signe "info" — jamais comptés.
 *  - Tous les autres postes respectent leur signe canonique (+/−).
 */
export function computeNetHT(lignes) {
  return lignes.reduce((net, l) => {
    if (l.codePoste === "C") return net - (l.remboursement || 0);
    if (l.signe === "info")  return net;
    if (l.signe === "+")     return net + (l.mensuel || 0);
    if (l.signe === "-")     return net - (l.mensuel || 0);
    return net;
  }, 0);
}

export function buildMontantsFromLignes(lignes, tauxTVA = 18) {
  const net_ht = computeNetHT(lignes);
  const montant_tva = Math.round(net_ht * tauxTVA / 100);
  const get = (code) => lignes.find(l => l.codePoste === code)?.mensuel || 0;
  const ligneC = lignes.find(l => l.codePoste === "C");
  return {
    a_travauxExecutes: get("A"),
    b_revisionsPrix:   get("B"),
    bp_sommesValoir:   get("B'"),
    c_avanceDemarrage: ligneC?.mensuel || 0,
    cp_rembourseAD:    ligneC?.remboursement || 0,
    d_retenueGarantie: get("D"),
    e_restitutionRG:   get("E"),
    f_penalites:       get("F"),
    g_cessionsMTX:     get("G"),
    h_rembourseMTX:    get("H"),
    i_cessionsMTL:     get("I"),
    j_rembourseMTL:    get("J"),
    k_cessionsRH:      get("K"),
    l_rembourseRH:     get("L"),
    m_autresRetenues:  get("M"),
    net_ht,
    montant_tva,
    net_ttc: net_ht + montant_tva,
  };
}

/**
 * Calcule les montants des lignes info/remb cessions depuis le détail des cessions.
 * Source unique de vérité pour G/H/I/J/K/L — jamais de saisie manuelle indépendante.
 */
export function computeMontantsCessionsDepuisDetail(cessions = []) {
  const mtx = cessions.filter(c => c.categorie === "MTX");
  const mtl = cessions.filter(c => c.categorie === "MTL");
  const rh  = cessions.filter(c => c.categorie === "RH");
  const sum   = (arr) => arr.reduce((s, c) => s + (c.montantValorise ?? c.montant ?? 0), 0);
  const sumRb = (arr) => arr.reduce((s, c) => s + (c.remboursement?.active ? c.remboursement.montant || 0 : 0), 0);
  return {
    G: sum(mtx), H: sumRb(mtx),
    I: sum(mtl), J: sumRb(mtl),
    K: sum(rh),  L: sumRb(rh),
  };
}

/**
 * Calcule le montant de restitution RG pour un décompte de type restitution.
 * - restitution_rg_partielle : 50% de la RG cumulée (taux par défaut, à confirmer)
 * - restitution_rg_totale : RG cumulée − montants déjà restitués en provisoire
 */
export function computeRestitutionRG(contratId, typeRestitution, allDecomptes) {
  const contractDecomptes = allDecomptes.filter(d => d.contratId === contratId);
  const validated = contractDecomptes.filter(d => d.statut === "Payé" || d.statut === "Approuvé");

  const rgCumulee = validated.reduce((sum, d) => {
    const ligneD = d.lignes?.find(l => l.codePoste === "D");
    return sum + (ligneD?.mensuel || d.montantsCalcules?.d_retenueGarantie || 0);
  }, 0);

  if (typeRestitution === "restitution_rg_partielle") {
    return Math.round(rgCumulee * 0.5);
  }
  if (typeRestitution === "restitution_rg_totale") {
    const dejaRestitue = contractDecomptes
      .filter(d => d.type === "restitution_rg_partielle" && (d.statut === "Payé" || d.statut === "Approuvé"))
      .reduce((sum, d) => sum + (d.montantsCalcules?.net_ht || 0), 0);
    return Math.max(0, rgCumulee - dejaRestitue);
  }
  return 0;
}
