import { Loader2 } from "lucide-react";

export function Spinner() {
  return <Loader2 size={16} className="animate-spin text-[#087F3E]" />;
}

export function ConfirmDelete({ onConfirm, onCancel, loading }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-600">Confirmer ?</span>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : "Oui"}
      </button>
      <button onClick={onCancel} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">
        Non
      </button>
    </div>
  );
}

export const MODULES = [
  { value: "decompte",     label: "Décompte" },
  { value: "avenant",      label: "Avenant" },
  { value: "contrat",      label: "Contrat" },
  { value: "bon_commande", label: "Bon de commande" },
  { value: "etat_cession", label: "État de cession" },
  { value: "facture",      label: "Facture" },
  { value: "releve",       label: "Relevé" },
];

export const MODULE_STATUTS = {
  decompte:     ["brouillon", "soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg", "paye", "rejete"],
  avenant:      ["brouillon", "soumis", "valide_dacc", "valide", "rejete"],
  contrat:      ["brouillon", "actif", "suspendu", "resilie", "termine", "cloture"],
  bon_commande: ["brouillon", "valide", "envoye", "receptionne", "cloture", "annule"],
  etat_cession: ["brouillon", "soumis", "valide", "rejete"],
  facture:      ["brouillon", "emise", "payee", "annulee"],
  releve:       ["genere", "envoye", "accepte", "conteste"],
};
