import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, RotateCcw, Package, Truck, Users, Plus } from "lucide-react";
import { useEtatsCession } from "../context/EtatsCessionContext";
import { useContrats } from "../context/ContratsContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import PageHeader from "../components/PageHeader";
import KPICard from "../components/KPICard";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { formatDate, formatMontantCourt } from "../utils/formatters";
import { getTotalValorise } from "../utils/etatCessionMetrics";

const chantierMap = Object.fromEntries(chantiers.map(c => [c.id, c]));
const sttMap = Object.fromEntries(sousTraitants.map(s => [s.id, s]));
const STATUTS_GLOBAUX = ["Ouvert", "En contrôle", "Arrêté"];
const CAT_ICONS = { MTX: Package, MTL: Truck, RH: Users };

function isMoisCourant(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function EtatsCessionListPage() {
  const { etats } = useEtatsCession();
  const { contrats } = useContrats();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const contratMap = useMemo(() => Object.fromEntries(contrats.map(c => [c.id, c])), [contrats]);

  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [contratFilter, setContratFilter] = useState(searchParams.get("contratId") || "");
  const [chantierFilter, setChantierFilter] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const rows = useMemo(() => etats.map(e => ({
    etat: e,
    contrat: contratMap[e.contratId],
    chantier: chantierMap[e.chantierId],
    stt: sttMap[contratMap[e.contratId]?.sousTraitantId],
    total: ["MTX", "MTL", "RH"].reduce((s, cat) => s + (e.sections[cat]?.totalValorise || 0), 0),
  })), [etats, contratMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(({ etat, contrat, stt }) => {
      if (q && ![etat.code, contrat?.code, stt?.raisonSociale].some(v => v?.toLowerCase().includes(q))) return false;
      if (statut && etat.statutGlobal !== statut) return false;
      if (contratFilter && etat.contratId !== contratFilter) return false;
      if (chantierFilter && etat.chantierId !== chantierFilter) return false;
      if (dateDebut && etat.periodeFin < dateDebut) return false;
      if (dateFin && etat.periodeDebut > dateFin) return false;
      return true;
    }).sort((a, b) => b.etat.periodeDebut.localeCompare(a.etat.periodeDebut));
  }, [rows, search, statut, contratFilter, chantierFilter, dateDebut, dateFin]);

  const nOuverts = etats.filter(e => e.statutGlobal === "Ouvert").length;
  const nEnControle = etats.filter(e => e.statutGlobal === "En contrôle").length;
  const nArretesNonConsommes = etats.filter(e => e.statutGlobal === "Arrêté" && (e.decomptesConsommateurs || []).length === 0).length;
  const totalPeriodeCourante = getTotalValorise(etats.filter(e => isMoisCourant(e.periodeDebut)));

  const hasFilter = search || statut || contratFilter || chantierFilter || dateDebut || dateFin;
  function resetFilters() {
    setSearch(""); setStatut(""); setContratFilter(""); setChantierFilter(""); setDateDebut(""); setDateFin("");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="États de cession" subtitle="Arrêtés périodiques MTX/MTL/RH, contrôlés et visés, consommés par les décomptes" />

      <div className="grid grid-cols-4 gap-4">
        <KPICard icon={Package} label="États ouverts" value={nOuverts} />
        <KPICard icon={Package} label="États en contrôle" value={nEnControle} />
        <KPICard icon={Package} label="Arrêtés non consommés" value={nArretesNonConsommes} />
        <KPICard icon={Package} label="Total valorisé (mois courant)" value={formatMontantCourt(totalPeriodeCourante)} />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => navigate("/etats-cession/nouveau")}
          className="flex items-center gap-1.5 text-sm bg-[#087F3E] text-white px-4 py-2 rounded-lg hover:bg-[#065A2C] transition-colors"
        >
          <Plus size={14} /> Nouvel état de cession
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Code, contrat, sous-traitant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select value={statut} onChange={e => setStatut(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS_GLOBAUX.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={contratFilter} onChange={e => setContratFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les contrats</option>
            {contrats.filter(c => c.baremeCessions).map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <select value={chantierFilter} onChange={e => setChantierFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les chantiers</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30" />
          {hasFilter && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code", "Contrat", "Chantier", "Sous-traitant", "Période", "MTX", "MTL", "RH", "Statut global", "Total"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-sm text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun état de cession ne correspond aux filtres.
                </td>
              </tr>
            ) : filtered.map(({ etat, contrat, chantier, stt, total }) => (
              <tr key={etat.id} onClick={() => navigate(`/etats-cession/${etat.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 whitespace-nowrap">{etat.code}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{contrat?.code || "—"}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{chantier?.nom || "—"}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{stt?.raisonSociale || "—"}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(etat.periodeDebut)} → {formatDate(etat.periodeFin)}</td>
                {["MTX", "MTL", "RH"].map(cat => {
                  const section = etat.sections[cat];
                  const Icon = CAT_ICONS[cat];
                  return (
                    <td key={cat} className="px-4 py-3 whitespace-nowrap">
                      {section?.statut === "Non renseignée" ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Icon size={12} className="text-gray-400" />
                          <StatusBadge statut={section.statut} />
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3"><StatusBadge statut={etat.statutGlobal} /></td>
                <td className="px-4 py-3"><MoneyDisplay amount={total} variant="small" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
