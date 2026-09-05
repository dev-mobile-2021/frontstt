import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ChevronLeft, ChevronRight, Plus, FileText, FileSpreadsheet } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";

const STATUTS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "soumis",    label: "Soumis" },
  { value: "valide",    label: "Validé" },
  { value: "rejete",    label: "Rejeté" },
];

export default function EtatsCessionListPage() {
  const navigate = useNavigate();
  const [search,    setSearch]    = useState("");
  const [statut,    setStatut]    = useState("");
  const [page,      setPage]      = useState(1);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = {
    code:   debounced || undefined,
    statut: statut    || undefined,
    page,
    count: 15,
  };

  const { data, isLoading, isError } = useEtatsCessionPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  function reset() { setSearch(""); setStatut(""); setPage(1); }

  function exportExcel() {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    window.open(`${API_BASE}/excel/etatscessions?${params.toString()}`, "_blank");
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="États de cession"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} état${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => navigate("/etats-cession/nouveau")}
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
          >
            <Plus size={16} /> Nouvel état de cession
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher par code état de cession…"
              value={search}
              onChange={e => setSearch(e.target.value)}
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
          <button
            onClick={exportExcel}
            className="ml-auto flex items-center gap-1.5 text-sm text-[#087F3E] border border-[#087F3E] px-3 py-2 rounded-lg hover:bg-[#E8F5EE] transition-colors"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les états de cession.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Code", "Contrat / STT", "Chantier", "Période", "Montant total", "Statut"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <FileText size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucun état de cession ne correspond aux filtres.</p>
                  </td>
                </tr>
              ) : rows.map(e => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/etats-cession/${e.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm font-semibold text-gray-900">{e.code}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-mono text-gray-700">{e.contrat?.code ?? "—"}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{e.contrat?.soustraitant?.raison_sociale}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{e.contrat?.chantier?.designation ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {fmtDate(e.periode_debut)}
                    {e.periode_fin ? ` → ${fmtDate(e.periode_fin)}` : ""}
                  </td>
                  <td className="px-4 py-3.5">
                    <MoneyDisplay amount={e.montant_total ?? 0} variant="small" />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge statut={e.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Page {meta.current_page} / {meta.last_page} — {meta.total} résultat{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${n === page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-200 text-gray-600"}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
