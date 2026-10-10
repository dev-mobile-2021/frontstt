import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, RotateCcw, ChevronLeft, ChevronRight, Users, Plus } from "lucide-react";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";
import SyncBadge from "../components/SyncBadge";
import AjouterX3Modal from "../components/AjouterX3Modal";
import { useAjouterDepuisX3 } from "../hooks/useX3Sync";
import SearchSelect from "../components/SearchSelect";

const fmtNum = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));

/** Nombre cliquable : mène à la liste des contrats du sous-traitant (désactivé si 0). */
function CountLink({ n, to }) {
  if (!n) return <span className="text-gray-300">0</span>;
  return (
    <Link to={to} onClick={e => e.stopPropagation()}
      className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#065A2C] text-sm font-semibold hover:bg-[#d4edd9] transition-colors">
      {n}
    </Link>
  );
}

const Montant = ({ v, strong, color }) => (
  <span className={`font-mono text-sm ${strong ? "font-semibold" : ""} ${color ?? (v ? "text-gray-800" : "text-gray-300")}`}>{fmtNum(v)}</span>
);

const STATUTS = [
  { value: "actif",      label: "Actif" },
  { value: "suspendu",   label: "Suspendu" },
  { value: "blackliste", label: "Blacklisté" },
];





export default function SousTraitantsListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const ajouterMut = useAjouterDepuisX3("soustraitant");

  const [search,    setSearch]    = useState("");
  const [statut,    setStatut]    = useState("");
  const [page,      setPage]      = useState(1);
  const [debounced, setDebounced] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = { raison_sociale: debounced || undefined, statut: statut || undefined, page, count: 15 };
  const { data, isLoading, isError } = useSousTraitantsPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  function reset()    { setSearch(""); setStatut(""); setPage(1); }
  function openModal() { setShowModal(true); }

  async function handleAjouter(code) {
    const item = await ajouterMut.mutateAsync(code);
    addToast(`Sous-traitant ajouté depuis Sage X3 : ${item?.designation ?? item?.raison_sociale ?? code}.`, "success");
    setShowModal(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sous-traitants"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} sous-traitant${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
          >
            <Plus size={16} /> Ajouter depuis Sage X3
          </button>
        }
      />

      {/* Synchronisation Sage X3 */}
      <SyncBadge module="soustraitants" label="Sous-traitants" invalidate={["soustraitants", "soustraitant"]} />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Raison sociale, NINEA, ville…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <SearchSelect
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </SearchSelect>
          {hasFilter && (
            <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={10} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les sous-traitants.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[1300px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  ["Raison sociale", "left"], ["Statut", "left"],
                  ["Contrat", "center"], ["Contrat en cours", "center"],
                  ["Total HT CT (contrats)", "right"], ["Total HT Avenant (avenants)", "right"], ["Total (contrats + avenants)", "right"],
                  ["Total décompte payé", "right"], ["Total décompte en attente", "right"], ["Décompte en cours", "right"],
                ].map(([h, align]) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-${align}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-gray-400 text-sm">
                    <Users size={28} className="mx-auto mb-2 text-gray-300" />
                    Aucun sous-traitant correspondant
                  </td>
                </tr>
              ) : rows.map(stt => (
                <tr key={stt.id} onClick={() => navigate(`/sous-traitants/${stt.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-gray-900">{stt.raison_sociale}</p>
                    {stt.forme_juridique && <p className="text-xs text-gray-400">{stt.forme_juridique}</p>}
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge statut={stt.statut} /></td>
                  <td className="px-4 py-3.5 text-center"><CountLink n={stt.nb_contrats} to={`/contrats?soustraitant_id=${stt.id}&statut=actif,termine,cloture`} /></td>
                  <td className="px-4 py-3.5 text-center"><CountLink n={stt.nb_contrats_en_cours} to={`/contrats?soustraitant_id=${stt.id}&statut=actif`} /></td>
                  <td className="px-4 py-3.5 text-right"><Montant v={stt.total_ht_contrats} /></td>
                  <td className="px-4 py-3.5 text-right"><Montant v={stt.total_ht_avenants} color={stt.total_ht_avenants ? "text-violet-700" : undefined} /></td>
                  <td className="px-4 py-3.5 text-right"><Montant v={stt.total_contrats_avenants} strong color={stt.total_contrats_avenants ? "text-[#065A2C]" : undefined} /></td>
                  <td className="px-4 py-3.5 text-right"><Montant v={stt.total_decomptes_payes} /></td>
                  <td className="px-4 py-3.5 text-right"><Montant v={stt.total_decomptes_en_attente} color={stt.total_decomptes_en_attente ? "text-amber-700" : undefined} /></td>
                  <td className="px-4 py-3.5 text-right"><Montant v={stt.total_decomptes_en_cours} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {meta.current_page} / {meta.last_page} — {meta.total} résultat{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-8 h-8 text-sm rounded transition-colors ${n === page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-100 text-gray-600"}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal création ── */}
      {showModal && (
        <AjouterX3Modal
          title="Ajouter un sous-traitant depuis Sage X3"
          label="Code sous-traitant Sage X3"
          placeholder="Ex. CSE-FL00004657"
          help="Le sous-traitant doit exister dans Sage X3. Il est récupéré avec sa raison sociale et ses chantiers ; les autres informations se renseignent ensuite dans sa fiche."
          pending={ajouterMut.isPending}
          onClose={() => setShowModal(false)}
          onSubmit={handleAjouter}
        />
      )}
    </div>
  );
}
