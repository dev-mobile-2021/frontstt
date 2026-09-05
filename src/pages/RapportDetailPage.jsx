import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, ChevronDown, Loader2, Info, AlertCircle, X, SlidersHorizontal,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import MoneyDisplay from "../components/MoneyDisplay";
import StatusBadge from "../components/StatusBadge";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
const STATUTS_CIRCUIT = ["soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg"];

// ─── Config par rapport ───────────────────────────────────────────────────────
// filters: liste des filtres affichés pour ce rapport
// excel:   endpoint + params fixes
const RAPPORT_CONFIG = {
  r1: {
    badge: "R1", title: "Budget sous-traitance par RAM",
    desc:  "Budget prévu vs montants engagés par famille RAM",
    excel: { base: "rapport/budget-ram" },
    filters: ["chantier_id"],
  },
  r2: {
    badge: "R2", title: "Contrats validés par RAM",
    desc:  "État nominatif des contrats validés",
    excel: { base: "rapport/contrats-ram", fixed: { type: "valides" } },
    filters: ["chantier_id", "soustraitant_id"],
  },
  r3: {
    badge: "R3", title: "Contrats engagés par RAM",
    desc:  "État nominatif des contrats actifs engagés",
    excel: { base: "rapport/contrats-ram", fixed: { type: "engages" } },
    filters: ["chantier_id", "soustraitant_id"],
  },
  r4: {
    badge: "R4", title: "Prestations réalisées / RAM",
    desc:  "État nominatif des prestations réalisées",
    excel: { base: "rapport/contrats-ram", fixed: { type: "realises" } },
    filters: ["chantier_id", "soustraitant_id"],
  },
  r5: {
    badge: "R5", title: "Cessions mensuelles par période",
    desc:  "Montants cédés regroupés par mois et famille RAM",
    excel: { base: "rapport/cessions-ram", fixed: { groupBy: "periode" } },
    filters: ["chantier_id", "soustraitant_id", "annee"],
  },
  r6: {
    badge: "R6", title: "Cessions mensuelles par STT",
    desc:  "Montants cédés regroupés par sous-traitant et famille RAM",
    excel: { base: "rapport/cessions-ram", fixed: { groupBy: "stt" } },
    filters: ["chantier_id", "soustraitant_id", "annee"],
  },
  r7: {
    badge: "R7", title: "Règlements réalisés",
    desc:  "Décomptes payés — base de référence des règlements effectifs",
    excel: { base: "rapport/reglements-realises" },
    filters: ["chantier_id", "soustraitant_id", "date_debut", "date_fin"],
  },
  r8: {
    badge: "R8", title: "Règlements en instance",
    desc:  "Décomptes en circuit de validation, en attente de paiement",
    excel: { base: "rapport/reglements-instance" },
    filters: ["chantier_id", "soustraitant_id", "statut_circuit"],
  },
};

// Valeurs initiales des filtres
const FILTER_INIT = {
  chantier_id:     "",
  soustraitant_id: "",
  annee:           new Date().getFullYear().toString(),
  date_debut:      "",
  date_fin:        "",
  statut_circuit:  "",
};

// Construire l'URL d'export avec tous les filtres actifs
function buildExcelUrl(config, filters) {
  const qs = new URLSearchParams();
  // Params fixes du rapport (type, groupBy)
  if (config.excel.fixed) {
    Object.entries(config.excel.fixed).forEach(([k, v]) => qs.set(k, v));
  }
  // Filtres utilisateur (seulement ceux déclarés dans config.filters)
  config.filters.forEach(key => {
    const paramKey = key === "statut_circuit" ? "statut" : key;
    const val = filters[key];
    if (val) qs.set(paramKey, val);
  });
  const q = qs.toString();
  return `${API_BASE}/${config.excel.base}${q ? "?" + q : ""}`;
}

// ─── Panneau de filtres ───────────────────────────────────────────────────────
const STATUT_CIRCUIT_OPTIONS = [
  { value: "soumis",      label: "Soumis (en attente DACC)" },
  { value: "valide_dacc", label: "Validé DACC (en attente DEX)" },
  { value: "valide_dex",  label: "Validé DEX (en attente DGA)" },
  { value: "valide_dga",  label: "Validé DGA (en attente DG)" },
  { value: "valide_dg",   label: "Validé DG (en attente paiement)" },
];

