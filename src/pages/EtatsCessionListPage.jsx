import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ChevronLeft, ChevronRight, Plus, X, Loader2, FileText, FileSpreadsheet } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useEtatsCessionPaginated, useSaveEtatCession } from "../hooks/useEtatsCession";
import { useContratsPaginated } from "../hooks/useContrats";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";

const STATUTS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "soumis",    label: "Soumis" },
  { value: "valide",    label: "Validé" },
  { value: "rejete",    label: "Rejeté" },
];

const INIT = { contrat_id: "", periode_debut: "", periode_fin: "", observations: "" };

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]";

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

export default function EtatsCessionListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const saveMut      = useSaveEtatCession();

  const [search,    setSearch]    = useState("");
  const [statut,    setStatut]    = useState("");
  const [page,      setPage]      = useState(1);
  const [debounced, setDebounced] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(INIT);
  const [errors,    setErrors]    = useState({});

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = { code: debounced || undefined, statut: statut || undefined, page, count: 15 };
  const { data, isLoading, isError } = useEtatsCessionPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  const { data: contratsData } = useContratsPaginated({ count: 200, statut: "actif" });
  const contrats = contratsData?.data ?? [];

  function reset()   { setSearch(""); setStatut(""); setPage(1); }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }

  function exportExcel() {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    window.open(`${API_BASE}/excel/etatscessions?${params.toString()}`, "_blank");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.contrat_id)    errs.contrat_id    = "Requis";
    if (!form.periode_debut) errs.periode_debut = "Requis";
    if (!form.periode_fin)   errs.periode_fin   = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const res = await saveMut.mutateAsync({
        contrat_id:    parseInt(form.contrat_id, 10),
        periode_debut: form.periode_debut,
        periode_fin:   form.periode_fin,
        observations:  form.observations || null,
      });
      addToast("État de cession créé.", "success");
      setShowModal(false);
      const newId = res?.data?.id;
      if (newId) navigate(`/etats-cession/${newId}`);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la création.", "error");
    }
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="États de cession"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} état${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => { setForm(INIT); setErrors({}); setShowModal(true); }}
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
          >
            <Plus size={16} /> Nouvel état de cession
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Rechercher par code état de cession…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
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
        <SkeletonTable rows={8} cols={6} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les états de cession.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Code", "Contrat / STT", "Chantier", "Période", "Montant total", "Statut"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <FileText size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucun état de cession ne correspond aux filtres.</p>
                  </td>
                </tr>
              ) : rows.map(e => (
                <tr key={e.id} onClick={() => navigate(`/etats-cession/${e.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors">
                  <td className="px-4 py-3.5"><span className="font-mono text-sm font-semibold text-gray-900">{e.code}</span></td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-mono text-gray-700">{e.contrat?.code ?? "—"}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{e.contrat?.soustraitant?.raison_sociale}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{e.contrat?.chantier?.designation ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {fmtDate(e.periode_debut)}{e.periode_fin ? ` → ${fmtDate(e.periode_fin)}` : ""}
                  </td>
                  <td className="px-4 py-3.5"><MoneyDisplay amount={e.montant_total ?? 0} variant="small" /></td>
                  <td className="px-4 py-3.5"><StatusBadge statut={e.statut} /></td>
                </tr>
              ))}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">Nouvel état de cession</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Contrat" required>
                <select value={form.contrat_id} onChange={e => set("contrat_id", e.target.value)}
                  className={`${INPUT} ${errors.contrat_id ? "border-red-400" : ""}`}>
                  <option value="">— Sélectionner un contrat —</option>
                  {contrats.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.soustraitant?.raison_sociale ?? "?"} / {c.chantier?.designation ?? "?"}
                    </option>
                  ))}
                </select>
                {errors.contrat_id && <p className="text-xs text-red-500 mt-1">{errors.contrat_id}</p>}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Période début" required>
                  <input type="date" value={form.periode_debut}
                    onChange={e => {
                      const v = e.target.value;
                      setForm(f => ({ ...f, periode_debut: v, periode_fin: f.periode_fin < v ? "" : f.periode_fin }));
                      setErrors(err => ({ ...err, periode_debut: undefined }));
                    }}
                    className={`${INPUT} ${errors.periode_debut ? "border-red-400" : ""}`} />
                  {errors.periode_debut && <p className="text-xs text-red-500 mt-1">{errors.periode_debut}</p>}
                </Field>
                <Field label="Période fin" required>
                  <input type="date" value={form.periode_fin} min={form.periode_debut || undefined}
                    onChange={e => set("periode_fin", e.target.value)}
                    className={`${INPUT} ${errors.periode_fin ? "border-red-400" : ""}`} />
                  {errors.periode_fin && <p className="text-xs text-red-500 mt-1">{errors.periode_fin}</p>}
                </Field>
              </div>

              <Field label="Observations">
                <textarea value={form.observations} onChange={e => set("observations", e.target.value)}
                  rows={2} className={INPUT} placeholder="Notes optionnelles…" />
              </Field>

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
