import { Check } from "lucide-react";

const CONFIGS = {
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
      {statut}
    </span>
  );
}
