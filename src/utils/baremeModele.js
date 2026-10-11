import * as XLSX from "xlsx";

/**
 * Exporte le barème au format Excel (.xlsx), prêt à être modifié puis réimporté.
 * Colonnes réimportables : CodeArticle ; Désignation ; Unité ; Prix unitaire.
 * Colonnes d'information (ignorées à l'import) : \`infos\` = [["Prix de base", "prix_base"], ...].
 * Le code peut être laissé vide : l'article est alors retrouvé par sa désignation.
 * lignes : [{ code, designation, unite, prix, ...champs d'info }]
 */
export function telechargerModeleBareme(lignes = [], nom = "modele_import_bareme", infos = []) {
  const entetes = ["CodeArticle", "Désignation", "Unité", "Prix unitaire", ...infos.map(([label]) => `(info) ${label}`)];
  const corps = lignes.length
    ? lignes.map((l) => [l.code, l.designation ?? "", l.unite ?? "", l.prix ?? "", ...infos.map(([, k]) => l[k] ?? "")])
    : [["MTXCIM00012", "CIMENT CEM II 42.5 EN SAC", "SAC", 6500], ["", "GASOIL", "L", 700]];

  const ws = XLSX.utils.aoa_to_sheet([entetes, ...corps]);
  ws["!cols"] = [{ wch: 16 }, { wch: 46 }, { wch: 9 }, { wch: 15 }, ...infos.map(() => ({ wch: 16 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Barème");

  const aide = XLSX.utils.aoa_to_sheet([
    ["MODE D'EMPLOI"],
    [""],
    ["1. Modifiez uniquement la colonne « Prix unitaire » de la feuille « Barème » (colonne D)."],
    ["2. Les colonnes « (info) … » sont là pour information : elles ne sont pas relues à l'import."],
    ["3. Ne changez pas l'unité : elle doit rester celle du barème."],
    ["4. Vous pouvez supprimer les lignes que vous ne modifiez pas : seules les lignes présentes sont traitées."],
    ["5. Le code article peut être laissé vide : l'article est alors retrouvé par sa désignation."],
    ["6. Réimportez le fichier (Importer un fichier) : un aperçu vous montre les changements avant l'enregistrement."],
  ]);
  aide["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, aide, "Mode d'emploi");
  XLSX.writeFile(wb, `${nom}.xlsx`);
}
