import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, Search, FileDown, FileSpreadsheet, Filter, X,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Package, Fuel, Wrench, Users, TrendingUp, Eye,
} from "lucide-react";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";

const fmtNum  = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const POSTES = [
  { key: "MTX",    label: "MTX",    icon: Package, color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  { key: "GASOIL", label: "Gasoil", icon: Fuel,    color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "MTL",    label: "MTL",    icon: Wrench,  color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  { key: "RH",     label: "RH",     icon: Users,   color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
];

const POSTE_MAP = Object.fromEntries(POSTES.map(p => [p.key, p]));

const STATUT_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "soumis",    label: "Soumis" },
  { value: "valide",    label: "Validé" },
  { value: "rejete",    label: "Rejeté" },
];

const POSTE_OPTIONS = [
  { value: "", label: "Tous les postes" },
  ...POSTES.map(p => ({ value: p.key, label: p.label })),
];

const INIT_FILTERS = {
  chantier_id: "", soustraitant_id: "", poste: "",
  statut_ec: "", mois_debut: "", mois_fin: "",
  code_article: "", ref_bs: "", ref_br: "",
};

const COUNT = 100;

const SORT_COLS = [
  { key: "date_sortie",  label: "Date sortie" },
  { key: "code_article", label: "Code article" },
  { key: "designation",  label: "Désignation" },
  { key: "montant",      label: "Montant" },
];

function getAuthHeader() {
  const token = localStorage.getItem("stt_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchLignes(params) {
  const token = localStorage.getItem("stt_token");
  const res = await axios.get(`${API_BASE}/etatcession/lignes`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export default function ConsultationEtatsCessionPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(INIT_FILTERS);
  const [applied, setApplied] = useState({});
  const [page, setPage]       = useState(1);
  const [sortCol, setSortCol] = useState("date_sortie");
  const [sortDir, setSortDir] = useState("desc");
  const [pdfLoading, setPdfLoading] = useState(false);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const { data: chantiersData } = useChantiersPaginated({ count: 200 });
  const { data: sttData }       = useSousTraitantsPaginated({ count: 200 });
  const chantiers               = chantiersData?.data ?? [];
  const soustraitants           = sttData?.data ?? [];

  const queryParams = useMemo(() => {
    const p = { page, count: COUNT };
    if (applied.chantier_id)     p.chantier_id     = applied.chantier_id;
    if (applied.soustraitant_id) p.soustraitant_id = applied.soustraitant_id;
    if (applied.poste)           p.poste           = applied.poste;
    if (applied.statut_ec)       p.statut_ec       = applied.statut_ec;
    if (applied.mois_debut)      p.mois_debut      = applied.mois_debut;
    if (applied.mois_fin)        p.mois_fin        = applied.mois_fin;
    if (applied.code_article)    p.code_article    = applied.code_article;
    if (applied.ref_bs)          p.ref_bs          = applied.ref_bs;
    if (applied.ref_br)          p.ref_br          = applied.ref_br;
    return p;
  }, [applied, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["etatcession_lignes", queryParams],
    queryFn: () => fetchLignes(queryParams),
    keepPreviousData: true,
  });

  const lignesRaw  = data?.data   ?? [];
  const totalRows  = data?.total  ?? 0;
  const totalPages = data?.pages  ?? 1;

  const lignes = lignesRaw;

  // Grouper par mois (periode_debut) puis par ND (ref_bs)
  const groupesMois = useMemo(() => {
    const moisMap = {};
    for (const l of lignes) {
      const moisKey = l.periode_debut ? l.periode_debut.slice(0, 7) : "____";
      if (!moisMap[moisKey]) moisMap[moisKey] = { moisKey, lignes: [] };
      moisMap[moisKey].lignes.push(l);
    }
    return Object.values(moisMap).sort((a, b) => a.moisKey.localeCompare(b.moisKey)).map(mois => {
      const ndMap = {};
      for (const l of mois.lignes) {
        const ndKey = l.ref_bs || `__ec_${l.etat_cession_id}__`;
        if (!ndMap[ndKey]) ndMap[ndKey] = {
          ref_bs:       l.ref_bs,
          date_sortie:  l.date_sortie,
          chantier:     l.chantier,
          soustraitant: l.soustraitant,
          lignes:       [],
        };
        ndMap[ndKey].lignes.push(l);
      }
      const nds = Object.values(ndMap);
      const total = mois.lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
      return { ...mois, nds, total };
    });
  }, [lignes]);

  // KPIs
  const totalMontant = lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
  const kpis = POSTES.map(p => ({
    ...p,
    total: lignes.filter(l => l.poste?.toUpperCase() === p.key).reduce((s, l) => s + (parseFloat(l.montant) || 0), 0),
    count: lignes.filter(l => l.poste?.toUpperCase() === p.key).length,
  }));

  function handleApply() {
    setApplied({ ...filters });
    setPage(1);
  }
  function handleReset() {
    setFilters(INIT_FILTERS);
    setApplied({});
    setPage(1);
  }
  function toggleSort() {}

  async function handlePdfRecap() {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams();
      if (applied.chantier_id) params.set("chantier_id", applied.chantier_id);
      if (applied.statut_ec)   params.set("statut", applied.statut_ec);
      if (applied.mois_debut)  params.set("mois_debut", applied.mois_debut);
      if (applied.mois_fin)    params.set("mois_fin", applied.mois_fin);
      const resp = await fetch(`${API_BASE}/pdf/recap-cessions?${params}`, { headers: getAuthHeader() });
      const blob = await resp.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } finally { setPdfLoading(false); }
  }

  async function handleExcel() {
    const params = new URLSearchParams();
    if (applied.chantier_id)     params.set("chantier_id", applied.chantier_id);
    if (applied.soustraitant_id) params.set("soustraitant_id", applied.soustraitant_id);
    if (applied.statut_ec)       params.set("statut", applied.statut_ec);
    if (applied.mois_debut)      params.set("date_debut", applied.mois_debut + "-01");
    if (applied.mois_fin)        params.set("date_fin", applied.mois_fin + "-31");
    const resp = await fetch(`${API_BASE}/excel/consultation-lignes?${params}`, { headers: getAuthHeader() });
    const blob = await resp.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "consultation-cessions.xlsx"; a.click();
  }

  const hasActiveFilters = Object.values(applied).some(v => !!v);
  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none";

  function SortIcon({ col }) {
    if (sortCol !== col) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-[#087F3E]" /> : <ChevronDown size={12} className="text-[#087F3E]" />;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1">
          <ArrowLeft size={14} /> États de cession
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">Consultation articles</span>
      </div>

      <PageHeader
        title="Consultation Articles"
        subtitle="Vue détail des lignes de cession — style Sage X3"
        action={
          <div className="flex gap-2">
            <button onClick={handlePdfRecap} disabled={pdfLoading || lignes.length === 0}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
              <FileDown size={14} /> PDF récap
            </button>
            <button onClick={handleExcel}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
        }
      />

      {/* Filtres */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={14} /> Filtres
          {hasActiveFilters && (
            <button onClick={handleReset} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
              <X size={12} /> Réinitialiser
            </button>
          )}
        </div>

        {/* Ligne 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Chantier</label>
            <select value={filters.chantier_id} onChange={e => set("chantier_id", e.target.value)} className={inputCls}>
              <option value="">Tous</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.designation}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sous-traitant</label>
            <select value={filters.soustraitant_id} onChange={e => set("soustraitant_id", e.target.value)} className={inputCls}>
              <option value="">Tous</option>
              {soustraitants.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Poste</label>
            <select value={filters.poste} onChange={e => set("poste", e.target.value)} className={inputCls}>
              {POSTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Statut EC</label>
            <select value={filters.statut_ec} onChange={e => set("statut_ec", e.target.value)} className={inputCls}>
              {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Code article</label>
            <input value={filters.code_article} onChange={e => set("code_article", e.target.value)}
              placeholder="ex. FBNOR6" className={inputCls} />
          </div>
        </div>

        {/* Ligne 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mois début</label>
            <input type="month" value={filters.mois_debut} onChange={e => set("mois_debut", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mois fin</label>
            <input type="month" value={filters.mois_fin} min={filters.mois_debut || undefined} onChange={e => set("mois_fin", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Réf. BS</label>
            <input value={filters.ref_bs} onChange={e => set("ref_bs", e.target.value)}
              placeholder="ex. BS-X3-..." className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Réf. BR</label>
            <input value={filters.ref_br} onChange={e => set("ref_br", e.target.value)}
              placeholder="ex. BR-..." className={inputCls} />
          </div>
          <div className="flex items-end">
            <button onClick={handleApply}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              <Search size={14} /> Appliquer
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {lignes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-1 bg-[#087F3E] text-white rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-green-100 text-xs font-medium uppercase tracking-wide">
              <TrendingUp size={13} /> Total
            </div>
            <div>
              <p className="text-xl font-bold mt-2">{fmtNum(totalMontant)}</p>
              <p className="text-green-200 text-xs">FCFA · {totalRows} ligne{totalRows > 1 ? "s" : ""}</p>
            </div>
          </div>
          {kpis.map(p => {
            const Icon = p.icon;
            return (
              <div key={p.key} className={`${p.bg} border ${p.border} rounded-2xl p-4`}>
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${p.color} mb-2`}>
                  <Icon size={12} /> {p.label}
                </div>
                <p className="text-sm font-bold text-gray-800">{fmtNum(p.total)}</p>
                <p className="text-xs text-gray-400">{p.count} ligne{p.count !== 1 ? "s" : ""} · FCFA</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tableau style RECAP ETATS DE CESSION — identique au PDF */}
      <div className="space-y-0">
        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-sm text-gray-400">Chargement…</div>
        ) : lignes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-sm text-gray-400">
            Aucun article trouvé. Appliquez des filtres pour afficher les données.
          </div>
        ) : (
          <div className="border border-gray-300 rounded-xl overflow-hidden">
            {groupesMois.map((mois, moisIdx) => {
              const moisLabel = new Date(mois.moisKey + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
              return (
                <div key={mois.moisKey}>
                  {/* Séparateur mois — fond bleu clair */}
                  <div className="bg-[#cce5f6] border-b border-[#a0c8e8] px-4 py-2 text-center">
                    <span className="text-sm font-bold text-gray-800">{moisLabel}</span>
                  </div>

                  {mois.nds.map((nd, ndIdx) => {
                    const ndTotal = nd.lignes.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
                    return (
                      <div key={nd.ref_bs || ndIdx}>
                        {/* Header ND : ref | date | chantier | sous-traitant */}
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr className="bg-white border-b border-gray-300">
                              <td className="px-3 py-1.5 text-xs font-semibold text-gray-800 border-r border-gray-300 w-36">{nd.ref_bs || "—"}</td>
                              <td className="px-3 py-1.5 text-xs text-gray-700 border-r border-gray-300 w-32">
                                {nd.date_sortie ? new Date(nd.date_sortie).toLocaleDateString("fr-FR") : "—"}
                              </td>
                              <td className="px-3 py-1.5 text-xs font-semibold text-gray-800 border-r border-gray-300 w-28">
                                {nd.chantier?.code_x3 || nd.chantier?.code || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-gray-700">
                                {nd.soustraitant?.raison_sociale || "—"}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Tableau articles */}
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-300">
                              <th className="px-3 py-1.5 text-left text-xs font-bold text-gray-900 border-r border-gray-200 w-32">Code article</th>
                              <th className="px-3 py-1.5 text-left text-xs font-bold text-gray-900 border-r border-gray-200">Description article</th>
                              <th className="px-3 py-1.5 text-center text-xs font-bold text-gray-900 border-r border-gray-200 w-16">Unite</th>
                              <th className="px-3 py-1.5 text-right text-xs font-bold text-gray-900 border-r border-gray-200 w-28">Qté demandée</th>
                              <th className="px-3 py-1.5 text-right text-xs font-bold text-gray-900 border-r border-gray-200 w-28">P.U</th>
                              <th className="px-3 py-1.5 text-right text-xs font-bold text-gray-900 w-36">Valeur</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nd.lignes.map(l => (
                              <tr key={l.id} className="border-b border-dashed border-gray-200 hover:bg-gray-50">
                                <td className="px-3 py-1.5 text-xs text-gray-800 border-r border-gray-200">{l.code_article || l.poste || "—"}</td>
                                <td className="px-3 py-1.5 text-xs text-gray-700 border-r border-gray-200">{l.designation}</td>
                                <td className="px-3 py-1.5 text-center text-xs text-gray-700 border-r border-gray-200 uppercase">{l.unite || "—"}</td>
                                <td className="px-3 py-1.5 text-right text-xs text-gray-800 border-r border-gray-200">
                                  {l.quantite != null ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(l.quantite) : "—"}
                                </td>
                                <td className="px-3 py-1.5 text-right text-xs text-gray-800 border-r border-gray-200">
                                  {l.prix_unitaire != null ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(l.prix_unitaire) : "—"}
                                </td>
                                <td className="px-3 py-1.5 text-right text-xs text-gray-900">
                                  {l.montant != null ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(l.montant) : "—"}
                                </td>
                              </tr>
                            ))}
                            {/* Sous-total ND */}
                            <tr className="border-t-2 border-gray-400">
                              <td colSpan={5} className="px-3 py-1 text-right text-xs text-gray-400">
                                ─────────────────────────
                              </td>
                              <td className="px-3 py-1 text-right text-xs font-bold text-gray-900">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ndTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* TOTAL ND — texte vert, aligné droite */}
                        <div className="px-4 py-2 text-right border-b border-gray-200">
                          <span className="text-sm font-bold text-[#087F3E]">
                            TOTAL&nbsp;:&nbsp;{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ndTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* TOTAL GÉNÉRAL */}
            <div className="border-t-2 border-[#087F3E] bg-[#E8F5EE] px-4 py-3 text-right">
              <span className="text-sm font-bold text-[#087F3E] mr-4">TOTAL GENERAL :</span>
              <span className="text-sm font-bold text-[#087F3E]">
                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalMontant)} FCFA
              </span>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border-t border-gray-200 px-5 py-3">
                <span className="text-xs text-gray-500">Page {page} / {totalPages} · {totalRows} lignes</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
