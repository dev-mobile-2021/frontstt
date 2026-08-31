import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, MapPin, User, TrendingUp } from "lucide-react";
import { chantiers } from "../data/chantiers";
import { contrats } from "../data/contrats";
import { useDecomptes } from "../context/DecomptesContext";
import { computeEngageSTT } from "../utils/chantierMetrics";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import SyncBadge from "../components/SyncBadge";
import { SkeletonCard } from "../components/Skeleton";

const REGIONS  = [...new Set(chantiers.map(c => c.region))].sort();
const STATUTS  = ["En cours", "Clôturé", "Suspendu"];

// Barre pour le taux d'ENGAGEMENT BUDGÉTAIRE : vert sain, orange alerte, rouge dépassement
function BudgetProgressBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct));
  const color = pct > 100
    ? "bg-red-500"
    : pct > 80
    ? "bg-amber-400"
    : "bg-[#087F3E]";
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

// Barre pour l'AVANCEMENT PHYSIQUE : plus c'est haut, mieux c'est
function AvancementBar({ value }) {
  const p = Math.min(100, Math.max(0, value));
  const color = p >= 75 ? "bg-[#087F3E]" : p >= 40 ? "bg-[#10A651]" : "bg-[#10A651]/60";
  return (
    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function ChantierCard({ chantier, engageSTT, onClick }) {
  const pctEngage = chantier.budget > 0
    ? Math.round((engageSTT / chantier.budget) * 100)
    : 0;

  const pctLabel = pctEngage > 100
    ? "text-red-600 font-bold"
    : pctEngage > 80
    ? "text-amber-600 font-semibold"
    : "text-[#087F3E] font-semibold";

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#087F3E] hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-gray-400 font-mono">{chantier.code}</span>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5 group-hover:text-[#087F3E] transition-colors line-clamp-2">
            {chantier.nom}
          </h3>
        </div>
        <StatusBadge statut={chantier.statut} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin size={11} className="flex-shrink-0" />
        {chantier.localisation}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <User size={11} className="flex-shrink-0" />
        <span className="font-medium text-gray-600">{chantier.directeurTravaux?.nom}</span>
        <span className="text-gray-300">·</span>
        <span>{chantier.directeurTravaux?.telephone}</span>
      </div>

      {/* Budget engagé (STT calculé) */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">STT engagé</span>
          <span className={pctLabel}>{pctEngage}%{pctEngage > 100 ? " ⚠ dépassement" : ""}</span>
        </div>
        <BudgetProgressBar pct={pctEngage} />
        <div className="flex justify-between text-xs text-gray-400">
          <MoneyDisplay amount={engageSTT} variant="small" />
          <MoneyDisplay amount={chantier.budget} variant="small" />
        </div>
      </div>

      {/* Avancement physique */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1 text-gray-400">
            <TrendingUp size={10} /> Avancement physique
          </span>
          <span className="text-gray-500 font-medium">{chantier.avancement}%</span>
        </div>
        <AvancementBar value={chantier.avancement} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
        <span>{contrats.filter(c => c.chantierId === chantier.id).length || 0} contrat{(contrats.filter(c => c.chantierId === chantier.id).length || 0) > 1 ? "s" : ""} STT</span>
        <span className="text-gray-300">{chantier.region}</span>
      </div>
    </div>
  );
}

export default function ChantiersListPage() {
  const { decomptes } = useDecomptes();
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [statut,  setStatut]  = useState("");
  const [region,  setRegion]  = useState("");

  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return chantiers.filter(c => {
      if (q && ![
        c.nom, c.code, c.localisation, c.region,
        c.directeurTravaux?.nom, c.conducteurTravaux?.nom,
      ].some(v => v?.toLowerCase().includes(q))) return false;
      if (statut && c.statut !== statut) return false;
      if (region && c.region !== region) return false;
      return true;
    });
  }, [search, statut, region]);

  // Calcul engage STT dynamique pour chaque chantier visible
  const filteredWithEngage = useMemo(() =>
    filtered.map(c => ({ chantier: c, engageSTT: computeEngageSTT(c, decomptes, contrats) })),
    [filtered]
  );

  const hasFilter = search || statut || region;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chantiers"
        subtitle="Suivi des chantiers CSE"
        action={
          <SyncBadge
            source="Sage X3 Projets"
            initialSync="20/08/2026 à 06:00"
            resultMessage={`Synchronisation terminée — ${chantiers.length} élément(s) à jour, 0 nouveau(x).`}
          />
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Nom, code, région, directeur ou conducteur de travaux…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select value={statut} onChange={e => setStatut(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Toutes les régions</option>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setStatut(""); setRegion(""); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filteredWithEngage.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          Aucun chantier ne correspond aux filtres.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredWithEngage.map(({ chantier, engageSTT }) => (
            <ChantierCard
              key={chantier.id}
              chantier={chantier}
              engageSTT={engageSTT}
              onClick={() => navigate(`/chantiers/${chantier.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
