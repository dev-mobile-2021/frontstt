import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, ChevronLeft, ChevronRight, RotateCcw, FileText, Clock, CheckCircle2, AlertTriangle, UserCheck } from "lucide-react";
import { useDecomptes } from "../context/DecomptesContext";
import { useUser } from "../context/UserContext";
import { contrats } from "../data/contrats";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";

const PAGE_SIZE = 8;

const STATUTS = ["Brouillon", "En validation", "Approuvé", "Payé", "Rejeté"];
const TYPES   = ["provisoire", "final", "definitif_general", "restitution_rg_partielle", "restitution_rg_totale"];

function KpiCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function getContratCode(contratId) {
  return contrats.find(c => c.id === contratId)?.code || contratId;
}

export default function DecomptesListPage() {
  const { decomptes } = useDecomptes();
  const { currentUser } = useUser();
  const navigate = useNavigate();

  const [search, setSearch]       = useState("");
  const [statut, setStatut]       = useState("");
  const [type, setType]           = useState("");
  const [contratF, setContratF]   = useState("");
  const [monRole, setMonRole]     = useState(false);
  const [page, setPage]           = useState(1);

  // KPIs
  const totalPaye = useMemo(() =>
    decomptes.filter(d => d.statut === "Payé").reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0), [decomptes]);
  const enValidationCount = decomptes.filter(d => d.statut === "En validation").length;
  const rejeteCount = decomptes.filter(d => d.statut === "Rejeté").length;
  const brouillonCount = decomptes.filter(d => d.statut === "Brouillon").length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return decomptes.filter(d => {
      const cCode = getContratCode(d.contratId).toLowerCase();
      if (q && !d.code.toLowerCase().includes(q) && !cCode.includes(q)) return false;
      if (statut && d.statut !== statut) return false;
      if (type && d.type !== type) return false;
      if (contratF && d.contratId !== contratF) return false;
      if (monRole && d.validationEtape?.profilEnAttente !== currentUser?.roleId) return false;
      return true;
    });
  }, [search, statut, type, contratF, monRole, decomptes, currentUser]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function reset() {
    setSearch(""); setStatut(""); setType(""); setContratF(""); setMonRole(false); setPage(1);
  }
  function handleFilter() { setPage(1); }

  const hasFilter = search || statut || type || contratF || monRole;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Décomptes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} décompte{filtered.length > 1 ? "s" : ""} · {decomptes.length} au total
          </p>
        </div>
        <button
          onClick={() => navigate("/decomptes/nouveau")}
          className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          Nouveau décompte
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={CheckCircle2} label="Total payé (net HT)" value={new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(totalPaye) + " FCFA"} color="bg-[#087F3E]" sub={`${decomptes.filter(d => d.statut === "Payé").length} décomptes payés`} />
        <KpiCard icon={Clock} label="En cours de validation" value={enValidationCount} color="bg-amber-400" sub="En attente de signature" />
        <KpiCard icon={FileText} label="Brouillons" value={brouillonCount} color="bg-blue-500" sub="Non encore soumis" />
        <KpiCard icon={AlertTriangle} label="Rejetés" value={rejeteCount} color="bg-red-500" sub="À corriger" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un code décompte ou contrat…"
              value={search}
              onChange={e => { setSearch(e.target.value); handleFilter(); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>

          <select
            value={statut}
            onChange={e => { setStatut(e.target.value); handleFilter(); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={type}
            onChange={e => { setType(e.target.value); handleFilter(); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30"
          >
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>

          <select
            value={contratF}
            onChange={e => { setContratF(e.target.value); handleFilter(); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30"
          >
            <option value="">Tous les contrats</option>
            {contrats.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>

          <button
            onClick={() => { setMonRole(v => !v); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${monRole ? "bg-[#087F3E] text-white border-[#087F3E]" : "border-gray-200 text-gray-600 hover:border-[#087F3E] hover:text-[#087F3E]"}`}
            title="Afficher uniquement les décomptes en attente de votre validation"
          >
            <UserCheck size={14} />
            Mon rôle
          </button>

          {hasFilter && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors"
            >
              <RotateCcw size={13} />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contrat</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Net HT</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Étape</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                  Aucun décompte ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            ) : paginated.map(dec => (
              <tr
                key={dec.id}
                onClick={() => navigate(`/decomptes/${dec.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5">
                  <span className="font-mono text-sm font-semibold text-gray-900">{dec.code}</span>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{getContratCode(dec.contratId)}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    dec.type === "définitif"
                      ? "bg-purple-50 text-purple-700 border border-purple-100"
                      : "bg-blue-50 text-blue-700 border border-blue-100"
                  }`}>
                    {dec.type.charAt(0).toUpperCase() + dec.type.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(dec.dateDebut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  {" — "}
                  {new Date(dec.dateFin).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <MoneyDisplay amount={dec.montantsCalcules?.net_ht || 0} />
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge statut={dec.statut} />
                </td>
                <td className="px-5 py-3.5 text-center">
                  {dec.validationEtape?.total > 0 ? (
                    <span className="text-xs text-gray-500">
                      {dec.validationEtape.actuelle}/{dec.validationEtape.total}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${
                    n === page
                      ? "bg-[#087F3E] text-white font-semibold"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
