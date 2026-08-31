/**
 * Retourne un objet { codePoste → montantCumulé } depuis tous les décomptes
 * du même contrat dont la dateFin est STRICTEMENT antérieure à dateReference.
 *
 * Utilisable à l'exécution (DecompteFormPage) pour initialiser un nouveau décompte.
 */
const STATUTS_CUMUL = ["Approuvé", "Payé"];

export function getCumulsPrecedents(contratId, dateReference, allDecomptes) {
  const cumuls = {};
  allDecomptes
    .filter(d => d.contratId === contratId && d.dateFin < dateReference && STATUTS_CUMUL.includes(d.statut))
    .sort((a, b) => a.dateFin.localeCompare(b.dateFin))
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
