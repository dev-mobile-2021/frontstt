import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ReceiptText } from "lucide-react";
import { useRelevesPaginated } from "../hooks/useReleves";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { formatDate } from "../utils/formatters";

const STATUTS = [
  { value: "genere",   label: "Généré" },
  { value: "envoye",   label: "Envoyé" },
  { value: "accepte",  label: "Accepté" },
  { value: "conteste", label: "Contesté" },
];

export default function RelevesListPage() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState("");
  const [statut, setStatut]   = useState("");
  const [page, setPage]       = useState(1);

  const { data, isLoading } = useRelevesPaginated({
    page,
    count: 20,
    code:   search || undefined,
    statut: statut || undefined,
  });

  const rows     = data?.data ?? [];
  const meta     = data?.metadata ?? {};
  const hasFilter = search || statut;

  function reset() {
    setSearch("");
    setStatut("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relevés de compte"
        subtitle="Documents contradictoires remis aux sous-traitants avant facturation"
      />

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Code relevé…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilter && (
            <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code", "Contrat", "Sous-traitant", "Décompte", "Date génération", "Statut"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="py-16 text-center text-sm text-gray-400">Chargement…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                  <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun relevé ne correspond aux filtres.
                </td>
              </tr>
            ) : rows.map(r => (
              <tr
                key={r.id}
                onClick={() => navigate(`/releves/${r.id}`)}
                className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">{r.code}</td>
                <td className="px-4 py-3 text-gray-700">{r.contrat?.code || "—"}</td>
                <td className="px-4 py-3 text-gray-700">{r.contrat?.soustraitant?.raison_sociale || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.decompte?.code || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(r.date_generation)}</td>
                <td className="px-4 py-3"><StatusBadge statut={r.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <span>{meta.total} relevé{meta.total !== 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Précédent
              </button>
              <span className="px-3 py-1 text-gray-500">Page {meta.current_page} / {meta.last_page}</span>
              <button
                disabled={page >= meta.last_page}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
