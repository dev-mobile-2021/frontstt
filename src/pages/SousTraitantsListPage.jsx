import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";

const STATUTS = [
  { value: "actif",      label: "Actif" },
  { value: "suspendu",   label: "Suspendu" },
  { value: "blackliste", label: "Blacklisté" },
];

export default function SousTraitantsListPage() {
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
    raison_sociale: debounced || undefined,
    statut:         statut    || undefined,
    page,
    count: 15,
  };

  const { data, isLoading, isError } = useSousTraitantsPaginated(filters);
  const rows      = data?.data ?? [];
  const meta      = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  function reset() { setSearch(""); setStatut(""); setPage(1); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sous-traitants"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} sous-traitant${(meta.total ?? 0) !== 1 ? "s" : ""}`}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Raison sociale, NINEA, ville…"
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
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les sous-traitants.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Raison sociale", "NINEA / RC", "Ville", "Contact", "Spécialités", "Statut"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-gray-400 text-sm">
                    <Users size={28} className="mx-auto mb-2 text-gray-300" />
                    Aucun sous-traitant correspondant
                  </td>
                </tr>
              ) : rows.map(stt => (
                <tr
                  key={stt.id}
                  onClick={() => navigate(`/sous-traitants/${stt.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-gray-900">{stt.raison_sociale}</p>
                    {stt.forme_juridique && <p className="text-xs text-gray-400">{stt.forme_juridique}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-mono text-gray-700">{stt.ninea || "—"}</p>
                    {stt.registre_commerce && <p className="text-xs text-gray-400">{stt.registre_commerce}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{stt.ville || "—"}</td>
                  <td className="px-5 py-3.5">
                    {stt.contact_nom && <p className="text-sm text-gray-700">{stt.contact_nom}</p>}
                    {stt.contact_telephone && <p className="text-xs text-gray-400">{stt.contact_telephone}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 max-w-[160px] truncate">{stt.specialites || "—"}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge statut={stt.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {meta.current_page} / {meta.last_page} — {meta.total} résultat{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 text-sm rounded transition-colors ${n === page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-100 text-gray-600"}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
                >
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
