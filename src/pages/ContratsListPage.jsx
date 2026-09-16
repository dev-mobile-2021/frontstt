import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Fragment } from "react";
import {
  Search, RotateCcw, ChevronLeft, ChevronRight, Plus, Eye, X, Loader2,
  FileText, FileSpreadsheet, ChevronDown, ChevronRight as ChevronRightIcon,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useContratsPaginated, useSaveContrat } from "../hooks/useContrats";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";
import { formatMontantCourt, formatDate } from "../utils/formatters";

const STATUTS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "actif",     label: "Actif" },
  { value: "suspendu",  label: "Suspendu" },
  { value: "resilie",   label: "Résilié" },
  { value: "termine",   label: "Terminé" },
  { value: "cloture",   label: "Clôturé" },
];

const TYPES = [
  { value: "forfait",       label: "Forfait" },
  { value: "serie_de_prix", label: "Série de prix" },
  { value: "regie",         label: "Régie" },
];

const AVENANT_STATUT_COLORS = {
  brouillon: "bg-gray-100 text-gray-500",
  valide:    "bg-violet-100 text-violet-700",
};

const INIT = {
  chantier_id: "", soustraitant_id: "",
  objet: "", type_contrat: "",
  montant_initial: "", date_debut: "", date_fin_prevue: "",
};

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]";

