import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ChevronLeft, ChevronRight, FileStack, FileSpreadsheet, Plus, X, Loader2, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useFacturesPaginated, useSaveFacture } from "../hooks/useFactures";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useContratsPaginated } from "../hooks/useContrats";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";

const TYPES = [
  { value: "fac_ava", label: "Avance de démarrage" },
  { value: "fac_stt", label: "Sous-traitant" },
  { value: "fac_cse", label: "CSE" },
];

const STATUTS = [
  { value: "emise",   label: "Émise" },
  { value: "payee",   label: "Payée" },
  { value: "annulee", label: "Annulée" },
  { value: "rapprochee", label: "Rapprochée" },
];

const TYPE_BADGE = {
  fac_ava: "bg-violet-50 text-violet-700 border border-violet-200",
  fac_stt: "bg-blue-50 text-blue-700 border border-blue-200",
  fac_cse: "bg-teal-50 text-teal-700 border border-teal-200",
};

const TYPE_LABEL = { fac_ava: "Avance de démarrage", fac_stt: "Sous-traitant", fac_cse: "CSE" };

function TypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[type] ?? "bg-gray-100 text-gray-600"}`}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

const FORM_INIT = {
  type: "fac_stt", objet: "", date_facture: new Date().toISOString().slice(0, 10),
  date_echeance: "", numero_facture_externe: "", montant_ht: "", taux_tva: "18",
  observations: "", decompte_id: "", contrat_id: "", soustraitant_id: "", chantier_id: "",
};

export default function FacturesListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search,    setSearch]    = useState("");
  const [type,      setType]      = useState("");
  const [statut,    setStatut]    = useState("");
  const [sttFilter, setSttFilter] = useState("");
  const [page,      setPage]      = useState(1);
  const [debounced, setDebounced] = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(FORM_INIT);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = {
    code:            debounced   || undefined,
    type:            type        || undefined,
    statut:          statut      || undefined,
    soustraitant_id: sttFilter   ? parseInt(sttFilter, 10) : undefined,
    page,
    count: 15,
  };

  const { data, isLoading, isError } = useFacturesPaginated(filters);
  const { data: allData } = useFacturesPaginated({ count: 500 });
  const saveMut    = useSaveFacture();
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || type || statut || sttFilter;

  // Calcul écarts: paires CSE/STT sur même décompte avec montant différent
  const ecartCount = useMemo(() => {
    const all = allData?.data ?? [];
    const cseMap = {};
    const sttMap = {};
    all.forEach(f => {
      if (f.type === "fac_cse" && f.decompte_id) cseMap[f.decompte_id] = f;
      if (f.type === "fac_stt" && f.decompte_id) sttMap[f.decompte_id] = f;
    });
    return Object.keys(cseMap).filter(did => {
      const cse = cseMap[did];
      const stt = sttMap[did];
      if (!stt) return false;
      return Math.abs((cse.montant_ttc ?? 0) - (stt.montant_ttc ?? 0)) > 1;
    }).length;
  }, [allData]);

  // Data for creation form
  const { data: decomptesData } = useDecomptesPaginated({ count: 200 });
  const { data: contratsData }  = useContratsPaginated({ count: 200, statut: "actif" });
  const { data: sttsData }      = useSousTraitantsPaginated({ count: 200 });
  const decompteOptions  = (decomptesData?.data ?? []).filter(d => ["valide_dg", "paye"].includes(d.statut));
  const contratOptions   = contratsData?.data ?? [];
  const sttOptions       = sttsData?.data ?? [];

  function reset() { setSearch(""); setType(""); setStatut(""); setSttFilter(""); setPage(1); }

  function exportExcel() {
    const params = new URLSearchParams();
    if (type)   params.set("type",   type);
    if (statut) params.set("statut", statut);
    window.open(`${API_BASE}/excel/factures?${params.toString()}`, "_blank");
  }

  async function handleCreate() {
    if (!form.date_facture || !form.montant_ht) {
      addToast("Date et montant HT sont requis.", "error"); return;
    }
    if (form.type === "fac_stt" && !form.decompte_id) {
      addToast("Sélectionnez un décompte pour une Facture STT.", "error"); return;
    }
    if (form.type === "fac_ava" && (!form.contrat_id || !form.soustraitant_id)) {
      addToast("Contrat et sous-traitant sont requis pour une Avance.", "error"); return;
    }
    if (form.type === "fac_cse" && !form.decompte_id) {
      addToast("Sélectionnez un décompte pour une Facture CSE.", "error"); return;
    }
    try {
      const payload = {
        type:                   form.type,
        objet:                  form.objet.trim() || null,
        date_facture:           form.date_facture,
        date_echeance:          form.date_echeance || null,
        numero_facture_externe: form.numero_facture_externe.trim() || null,
        montant_ht:             parseFloat(form.montant_ht),
        taux_tva:               parseFloat(form.taux_tva || "18"),
        observations:           form.observations || null,
      };
      if (form.type === "fac_stt") payload.decompte_id = parseInt(form.decompte_id, 10);
      if (form.type === "fac_cse") payload.decompte_id = parseInt(form.decompte_id, 10);
      if (form.type === "fac_ava") {
        payload.contrat_id      = parseInt(form.contrat_id, 10);
        payload.soustraitant_id = parseInt(form.soustraitant_id, 10);
      }
      const res = await saveMut.mutateAsync(payload);
      addToast("Facture créée.", "success");
      setShowForm(false);
      setForm(FORM_INIT);
      if (res?.data?.id) navigate(`/factures/${res.data.id}`);
    } catch (err) {
      addToast(err.response?.data?.error ?? err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} facture${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-3">
            {ecartCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-sm font-medium">
                <AlertTriangle size={14} />
                Écarts à traiter ({ecartCount})
              </div>
            )}
            <button
              onClick={() => { setForm(FORM_INIT); setShowForm(true); }}
              className="flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#065A2C] transition-colors"
            >
              <Plus size={15} /> Nouvelle facture
            </button>
          </div>
        }
      />

      {/* ── Modal création ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">Nouvelle facture</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...FORM_INIT, type: e.target.value, date_facture: f.date_facture }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none">
                    <option value="fac_stt">Facture Sous-traitant</option>
                    <option value="fac_cse">Facture CSE</option>
                    <option value="fac_ava">Avance de démarrage</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Date facture *</label>
                  <input type="date" value={form.date_facture} onChange={e => setForm(f => ({ ...f, date_facture: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
                </div>
              </div>

              {(form.type === "fac_stt" || form.type === "fac_cse") && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Décompte lié *</label>
                  <select value={form.decompte_id} onChange={e => {
                    const dec = decompteOptions.find(d => d.id === parseInt(e.target.value));
                    setForm(f => ({
                      ...f,
                      decompte_id:    e.target.value,
                      contrat_id:     dec?.contrat_id ? String(dec.contrat_id) : f.contrat_id,
                      soustraitant_id: dec?.contrat?.soustraitant?.id ? String(dec.contrat.soustraitant.id) : f.soustraitant_id,
                      montant_ht:     dec?.montant_ht ? String(dec.montant_ht) : f.montant_ht,
                      taux_tva:       dec?.taux_tva   ? String(dec.taux_tva)   : f.taux_tva,
                      objet:          dec?.contrat?.objet ? `Facture travaux — ${dec.contrat.objet}` : f.objet,
                    }));
                  }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none">
                    <option value="">— Sélectionner un décompte —</option>
                    {decompteOptions.map(d => (
                      <option key={d.id} value={d.id}>{d.code} — {d.contrat?.soustraitant?.raison_sociale ?? "?"}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.type === "fac_ava" && (<>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Contrat *</label>
                  <select value={form.contrat_id} onChange={e => setForm(f => ({ ...f, contrat_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none">
                    <option value="">— Sélectionner un contrat —</option>
                    {contratOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.soustraitant?.raison_sociale ?? "?"}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Sous-traitant bénéficiaire *</label>
                  <select value={form.soustraitant_id} onChange={e => setForm(f => ({ ...f, soustraitant_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none">
                    <option value="">— Sélectionner un sous-traitant —</option>
                    {sttOptions.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
                  </select>
                </div>
              </>)}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Objet *</label>
                <input type="text" value={form.objet} onChange={e => setForm(f => ({ ...f, objet: e.target.value }))}
                  placeholder="Objet de la facture" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Montant HT (FCFA) *</label>
                  <input type="number" min={0} value={form.montant_ht} onChange={e => setForm(f => ({ ...f, montant_ht: e.target.value }))}
                    placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Taux TVA (%)</label>
                  <input type="number" min={0} max={100} value={form.taux_tva} onChange={e => setForm(f => ({ ...f, taux_tva: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Date d'échéance</label>
                  <input type="date" value={form.date_echeance} onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">N° facture externe</label>
                  <input type="text" value={form.numero_facture_externe} onChange={e => setForm(f => ({ ...f, numero_facture_externe: e.target.value }))}
                    placeholder="Ex. F-2026-042" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button onClick={handleCreate} disabled={saveMut.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                  {saveMut.isPending && <Loader2 size={13} className="animate-spin" />}
                  Créer la facture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Code, contrat…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={sttFilter} onChange={e => { setSttFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les sous-traitants</option>
            {sttOptions.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
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
          Impossible de charger les factures.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Code", "Type", "Contrat", "Sous-traitant", "Montant TTC", "Statut", "Date"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <FileStack size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucune facture ne correspond aux filtres.</p>
                  </td>
                </tr>
              ) : rows.map(f => (
                <tr key={f.id} onClick={() => navigate(`/factures/${f.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm font-semibold text-gray-900">{f.code}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <TypeBadge type={f.type} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm text-[#087F3E] font-medium">{f.contrat?.code ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-gray-700 truncate max-w-[180px]">
                      {f.soustraitant?.raison_sociale ?? f.chantier?.designation ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <MoneyDisplay amount={f.montant_ttc ?? 0} variant="small" className="font-semibold text-gray-800" />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge statut={f.statut} />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                    {fmtDate(f.date_facture)}
                  </td>
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
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${n === page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-200 text-gray-600"}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
