import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ChevronLeft, ChevronRight, Users, Plus, X, Loader2 } from "lucide-react";
import { useSousTraitantsPaginated, useSaveSousTraitant } from "../hooks/useSousTraitants";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";

const STATUTS = [
  { value: "actif",      label: "Actif" },
  { value: "suspendu",   label: "Suspendu" },
  { value: "blackliste", label: "Blacklisté" },
];

const FORMES = ["SARL", "SA", "SUARL", "GIE", "Entreprise individuelle", "Autre"];

const INIT = {
  raison_sociale: "", forme_juridique: "", ninea: "", registre_commerce: "",
  specialites: "", adresse: "", ville: "", telephone: "", email: "",
  site_web: "", contact_nom: "", contact_telephone: "", contact_email: "", code_x3: "",
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

export default function SousTraitantsListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const saveMut      = useSaveSousTraitant();

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

  const filters = { raison_sociale: debounced || undefined, statut: statut || undefined, page, count: 15 };
  const { data, isLoading, isError } = useSousTraitantsPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }
  function reset()    { setSearch(""); setStatut(""); setPage(1); }
  function openModal(){ setForm(INIT); setErrors({}); setShowModal(true); }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.raison_sociale.trim()) errs.raison_sociale = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      await saveMut.mutateAsync({
        raison_sociale:    form.raison_sociale.trim(),
        forme_juridique:   form.forme_juridique   || null,
        ninea:             form.ninea              || null,
        registre_commerce: form.registre_commerce  || null,
        specialites:       form.specialites        || null,
        adresse:           form.adresse            || null,
        ville:             form.ville              || null,
        telephone:         form.telephone          || null,
        email:             form.email              || null,
        site_web:          form.site_web           || null,
        contact_nom:       form.contact_nom        || null,
        contact_telephone: form.contact_telephone  || null,
        contact_email:     form.contact_email      || null,
        code_x3:           form.code_x3            || null,
        statut: "actif",
      });
      addToast("Sous-traitant créé.", "success");
      setShowModal(false);
    } catch {
      addToast("Erreur lors de la création.", "error");
    }
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
            <Plus size={16} /> Nouveau sous-traitant
          </button>
        }
      />

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
          <select
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilter && (
            <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les sous-traitants.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Raison sociale", "NINEA / RC", "Ville", "Contact", "Spécialités", "Statut"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-gray-400 text-sm">
                    <Users size={28} className="mx-auto mb-2 text-gray-300" />
                    Aucun sous-traitant correspondant
                  </td>
                </tr>
              ) : rows.map(stt => (
                <tr key={stt.id} onClick={() => navigate(`/sous-traitants/${stt.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-gray-900">{stt.raison_sociale}</p>
                    {stt.forme_juridique && <p className="text-xs text-gray-400">{stt.forme_juridique}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-mono text-gray-700">{stt.ninea || "—"}</p>
                    {stt.registre_commerce && <p className="text-xs text-gray-400">{stt.registre_commerce}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{stt.ville || "—"}</td>
                  <td className="px-5 py-3.5">
                    {stt.contact_nom && <p className="text-sm text-gray-700">{stt.contact_nom}</p>}
                    {stt.contact_telephone && <p className="text-xs text-gray-400">{stt.contact_telephone}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 max-w-[160px] truncate">{stt.specialites || "—"}</td>
                  <td className="px-5 py-3.5"><StatusBadge statut={stt.statut} /></td>
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">Nouveau sous-traitant</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identité</p>
                <Field label="Raison sociale" required>
                  <input value={form.raison_sociale} onChange={e => set("raison_sociale", e.target.value)}
                    className={`${INPUT} ${errors.raison_sociale ? "border-red-400" : ""}`}
                    placeholder="Nom de l'entreprise" />
                  {errors.raison_sociale && <p className="text-xs text-red-500 mt-1">{errors.raison_sociale}</p>}
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Forme juridique">
                    <select value={form.forme_juridique} onChange={e => set("forme_juridique", e.target.value)} className={INPUT}>
                      <option value="">— Sélectionner —</option>
                      {FORMES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                  <Field label="Spécialités">
                    <input value={form.specialites} onChange={e => set("specialites", e.target.value)}
                      className={INPUT} placeholder="Génie civil, électricité…" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="NINEA">
                    <input value={form.ninea} onChange={e => set("ninea", e.target.value)}
                      className={INPUT} placeholder="Numéro NINEA" />
                  </Field>
                  <Field label="Registre de commerce">
                    <input value={form.registre_commerce} onChange={e => set("registre_commerce", e.target.value)}
                      className={INPUT} placeholder="RC / RCCM" />
                  </Field>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Coordonnées</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ville">
                    <input value={form.ville} onChange={e => set("ville", e.target.value)} className={INPUT} placeholder="Dakar…" />
                  </Field>
                  <Field label="Téléphone">
                    <input value={form.telephone} onChange={e => set("telephone", e.target.value)} className={INPUT} placeholder="+221…" />
                  </Field>
                </div>
                <Field label="Adresse">
                  <input value={form.adresse} onChange={e => set("adresse", e.target.value)} className={INPUT} placeholder="Rue, quartier…" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email">
                    <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Code X3">
                    <input value={form.code_x3} onChange={e => set("code_x3", e.target.value)} className={INPUT} />
                  </Field>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact principal</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nom du contact">
                    <input value={form.contact_nom} onChange={e => set("contact_nom", e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Tél. contact">
                    <input value={form.contact_telephone} onChange={e => set("contact_telephone", e.target.value)} className={INPUT} />
                  </Field>
                </div>
                <Field label="Email contact">
                  <input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} className={INPUT} />
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
