import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, RotateCcw, ChevronLeft, ChevronRight, Plus, X, Loader2,
  FileText, FileSpreadsheet, TrendingUp, ChevronDown,
  DollarSign, CheckCircle2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useDecomptesPaginated, useDecompteCircuit, useSaveDecompte } from "../hooks/useDecomptes";
import { useContratsPaginated } from "../hooks/useContrats";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";
import { formatMontantCourt } from "../utils/formatters";

const STATUTS = [
  { value: "brouillon",   label: "Brouillon" },
  { value: "soumis",      label: "Soumis" },
  { value: "valide_ct",   label: "Validé CT" },
  { value: "valide_cp",   label: "Validé CP" },
  { value: "valide_daf",  label: "Validé DAF" },
  { value: "valide_dg",   label: "Validé DG" },
  { value: "paye",        label: "Payé" },
  { value: "rejete",      label: "Rejeté" },
];

const STATUTS_INSTANCE = ["soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg", "valide_ct", "valide_cp", "valide_daf"];

const INIT = {
  contrat_id: "", etat_cession_id: "", montant_brut: "",
  taux_retenue_garantie: "5", taux_tva: "18",
  date_echeance: "", observations: "",
};

function MiniKPI({ icon: Icon, label, value, sub, iconColor = "text-gray-500" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className={`mt-0.5 p-2 rounded-lg bg-gray-50 ${iconColor}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-base font-bold text-gray-900 truncate">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
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

export default function DecomptesListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const saveMut      = useSaveDecompte();

  const [showStats,  setShowStats]  = useState(true);
  const [search,     setSearch]     = useState("");
  const [statut,     setStatut]     = useState("");
  const [page,       setPage]       = useState(1);
  const [debounced,  setDebounced]  = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(INIT);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = { code: debounced || undefined, statut: statut || undefined, page, count: 15 };

  const { data: circuitData = [] } = useDecompteCircuit();

  const circuitOrder = useMemo(() => {
    if (circuitData.length === 0)
      return ["brouillon", "soumis", "valide_ct", "valide_cp", "valide_daf", "valide_dg", "paye"];
    return ["brouillon", circuitData[0].statut_avant, ...circuitData.map(e => e.statut_apres), "paye"];
  }, [circuitData]);

  function circuitStep(s) {
    const idx = circuitOrder.indexOf(s);
    return idx >= 0 ? `${idx}/${circuitOrder.length - 1}` : null;
  }

  const { data, isLoading, isError } = useDecomptesPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut;

  const { data: allData }  = useDecomptesPaginated({ count: 200 });
  const allDecomptes        = allData?.data ?? [];

  const { data: contratsData } = useContratsPaginated({ count: 100, statut: "actif" });
  const contrats = contratsData?.data ?? [];

  const { data: ecData } = useEtatsCessionPaginated({ count: 100, contrat_id: form.contrat_id || undefined });
  const etatsCession = ecData?.data ?? [];

  const statsKPIs = useMemo(() => {
    const uniqueContratIds = [...new Set(allDecomptes.map(d => d.contrat_id).filter(Boolean))];
    const uniqueContrats   = allDecomptes
      .filter((d, i, arr) => d.contrat_id && arr.findIndex(x => x.contrat_id === d.contrat_id) === i)
      .map(d => d.contrat);
    const montantContrats = uniqueContrats.reduce((s, c) => s + parseFloat(c?.montant_actuel ?? c?.montant_initial ?? 0), 0);
    const montantEngage   = allDecomptes.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
    const cumulPaye       = allDecomptes.filter(d => d.statut === "paye").reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
    return { totalContrats: uniqueContratIds.length, montantContrats, montantEngage, cumulPaye };
  }, [allDecomptes]);

  const validationsEnCours = useMemo(() => {
    if (!circuitData.length) return [];
    return circuitData.map(etape => ({
      profil_code: etape.profil_code,
      libelle:     etape.libelle,
      count:       allDecomptes.filter(d => d.statut === etape.statut_avant).length,
    }));
  }, [circuitData, allDecomptes]);

  const totalEnValidation = validationsEnCours.reduce((s, v) => s + v.count, 0);

  const reglements = useMemo(() => {
    const map = {};
    allDecomptes.filter(d => STATUTS_INSTANCE.includes(d.statut)).forEach(d => {
      const key = d.contrat?.soustraitant?.raison_sociale ?? "—";
      if (!map[key]) map[key] = { nbr: 0, montant: 0 };
      map[key].nbr    += 1;
      map[key].montant += parseFloat(d.montant_ht ?? 0);
    });
    return Object.entries(map).map(([nom, v]) => ({ nom, ...v })).sort((a, b) => b.montant - a.montant);
  }, [allDecomptes]);

  const totalReglements    = reglements.reduce((s, r) => s + r.montant, 0);
  const totalReglementsNbr = reglements.reduce((s, r) => s + r.nbr, 0);

  function reset()    { setSearch(""); setStatut(""); setPage(1); }
  function set(k, v)  { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }
  function openModal(){ setForm(INIT); setErrors({}); setShowModal(true); }

  function exportExcel() {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    window.open(`${API_BASE}/excel/decomptes?${params.toString()}`, "_blank");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.contrat_id)      errs.contrat_id      = "Requis";
    if (!form.etat_cession_id) errs.etat_cession_id = "Requis";
    if (!form.montant_brut)    errs.montant_brut    = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const created = await saveMut.mutateAsync({
        contrat_id:            parseInt(form.contrat_id),
        etat_cession_id:       parseInt(form.etat_cession_id),
        montant_brut:          parseFloat(form.montant_brut),
        taux_retenue_garantie: parseFloat(form.taux_retenue_garantie || 5),
        taux_tva:              parseFloat(form.taux_tva || 18),
        date_echeance:         form.date_echeance || null,
        observations:          form.observations  || null,
        statut: "brouillon",
      });
      addToast("Décompte créé.", "success");
      setShowModal(false);
      if (created?.data?.id) navigate(`/decomptes/${created.data.id}`);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.errors?.[0] || "Erreur lors de la création.";
      addToast(msg, "error");
    }
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Décomptes"
        subtitle={isLoading ? "Chargement…" : `${meta.total ?? 0} décompte${(meta.total ?? 0) !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
          >
            <Plus size={16} /> Nouveau décompte
          </button>
        }
      />

      {/* ── Stats Banner ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowStats(s => !s)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          <span className="flex items-center gap-2">
            <TrendingUp size={15} className="text-[#087F3E]" />
            Résumé global — Tous les chantiers
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showStats ? "rotate-180" : ""}`} />
        </button>

        {showStats && (
          <div className="border-t border-gray-100 p-5 space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <MiniKPI icon={FileText} label="Contrats de ST" value={statsKPIs.totalContrats} sub="Contrats avec décomptes" />
              <MiniKPI icon={TrendingUp} label="Montants contrats" value={formatMontantCourt(statsKPIs.montantContrats)} sub="Montant actualisé total" />
              <MiniKPI icon={CheckCircle2} label="Montants engagés" value={formatMontantCourt(statsKPIs.montantEngage)} sub="Total décomptes soumis" iconColor="text-blue-600" />
              <MiniKPI icon={DollarSign} label="Cumul payé" value={formatMontantCourt(statsKPIs.cumulPaye)} sub="Décomptes à statut payé" iconColor="text-[#087F3E]" />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">Validations en cours</h3>
                  {totalEnValidation > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                      {totalEnValidation} en attente
                    </span>
                  )}
                </div>
                {validationsEnCours.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Circuit non configuré.</p>
                ) : (
                  <div className="space-y-2">
                    {validationsEnCours.map(v => (
                      <div key={v.profil_code} className="flex items-center gap-3 py-1">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${v.count > 0 ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-gray-100 text-gray-300 border border-gray-200"}`}>
                          {v.count}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700">{v.profil_code.toUpperCase()}</p>
                          <p className="text-xs text-gray-400">{v.libelle}</p>
                        </div>
                        {v.count > 0 && <span className="text-xs text-amber-600 font-medium whitespace-nowrap">En attente</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Règlements en instance</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Décomptes en circuit, non payés</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-gray-400">{totalReglementsNbr} décompte{totalReglementsNbr !== 1 ? "s" : ""}</p>
                    <MoneyDisplay amount={totalReglements} className="text-sm font-bold text-[#087F3E]" />
                  </div>
                </div>
                {reglements.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Aucun règlement en instance.</p>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {reglements.map(r => (
                      <div key={r.nom} className="flex items-center justify-between py-2 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#087F3E] flex-shrink-0" />
                          <p className="text-xs text-gray-700 truncate">{r.nom}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs text-gray-500 tabular-nums w-5 text-right">{r.nbr}</span>
                          <MoneyDisplay amount={r.montant} variant="small" className="font-semibold text-gray-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher par code décompte…"
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
        <SkeletonTable rows={8} cols={6} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les décomptes.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Code", "Contrat / STT", "Chantier", "Montant brut", "Net HT", "TTC", "Échéance", "Statut", "Circuit"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileText size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucun décompte ne correspond aux filtres.</p>
                  </td>
                </tr>
              ) : rows.map(d => (
                <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)}
                  className="hover:bg-gray-50 even:bg-gray-50/40 group cursor-pointer transition-colors">
                  <td className="px-4 py-3.5"><span className="font-mono text-sm font-semibold text-gray-900">{d.code}</span></td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-mono text-gray-700">{d.contrat?.code ?? "—"}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{d.contrat?.soustraitant?.raison_sociale}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{d.contrat?.chantier?.designation ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3.5"><MoneyDisplay amount={d.montant_brut ?? 0} variant="small" /></td>
                  <td className="px-4 py-3.5"><MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="text-[#087F3E]" /></td>
                  <td className="px-4 py-3.5"><MoneyDisplay amount={d.montant_ttc ?? 0} variant="small" className="font-semibold text-gray-800" /></td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{fmtDate(d.date_echeance)}</td>
                  <td className="px-4 py-3.5"><StatusBadge statut={d.statut} /></td>
                  <td className="px-4 py-3.5">
                    {d.statut === "rejete" ? (
                      <span className="text-xs text-red-500">Rejeté</span>
                    ) : (
                      <span className="text-xs text-gray-400 tabular-nums">{circuitStep(d.statut)}</span>
                    )}
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
              <h2 className="text-base font-bold text-gray-900">Nouveau décompte</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Contrat" required>
                <select value={form.contrat_id} onChange={e => { set("contrat_id", e.target.value); set("etat_cession_id", ""); }}
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

              <Field label="État de cession" required>
                <select value={form.etat_cession_id} onChange={e => set("etat_cession_id", e.target.value)}
                  className={`${INPUT} ${errors.etat_cession_id ? "border-red-400" : ""}`}
                  disabled={!form.contrat_id}>
                  <option value="">— Sélectionner un état de cession —</option>
                  {etatsCession.map(ec => (
                    <option key={ec.id} value={ec.id}>
                      {ec.code ?? `EC-${ec.id}`} — {ec.periode_debut ?? ""} → {ec.periode_fin ?? ""}
                    </option>
                  ))}
                </select>
                {errors.etat_cession_id && <p className="text-xs text-red-500 mt-1">{errors.etat_cession_id}</p>}
                {form.contrat_id && etatsCession.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Aucun état de cession pour ce contrat. Créez-en un d'abord.</p>
                )}
              </Field>

              <Field label="Montant brut HT (FCFA)" required>
                <input type="number" min="0" value={form.montant_brut} onChange={e => set("montant_brut", e.target.value)}
                  className={`${INPUT} ${errors.montant_brut ? "border-red-400" : ""}`} placeholder="0" />
                {errors.montant_brut && <p className="text-xs text-red-500 mt-1">{errors.montant_brut}</p>}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Retenue garantie (%)">
                  <input type="number" min="0" max="100" value={form.taux_retenue_garantie}
                    onChange={e => set("taux_retenue_garantie", e.target.value)} className={INPUT} />
                </Field>
                <Field label="TVA (%)">
                  <input type="number" min="0" max="100" value={form.taux_tva}
                    onChange={e => set("taux_tva", e.target.value)} className={INPUT} />
                </Field>
              </div>

              <Field label="Date d'échéance">
                <input type="date" value={form.date_echeance} onChange={e => set("date_echeance", e.target.value)} className={INPUT} />
              </Field>

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
