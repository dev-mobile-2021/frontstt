import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ReceiptText } from "lucide-react";
import { useReleves } from "../context/RelevesContext";
import { contrats } from "../data/contrats";
import { sousTraitants } from "../data/sous_traitants";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { formatDate } from "../utils/formatters";

const contratMap = Object.fromEntries(contrats.map(c => [c.id, c]));
const sttMap = Object.fromEntries(sousTraitants.map(s => [s.id, s]));

const STATUTS = ["Généré", "Envoyé au sous-traitant", "Accepté", "Contesté"];

export default function RelevesListPage() {
  const { releves } = useReleves();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [sttFilter, setSttFilter] = useState("");

  const rows = useMemo(() => releves.map(r => {
    const contrat = contratMap[r.contratId];
    const stt = sttMap[contrat?.sousTraitantId];
    return { releve: r, contrat, stt };
  }), [releves]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(({ releve, contrat, stt }) => {
      if (q && ![releve.code, contrat?.code, stt?.raisonSociale, releve.decompteId].some(v => v?.toLowerCase().includes(q))) return false;
      if (statut && releve.statut !== statut) return false;
      if (sttFilter && contrat?.sousTraitantId !== sttFilter) return false;
      return true;
    });
  }, [rows, search, statut, sttFilter]);

  const hasFilter = search || statut || sttFilter;

  return (
    <div className="space-y-6">
      <PageHeader title="Relevés de compte" subtitle="Documents contradictoires remis aux sous-traitants avant facturation" />

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Code relevé, contrat, sous-traitant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
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
          {hasFilter && (
            <button onClick={() => { setSearch(""); setStatut(""); setSttFilter(""); }}
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
              {["Code", "Contrat", "Sous-traitant", "Décompte", "Date génération", "Statut"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                  <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun relevé ne correspond aux filtres.
                </td>
              </tr>
            ) : filtered.map(({ releve, contrat, stt }) => (
              <tr key={releve.id} onClick={() => navigate(`/releves/${releve.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">{releve.code}</td>
                <td className="px-4 py-3 text-gray-700">{contrat?.code || releve.contratId}</td>
                <td className="px-4 py-3 text-gray-700">{stt?.raisonSociale || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{releve.decompteId}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(releve.dateGeneration)}</td>
                <td className="px-4 py-3"><StatusBadge statut={releve.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
