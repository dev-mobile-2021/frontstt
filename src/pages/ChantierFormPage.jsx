import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Calendar, User, Phone, MapPin, FileText, Hash, HardHat } from "lucide-react";
import { chantiers } from "../data/chantiers";
import { contrats } from "../data/contrats";
import { useDecomptes } from "../context/DecomptesContext";
import { sousTraitants } from "../data/sous_traitants";
import { computeEngageSTT, computeEnValidationSTT, computeBudgetFamilles } from "../utils/chantierMetrics";
import { getMontantActualise } from "../utils/contratMetrics";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import MoneyDisplay from "../components/MoneyDisplay";
import BudgetFamilleWidget from "../components/BudgetFamilleWidget";
import SyncBadge from "../components/SyncBadge";

const sttMap = Object.fromEntries(sousTraitants.map(s => [s.id, s]));
const contratMap = Object.fromEntries(contrats.map(c => [c.id, c]));

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-gray-400 flex-shrink-0" />
      <span className="text-gray-500">{label} :</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function RoleChip({ label, badge, nom, telephone, color = "gray" }) {
  const colors = {
    green:  "bg-[#E8F5EE] text-[#065A2C] border-[#b5ddc8]",
    amber:  "bg-amber-50 text-amber-800 border-amber-200",
    gray:   "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[color]}`}>
      <HardHat size={15} className="flex-shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${colors[color]}`}>{badge}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <div className="text-sm font-semibold mt-0.5">{nom || "—"}</div>
      </div>
      {telephone && (
        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{telephone}</span>
      )}
    </div>
  );
}

export default function ChantierFormPage() {
  const { decomptes } = useDecomptes();
  const { id }   = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("contrats");

  const chantier = useMemo(() => chantiers.find(c => c.id === id), [id]);

  const chantierContrats = useMemo(() =>
    contrats.filter(c => c.chantierId === chantier?.id), [chantier]);

  const chantierDecomptes = useMemo(() =>
    decomptes
      .filter(d => chantierContrats.some(c => c.id === d.contratId))
      .sort((a, b) => new Date(b.dateFin) - new Date(a.dateFin))
      .slice(0, 15),
    [chantierContrats]);

  const montantEngage = useMemo(() =>
    chantier ? computeEngageSTT(chantier, decomptes, contrats) : 0, [chantier, decomptes]);

  const montantEnValidation = useMemo(() =>
    chantier ? computeEnValidationSTT(chantier, decomptes, contrats) : 0, [chantier, decomptes]);

  const budgetFamillesCalc = useMemo(() =>
    chantier ? computeBudgetFamilles(chantier, decomptes, contrats) : [], [chantier, decomptes]);

  if (!chantier) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Chantier introuvable</p>
        <button onClick={() => navigate("/chantiers")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour</button>
      </div>
    );
  }

  const tabs = [
    { id: "contrats",  label: "Contrats de sous-traitance", icon: FileText, count: chantierContrats.length },
    { id: "decomptes", label: "Décomptes récents",          icon: Hash,     count: chantierDecomptes.length },
  ];

  const dureeJours = chantier.dateDebut && chantier.dateFinPrevisionnelle
    ? Math.round((new Date(chantier.dateFinPrevisionnelle) - new Date(chantier.dateDebut)) / 86400000)
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/chantiers")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Chantiers
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{chantier.nom}</span>
      </div>

      <PageHeader
        title={`${chantier.code} — ${chantier.nom}`}
        subtitle={chantier.localisation}
        action={<StatusBadge statut={chantier.statut} />}
      />

      {/* Badge référentiel Sage X3 */}
      <SyncBadge
        source="Sage X3 Projets"
        initialSync="20/08/2026 à 06:00"
        resultMessage="Synchronisation terminée — 1 élément à jour, 0 nouveau."
      />

      {/* Info band */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <InfoChip icon={Calendar} label="Début"                value={new Date(chantier.dateDebut).toLocaleDateString("fr-FR")} />
          <InfoChip icon={Calendar} label="Fin prévisionnelle"   value={new Date(chantier.dateFinPrevisionnelle).toLocaleDateString("fr-FR")} />
          {dureeJours && <InfoChip icon={Calendar} label="Durée" value={`${dureeJours} jours`} />}
          <InfoChip icon={MapPin}   label="Région"               value={chantier.region} />
        </div>
      </div>

      {/* Circuit terrain */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-700">Circuit terrain — responsables du chantier</h3>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-0.5">Avant circuit administratif (DACC → DEX → DGA → DG)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RoleChip
            badge="CT"
            label="Conducteur de Travaux — Niveau 1 (constat terrain)"
            nom={chantier.conducteurTravaux?.nom}
            telephone={chantier.conducteurTravaux?.telephone}
            color="amber"
          />
          <RoleChip
            badge="DT"
            label="Directeur de Travaux — Niveau 2 (direction technique)"
            nom={chantier.directeurTravaux?.nom}
            telephone={chantier.directeurTravaux?.telephone}
            color="green"
          />
        </div>
        <p className="text-xs text-gray-400 pt-1">
          Ces deux rôles valident en premier les décomptes de ce chantier, avant transmission au circuit administratif central.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Budget total",        value: <MoneyDisplay amount={chantier.budget} className="text-gray-900 font-bold text-base" /> },
          { label: "STT engagé (calculé)", value: <MoneyDisplay amount={montantEngage} className="text-[#087F3E] font-bold text-base" /> },
          { label: "En cours de validation", value: montantEnValidation > 0 ? <MoneyDisplay amount={montantEnValidation} className="text-amber-600 font-bold text-base" /> : <span className="text-gray-300">—</span> },
          { label: "Avancement physique",  value: `${chantier.avancement}%` },
          { label: "Contrats sous-trait.", value: chantierContrats.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <div className="text-base font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Budget RAM widget */}
      {budgetFamillesCalc.length > 0 && (
        <BudgetFamilleWidget familles={budgetFamillesCalc} />
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-5">

          {activeTab === "contrats" && (
            chantierContrats.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Aucun contrat rattaché.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Code", "Sous-traitant", "Objet", "Montant HT", "Statut"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chantierContrats.map(c => (
                    <tr key={c.id} onClick={() => navigate(`/contrats/${c.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.code}</td>
                      <td className="px-4 py-3 text-xs">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/sous-traitants/${c.sousTraitantId}`); }}
                          className="text-[#087F3E] underline hover:text-[#065A2C] transition-colors"
                        >
                          {sttMap[c.sousTraitantId]?.raisonSociale || c.sousTraitantId}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{c.objet}</td>
                      <td className="px-4 py-3"><MoneyDisplay amount={getMontantActualise(c)} variant="small" /></td>
                      <td className="px-4 py-3"><StatusBadge statut={c.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === "decomptes" && (
            chantierDecomptes.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Aucun décompte.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Code", "Sous-traitant", "Période", "Net HT", "Statut"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chantierDecomptes.map(d => {
                    const ctr = contratMap[d.contratId];
                    const stt = sttMap[ctr?.sousTraitantId];
                    return (
                      <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{d.code}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{stt?.raisonSociale || d.contratId}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(d.dateDebut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3"><MoneyDisplay amount={d.montantsCalcules?.net_ht || 0} variant="small" /></td>
                        <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}
