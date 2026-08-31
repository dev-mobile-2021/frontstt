import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, AlertTriangle, FileStack } from "lucide-react";
import { useFactures } from "../context/FacturesContext";
import { contrats } from "../data/contrats";
import { sousTraitants } from "../data/sous_traitants";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { formatDate } from "../utils/formatters";

const contratMap = Object.fromEntries(contrats.map(c => [c.id, c]));
const sttMap = Object.fromEntries(sousTraitants.map(s => [s.id, s]));

const TYPES = [
  { value: "avance", label: "Avance de démarrage" },
  { value: "cse", label: "CSE" },
  { value: "sous_traitant", label: "Sous-traitant" },
];
const STATUTS = ["Émise", "Importée", "Rapprochée", "Écart détecté", "Contrôlée DACC", "Validée DFC", "Payée", "Rejetée"];

export default function FacturesListPage() {
  const { factures } = useFactures();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [statut, setStatut] = useState("");
  const [sttFilter, setSttFilter] = useState("");
  const [onlyEcarts, setOnlyEcarts] = useState(false);

  const rows = useMemo(() => factures.map(f => {
    const contrat = contratMap[f.contratId];
    const stt = sttMap[contrat?.sousTraitantId];
    return { facture: f, contrat, stt };
  }), [factures]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(({ facture, contrat, stt }) => {
      if (onlyEcarts && facture.statut !== "Écart détecté") return false;
      if (q && ![facture.code, contrat?.code, stt?.raisonSociale].some(v => v?.toLowerCase().includes(q))) return false;
      if (type && facture.type !== type) return false;
      if (statut && facture.statut !== statut) return false;
      if (sttFilter && contrat?.sousTraitantId !== sttFilter) return false;
      return true;
    });
  }, [rows, search, type, statut, sttFilter, onlyEcarts]);

  const ecartsCount = factures.filter(f => f.statut === "Écart détecté").length;
  const hasFilter = search || type || statut || sttFilter || onlyEcarts;

  return (
    <div className="space-y-6">
      <PageHeader title="Factures" subtitle="Avance de démarrage, factures CSE et sous-traitant, rapprochement" />

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Code, contrat, sous-traitant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select value={type} onChange={e => setType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statut} onChange={e => setStatut(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={sttFilter} onChange={e => setSttFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les sous-traitants</option>
            {sousTraitants.map(s => <option key={s.id} value={s.id}>{s.raisonSociale}</option>)}
          </select>
          <button
            onClick={() => setOnlyEcarts(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${onlyEcarts ? "bg-red-600 text-white border-red-600" : "border-red-200 text-red-600 hover:bg-red-50"}`}
          >
            <AlertTriangle size={14} />
            Écarts à traiter{ecartsCount > 0 ? ` (${ecartsCount})` : ""}
          </button>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setType(""); setStatut(""); setSttFilter(""); setOnlyEcarts(false); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code", "Type", "Contrat", "Sous-traitant", "Montant TTC", "Statut", "Date"].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Montant TTC" ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                  <FileStack className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucune facture ne correspond aux filtres.
                </td>
              </tr>
            ) : filtered.map(({ facture, contrat, stt }) => (
              <tr key={facture.id} onClick={() => navigate(`/factures/${facture.id}`)} className={`hover:bg-gray-50 cursor-pointer transition-colors ${facture.statut === "Écart détecté" ? "bg-red-50/40" : ""}`}>
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">{facture.code}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{TYPES.find(t => t.value === facture.type)?.label || facture.type}</td>
                <td className="px-4 py-3 text-gray-700">{contrat?.code || "—"}</td>
                <td className="px-4 py-3 text-gray-700">{stt?.raisonSociale || "—"}</td>
                <td className="px-4 py-3 text-right"><MoneyDisplay amount={facture.montantTTC} variant="small" /></td>
                <td className="px-4 py-3"><StatusBadge statut={facture.statut} /></td>
                <td className="px-4 py-3 text-gray-500">{formatDate(facture.dateEmission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