export default function ContratsListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const saveMut      = useSaveContrat();

  const [search,    setSearch]    = useState("");
  const [statut,    setStatut]    = useState("");
  const [page,      setPage]      = useState(1);
  const [debounced, setDebounced] = useState("");
  const [expanded,  setExpanded]  = useState({});
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(INIT);
  const [errors,    setErrors]    = useState({});

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = { code: debounced || undefined, statut: statut || undefined, page, count: 15 };
  const { data, isLoading, isError } = useContratsPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  const { data: chantiersData } = useChantiersPaginated({ count: 100 });
  const chantiers = chantiersData?.data ?? [];

  const { data: sttData } = useSousTraitantsPaginated({ count: 100, statut: "actif" });
  const sousTraitants = sttData?.data ?? [];

  function reset()    { setSearch(""); setStatut(""); setPage(1); }
  function set(k, v)  { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }
  function openModal(){ setForm(INIT); setErrors({}); setShowModal(true); }

  function toggleExpand(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }

  function exportExcel() {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    window.open(`${API_BASE}/excel/contrats?${params.toString()}`, "_blank");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.chantier_id)           errs.chantier_id      = "Requis";
    if (!form.soustraitant_id)       errs.soustraitant_id  = "Requis";
    if (!form.objet.trim())          errs.objet            = "Requis";
    if (!form.montant_initial)       errs.montant_initial  = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const created = await saveMut.mutateAsync({
        chantier_id:     parseInt(form.chantier_id),
        soustraitant_id: parseInt(form.soustraitant_id),
        objet:           form.objet.trim(),
        type_contrat:    form.type_contrat  || null,
        montant_initial: parseFloat(form.montant_initial),
        date_debut:      form.date_debut      || null,
        date_fin_prevue: form.date_fin_prevue || null,
        statut: "brouillon",
      });
      addToast("Contrat créé.", "success");
      setShowModal(false);
      if (created?.data?.id) navigate(`/contrats/${created.data.id}`);
    } catch {
      addToast("Erreur lors de la création.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrats"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} contrat${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
          >
            <Plus size={16} /> Nouveau contrat
          </button>
        }
      />

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Rechercher par code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilter && (
            <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
          <button onClick={exportExcel}
            className="ml-auto flex items-center gap-1.5 text-sm text-[#087F3E] border border-[#087F3E] px-3 py-2 rounded-lg hover:bg-[#E8F5EE] transition-colors">
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les contrats.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Code", "Chantier", "Sous-traitant", "Objet", "Montant actualisé", "Validation", "Réalisé", "À réaliser", "Projets avenants"].map(h => (
                  <th key={h} className={`text-xs uppercase tracking-wide font-medium text-gray-500 px-4 py-3.5
                    ${["Montant actualisé","Réalisé","À réaliser"].includes(h) ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileText size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucun contrat ne correspond aux filtres.</p>
                  </td>
                </tr>
              ) : rows.map(c => {
                const realise    = parseFloat(c.montant_realise ?? 0);
                const contracte  = parseFloat(c.montant_actuel ?? c.montant_initial ?? 0);
                const aRealiser  = contracte - realise;
                const pct        = contracte > 0 ? Math.min(100, Math.round((realise / contracte) * 100)) : 0;
                const isModified = c.montant_actuel != null && c.montant_actuel !== c.montant_initial;
                const hasAvenants = (c.avenants ?? []).length > 0;
                const isOpen     = expanded[c.id] && hasAvenants;

                return (
                  <Fragment key={c.id}>
                    <tr onClick={() => navigate(`/contrats/${c.id}`)}
                      className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold font-mono text-gray-900">{c.code}</span>
                        {c.type_contrat && <p className="text-xs text-gray-400 mt-0.5">{c.type_contrat}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-700 truncate max-w-[150px]">{c.chantier?.designation ?? "—"}</p>
                        {c.chantier?.code && <p className="text-xs font-mono text-gray-400">{c.chantier.code}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-700 truncate max-w-[140px]">{c.soustraitant?.raison_sociale ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <p className="text-sm text-gray-800 truncate">{c.objet}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <MoneyDisplay amount={contracte} variant="small" className={isModified ? "text-violet-600 font-semibold" : ""} />
                        {isModified && (
                          <p className="text-xs text-gray-400 mt-0.5">init. {formatMontantCourt(parseFloat(c.montant_initial ?? 0))}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge statut={c.statut} /></td>
                      <td className="px-4 py-3.5 text-right">
                        {realise > 0 ? (
                          <>
                            <MoneyDisplay amount={realise} variant="small" className="text-[#087F3E] font-semibold" />
                            <div className="flex items-center gap-1.5 mt-1 justify-end">
                              <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{pct}%</span>
                            </div>
                          </>
                        ) : <span className="text-xs text-gray-400">0%</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <MoneyDisplay amount={Math.abs(aRealiser)} variant="small"
                          className={aRealiser < 0 ? "text-red-600 font-semibold" : "text-gray-700"} />
                        {aRealiser < 0 && <p className="text-xs text-red-400 mt-0.5">Dépassement</p>}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {hasAvenants ? (
                            <>
                              <button onClick={() => toggleExpand(c.id)}
                                className="p-0.5 rounded text-gray-400 hover:text-[#087F3E] transition-colors">
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                              </button>
                              <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                {c.avenants.length} avenant{c.avenants.length > 1 ? "s" : ""}
                              </span>
                            </>
                          ) : <span className="text-xs text-gray-300 ml-5">—</span>}
                          <Link to={`/contrats/${c.id}`}
                            className="ml-auto p-1 rounded text-gray-300 hover:text-[#087F3E] transition-colors opacity-0 group-hover:opacity-100">
                            <Eye size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>

                    {isOpen && c.avenants.map(a => (
                      <tr key={`avn-${a.id}`} className="bg-violet-50/40 border-l-2 border-violet-200">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-violet-300">↳</span>
                            <span className="text-xs font-mono font-medium text-violet-600">{a.code}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-xs text-gray-500 italic" colSpan={2}>{a.objet}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`text-xs font-semibold ${parseFloat(a.montant) >= 0 ? "text-violet-700" : "text-red-600"}`}>
                            {parseFloat(a.montant) >= 0 ? "+" : ""}{formatMontantCourt(parseFloat(a.montant))}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AVENANT_STATUT_COLORS[a.statut] ?? "bg-gray-100 text-gray-500"}`}>
                            {a.statut}
                          </span>
                        </td>
                        <td className="px-4 py-2" colSpan={3}>
                          {a.date_signature && <span className="text-xs text-gray-400">{formatDate(a.date_signature)}</span>}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Page {meta.current_page} / {meta.last_page} — {meta.total} résultat{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${n === page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-200 text-gray-600"}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal création ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">Nouveau contrat</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Chantier" required>
                <select value={form.chantier_id} onChange={e => set("chantier_id", e.target.value)}
                  className={`${INPUT} ${errors.chantier_id ? "border-red-400" : ""}`}>
                  <option value="">— Sélectionner un chantier —</option>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.designation} ({c.code})</option>)}
                </select>
                {errors.chantier_id && <p className="text-xs text-red-500 mt-1">{errors.chantier_id}</p>}
              </Field>

              <Field label="Sous-traitant" required>
                <select value={form.soustraitant_id} onChange={e => set("soustraitant_id", e.target.value)}
                  className={`${INPUT} ${errors.soustraitant_id ? "border-red-400" : ""}`}>
                  <option value="">— Sélectionner un sous-traitant —</option>
                  {sousTraitants.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
                </select>
                {errors.soustraitant_id && <p className="text-xs text-red-500 mt-1">{errors.soustraitant_id}</p>}
              </Field>

              <Field label="Objet du contrat" required>
                <input value={form.objet} onChange={e => set("objet", e.target.value)}
                  className={`${INPUT} ${errors.objet ? "border-red-400" : ""}`}
                  placeholder="Description de la prestation" />
                {errors.objet && <p className="text-xs text-red-500 mt-1">{errors.objet}</p>}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Type de contrat">
                  <select value={form.type_contrat} onChange={e => set("type_contrat", e.target.value)} className={INPUT}>
                    <option value="">— Type —</option>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Montant initial HT (FCFA)" required>
                  <input type="number" min="0" value={form.montant_initial} onChange={e => set("montant_initial", e.target.value)}
                    className={`${INPUT} ${errors.montant_initial ? "border-red-400" : ""}`} placeholder="0" />
                  {errors.montant_initial && <p className="text-xs text-red-500 mt-1">{errors.montant_initial}</p>}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de début">
                  <input type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)} className={INPUT} />
                </Field>
                <Field label="Date de fin prévue">
                  <input type="date" value={form.date_fin_prevue} onChange={e => set("date_fin_prevue", e.target.value)} className={INPUT} />
                </Field>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saveMut.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {saveMut.isPending && <Loader2 size={14} className="animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
