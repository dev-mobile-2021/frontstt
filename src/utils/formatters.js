/** Format a number as FCFA currency (e.g. 1 500 000 FCFA) */
export function formatMontant(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value) + " FCFA";
}

/** Format a date string to "dd MMM yyyy" French format */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

/** Return abbreviated amount, e.g. 1 500 000 000 → "1,5 Md" or 485 000 000 → "485 M" */
export function formatMontantCourt(value) {
  if (!value && value !== 0) return "—";
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Md FCFA";
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M FCFA";
  }
  return formatMontant(value);
}