function FilterPanel({ filterKeys, filters, onChange }) {
  const { data: dCh }  = useChantiersPaginated({ count: 200 });
  const { data: dStt } = useSousTraitantsPaginated({ count: 200 });
  const chantiers = dCh?.data  ?? [];
  const stts      = dStt?.data ?? [];

  const activeCount = filterKeys.filter(k => filters[k] && filters[k] !== "").length;

  function reset() {
    const cleared = {};
    filterKeys.forEach(k => { cleared[k] = k === "annee" ? new Date().getFullYear().toString() : ""; });
    onChange(cleared);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-600">Filtres</span>
        {activeCount > 0 && (
          <span className="text-xs bg-[#087F3E] text-white px-2 py-0.5 rounded-full font-semibold">{activeCount} actif{activeCount > 1 ? "s" : ""}</span>
        )}
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <X size={11} /> Réinitialiser
          </button>
        )}
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        {filterKeys.includes("chantier_id") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Chantier</label>
            <div className="relative">
              <select
                value={filters.chantier_id}
                onChange={e => onChange({ chantier_id: e.target.value })}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
              >
                <option value="">Tous les chantiers</option>
                {chantiers.map(c => <option key={c.id} value={c.id}>{c.designation}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {filterKeys.includes("soustraitant_id") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sous-traitant</label>
            <div className="relative">
              <select
                value={filters.soustraitant_id}
                onChange={e => onChange({ soustraitant_id: e.target.value })}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
              >
                <option value="">Tous les sous-traitants</option>
                {stts.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {filterKeys.includes("annee") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Année</label>
            <input
              type="number"
              value={filters.annee}
              onChange={e => onChange({ annee: e.target.value })}
              min="2020" max="2099"
              className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
        )}

        {filterKeys.includes("date_debut") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={filters.date_debut}
              onChange={e => onChange({ date_debut: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
        )}

        {filterKeys.includes("date_fin") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={filters.date_fin}
              onChange={e => onChange({ date_fin: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
        )}

        {filterKeys.includes("statut_circuit") && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Étape de validation</label>
            <div className="relative">
              <select
                value={filters.statut_circuit}
                onChange={e => onChange({ statut_circuit: e.target.value })}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
              >
                <option value="">Toutes les étapes</option>
                {STATUT_CIRCUIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
      <Loader2 size={18} className="animate-spin" /> Chargement…
    </div>
  );
}

function RamNote() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
      <Info size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-700">
        Vue simplifiée — le détail par famille RAM (RH / Matériaux / Matériel) est disponible dans l'export Excel.
      </p>
    </div>
  );
}

function TableFoot({ cols, totals }) {
  return (
    <tfoot>
      <tr className="bg-[#E8F5EE] border-t-2 border-[#087F3E]">
        {totals.map((cell, i) => (
          <td key={i} className="px-4 py-3 font-bold text-sm">
            {cell}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

// ─── R1 : Budget par chantier ─────────────────────────────────────────────────
function ViewR1({ filters }) {
  const { data: dCh, isLoading: lCh } = useChantiersPaginated({ count: 500 });
  const { data: dCo, isLoading: lCo } = useContratsPaginated({ count: 5000 });
  const chantiers = dCh?.data ?? [];
  const contrats  = dCo?.data ?? [];

  const rows = useMemo(() => chantiers
    .filter(ch => !filters.chantier_id || ch.id == filters.chantier_id)
    .map(ch => {
      const budget = parseFloat(ch.budget_sous_traitance ?? 0);
      const engage = contrats
        .filter(c => c.chantier_id === ch.id && c.statut !== "annule")
        .reduce((s, c) => s + parseFloat(c.montant_actuel ?? c.montant_initial ?? 0), 0);
      const pct = budget > 0 ? Math.round(engage / budget * 100) : 0;
      return { id: ch.id, nom: ch.designation, budget, engage, reste: budget - engage, pct };
    })
    .filter(r => r.budget > 0)
    .sort((a, b) => b.budget - a.budget),
  [chantiers, contrats, filters]);

  if (lCh || lCo) return <LoadingState />;

  const totB = rows.reduce((s, r) => s + r.budget, 0);
  const totE = rows.reduce((s, r) => s + r.engage, 0);

  return (
    <div className="space-y-4">
      <RamNote />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Chantier", "Budget STT", "Engagé (contrats)", "Reste", "% Engagé"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && <tr><td colSpan={5} className="text-center text-sm text-gray-400 py-12">Aucune donnée</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">{r.nom}</td>
                <td className="px-4 py-3"><MoneyDisplay amount={r.budget} variant="small" /></td>
                <td className="px-4 py-3"><MoneyDisplay amount={r.engage} variant="small" className="font-semibold" /></td>
                <td className="px-4 py-3">
                  <MoneyDisplay amount={r.reste} variant="small"
                    className={r.reste < 0 ? "text-red-600 font-semibold" : "text-[#087F3E] font-semibold"} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.pct > 100 ? "bg-red-500" : r.pct > 80 ? "bg-amber-500" : "bg-[#087F3E]"}`}
                        style={{ width: `${Math.min(100, r.pct)}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-8 ${r.pct > 100 ? "text-red-600" : r.pct > 80 ? "text-amber-600" : "text-[#087F3E]"}`}>{r.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <TableFoot totals={[
              <span className="text-gray-900">TOTAL</span>,
              <MoneyDisplay amount={totB} variant="small" />,
              <MoneyDisplay amount={totE} variant="small" />,
              <MoneyDisplay amount={totB - totE} variant="small" className="text-[#087F3E]" />,
              <span className="text-[#087F3E]">{totB > 0 ? `${Math.round(totE / totB * 100)}%` : "—"}</span>,
            ]} />
          )}
        </table>
      </div>
    </div>
  );
}

// ─── R2 / R3 / R4 : Contrats ─────────────────────────────────────────────────
function ViewContrats({ filters, statuts, label }) {
  const { data, isLoading } = useContratsPaginated({ count: 5000 });
  const contrats = data?.data ?? [];

  const rows = useMemo(() => contrats
    .filter(c => statuts.includes(c.statut))
    .filter(c => !filters.chantier_id     || c.chantier_id    == filters.chantier_id)
    .filter(c => !filters.soustraitant_id || c.soustraitant_id == filters.soustraitant_id)
    .sort((a, b) => (a.chantier?.designation ?? "").localeCompare(b.chantier?.designation ?? "")),
  [contrats, statuts, filters]);

  if (isLoading) return <LoadingState />;

  const total = rows.reduce((s, c) => s + parseFloat(c.montant_actuel ?? c.montant_initial ?? 0), 0);

  return (
    <div className="space-y-4">
      <RamNote />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">{rows.length} contrat{rows.length !== 1 ? "s" : ""} — {label}</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Contrat", "Chantier", "Sous-traitant", "Montant (FCFA)", "Statut"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && <tr><td colSpan={5} className="text-center text-sm text-gray-400 py-12">Aucun contrat</td></tr>}
            {rows.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-mono font-semibold text-[#087F3E]">{c.code}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.objet}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.chantier?.designation ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.soustraitant?.raison_sociale ?? "—"}</td>
                <td className="px-4 py-3">
                  <MoneyDisplay amount={parseFloat(c.montant_actuel ?? c.montant_initial ?? 0)} variant="small" className="font-semibold" />
                </td>
                <td className="px-4 py-3"><StatusBadge statut={c.statut} /></td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <TableFoot totals={[
              <span className="text-gray-900" colSpan={3}>TOTAL</span>, "", "",
              <MoneyDisplay amount={total} variant="small" className="text-[#087F3E]" />,
              "",
            ]} />
          )}
        </table>
      </div>
    </div>
  );
}

// ─── R5 / R6 : Cessions ──────────────────────────────────────────────────────
function ViewCessions({ filters, groupBy }) {
  const { data, isLoading } = useEtatsCessionPaginated({ count: 5000 });
  const etats = data?.data ?? [];

  const { rows, total } = useMemo(() => {
    const filtered = etats.filter(e => {
      if (filters.chantier_id     && e.contrat?.chantier?.id    != filters.chantier_id)     return false;
      if (filters.soustraitant_id && e.contrat?.soustraitant?.id != filters.soustraitant_id) return false;
      if (filters.annee           && e.periode_debut             && !e.periode_debut.startsWith(filters.annee)) return false;
      return true;
    });

    const groups = {};
    filtered.forEach(e => {
      const key = groupBy === "stt"
        ? (e.contrat?.soustraitant?.raison_sociale ?? "—")
        : (e.periode_debut ? e.periode_debut.slice(0, 7) : "—");
      if (!groups[key]) groups[key] = { label: key, montant: 0, nb: 0 };
      groups[key].montant += parseFloat(e.montant_total ?? 0);
      groups[key].nb++;
    });

    const rows  = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
    const total = rows.reduce((s, r) => s + r.montant, 0);
    return { rows, total };
  }, [etats, filters, groupBy]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <RamNote />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {[groupBy === "stt" ? "Sous-traitant" : "Période", "Nb états", "Montant cédé (FCFA)", "Part"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!rows.length && <tr><td colSpan={4} className="text-center text-sm text-gray-400 py-12">Aucune cession trouvée</td></tr>}
            {rows.map(r => (
              <tr key={r.label} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">{r.label}</td>
                <td className="px-4 py-3 text-center text-gray-600">{r.nb}</td>
                <td className="px-4 py-3"><MoneyDisplay amount={r.montant} variant="small" className="font-semibold" /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{total > 0 ? `${Math.round(r.montant / total * 100)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <TableFoot totals={[
              <span className="text-gray-900">TOTAL</span>,
              <span className="text-center block">{rows.reduce((s, r) => s + r.nb, 0)}</span>,
              <MoneyDisplay amount={total} variant="small" className="text-[#087F3E]" />,
              <span className="text-[#087F3E] font-bold">100%</span>,
            ]} />
          )}
        </table>
      </div>
    </div>
  );
}

// ─── R7 : Règlements réalisés ─────────────────────────────────────────────────
function ViewR7({ filters }) {
  const { data, isLoading } = useDecomptesPaginated({ count: 5000 });
  const decomptes = data?.data ?? [];

  const rows = useMemo(() => decomptes
    .filter(d => d.statut === "paye")
    .filter(d => !filters.chantier_id     || d.contrat?.chantier?.id    == filters.chantier_id)
    .filter(d => !filters.soustraitant_id || d.contrat?.soustraitant?.id == filters.soustraitant_id)
    .filter(d => {
      if (!filters.date_debut && !filters.date_fin) return true;
      const dt = d.updated_at ? new Date(d.updated_at) : null;
      if (!dt) return false;
      if (filters.date_debut && dt < new Date(filters.date_debut)) return false;
      if (filters.date_fin   && dt > new Date(filters.date_fin + "T23:59:59")) return false;
      return true;
    })
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
  [decomptes, filters]);

  if (isLoading) return <LoadingState />;

  const total = rows.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600">{rows.length} règlement{rows.length !== 1 ? "s" : ""} réalisé{rows.length !== 1 ? "s" : ""}</p>
        <MoneyDisplay amount={total} variant="small" className="font-bold text-[#087F3E]" />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Décompte", "Chantier", "Sous-traitant", "Montant HT", "Montant TTC", "Date paiement"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {!rows.length && <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-12">Aucun règlement réalisé</td></tr>}
          {rows.map(d => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-mono font-semibold text-gray-900">{d.code}</p>
                <p className="text-xs text-gray-400">N°{d.numero}</p>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{d.contrat?.chantier?.designation    ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{d.contrat?.soustraitant?.raison_sociale ?? "—"}</td>
              <td className="px-4 py-3"><MoneyDisplay amount={d.montant_ht  ?? 0} variant="small" /></td>
              <td className="px-4 py-3"><MoneyDisplay amount={d.montant_ttc ?? 0} variant="small" className="font-semibold" /></td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {d.updated_at ? new Date(d.updated_at).toLocaleDateString("fr-FR") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <TableFoot totals={[
            <span className="text-gray-900" colSpan={3}>TOTAL</span>, "", "",
            <MoneyDisplay amount={total} variant="small" className="text-[#087F3E]" />,
            "", "",
          ]} />
        )}
      </table>
    </div>
  );
}

// ─── R8 : Règlements en instance ─────────────────────────────────────────────
function ViewR8({ filters }) {
  const { data, isLoading } = useDecomptesPaginated({ count: 5000 });
  const decomptes = data?.data ?? [];

  const ETAPE_LABEL = {
    soumis:      "Soumis — DACC",
    valide_dacc: "Validé DACC — DEX",
    valide_dex:  "Validé DEX — DGA",
    valide_dga:  "Validé DGA — DG",
    valide_dg:   "Validé DG — paiement",
  };

  const rows = useMemo(() => {
    const statuts = filters.statut_circuit ? [filters.statut_circuit] : STATUTS_CIRCUIT;
    return decomptes
      .filter(d => statuts.includes(d.statut))
      .filter(d => !filters.chantier_id     || d.contrat?.chantier?.id    == filters.chantier_id)
      .filter(d => !filters.soustraitant_id || d.contrat?.soustraitant?.id == filters.soustraitant_id)
      .sort((a, b) => new Date(a.date_echeance ?? a.created_at) - new Date(b.date_echeance ?? b.created_at));
  }, [decomptes, filters]);

  if (isLoading) return <LoadingState />;

  const total = rows.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          <p className="text-xs font-semibold text-amber-700">
            {rows.length} décompte{rows.length !== 1 ? "s" : ""} en attente de paiement
          </p>
        </div>
        <MoneyDisplay amount={total} variant="small" className="font-bold text-amber-600" />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Décompte", "Chantier", "Sous-traitant", "Montant HT", "Étape en cours", "Échéance"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {!rows.length && <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-12">Aucun règlement en instance</td></tr>}
          {rows.map(d => {
            const echeance = d.date_echeance ? new Date(d.date_echeance) : null;
            const isLate   = echeance && echeance < new Date();
            return (
              <tr key={d.id} className="hover:bg-amber-50/30">
                <td className="px-4 py-3">
                  <p className="font-mono font-semibold text-gray-900">{d.code}</p>
                  <p className="text-xs text-gray-400">N°{d.numero}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{d.contrat?.chantier?.designation    ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{d.contrat?.soustraitant?.raison_sociale ?? "—"}</td>
                <td className="px-4 py-3"><MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="font-semibold" /></td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {ETAPE_LABEL[d.statut] ?? d.statut}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {echeance
                    ? <span className={`text-xs font-semibold ${isLate ? "text-red-600" : "text-gray-600"}`}>{isLate ? "⚠ " : ""}{echeance.toLocaleDateString("fr-FR")}</span>
                    : <span className="text-gray-400 text-xs">—</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
        {rows.length > 0 && (
          <TableFoot totals={[
            <span className="text-gray-900">TOTAL</span>, "", "",
            <MoneyDisplay amount={total} variant="small" className="text-amber-600" />,
            "", "",
          ]} />
        )}
      </table>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function RapportDetailPage() {
  const { rapportId } = useParams();
  const navigate      = useNavigate();

  const config = RAPPORT_CONFIG[rapportId];

  // Initialiser les filtres selon les clés déclarées dans le config
  const [filters, setFilters] = useState(() => {
    if (!config) return {};
    const init = {};
    config.filters.forEach(k => { init[k] = FILTER_INIT[k] ?? ""; });
    return init;
  });

  function handleFilterChange(patch) {
    setFilters(prev => ({ ...prev, ...patch }));
  }

  if (!config) {
    return (
      <div className="text-center py-20 text-gray-500">
        Rapport introuvable.{" "}
        <button onClick={() => navigate("/rapports")} className="text-[#087F3E] underline">Retour</button>
      </div>
    );
  }

  function handleDownload() {
    window.open(buildExcelUrl(config, filters), "_blank");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        subtitle={config.desc}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/rapports")}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft size={14} /> Retour
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[#087F3E] text-white hover:bg-[#065A2C] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={14} /> Télécharger Excel
            </button>
          </div>
        }
      />

      <FilterPanel
        filterKeys={config.filters}
        filters={filters}
        onChange={handleFilterChange}
      />

      {rapportId === "r1" && <ViewR1 filters={filters} />}
      {rapportId === "r2" && <ViewContrats filters={filters} statuts={["actif","suspendu","termine","cloture"]} label="Contrats validés" />}
      {rapportId === "r3" && <ViewContrats filters={filters} statuts={["actif"]} label="Contrats engagés" />}
      {rapportId === "r4" && <ViewContrats filters={filters} statuts={["actif","termine","cloture"]} label="Prestations réalisées" />}
      {rapportId === "r5" && <ViewCessions filters={filters} groupBy="periode" />}
      {rapportId === "r6" && <ViewCessions filters={filters} groupBy="stt" />}
      {rapportId === "r7" && <ViewR7 filters={filters} />}
      {rapportId === "r8" && <ViewR8 filters={filters} />}
    </div>
  );
}
