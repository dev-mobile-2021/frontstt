import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Eye, Plus, X, ChevronLeft, ChevronRight, Copy, Archive } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import ProgressBar from "../components/ProgressBar";
import { useContrats } from "../context/ContratsContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import { useDecomptes } from "../context/DecomptesContext";
import { formatMontantCourt, formatDate } from "../utils/formatters";
import { getMontantActualise, computeMontantRealise, computeNombreDecomptes } from "../utils/contratMetrics";
import { computeAlerteDelai } from "../utils/contratAlertes";
import { AlertTriangle } from "lucide-react";

const PAGE_SIZE = 8;

const sttMap  = Object.fromEntries(sousTraitants.map((s) => [s.id, s.raisonSociale]));
const chanMap = Object.fromEntries(chantiers.map((c) => [c.id, c.nom]));

const ALL_STATUTS = ["En cours d'exécution", "Clôturé", "Suspendu", "Brouillon", "En validation"];

export default function ContratsListPage() {
  const { contrats } = useContrats();
  const { decomptes } = useDecomptes();
  const navigate = useNavigate();
  const [search, setSearch]         = useState("");
  const [filterChantier, setFilterChantier] = useState("");
  const [filterStatut, setFilterStatut]     = useState("");
  const [filterSTT, setFilterSTT]           = useState("");
  const [page, setPage]             = useState(1);

  const filtered = useMemo(() => {
    return contrats.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q || [
        c.code, c.objet, sttMap[c.sousTraitantId], chanMap[c.chantierId],
      ].some((v) => v?.toLowerCase().includes(q));

      return (
        matchSearch &&
        (!filterChantier || c.chantierId === filterChantier) &&
        (!filterStatut   || c.statut === filterStatut) &&
        (!filterSTT      || c.sousTraitantId === filterSTT)
      );
    });
  }, [search, filterChantier, filterStatut, filterSTT, contrats]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasFilters = search || filterChantier || filterStatut || filterSTT;

  function resetFilters() {
    setSearch(""); setFilterChantier(""); setFilterStatut(""); setFilterSTT(""); setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrats"
        subtitle="Gestion des contrats de sous-traitance"
        action={
          <Link
            to="/contrats/nouveau"
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" /> Nouveau contrat
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par code, objet, sous-traitant..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200"
            />
          </div>

          {/* Chantier filter */}
          <select
            value={filterChantier}
            onChange={(e) => { setFilterChantier(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200 min-w-[180px]"
          >
            <option value="">Tous les chantiers</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>

          {/* Statut filter */}
          <select
            value={filterStatut}
            onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200 min-w-[160px]"
          >
            <option value="">Tous les statuts</option>
            {ALL_STATUTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Sous-traitant filter */}
          <select
            value={filterSTT}
            onChange={(e) => { setFilterSTT(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200 min-w-[180px]"
          >
            <option value="">Tous les sous-traitants</option>
            {sousTraitants.map((s) => (
              <option key={s.id} value={s.id}>{s.raisonSociale}</option>
            ))}
          </select>
        </div>

        {/* Filter info row */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{filtered.length}</span> contrat{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
          </p>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-[#087F3E] font-medium hover:text-[#065A2C] transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 px-5 py-3.5">Code</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 px-4 py-3.5">Objet</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 px-4 py-3.5">Sous-traitant</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 px-4 py-3.5">Chantier</th>
              <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-500 px-4 py-3.5">Montant HT</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 px-4 py-3.5 w-36">Avancement</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <p className="text-sm text-gray-500">Aucun contrat ne correspond à vos critères.</p>
                  <button onClick={resetFilters} className="mt-2 text-sm text-[#087F3E] font-medium hover:underline">
                    Réinitialiser les filtres
                  </button>
                </td>
              </tr>
            ) : paginated.map((contrat) => {
              const montantActualise = getMontantActualise(contrat);
              const montantRealise   = computeMontantRealise(contrat.id, decomptes);
              const nDecomptes       = computeNombreDecomptes(contrat.id, decomptes);
              const avancement = montantActualise > 0
                ? Math.round((montantRealise / montantActualise) * 100)
                : 0;
              const hasAvenants = (contrat.avenants || []).some((a) => a.statutValidationDFC === "Validé");
              const alerte = computeAlerteDelai(contrat);
              return (
                <tr
                  key={contrat.id}
                  onClick={() => navigate(`/contrats/${contrat.id}`)}
                  className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{contrat.code}</span>
                      {contrat.typeCircuit === "réduit" && (
                        <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 font-medium">circuit réduit</span>
                      )}
                      {alerte && (
                        <span title={alerte.message} className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium border ${alerte.type === "danger" ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                          <AlertTriangle size={10} />
                          {alerte.pct}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-[220px]">
                    <p className="text-sm text-gray-800 truncate" title={contrat.objet}>{contrat.objet}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{nDecomptes} décompte{nDecomptes !== 1 ? "s" : ""}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-700 truncate max-w-[160px]">{sttMap[contrat.sousTraitantId]}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{chanMap[contrat.chantierId]}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-gray-900">{formatMontantCourt(montantActualise)}</span>
                    {hasAvenants && (
                      <p className="text-xs text-purple-600 font-medium mt-0.5">actualisé</p>
                    )}
                  </td>
                  <td className="px-4 py-4 w-36">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-600">{avancement}%</span>
                      <ProgressBar value={avancement} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge statut={contrat.statut} />
                  </td>
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/contrats/${contrat.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#087F3E] hover:bg-[#E8F5EE] transition-colors duration-200"
                        title="Voir le contrat"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                        title="Dupliquer (démo)"
                        onClick={() => {}}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Affichage de{" "}
              <span className="font-medium">{(safePage - 1) * PAGE_SIZE + 1}</span> à{" "}
              <span className="font-medium">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span> sur{" "}
              <span className="font-medium">{filtered.length}</span> contrat{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === safePage
                      ? "bg-[#087F3E] text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
