import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, MapPin, User, Building2 } from "lucide-react";
import { useChantiersPaginated } from "../hooks/useChantiers";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

const STATUTS = [
  { value: "actif",    label: "Actif" },
  { value: "suspendu", label: "Suspendu" },
  { value: "termine",  label: "Terminé" },
  { value: "cloture",  label: "Clôturé" },
];

function BudgetBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct));
  const color = pct > 90 ? "bg-amber-400" : "bg-[#087F3E]";
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function ChantierCard({ chantier, onClick }) {
  const pct = chantier.budget_total > 0
    ? Math.round((chantier.budget_sous_traitance / chantier.budget_total) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#087F3E] hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-gray-400 font-mono">{chantier.code}</span>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5 group-hover:text-[#087F3E] transition-colors line-clamp-2">
            {chantier.designation}
          </h3>
        </div>
        <StatusBadge statut={chantier.statut} />
      </div>

      {chantier.localisation && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin size={11} className="flex-shrink-0" />
          {chantier.localisation}
        </div>
      )}

      {chantier.chef_projet && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <User size={11} className="flex-shrink-0" />
          <span className="font-medium text-gray-600">{chantier.chef_projet}</span>
        </div>
      )}

      <div className="space-y-1 pt-1 border-t border-gray-100">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Budget S/T</span>
          <span className="text-[#087F3E] font-semibold">{pct}%</span>
        </div>
        <BudgetBar pct={pct} />
        <div className="flex justify-between text-xs text-gray-400">
          <MoneyDisplay amount={chantier.budget_sous_traitance} variant="small" />
          <MoneyDisplay amount={chantier.budget_total} variant="small" />
        </div>
      </div>
    </div>
  );
}

export default function ChantiersListPage() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState("");
  const [statut, setStatut]   = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = {
    designation: debounced || undefined,
    statut:      statut    || undefined,
    count: 60,
  };

  const { data, isLoading, isError } = useChantiersPaginated(filters);
  const chantiers = data?.data ?? [];
  const total     = data?.metadata?.total ?? 0;
  const hasFilter = search || statut;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chantiers"
        subtitle={isLoading ? "Chargement…" : `${total} chantier${total !== 1 ? "s" : ""}`}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Nom, code ou localisation…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select
            value={statut}
            onChange={e => setStatut(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilter && (
            <button
              onClick={() => { setSearch(""); setStatut(""); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors"
            >
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les chantiers. Vérifiez la connexion au serveur.
        </div>
      ) : chantiers.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          <Building2 size={32} className="mx-auto mb-3 text-gray-300" />
          Aucun chantier ne correspond aux filtres.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {chantiers.map(c => (
            <ChantierCard
              key={c.id}
              chantier={c}
              onClick={() => navigate(`/chantiers/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
