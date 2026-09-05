import { Check } from "lucide-react";

const CONFIGS = {
  // ── API values (snake_case / lowercase) ──
  "actif":        { cls: "bg-blue-50 text-blue-700",    label: "Actif",      icon: null },
  "suspendu":     { cls: "bg-amber-50 text-amber-700",  label: "Suspendu",   icon: null },
  "termine":      { cls: "bg-gray-100 text-gray-700",   label: "Terminé",    icon: null },
  "cloture":      { cls: "bg-gray-100 text-gray-700",   label: "Clôturé",    icon: Check },
  "annule":       { cls: "bg-red-50 text-red-700",      label: "Annulé",     icon: null },
  "brouillon":    { cls: "bg-gray-100 text-gray-700",   label: "Brouillon",  icon: null },
  "en_cours":     { cls: "bg-blue-50 text-blue-700",    label: "En cours",   icon: null },
  "valide":       { cls: "bg-[#E8F5EE] text-[#065A2C]",label: "Validé",     icon: Check },
  "rejete":       { cls: "bg-red-50 text-red-700",      label: "Rejeté",     icon: null },
  "soumis":       { cls: "bg-yellow-50 text-yellow-800",label: "Soumis",     icon: null },
  "valide_ct":    { cls: "bg-amber-50 text-amber-700",  label: "Validé CT",  icon: null },
  "valide_cp":    { cls: "bg-amber-50 text-amber-700",  label: "Validé CP",  icon: null },
  "valide_daf":   { cls: "bg-violet-50 text-violet-700",label: "Validé DAF", icon: null },
  "valide_dg":    { cls: "bg-[#E8F5EE] text-[#065A2C]",label: "Validé DG",  icon: Check },
  "paye":         { cls: "bg-[#E8F5EE] text-[#065A2C]",label: "Payé",       icon: Check },
  "resilie":      { cls: "bg-red-50 text-red-700",      label: "Résilié",    icon: null },
  "emise":        { cls: "bg-gray-100 text-gray-700",   label: "Émise",      icon: null },
  "payee":        { cls: "bg-[#E8F5EE] text-[#065A2C]",label: "Payée",      icon: Check },
  "annulee":      { cls: "bg-red-50 text-red-700",      label: "Annulée",    icon: null },
  "solde":        { cls: "bg-gray-100 text-gray-700",   label: "Soldé",      icon: null },
  "blackliste":   { cls: "bg-red-100 text-red-800",    label: "Blacklisté", icon: null },
  "genere":       { cls: "bg-gray-100 text-gray-700",  label: "Généré",     icon: null },
  "envoye":       { cls: "bg-amber-50 text-amber-700", label: "Envoyé",     icon: null },
  "accepte":      { cls: "bg-[#E8F5EE] text-[#065A2C]", label: "Accepté",  icon: Check },
  "conteste":     { cls: "bg-red-50 text-red-700",     label: "Contesté",   icon: null },

  // ── Legacy display labels (kept for backward-compat) ──
  "Brouillon":            { cls: "bg-gray-100 text-gray-700", icon: null },
  "En validation":        { cls: "bg-yellow-50 text-yellow-800", icon: null },
  "Approuvé":             { cls: "bg-[#E8F5EE] text-[#065A2C]", icon: Check },
  "Approuvé final":       { cls: "bg-[#E8F5EE] text-[#065A2C]", icon: Check },
  "En cours d'exécution": { cls: "bg-blue-50 text-blue-700", icon: null },
  "Payé":                 { cls: "bg-[#E8F5EE] text-[#065A2C]", icon: Check },
  "Rejeté":               { cls: "bg-red-50 text-red-700", icon: null },
  "Clôturé":              { cls: "bg-gray-100 text-gray-700", icon: null },
  // Bon de commande
  "Actif":                { cls: "bg-blue-50 text-blue-700", icon: null },
  "Soldé":                { cls: "bg-gray-100 text-gray-700", icon: null },
  // Relevé de compte
  "Généré":               { cls: "bg-gray-100 text-gray-700", icon: null },
  "Envoyé au sous-traitant": { cls: "bg-amber-50 text-amber-700", icon: null },
  "Accepté":              { cls: "bg-[#E8F5EE] text-[#065A2C]", icon: Check },
  "Contesté":             { cls: "bg-red-50 text-red-700", icon: null },
  // Facture
  "Émise":                { cls: "bg-gray-100 text-gray-700", icon: null },
  "Importée":             { cls: "bg-blue-50 text-blue-700", icon: null },
  "Rapprochée":           { cls: "bg-teal-50 text-teal-700", icon: null },
  "Écart détecté":        { cls: "bg-red-50 text-red-700", icon: null },
  "Contrôlée DACC":        { cls: "bg-violet-50 text-violet-700", icon: null },
  "Validée DFC":          { cls: "bg-indigo-50 text-indigo-700", icon: null },
  "Payée":                { cls: "bg-[#E8F5EE] text-[#065A2C]", icon: Check },
  "Rejetée":              { cls: "bg-red-50 text-red-700", icon: null },
  // État de cession — statut global
  "Ouvert":               { cls: "bg-gray-100 text-gray-700", icon: null },
  "En contrôle":          { cls: "bg-amber-50 text-amber-700", icon: null },
  "Arrêté":               { cls: "bg-[#E8F5EE] text-[#065A2C]", icon: Check },
  // État de cession — statut de section (partagé avec "Ouvert"/"Arrêté" ci-dessus)
  "Non renseignée":       { cls: "bg-gray-50 text-gray-400", icon: null },
  "Alimentée":            { cls: "bg-blue-50 text-blue-700", icon: null },
  "Anomalies détectées":  { cls: "bg-red-50 text-red-700", icon: null },
  "Quantités validées":   { cls: "bg-amber-50 text-amber-700", icon: null },
  "Validée":              { cls: "bg-[#E8F5EE] text-[#065A2C]", icon: Check },
};

export default function StatusBadge({ statut }) {
  const config = CONFIGS[statut] || { cls: "bg-gray-100 text-gray-700", icon: null };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${config.cls}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {config.label ?? statut}
    </span>
  );
}
