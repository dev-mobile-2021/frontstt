import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Search, FileDown, FileSpreadsheet, Filter, X,
  ChevronRight, Eye,
} from "lucide-react";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/PageHeader";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";

const fmtNum  = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const TYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "MTX", label: "MTX — Matériaux" },
  { value: "GASOIL", label: "Gasoil" },
  { value: "MTL", label: "MTL — Matériel" },
  { value: "RH", label: "RH — Ressources humaines" },
];

const STATUT_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "brouillon", label: "Brouillon" },
  { value: "soumis", label: "Soumis" },
  { value: "valide", label: "Validé" },
  { value: "rejete", label: "Rejeté" },
];

const INIT_FILTERS = {
  type_poste:       "",
  statut:           "",
  chantier_id:      "",
  soustraitant_id:  "",
  mois_debut:       "",
  mois_fin:         "",
};

export default function ConsultationEtatsCessionPage() {
  const navigate = useNavigate();
  const [filters, setFilters]   = useState(INIT_FILTERS);
  const [applied, setApplied]   = useState({});
  const [page, setPage]         = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const { data: chantiersData }    = useChantiersPaginated({ count: 200 });
  const { data: sttData }          = useSousTraitantsPaginated({ count: 200 });
  const chantiers                  = chantiersData?.data ?? [];
  const soustraitants              = sttData?.data ?? [];

  // Query avec filtres appliqués
  const queryFilters = {
    page,
    count: 20,
    statut:          applied.statut          || undefined,
    chantier_id:     applied.chantier_id     ? parseInt(applied.chantier_id, 10) : undefined,
    soustraitant_id: applied.soustraitant_id ? parseInt(applied.soustraitant_id, 10) : undefined,
  };
  const { data, isLoading } = useEtatsCessionPaginated(queryFilters);

  const etats     = data?.data ?? [];
  const meta      = data?.metadata ?? {};

  // Filtrer par type_poste côté client (les lignes sont déjà chargées dans le détail)
  // et par mois côté client
  const etatsFiltres = etats.filter(ec => {
    if (applied.mois_debut) {
      const debut = ec.periode_debut?.slice(0, 7);
      if (debut < applied.mois_debut) return false;
    }
    if (applied.mois_fin) {
      const debut = ec.periode_debut?.slice(0, 7);
      if (debut > applied.mois_fin) return false;
    }
    return true;
  });

  function handleApply() {
    setApplied({ ...filters });
    setPage(1);
  }

  function handleReset() {
    setFilters(INIT_FILTERS);
    setApplied({});
    setPage(1);
  }

  async function handlePdf() {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams();
      if (applied.chantier_id)     params.set("chantier_id", applied.chantier_id);
      if (applied.statut)          params.set("statut", applied.statut);
      if (applied.mois_debut)      params.set("mois_debut", applied.mois_debut);
      if (applied.mois_fin)        params.set("mois_fin", applied.mois_fin);
      const token = localStorage.getItem("stt_token");
      const resp  = await fetch(`${API_BASE}/pdf/recap-cessions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob  = await resp.blob();
      const url   = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleExcel() {
    const params = new URLSearchParams();
    if (applied.chantier_id)     params.set("chantier_id", applied.chantier_id);
    if (applied.statut)          params.set("statut", applied.statut);
    if (applied.soustraitant_id) params.set("soustraitant_id", applied.soustraitant_id);
    const token = localStorage.getItem("stt_token");
    const resp  = await fetch(`${API_BASE}/excel/etatscessions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob  = await resp.blob();
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href      = url;
    a.download  = "etats-cession.xlsx";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const hasActiveFilters = Object.values(applied).some(v => !!v);
  const totalMontant     = etatsFiltres.reduce((s, e) => s + parseFloat(e.montant_total ?? 0), 0);

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> États de cession
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">Consultation</span>
      </div>

      <PageHeader
        title="Consultation États de Cession"
        subtitle="Visualisez et exportez les états par type, période et sous-traitant"
      />

      {/* Panneau filtres */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={14} /> Filtres
          {hasActiveFilters && (
            <button onClick={handleReset} className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
              <X size={12} /> Réinitialiser
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Type</label>
            <select value={filters.type_poste} onChange={e => set("type_poste", e.target.value)} className={inputCls}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Statut</label>
            <select value={filters.statut} onChange={e => set("statut", e.target.value)} className={inputCls}>
              {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
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
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mois début</label>
            <input type="month" value={filters.mois_debut} onChange={e => set("mois_debut", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mois fin</label>
            <input type="month" value={filters.mois_fin} min={filters.mois_debut || undefined} onChange={e => set("mois_fin", e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleApply}
            className="inline-flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Search size={14} /> Filtrer
          </button>
        </div>
      </div>

      {/* Barre résultats + exports */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{etatsFiltres.length}</span> état{etatsFiltres.length !== 1 ? "s" : ""}
            {etatsFiltres.length > 0 && (
              <span className="ml-2 text-[#087F3E] font-semibold">— Total : {fmtNum(totalMontant)} FCFA</span>
            )}
          </p>
          {hasActiveFilters && (
            <span className="text-xs bg-[#E8F5EE] text-[#087F3E] px-2 py-0.5 rounded-full font-medium">Filtres actifs</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePdf}
            disabled={pdfLoading || etatsFiltres.length === 0}
            className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <FileDown size={14} /> PDF Récap
          </button>
          <button
            onClick={handleExcel}
            disabled={etatsFiltres.length === 0}
            className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-sm text-gray-400">Chargement…</div>
        ) : etatsFiltres.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            Aucun état de cession ne correspond aux critères sélectionnés.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Chantier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sous-traitant</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {etatsFiltres.map(ec => (
                <tr key={ec.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-900">{ec.code}</td>
                  <td className="px-4 py-3.5 text-gray-600 text-xs">
                    {fmtDate(ec.periode_debut)}
                    {ec.periode_fin && ec.periode_fin !== ec.periode_debut && (
                      <> → {fmtDate(ec.periode_fin)}</>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{ec.contrat?.chantier?.code ?? "—"}</span>
                    <span className="ml-2 text-gray-600 text-xs">{ec.contrat?.chantier?.designation ?? ""}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 text-xs">{ec.contrat?.soustraitant?.raison_sociale ?? "—"}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{fmtNum(ec.montant_total)} FCFA</td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge statut={ec.statut} />
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <Link to={`/etats-cession/${ec.id}`} className="text-gray-400 hover:text-[#087F3E] transition-colors">
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            {etatsFiltres.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Total ({etatsFiltres.length} état{etatsFiltres.length !== 1 ? "s" : ""})
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#087F3E] text-base">{fmtNum(totalMontant)} FCFA</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            ← Préc.
          </button>
          <span className="text-sm text-gray-500">Page {page} / {meta.last_page}</span>
          <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            Suiv. →
          </button>
        </div>
      )}
    </div>
  );
}
