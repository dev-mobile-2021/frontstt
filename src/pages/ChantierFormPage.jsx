import { useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, ChevronDown, Calendar, MapPin, FileText, Hash,
  ExternalLink, RefreshCw, Info, Users, Wrench, Package, Truck, Layers, Building2,
} from "lucide-react";
import { useChantier } from "../hooks/useChantiers";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

const fmt = n => n == null ? "—" : new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// ─── Circuit terrain card ────────────────────────────────────────────────────
function RoleCard({ badge, role, level, nom, color }) {
  const colors = {
    amber: { wrap: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800 border-amber-300" },
    green: { wrap: "bg-[#E8F5EE] border-[#b5ddc8]", badge: "bg-[#d4edd9] text-[#065A2C] border-[#b5ddc8]" },
  };
  const c = colors[color] ?? colors.amber;
  if (!nom) return null;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${c.wrap}`}>
      <div className={`flex-shrink-0 px-2 py-1 rounded border text-xs font-bold ${c.badge}`}>{badge}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{role} — {level}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{nom}</p>
      </div>
    </div>
  );
}

// ─── Budget par famille ──────────────────────────────────────────────────────
function BudgetFamille({ icon: Icon, label, depense, budget, color }) {
  const pct = budget > 0 ? Math.round((depense / budget) * 100) : 0;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-700">{label}</span>
          <span className="text-xs font-semibold text-gray-500">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{fmt(depense)} engagé</span>
          <span>{fmt(budget)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Contrats ────────────────────────────────────────────────────────────
const STATUT_OPTIONS = [
  { value: "",          label: "Tous les statuts" },
  { value: "actif",     label: "En cours" },
  { value: "brouillon", label: "Brouillon" },
  { value: "suspendu",  label: "Suspendu" },
  { value: "resilie",   label: "Résilié" },
  { value: "termine",   label: "Terminé" },
  { value: "cloture",   label: "Clôturé" },
];

function TabContrats({ chantierId }) {
  const navigate = useNavigate();
  const [statut, setStatut]     = useState("");
  const [expanded, setExpanded] = useState({});

  const { data, isLoading } = useContratsPaginated({
    chantier_id: Number(chantierId),
    statut:      statut || undefined,
    count:       100,
  });

  const contrats = data?.data ?? [];

  function toggle(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={statut} onChange={e => setStatut(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]">
          {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">{contrats.length} contrat(s)</span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-8 px-3 py-3" />
              {["Code", "Sous-traitant", "Objet", "Montant HT", "Statut"].map(h => (
                <th key={h} className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Montant HT" ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>
            )}
            {!isLoading && contrats.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun contrat pour ce chantier</td></tr>
            )}
            {contrats.map(c => {
              const hasAvenant = c.avenants?.length > 0;
              const isOpen     = expanded[c.id];
              return (
                <Fragment key={c.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-center">
                      {hasAvenant && (
                        <button onClick={() => toggle(c.id)} className="text-gray-400 hover:text-gray-700">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[#087F3E] font-semibold whitespace-nowrap">{c.code}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{c.soustraitant?.raison_sociale ?? "—"}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[200px] truncate">{c.objet ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <MoneyDisplay amount={c.montant_actuel ?? c.montant_initial ?? 0} className="text-sm font-semibold text-gray-900" />
                    </td>
                    <td className="px-3 py-3"><StatusBadge statut={c.statut} /></td>
                    <td className="px-3 py-3">
                      <button onClick={() => navigate(`/contrats/${c.id}`)} className="text-gray-400 hover:text-[#087F3E]" title="Ouvrir">
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                  {isOpen && c.avenants?.map(a => (
                    <tr key={a.id} className="bg-violet-50/40 border-t border-violet-100">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2">
                        <span className="text-gray-300 mr-1 text-xs">↳</span>
                        <span className="font-mono text-xs text-violet-600">{a.code}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 italic" colSpan={2}>{a.objet}</td>
                      <td className="px-3 py-2 text-right">
                        <MoneyDisplay amount={a.montant} sign={a.montant >= 0 ? "+" : "-"} variant="small"
                          className={a.montant >= 0 ? "text-[#087F3E]" : "text-red-600"} />
                      </td>
                      <td className="px-3 py-2"><StatusBadge statut={a.statut} /></td>
                      <td className="px-3 py-2" />
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab Décomptes récents ───────────────────────────────────────────────────
function TabDecomptes({ chantierId }) {
  const navigate = useNavigate();
  const { data, isLoading } = useDecomptesPaginated({ chantier_id: Number(chantierId), count: 20 });
  const decomptes = data?.data ?? [];

  const fmtPeriode = dec => {
    const ec = dec.etat_cession;
    if (!ec?.periode_debut) return "—";
    return new Date(ec.periode_debut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Code", "Sous-traitant", "Période", "Net HT", "Statut"].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Net HT" ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>
          )}
          {!isLoading && decomptes.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun décompte pour ce chantier</td></tr>
          )}
          {decomptes.map(d => (
            <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)}
              className="hover:bg-gray-50 cursor-pointer transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-[#087F3E] font-semibold">{d.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{d.contrat?.soustraitant?.raison_sociale ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{fmtPeriode(d)}</td>
              <td className="px-4 py-3 text-right">
                <MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="font-semibold text-gray-800" />
              </td>
              <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function ChantierFormPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("contrats");

  const { data: chantier, isLoading, isError } = useChantier(id);
  const { data: contratsData } = useContratsPaginated({ chantier_id: Number(id), count: 200 });
  const contrats = contratsData?.data ?? [];

  if (isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>;
  }
  if (isError || !chantier) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Chantier introuvable</p>
        <button onClick={() => navigate("/chantiers")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const dureeJours = chantier.date_debut && chantier.date_fin_prevue
    ? Math.round((new Date(chantier.date_fin_prevue) - new Date(chantier.date_debut)) / 86400000)
    : null;

  const sttEngage   = contrats.reduce((s, c) => s + (c.montant_actuel ?? 0), 0);
  const budgetTotal = chantier.budget_total ?? 0;
  const sttPct      = budgetTotal > 0 ? Math.round((sttEngage / budgetTotal) * 100) : 0;

  const familles = [
    { icon: Users,     label: "Personnel / Main d'œuvre",  depense: 0,         budget: chantier.budget_personnel ?? 0,      color: "bg-blue-100 text-blue-600" },
    { icon: Wrench,    label: "Matériel",                  depense: 0,         budget: chantier.budget_materiel ?? 0,       color: "bg-amber-100 text-amber-600" },
    { icon: Package,   label: "Matériaux & Fournitures",   depense: 0,         budget: chantier.budget_fournitures ?? 0,    color: "bg-orange-100 text-orange-600" },
    { icon: Truck,     label: "Transports",                depense: 0,         budget: 0,                                   color: "bg-teal-100 text-teal-600" },
    { icon: Layers,    label: "Services extérieurs",       depense: 0,         budget: chantier.budget_divers ?? 0,         color: "bg-violet-100 text-violet-600" },
    { icon: Building2, label: "Sous-traitants",            depense: sttEngage, budget: chantier.budget_sous_traitance ?? 0, color: "bg-[#E8F5EE] text-[#087F3E]" },
  ];
  const totalDepense = familles.reduce((s, f) => s + f.depense, 0);
  const totalBudget  = familles.reduce((s, f) => s + f.budget, 0);

  const tabs = [
    { id: "contrats",  label: `Contrats de sous-traitance${contrats.length > 0 ? ` (${contrats.length})` : ""}`, icon: FileText },
    { id: "decomptes", label: "Décomptes récents", icon: Hash },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/chantiers")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Chantiers
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{chantier.designation}</span>
      </div>

      <PageHeader
        title={`${chantier.code} — ${chantier.designation}`}
        subtitle={chantier.localisation || ""}
        action={<StatusBadge statut={chantier.statut} />}
      />

      {/* Sync banner */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3">
        <Info size={14} className="text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500 flex-1">
          Référentiel synchronisé depuis Sage X3 Projets
          {chantier.synced_at ? (
            <> · Dernière synchronisation : {new Date(chantier.synced_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
          ) : null}
        </p>
        <button onClick={() => addToast("Synchronisation Sage X3 non disponible en mode démo.", "info")}
          className="inline-flex items-center gap-1.5 text-xs text-[#087F3E] border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors font-medium">
          <RefreshCw size={12} /> Synchroniser depuis Sage X3
        </button>
      </div>

      {/* Info band */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {chantier.date_debut && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Début :</span>
              <span className="font-medium text-gray-800">{fmtDate(chantier.date_debut)}</span>
            </div>
          )}
          {chantier.date_fin_prevue && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Fin prévisionnelle :</span>
              <span className="font-medium text-gray-800">{fmtDate(chantier.date_fin_prevue)}</span>
            </div>
          )}
          {dureeJours && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Durée :</span>
              <span className="font-medium text-gray-800">{dureeJours} jours</span>
            </div>
          )}
          {chantier.localisation && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Région :</span>
              <span className="font-medium text-gray-800">{chantier.localisation.split(/[,—\-]/)[0].trim()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Circuit terrain */}
      {(chantier.conducteur_travaux || chantier.chef_projet) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Circuit terrain — responsables du chantier</h3>
            <p className="text-xs text-gray-400 mt-0.5">Avant circuit administratif (DACC → DEX → DGA → DG)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard badge="CT" role="Conducteur de Travaux" level="Niveau 1 (constat terrain)"
              nom={chantier.conducteur_travaux} color="amber" />
            <RoleCard badge="DT" role="Directeur de Travaux" level="Niveau 2 (direction technique)"
              nom={chantier.chef_projet} color="green" />
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Ces deux rôles valident en premier les décomptes de ce chantier, avant transmission au circuit administratif central.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Budget total",           value: fmt(budgetTotal),        sub: null,                     highlight: false },
          { label: "STT engagé (calculé)",   value: fmt(sttEngage),          sub: `${sttPct}% du budget`,   highlight: true  },
          { label: "En cours de validation", value: "—",                     sub: "décomptes soumis",        highlight: false },
          { label: "Avancement physique",    value: "—",                     sub: "données X3",             highlight: false },
          { label: "Contrats sous-trait.",   value: String(contrats.length), sub: null,                     highlight: false },
        ].map(({ label, value, sub, highlight }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-base font-bold ${highlight ? "text-[#087F3E]" : "text-gray-900"}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Budget par famille */}
      {totalBudget > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Budget par famille RAM</h3>
          {familles.filter(f => f.budget > 0 || f.depense > 0).map(f => (
            <BudgetFamille key={f.label} {...f} />
          ))}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 text-sm font-semibold text-gray-700">
            <span>Total</span>
            <span>{fmt(totalDepense)} engagé sur {fmt(totalBudget)}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-5">
          {activeTab === "contrats"  && <TabContrats chantierId={id} />}
          {activeTab === "decomptes" && <TabDecomptes chantierId={id} />}
        </div>
      </div>
    </div>
  );
}
