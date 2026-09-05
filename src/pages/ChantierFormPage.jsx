import { useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, ChevronDown, Calendar, MapPin, FileText, Hash, HardHat, ExternalLink } from "lucide-react";
import { useChantier } from "../hooks/useChantiers";
import { useContratsPaginated } from "../hooks/useContrats";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

function InfoChip({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-gray-400 flex-shrink-0" />
      <span className="text-gray-500">{label} :</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function RoleChip({ badge, label, nom, color = "gray" }) {
  const colors = {
    green: "bg-[#E8F5EE] text-[#065A2C] border-[#b5ddc8]",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    gray:  "bg-gray-50 text-gray-700 border-gray-200",
  };
  if (!nom) return null;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[color]}`}>
      <HardHat size={15} className="flex-shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${colors[color]}`}>{badge}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <div className="text-sm font-semibold mt-0.5">{nom}</div>
      </div>
    </div>
  );
}

function BudgetKPI({ label, amount, highlight }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <MoneyDisplay
        amount={amount ?? 0}
        className={`text-base font-bold ${highlight ? "text-[#087F3E]" : "text-gray-900"}`}
      />
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
    statut: statut || undefined,
    count: 100,
  });

  const contrats = data?.data ?? [];

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function pct(realise, actuel) {
    if (!actuel) return 0;
    return Math.min(100, Math.round((realise / actuel) * 100));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={statut}
          onChange={e => setStatut(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
        >
          {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-gray-400">{contrats.length} contrat(s)</span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-8 px-3 py-3" />
              {["Code", "Sous-traitant", "Objet", "Montant actualisé", "Statut", "Réalisé", "À réaliser", "Avenants", ""].map(h => (
                <th key={h} className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Montant actualisé" || h === "Réalisé" || h === "À réaliser" ? "text-right" : h === "Statut" || h === "Avenants" ? "text-center" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>
            )}
            {!isLoading && contrats.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun contrat pour ce chantier</td></tr>
            )}
            {contrats.map(c => {
              const realise    = c.montant_realise ?? 0;
              const actuel     = c.montant_actuel  ?? 0;
              const aRealiser  = actuel - realise;
              const p          = pct(realise, actuel);
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
                    <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{c.soustraitant?.raison_sociale ?? "—"}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[180px] truncate">{c.objet ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <MoneyDisplay amount={actuel} className="text-sm font-semibold text-gray-900" />
                      {c.montant_initial !== actuel && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Initial : <MoneyDisplay amount={c.montant_initial} variant="muted" />
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge statut={c.statut} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <MoneyDisplay amount={realise} className="text-sm font-semibold text-[#087F3E]" />
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1 ml-auto">
                        <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${p}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{p}%</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <MoneyDisplay
                        amount={Math.abs(aRealiser)}
                        className={`text-sm font-semibold ${aRealiser < 0 ? "text-red-600" : "text-gray-700"}`}
                      />
                      {aRealiser < 0 && <p className="text-xs text-red-400 mt-0.5">Dépassement</p>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {hasAvenant ? (
                        <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">
                          {c.avenants.length} avenant{c.avenants.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => navigate(`/contrats/${c.id}`)}
                        className="text-gray-400 hover:text-[#087F3E]"
                        title="Ouvrir"
                      >
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
                        <MoneyDisplay
                          amount={a.montant}
                          sign={a.montant >= 0 ? "+" : "-"}
                          variant="small"
                          className={a.montant >= 0 ? "text-[#087F3E]" : "text-red-600"}
                        />
                      </td>
                      <td className="px-3 py-2 text-center" colSpan={3}>
                        <StatusBadge statut={a.statut} />
                      </td>
                      <td className="px-3 py-2" colSpan={2} />
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

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ChantierFormPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("contrats");

  const { data: chantier, isLoading, isError } = useChantier(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
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

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  const tabs = [
    { id: "contrats",  label: "Contrats de sous-traitance", icon: FileText },
    { id: "decomptes", label: "Décomptes",                  icon: Hash },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate("/chantiers")}
          className="hover:text-[#087F3E] flex items-center gap-1 transition-colors"
        >
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

      {/* Info band */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <InfoChip icon={Calendar} label="Début"              value={fmtDate(chantier.date_debut)} />
          <InfoChip icon={Calendar} label="Fin prévisionnelle" value={fmtDate(chantier.date_fin_prevue)} />
          {dureeJours && <InfoChip icon={Calendar} label="Durée" value={`${dureeJours} jours`} />}
          {chantier.localisation && <InfoChip icon={MapPin} label="Localisation" value={chantier.localisation} />}
          {chantier.code_x3 && <InfoChip icon={FileText} label="Code X3" value={chantier.code_x3} />}
        </div>
      </div>

      {/* Responsables */}
      {(chantier.chef_projet || chantier.conducteur_travaux) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Responsables du chantier</h3>
          <div className="grid grid-cols-2 gap-3">
            <RoleChip
              badge="CT"
              label="Conducteur de Travaux"
              nom={chantier.conducteur_travaux}
              color="amber"
            />
            <RoleChip
              badge="CP"
              label="Chef de Projet"
              nom={chantier.chef_projet}
              color="green"
            />
          </div>
        </div>
      )}

      {/* Budget KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <BudgetKPI label="Budget total"          amount={chantier.budget_total}          />
        <BudgetKPI label="Budget S/T"            amount={chantier.budget_sous_traitance} highlight />
        <BudgetKPI label="Budget personnel"      amount={chantier.budget_personnel}      />
        <BudgetKPI label="Budget matériel"       amount={chantier.budget_materiel}       />
        <BudgetKPI label="Budget fournitures"    amount={chantier.budget_fournitures}    />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-5">
          {activeTab === "contrats"  && <TabContrats chantierId={id} />}
          {activeTab === "decomptes" && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="font-medium text-gray-500">Décomptes</p>
              <p className="text-xs mt-1 text-gray-400">Module en cours de connexion — disponible prochainement.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
