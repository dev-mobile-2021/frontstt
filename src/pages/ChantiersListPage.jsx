import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, MapPin, User, Building2, Plus, X, ChevronLeft, ChevronRight, Loader2, RefreshCw, Info } from "lucide-react";
import { useChantiersPaginated, useSaveChantier } from "../hooks/useChantiers";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

const STATUTS = [
  { value: "actif",    label: "En cours" },
  { value: "suspendu", label: "Suspendu" },
  { value: "termine",  label: "Terminé" },
  { value: "cloture",  label: "Clôturé" },
];

const INIT = {
  designation: "", localisation: "", description: "",
  date_debut: "", date_fin_prevue: "",
  budget_total: "", budget_sous_traitance: "",
};

function ProgressBar({ pct, color = "bg-[#087F3E]" }) {
  const p = Math.min(100, Math.max(0, pct || 0));
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function ChantierCard({ chantier, onClick }) {
  const contrats   = chantier.contrats ?? [];
  const nbContrats = contrats.length;
  const sttEngage  = contrats.reduce((s, c) => s + (c.montant_actuel ?? 0), 0);
  const budgetTotal = chantier.budget_total ?? 0;
  const sttPct     = budgetTotal > 0 ? Math.round((sttEngage / budgetTotal) * 100) : 0;

  return (
    <div onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#087F3E] hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-gray-400 font-mono">{chantier.code}</span>
          <h3 className="text-sm font-bold text-gray-900 mt-0.5 group-hover:text-[#087F3E] transition-colors line-clamp-2">
            {chantier.designation}
          </h3>
        </div>
        <StatusBadge statut={chantier.statut} />
      </div>

      {/* Localisation */}
      {chantier.localisation && (
        <div className="flex items-start gap-1.5 text-xs text-gray-500">
          <MapPin size={11} className="flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{chantier.localisation}</span>
        </div>
      )}

      {/* Responsable */}
      {(chantier.chef_projet || chantier.conducteur_travaux) && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <User size={11} className="flex-shrink-0 text-gray-400" />
          <span className="font-medium">{chantier.chef_projet || chantier.conducteur_travaux}</span>
        </div>
      )}

      {/* STT engagé */}
      <div className="space-y-1 pt-1 border-t border-gray-100">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">STT engagé</span>
          <span className={`font-semibold ${sttPct > 90 ? "text-amber-600" : "text-[#087F3E]"}`}>{sttPct}%</span>
        </div>
        <ProgressBar pct={sttPct} color={sttPct > 90 ? "bg-amber-400" : "bg-[#087F3E]"} />
        <div className="flex justify-between text-xs text-gray-400">
          <MoneyDisplay amount={sttEngage} variant="small" />
          <MoneyDisplay amount={budgetTotal} variant="small" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
        <span>{nbContrats} contrat{nbContrats !== 1 ? "s" : ""} STT</span>
        {chantier.localisation && (
          <span className="text-gray-400 truncate max-w-[120px] text-right">
            {chantier.localisation.split(/[,—\-]/)[0].trim()}
          </span>
        )}
      </div>
    </div>
  );
}

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

export default function ChantiersListPage() {
  const navigate    = useNavigate();
  const { addToast } = useToast();
  const saveMut     = useSaveChantier();

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

  const filters = { designation: debounced || undefined, statut: statut || undefined, page, count: 15 };
  const { data, isLoading, isError } = useChantiersPaginated(filters);
  const chantiers  = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }
  function openModal() { setForm(INIT); setErrors({}); setShowModal(true); }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.designation.trim()) errs.designation = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await saveMut.mutateAsync({
        designation:           form.designation.trim(),
        localisation:          form.localisation || null,
        description:           form.description  || null,
        date_debut:            form.date_debut   || null,
        date_fin_prevue:       form.date_fin_prevue || null,
        budget_sous_traitance: form.budget_sous_traitance ? parseFloat(form.budget_sous_traitance) : null,
        statut: "actif",
      });
      addToast("Chantier créé.", "success");
      setShowModal(false);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la création.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chantiers"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} chantier${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <button onClick={openModal}
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
            <Plus size={16} /> Nouveau chantier
          </button>
        }
      />

      {/* Sync banner */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3">
        <Info size={14} className="text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500 flex-1">
          Référentiel synchronisé depuis Sage X3 Projets
          {chantiers[0]?.synced_at ? (
            <> · Dernière synchronisation : {new Date(chantiers[0].synced_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
          ) : null}
        </p>
        <button
          onClick={() => addToast("Synchronisation Sage X3 non disponible en mode démo.", "info")}
          className="inline-flex items-center gap-1.5 text-xs text-[#087F3E] border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors font-medium">
          <RefreshCw size={12} /> Synchroniser depuis Sage X3
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Nom, code, région, directeur ou conducteur de travaux…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
          </div>
          <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setStatut(""); setPage(1); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
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
          Impossible de charger les chantiers.
        </div>
      ) : chantiers.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          <Building2 size={32} className="mx-auto mb-3 text-gray-300" />
          Aucun chantier ne correspond aux filtres.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {chantiers.map(c => (
              <ChantierCard key={c.id} chantier={c} onClick={() => navigate(`/chantiers/${c.id}`)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-between px-5 py-3">
              <p className="text-xs text-gray-500">
                Page {meta.current_page} / {meta.last_page} — {meta.total} résultat{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
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

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">Nouveau chantier</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Désignation" required>
                <input value={form.designation} onChange={e => set("designation", e.target.value)}
                  className={`${INPUT} ${errors.designation ? "border-red-400" : ""}`}
                  placeholder="Nom du chantier" />
                {errors.designation && <p className="text-xs text-red-500 mt-1">{errors.designation}</p>}
              </Field>

              <Field label="Localisation">
                <input value={form.localisation} onChange={e => set("localisation", e.target.value)}
                  className={INPUT} placeholder="Ville, région…" />
              </Field>

              <Field label="Description">
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  rows={2} className={INPUT} placeholder="Description optionnelle" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de début">
                  <input type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)} className={INPUT} />
                </Field>
                <Field label="Date de fin prévue">
                  <input type="date" value={form.date_fin_prevue} onChange={e => set("date_fin_prevue", e.target.value)} className={INPUT} />
                </Field>
              </div>

              <Field label="Budget S/T HT (FCFA)">
                <input type="number" min="0" value={form.budget_sous_traitance} onChange={e => set("budget_sous_traitance", e.target.value)}
                  className={INPUT} placeholder="0" />
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
