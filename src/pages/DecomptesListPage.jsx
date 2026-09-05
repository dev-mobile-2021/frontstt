import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, RotateCcw, ChevronLeft, ChevronRight, Plus,
  FileText, FileSpreadsheet, TrendingUp, ChevronDown,
  DollarSign, CheckCircle2, Users,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useDecomptesPaginated, useDecompteCircuit } from "../hooks/useDecomptes";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";
import { formatMontantCourt } from "../utils/formatters";

const STATUTS = [
  { value: "brouillon",   label: "Brouillon" },
  { value: "soumis",      label: "Soumis" },
  { value: "valide_ct",   label: "Validé CT" },
  { value: "valide_cp",   label: "Validé CP" },
  { value: "valide_daf",  label: "Validé DAF" },
  { value: "valide_dg",   label: "Validé DG" },
  { value: "paye",        label: "Payé" },
  { value: "rejete",      label: "Rejeté" },
];

const STATUTS_INSTANCE = ["soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg", "valide_ct", "valide_cp", "valide_daf"];

function MiniKPI({ icon: Icon, label, value, sub, iconColor = "text-gray-500" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className={`mt-0.5 p-2 rounded-lg bg-gray-50 ${iconColor}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-base font-bold text-gray-900 truncate">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

export default function DecomptesListPage() {
  const navigate = useNavigate();
  const [showStats,  setShowStats]  = useState(true);
  const [search,     setSearch]     = useState("");
  const [statut,     setStatut]     = useState("");
  const [page,       setPage]       = useState(1);
  const [debounced,  setDebounced]  = useState("");

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

  const { data: circuitData = [] } = useDecompteCircuit();

  const circuitOrder = useMemo(() => {
    if (circuitData.length === 0)
      return ["brouillon", "soumis", "valide_ct", "valide_cp", "valide_daf", "valide_dg", "paye"];
    return ["brouillon", circuitData[0].statut_avant, ...circuitData.map(e => e.statut_apres), "paye"];
  }, [circuitData]);

  function circuitStep(s) {
    const idx = circuitOrder.indexOf(s);
    return idx >= 0 ? `${idx}/${circuitOrder.length - 1}` : null;
  }

  // Paginated filtered fetch (for the table)
  const { data, isLoading, isError } = useDecomptesPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  // Full unfiltered fetch (for stats banner)
  const { data: allData } = useDecomptesPaginated({ count: 200 });
  const allDecomptes = allData?.data ?? [];

  // ── Stats KPIs ────────────────────────────────────────────────────────────
  const statsKPIs = useMemo(() => {
    const uniqueContratIds = [...new Set(allDecomptes.map(d => d.contrat_id).filter(Boolean))];
    const uniqueContrats   = allDecomptes
      .filter((d, i, arr) => d.contrat_id && arr.findIndex(x => x.contrat_id === d.contrat_id) === i)
      .map(d => d.contrat);

    const montantContrats = uniqueContrats.reduce(
      (s, c) => s + parseFloat(c?.montant_actuel ?? c?.montant_initial ?? 0), 0
    );
    const montantEngage = allDecomptes.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
    const cumulPaye     = allDecomptes
      .filter(d => d.statut === "paye")
      .reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);

    return { totalContrats: uniqueContratIds.length, montantContrats, montantEngage, cumulPaye };
  }, [allDecomptes]);

  // ── Validations en cours ──────────────────────────────────────────────────
  const validationsEnCours = useMemo(() => {
    if (!circuitData.length) return [];
    return circuitData.map(etape => ({
      profil_code: etape.profil_code,
      libelle:     etape.libelle,
      count:       allDecomptes.filter(d => d.statut === etape.statut_avant).length,
    }));
  }, [circuitData, allDecomptes]);

  const totalEnValidation = validationsEnCours.reduce((s, v) => s + v.count, 0);

  // ── Règlements en instance (par sous-traitant) ────────────────────────────
  const reglements = useMemo(() => {
    const map = {};
    allDecomptes
      .filter(d => STATUTS_INSTANCE.includes(d.statut))
      .forEach(d => {
        const key = d.contrat?.soustraitant?.raison_sociale ?? "—";
        if (!map[key]) map[key] = { nbr: 0, montant: 0 };
        map[key].nbr    += 1;
        map[key].montant += parseFloat(d.montant_ht ?? 0);
      });
    return Object.entries(map)
      .map(([nom, v]) => ({ nom, ...v }))
      .sort((a, b) => b.montant - a.montant);
  }, [allDecomptes]);

  const totalReglements = reglements.reduce((s, r) => s + r.montant, 0);
  const totalReglementsNbr = reglements.reduce((s, r) => s + r.nbr, 0);

  function reset() { setSearch(""); setStatut(""); setPage(1); }

  function exportExcel() {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    window.open(`${API_BASE}/excel/decomptes?${params.toString()}`, "_blank");
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Décomptes"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} décompte${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => navigate("/decomptes/nouveau")}
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
          >
            <Plus size={16} /> Nouveau décompte
          </button>
        }
      />

      {/* ── Stats Banner ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowStats(s => !s)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[#087F3E]" />
            Résumé global — Tous les chantiers
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showStats ? "rotate-180" : ""}`} />
        </button>

        {showStats && (
          <div className="border-t border-gray-100 p-5 space-y-5">

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-4">
              <MiniKPI
                icon={FileText}
                label="Contrats de ST"
                value={statsKPIs.totalContrats}
                sub="Contrats avec décomptes"
              />
              <MiniKPI
                icon={TrendingUp}
                label="Montants contrats"
                value={formatMontantCourt(statsKPIs.montantContrats)}
                sub="Montant actualisé total"
              />
              <MiniKPI
                icon={CheckCircle2}
                label="Montants engagés"
                value={formatMontantCourt(statsKPIs.montantEngage)}
                sub="Total décomptes soumis"
                iconColor="text-blue-600"
              />
              <MiniKPI
                icon={DollarSign}
                label="Cumul payé"
                value={formatMontantCourt(statsKPIs.cumulPaye)}
                sub="Décomptes à statut payé"
                iconColor="text-[#087F3E]"
              />
            </div>

            {/* Two panels */}
            <div className="grid grid-cols-2 gap-5">

              {/* Validations en cours */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Validations en cours</h3>
                  {totalEnValidation > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                      {totalEnValidation} en attente
                    </span>
                  )}
                </div>

                {validationsEnCours.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Circuit non configuré.</p>
                ) : (
                  <div className="space-y-2">
                    {validationsEnCours.map(v => (
                      <div key={v.profil_code} className="flex items-center gap-3 py-1">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${v.count > 0
                            ? "bg-amber-100 text-amber-700 border border-amber-300"
                            : "bg-gray-100 text-gray-300 border border-gray-200"
                          }`}
                        >
                          {v.count}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700">{v.profil_code.toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{v.libelle}</p>
                        </div>
                        {v.count > 0 && (
                          <span className="text-xs text-amber-600 font-medium whitespace-nowrap">En attente</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Règlements en instance */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Règlements en instance</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Décomptes en circuit, non payés</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-400">{totalReglementsNbr} décompte{totalReglementsNbr !== 1 ? "s" : ""}</p>
                    <MoneyDisplay amount={totalReglements} className="text-sm font-bold text-[#087F3E]" />
                  </div>
                </div>

                {reglements.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Aucun règlement en instance.</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {reglements.map(r => (
                      <div key={r.nom} className="flex items-center justify-between py-2 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#087F3E] flex-shrink-0" />
                          <p className="text-xs text-gray-700 truncate">{r.nom}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs text-gray-500 tabular-nums w-5 text-right">{r.nbr}</span>
                          <MoneyDisplay amount={r.montant} variant="small" className="font-semibold text-gray-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher par code décompte…"
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
          Impossible de charger les décomptes.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Code", "Contrat / STT", "Chantier", "Montant brut", "Net HT", "TTC", "Échéance", "Statut", "Circuit"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileText size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucun décompte ne correspond aux filtres.</p>
                  </td>
                </tr>
              ) : rows.map(d => (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/decomptes/${d.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm font-semibold text-gray-900">{d.code}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-mono text-gray-700">{d.contrat?.code ?? "—"}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{d.contrat?.soustraitant?.raison_sociale}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{d.contrat?.chantier?.designation ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <MoneyDisplay amount={d.montant_brut ?? 0} variant="small" />
                  </td>
                  <td className="px-4 py-3.5">
                    <MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="text-[#087F3E]" />
                  </td>
                  <td className="px-4 py-3.5">
                    <MoneyDisplay amount={d.montant_ttc ?? 0} variant="small" className="font-semibold text-gray-800" />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {fmtDate(d.date_echeance)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge statut={d.statut} />
                  </td>
                  <td className="px-4 py-3.5">
                    {d.statut === "rejete" ? (
                      <span className="text-xs text-red-500">Rejeté</span>
                    ) : (
                      <span className="text-xs text-gray-400 tabular-nums">{circuitStep(d.statut)}</span>
                    )}
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
