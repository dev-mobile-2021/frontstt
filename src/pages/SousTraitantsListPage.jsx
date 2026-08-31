import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { sousTraitants } from "../data/sous_traitants";
import { contrats } from "../data/contrats";
import { useDecomptes } from "../context/DecomptesContext";
import { computeMontantEngageSTT } from "../utils/sttMetrics";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import SyncBadge from "../components/SyncBadge";
import { SkeletonTable } from "../components/Skeleton";

const PAGE_SIZE = 8;
const SECTEURS = [...new Set(sousTraitants.map(s => s.secteurActivite))].sort();
const STATUTS  = ["Actif", "Suspendu", "Blacklisté"];

function Stars({ n }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} className={i <= n ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
      ))}
    </div>
  );
}

function getContratsStt(sttId) {
  return contrats.filter(c => c.sousTraitantId === sttId);
}

export default function SousTraitantsListPage() {
  const { decomptes } = useDecomptes();
  const navigate   = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [secteur, setSecteur] = useState("");
  const [statut,  setStatut]  = useState("");
  const [page,    setPage]    = useState(1);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sousTraitants.filter(s => {
      if (q && ![s.raisonSociale, s.sigle, s.ville, s.rccm, s.ninea].some(v => v?.toLowerCase().includes(q))) return false;
      if (secteur && s.secteurActivite !== secteur) return false;
      if (statut && s.statut !== statut) return false;
      return true;
    });
  }, [search, secteur, statut]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilter  = search || secteur || statut;

  function reset() { setSearch(""); setSecteur(""); setStatut(""); setPage(1); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sous-traitants"
        subtitle="Répertoire des entreprises sous-traitantes"
        action={
          <SyncBadge
            source="Sage X3 — Tiers fournisseurs"
            initialSync="19/08/2026 à 22:00"
            resultMessage={`Synchronisation terminée — ${sousTraitants.length} élément(s) à jour, 0 nouveau(x).`}
          />
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Raison sociale, sigle, ville, NINEA, RCCM…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select value={secteur} onChange={e => { setSecteur(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les secteurs</option>
            {SECTEURS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
          {hasFilter && (
            <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={6} cols={6} /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Raison sociale", "Secteur", "Contact", "Contrats", "Montant engagé", "Statut", "Notation"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14 text-gray-400 text-sm">Aucun sous-traitant correspondant</td></tr>
              ) : paginated.map(stt => {
                const cList = getContratsStt(stt.id);
                const actifs = cList.filter(c => c.statut === "En cours d'exécution").length;
                const montantEngage = computeMontantEngageSTT(stt.id, contrats, decomptes);
                return (
                  <tr key={stt.id} onClick={() => navigate(`/sous-traitants/${stt.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900">{stt.raisonSociale}</p>
                      <p className="text-xs text-gray-400">{stt.ninea}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{stt.secteurActivite}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-700">{stt.contact.nom}</p>
                      <p className="text-xs text-gray-400">{stt.contact.telephone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm font-semibold text-gray-900">{actifs}</span>
                      <span className="text-xs text-gray-400 ml-1">/ {cList.length}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <MoneyDisplay amount={montantEngage} variant="small" />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge statut={stt.statut} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Stars n={stt.notation || 0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} sur {filtered.length}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16}/></button>
                {Array.from({length: totalPages}, (_,i) => i+1).map(n => (
                  <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 text-sm rounded transition-colors ${n===page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-100 text-gray-600"}`}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16}/></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
