import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
import SearchSelect from "../components/SearchSelect";
import { fmtNum } from "../utils/formatters";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
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
  statut_ec: "", date_debut: "", date_fin: "",
  code_article: "", ref_bs: "", ref_br: "",
};

function PortalSearchSelect({ value, onChange, options, placeholder, labelKey = "label", valueKey = "id" }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const btnRef              = useRef(null);
  const [rect, setRect]     = useState(null);

  const selected = options.find(o => String(o[valueKey]) === String(value));
  const filtered = options.filter(o =>
    !search || String(o[labelKey]).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          !document.getElementById("portal-search-select")?.contains(e.target)) {
        setOpen(false); setSearch("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleOpen() {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  }

  function pick(v) { onChange(v); setOpen(false); setSearch(""); }

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-[#087F3E] focus:outline-none focus:ring-2 focus:ring-[#087F3E] transition-colors">
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected[labelKey] : placeholder}
        </span>
        <ChevronDown size={14} className={`ml-2 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && rect && createPortal(
        <div id="portal-search-select"
          style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input autoFocus type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
              {search && <button onClick={() => setSearch("")}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>}
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            <li onClick={() => pick("")}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-green-50 hover:text-[#087F3E] ${!value ? "bg-green-50 text-[#087F3E] font-medium" : "text-gray-500"}`}>
              {placeholder}
            </li>
            {filtered.length === 0 && <li className="px-3 py-3 text-sm text-gray-400 text-center">Aucun résultat</li>}
            {filtered.map(o => (
              <li key={o[valueKey]} onClick={() => pick(String(o[valueKey]))}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-green-50 hover:text-[#087F3E] transition-colors ${String(value) === String(o[valueKey]) ? "bg-green-50 text-[#087F3E] font-medium" : "text-gray-700"}`}>
                {o[labelKey]}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}

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

  const { data: chantiersData } = useChantiersPaginated({ count: 500 });
  const { data: sttData }       = useSousTraitantsPaginated({ count: 500 });
  const chantiers               = chantiersData?.data ?? [];
  const soustraitants           = sttData?.data ?? [];

  const queryParams = useMemo(() => {
    const p = { page, count: COUNT };
    if (applied.chantier_id)     p.chantier_id     = applied.chantier_id;
    if (applied.soustraitant_id) p.soustraitant_id = applied.soustraitant_id;
    if (applied.poste)           p.poste           = applied.poste;
    if (applied.statut_ec)       p.statut_ec       = applied.statut_ec;
    if (applied.date_debut)      p.date_debut      = applied.date_debut;
    if (applied.date_fin)        p.date_fin        = applied.date_fin;
    if (applied.code_article)    p.code_article    = applied.code_article;
    if (applied.ref_bs)          p.ref_bs          = applied.ref_bs;
    if (applied.ref_br)          p.ref_br          = applied.ref_br;
    return p;
  }, [applied, page]);

  const statsParams = useMemo(() => {
    const p = { ...queryParams, page: 1, count: 9999 };
    return p;
  }, [queryParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["etatcession_lignes", queryParams],
    queryFn: () => fetchLignes(queryParams),
    keepPreviousData: true,
  });

  const { data: statsData } = useQuery({
    queryKey: ["etatcession_lignes_stats", statsParams],
    queryFn: () => fetchLignes(statsParams),
    keepPreviousData: true,
  });

  const lignesRaw  = data?.data   ?? [];
  const totalRows  = data?.total  ?? 0;
  const totalPages = data?.pages  ?? 1;

  const lignes      = lignesRaw;
  const lignesStats = statsData?.data ?? lignes;

  // Grouper par mois (periode_debut) puis par ref_bs (ND)
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
        const ndKey = l.ref_bs || "__sans_nd__";
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

  // KPIs calculés sur toutes les lignes (pas seulement la page courante)
  const totalMontant = lignesStats.reduce((s, l) => s + (parseFloat(l.montant) || 0), 0);
  const kpis = POSTES.map(p => ({
    ...p,
    total: lignesStats.filter(l => l.poste?.toUpperCase() === p.key).reduce((s, l) => s + (parseFloat(l.montant) || 0), 0),
    count: lignesStats.filter(l => l.poste?.toUpperCase() === p.key).length,
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

  function buildPdfParams() {
    const params = new URLSearchParams();
    if (applied.chantier_id)     params.set("chantier_id",     applied.chantier_id);
    if (applied.soustraitant_id) params.set("soustraitant_id", applied.soustraitant_id);
    if (applied.statut_ec)       params.set("statut",          applied.statut_ec);
    if (applied.date_debut)      params.set("date_debut",      applied.date_debut);
    if (applied.date_fin)        params.set("date_fin",        applied.date_fin);
    if (applied.poste)           params.set("poste",           applied.poste);
    if (applied.code_article)    params.set("code_article",    applied.code_article);
    if (applied.ref_bs)          params.set("ref_bs",          applied.ref_bs);
    if (applied.ref_br)          params.set("ref_br",          applied.ref_br);
    return params;
  }

  async function handlePdfRecap() {
    setPdfLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/pdf/recap-cessions?${buildPdfParams()}`, { headers: getAuthHeader() });
      const blob = await resp.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } finally { setPdfLoading(false); }
  }

  async function handlePdfRecapArticles() {
    setPdfLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/pdf/recap-articles?${buildPdfParams()}`, { headers: getAuthHeader() });
      const blob = await resp.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } finally { setPdfLoading(false); }
  }

  async function handleExcel() {
    const resp = await fetch(`${API_BASE}/excel/consultation-lignes?${buildPdfParams()}`, { headers: getAuthHeader() });
    const blob = await resp.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "consultation-recap-periode.xlsx"; a.click();
  }

  async function handleExcelCumul() {
    const resp = await fetch(`${API_BASE}/excel/consultation-cumul?${buildPdfParams()}`, { headers: getAuthHeader() });
    const blob = await resp.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "consultation-cumul.xlsx"; a.click();
  }

  const hasActiveFilters = Object.values(applied).some(v => !!v);
  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none";

  function SortIcon({ col }) {
    if (sortCol !== col) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-[#087F3E]" /> : <ChevronDown size={12} className="text-[#087F3E]" />;
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1">
          <ArrowLeft size={14} /> États de cession
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">Consultation articles</span>
      </div>

      {/* Entête + Filtres intégrés */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Titre + actions */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Consultation Articles</h1>
            <p className="text-xs text-gray-400 mt-0.5">Récap matériaux — lignes de cession</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePdfRecap} disabled={pdfLoading || lignes.length === 0}
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-40">
              <FileDown size={13} /> PDF Récap / Période
            </button>
            <button onClick={handlePdfRecapArticles} disabled={pdfLoading || lignes.length === 0}
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-40">
              <FileDown size={13} /> PDF Cumul
            </button>
            <button onClick={handleExcel} disabled={lignes.length === 0}
              className="inline-flex items-center gap-1.5 bg-[#087F3E] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#065A2C] disabled:opacity-40">
              <FileSpreadsheet size={13} /> Excel Récap / Période
            </button>
            <button onClick={handleExcelCumul} disabled={lignes.length === 0}
              className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-800 disabled:opacity-40">
              <FileSpreadsheet size={13} /> Excel Cumul
            </button>
          </div>
        </div>

        {/* Filtres dans l'entête */}
        <div className="px-5 py-4 space-y-3">
          {/* Ligne 1 : Chantier + STT + Statut + Poste */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-1 space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Chantier</label>
              <PortalSearchSelect
                value={filters.chantier_id}
                onChange={v => set("chantier_id", v)}
                options={chantiers}
                placeholder="Tous les chantiers"
                labelKey="designation"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Sous-traitant</label>
              <PortalSearchSelect
                value={filters.soustraitant_id}
                onChange={v => set("soustraitant_id", v)}
                options={soustraitants}
                placeholder="Tous les STT"
                labelKey="raison_sociale"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Statut EC</label>
              <select value={filters.statut_ec} onChange={e => set("statut_ec", e.target.value)} className={inputCls}>
                {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Poste</label>
              <select value={filters.poste} onChange={e => set("poste", e.target.value)} className={inputCls}>
                {POSTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Ligne 2 : Période + Code article + Réf BS + Réf BR + Appliquer */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Période début</label>
              <input type="date" value={filters.date_debut} onChange={e => set("date_debut", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Période fin</label>
              <input type="date" value={filters.date_fin} min={filters.date_debut || undefined} onChange={e => set("date_fin", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Code article</label>
              <input value={filters.code_article} onChange={e => set("code_article", e.target.value)}
                placeholder="ex. FBNOR6" className={inputCls} />
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <button onClick={handleReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-2.5 py-2 rounded-lg">
                  <X size={12} /> Reset
                </button>
              )}
              <button onClick={handleApply}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Search size={13} /> Appliquer
              </button>
            </div>
          </div>

          {/* Badges filtres actifs */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {applied.chantier_id && <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{chantiers.find(c => String(c.id) === applied.chantier_id)?.designation ?? applied.chantier_id}</span>}
              {applied.soustraitant_id && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{soustraitants.find(s => String(s.id) === applied.soustraitant_id)?.raison_sociale ?? applied.soustraitant_id}</span>}
              {applied.statut_ec && <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">{applied.statut_ec}</span>}
              {applied.poste && <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">{applied.poste}</span>}
              {applied.date_debut && <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">Du {applied.date_debut}</span>}
              {applied.date_fin && <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">Au {applied.date_fin}</span>}
              {applied.code_article && <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">{applied.code_article}</span>}
              {applied.ref_bs && <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">BS: {applied.ref_bs}</span>}
              {applied.ref_br && <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">BR: {applied.ref_br}</span>}
            </div>
          )}
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

      {/* Tableau plat paginé */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Chargement…</div>
        ) : lignes.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Aucun article trouvé. Appliquez des filtres pour afficher les données.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#065A2C]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Période</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Chantier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Sous-traitant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Poste</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Code article</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white">Désignation</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white">Unité</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white">Quantité</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white">P.U</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white">Montant</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={l.id ?? i} className={`border-b border-gray-100 hover:bg-[#E8F5EE] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {l.periode_debut ? new Date(l.periode_debut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{l.chantier?.code_x3 || l.chantier?.designation || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{l.soustraitant?.raison_sociale || "—"}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {l.poste ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          l.poste === "MTX" ? "bg-blue-50 text-blue-700" :
                          l.poste === "GASOIL" ? "bg-orange-50 text-orange-700" :
                          l.poste === "MTL" ? "bg-violet-50 text-violet-700" :
                          "bg-green-50 text-green-700"
                        }`}>{l.poste}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-800">{l.code_article || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{l.designation || "—"}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-600 uppercase">{l.unite || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-800">{l.quantite != null ? fmtNum(l.quantite, 2) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-800">{l.prix_unitaire != null ? fmtNum(l.prix_unitaire, 0) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">{l.montant != null ? fmtNum(l.montant, 0) : "—"}</td>
                    <td className="px-2 py-2">
                      <Link to={`/etats-cession/${l.etat_cession_id}`}
                        className="text-gray-300 hover:text-[#087F3E] transition-colors inline-flex">
                        <Eye size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Page {page} / {totalPages} · {totalRows} ligne{totalRows > 1 ? "s" : ""}</span>
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
          </>
        )}
      </div>
    </div>
  );
}
