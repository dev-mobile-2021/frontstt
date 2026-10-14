/** Formate un nombre avec séparateur de milliers visible (espace normale) */
export function fmtNum(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const n = Number(value);
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).replace(/ | /g, " "); // espace fine/insécable → espace normale visible
}

/** Montant FCFA complet : 1 500 000 FCFA */
export function formatMontant(value) {
  if (value === null || value === undefined) return "—";
  return fmtNum(Math.round(Number(value))) + " FCFA";
}

/** Montant FCFA abrégé pour KPIs : 1,5 Md / 485 M / 1 500 FCFA */
export function formatMontantCourt(value) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const n = Number(value);
  if (n >= 1_000_000_000) return fmtNum(n / 1_000_000_000, 1) + " Md FCFA";
  if (n >= 1_000_000)     return fmtNum(n / 1_000_000, 1)     + " M FCFA";
  return formatMontant(n);
}

/** Date fr-FR : 12 oct. 2026 */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(dateStr));
}
