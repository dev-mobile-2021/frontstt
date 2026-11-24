import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, RotateCcw, Plus, X, Loader2,
  FileText, FileSpreadsheet, TrendingUp, ChevronDown,
  DollarSign, CheckCircle2, Trash2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useDecomptesPaginated, useDecompteCircuit, useSaveDecompte, useDeleteDecompte } from "../hooks/useDecomptes";
import { usePeutFaire } from "../hooks/useParametres";
import ConfirmModal from "../components/ConfirmModal";
import { useContratsPaginated } from "../hooks/useContrats";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";
import { formatMontantCourt } from "../utils/formatters";
import SearchSelect from "../components/SearchSelect";
import Pagination from "../components/Pagination";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";

const STATUTS = [
  { value: "brouillon",    label: "Brouillon" },
  { value: "soumis",       label: "Soumis" },
  { value: "valide_dacc",  label: "Validé DACC" },
  { value: "valide_dexa",  label: "Validé DEXA" },
  { value: "valide_dcg",   label: "Validé DCG" },
  { value: "valide_dga",   label: "Validé DGA" },
  { value: "valide_dg",    label: "Validé DG" },
  { value: "paye",         label: "Payé" },
  { value: "rejete",       label: "Rejeté" },
];

const TYPES = [
  { value: "provisoire",               label: "Provisoire" },
  { value: "final",                    label: "Final" },
  { value: "restitution_rg_partielle", label: "Restitution RG partielle" },
  { value: "restitution_rg_totale",    label: "Restitution RG totale" },
  { value: "definitif_general",        label: "Définitif général" },
];

const TYPE_BADGE = {
  provisoire:               "bg-green-50 text-green-700 border border-green-200",
  final:                    "bg-green-100 text-green-700 border border-green-300",
  restitution_rg_partielle: "bg-amber-50 text-amber-700 border border-amber-200",
  restitution_rg_totale:    "bg-amber-100 text-amber-700 border border-amber-300",
  definitif_general:        "bg-surface-50 text-ink-700 border border-line-200",
};

const STATUTS_INSTANCE = ["soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg", "valide_ct", "valide_cp", "valide_daf"];

const INIT = {
  contrat_id: "",
  type:       "provisoire",
  date_debut: "",
  date_fin:   "",
};

const SELECT_CLS = "h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100";

function MiniKPI({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line-200 bg-white p-4 shadow-xs">
      <div className="mt-0.5 rounded-lg bg-green-100 p-2">
        <Icon className="h-4 w-4 text-green-600" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <p className="truncate text-base font-bold tabular-nums text-ink-900">{value}</p>
        <p className="mt-0.5 text-xs text-ink-500">{sub}</p>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function DecomptesListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const saveMut      = useSaveDecompte();
  const deleteMut    = useDeleteDecompte();
  const [confirmDel, setConfirmDel] = useState(null);

  const [showStats,    setShowStats]  = useState(true);
  const [search,       setSearch]     = useState("");
  const [statut,       setStatut]     = useState("");
  const [typeFilter,   setTypeFilter] = useState("");
  const [sttFilter,    setSttFilter]  = useState("");
  const [contratFilter,setContratFilter] = useState("");
  const [page,         setPage]       = useState(1);
  const [debounced,    setDebounced]  = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState(INIT);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = { code: debounced || undefined, statut: statut || undefined, type: typeFilter || undefined, contrat_id: contratFilter ? parseInt(contratFilter) : undefined, soustraitant_id: sttFilter ? parseInt(sttFilter) : undefined, page, count: 15 };

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
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut || typeFilter || sttFilter || contratFilter;

  const { data: allData }  = useDecomptesPaginated({ count: 200 });
  const allDecomptes        = allData?.data ?? [];
  const { data: peutCreerDecompte = false } = usePeutFaire("creer_decompte");

  const { data: contratsData } = useContratsPaginated({ count: 100 });
  const contrats = contratsData?.data ?? [];

  const sttList = useMemo(() => {
    const seen = new Set();
    return contrats
      .filter(c => c.soustraitant?.raison_sociale && !seen.has(c.soustraitant_id) && seen.add(c.soustraitant_id))
      .map(c => ({ id: c.soustraitant_id, nom: c.soustraitant.raison_sociale }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [contrats]);

  const rows = data?.data ?? [];

  const contratIdInt = form.contrat_id ? parseInt(form.contrat_id) : undefined;
  const { data: ecData } = useEtatsCessionPaginated(
    { count: 100, contrat_id: contratIdInt },
    { enabled: showModal && !!form.contrat_id, keepPreviousData: false }
  );
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

  useEffect(() => {
    if (showModal && form.contrat_id && etatsCession.length > 0) {
      const last = etatsCession[etatsCession.length - 1];
      setForm(f => ({ ...f, etat_cession_id: String(last.id) }));
    }
  }, [etatsCession, showModal, form.contrat_id]);

  function reset()    { setSearch(""); setStatut(""); setTypeFilter(""); setSttFilter(""); setContratFilter(""); setPage(1); }
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
    if (!form.contrat_id) errs.contrat_id = "Requis";
    if (!form.date_debut) errs.date_debut  = "Requis";
    if (!form.date_fin)   errs.date_fin    = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const created = await saveMut.mutateAsync({
        contrat_id: parseInt(form.contrat_id),
        type:       form.type || "provisoire",
        date_debut: form.date_debut,
        date_fin:   form.date_fin,
      });
      addToast("Décompte créé.", "success");
      setShowModal(false);
      if (created?.data?.id) navigate(`/decomptes/${created.data.id}`);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Erreur lors de la création.";
      addToast(msg, "error");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Décomptes"
        description="Suivi des décomptes de sous-traitance et leur circuit de validation."
        total={meta.total}
        actions={
          <>
            <Button variant="secondary" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            {peutCreerDecompte && (
              <Button onClick={openModal}>
                <Plus className="h-4 w-4" /> Nouveau décompte
              </Button>
            )}
          </>
        }
      />

      {/* ── Stats Banner ── */}
      <div className="overflow-hidden rounded-xl border border-line-200 bg-white shadow-xs">
        <button onClick={() => setShowStats(s => !s)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-[13px] font-semibold text-ink-900 hover:bg-surface-50 transition-colors">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" strokeWidth={1.75} />
            Résumé global — Tous les chantiers
          </span>
          <ChevronDown className={cn("h-4 w-4 text-ink-400 transition-transform duration-200", showStats && "rotate-180")} />
        </button>

        {showStats && (
          <div className="space-y-5 border-t border-line-200 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniKPI icon={FileText} label="Contrats de ST" value={statsKPIs.totalContrats} sub="Contrats avec décomptes" />
              <MiniKPI icon={TrendingUp} label="Montants contrats" value={formatMontantCourt(statsKPIs.montantContrats)} sub="Montant actualisé total" />
              <MiniKPI icon={CheckCircle2} label="Montants engagés" value={formatMontantCourt(statsKPIs.montantEngage)} sub="Total décomptes soumis" />
              <MiniKPI icon={DollarSign} label="Cumul payé" value={formatMontantCourt(statsKPIs.cumulPaye)} sub="Décomptes à statut payé" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-line-200 bg-surface-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-ink-900">Validations en cours</h3>
                  {totalEnValidation > 0 && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      {totalEnValidation} en attente
                    </span>
                  )}
                </div>
                {validationsEnCours.length === 0 ? (
                  <p className="py-4 text-center text-xs text-ink-400">Circuit non configuré.</p>
                ) : (
                  <div className="space-y-2">
                    {validationsEnCours.map(v => (
                      <div key={v.profil_code} className="flex items-center gap-3 py-1">
                        <span className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                          v.count > 0
                            ? "border-amber-300 bg-amber-100 text-amber-700"
                            : "border-line-200 bg-white text-ink-300"
                        )}>
                          {v.count}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-ink-900">{v.profil_code.toUpperCase()}</p>
                          <p className="text-xs text-ink-500">{v.libelle}</p>
                        </div>
                        {v.count > 0 && <span className="whitespace-nowrap text-xs font-medium text-amber-700">En attente</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-line-200 bg-surface-50 p-4">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-[13px] font-semibold text-ink-900">Règlements en instance</h3>
                    <p className="mt-0.5 text-xs text-ink-500">Décomptes en circuit, non payés</p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-xs text-ink-500">{totalReglementsNbr} décompte{totalReglementsNbr !== 1 ? "s" : ""}</p>
                    <MoneyDisplay amount={totalReglements} className="text-sm font-bold text-green-700" />
                  </div>
                </div>
                {reglements.length === 0 ? (
                  <p className="py-4 text-center text-xs text-ink-400">Aucun règlement en instance.</p>
                ) : (
                  <div className="divide-y divide-line-100">
                    {reglements.map(r => (
                      <div key={r.nom} className="flex items-center justify-between gap-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />
                          <p className="truncate text-xs text-ink-700">{r.nom}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <span className="w-5 text-right text-xs tabular-nums text-ink-500">{r.nbr}</span>
                          <MoneyDisplay amount={r.montant} variant="small" className="font-semibold text-ink-900" />
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
      <div className="rounded-xl border border-line-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              placeholder="Rechercher par code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={SELECT_CLS + " max-w-[180px]"}>
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }} className={SELECT_CLS + " max-w-[170px]"}>
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={sttFilter} onChange={e => { setSttFilter(e.target.value); setPage(1); }} className={SELECT_CLS + " max-w-[180px]"}>
            <option value="">Tous les STT</option>
            {sttList.map(s => <option key={s.id} value={String(s.id)}>{s.nom}</option>)}
          </select>
          <select value={contratFilter} onChange={e => { setContratFilter(e.target.value); setPage(1); }} className={SELECT_CLS + " max-w-[220px]"}>
            <option value="">Tous les contrats</option>
            {contrats.map(c => <option key={c.id} value={c.id}>{c.code} — {c.soustraitant?.raison_sociale}</option>)}
          </select>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : isError ? (
        <div className="rounded-xl border border-line-200 bg-white py-16 text-center text-[13px] text-red-500">
          Impossible de charger les décomptes.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line-200 bg-white">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-green-800">
                {["Code", "Type", "Contrat / STT", "Période", "Net HT", "TTC", "Statut", "Circuit"].map(h => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileText className="mx-auto mb-2 h-7 w-7 text-ink-300" strokeWidth={1.5} />
                    <p className="text-[13px] text-ink-500">Aucun décompte ne correspond aux filtres.</p>
                  </td>
                </tr>
              ) : rows.map(d => (
                <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)}
                  className="cursor-pointer transition-colors hover:bg-green-50/60">
                  <td className="px-4 py-3"><span className="font-mono text-[13px] font-semibold text-ink-900">{d.code}</span></td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", TYPE_BADGE[d.type] ?? "bg-surface-50 text-ink-500 border border-line-200")}>
                      {TYPES.find(t => t.value === d.type)?.label ?? d.type ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-[13px] text-ink-700">{d.contrat?.code ?? "—"}</p>
                    <p className="max-w-[160px] truncate text-xs text-ink-500">{d.contrat?.soustraitant?.raison_sociale}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                    {d.date_debut && d.date_fin
                      ? `${new Date(d.date_debut).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })} — ${new Date(d.date_fin).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })}`
                      : d.etat_cession?.periode_debut
                        ? `${new Date(d.etat_cession.periode_debut).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })} — ${new Date(d.etat_cession.periode_fin).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3"><MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="font-semibold text-green-700" /></td>
                  <td className="px-4 py-3"><MoneyDisplay amount={d.montant_ttc ?? 0} variant="small" className="font-semibold text-ink-900" /></td>
                  <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
                  <td className="px-4 py-3">
                    {d.statut === "rejete" ? (
                      <span className="text-xs text-red-600">Rejeté</span>
                    ) : (
                      <span className="text-xs tabular-nums text-ink-500">{circuitStep(d.statut)}</span>
                    )}
                  </td>
                  {d.statut === "brouillon" && (
                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setConfirmDel(d)}
                        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination page={page} totalPages={totalPages} total={meta.total} onPage={setPage} />
        </div>
      )}

      {/* ── Modal création ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau décompte</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <Field label="Contrat" required error={errors.contrat_id}>
                <SearchSelect value={form.contrat_id} onChange={e => set("contrat_id", e.target.value)}
                  className={cn(SELECT_CLS, errors.contrat_id && "border-red-400")}>
                  <option value="">— Sélectionner un contrat —</option>
                  {contrats.filter(c => c.statut === "actif").map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.soustraitant?.raison_sociale ?? "?"} / {c.chantier?.designation ?? "?"}
                    </option>
                  ))}
                </SearchSelect>
              </Field>

              <Field label="Type de décompte">
                <SearchSelect value={form.type} onChange={e => set("type", e.target.value)} className={SELECT_CLS}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </SearchSelect>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Date de début" required error={errors.date_debut}>
                  <Input type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)}
                    className={errors.date_debut ? "border-red-400" : ""} />
                </Field>
                <Field label="Date de fin" required error={errors.date_fin}>
                  <Input type="date" value={form.date_fin} onChange={e => set("date_fin", e.target.value)}
                    className={errors.date_fin ? "border-red-400" : ""} />
                </Field>
              </div>

              <p className="rounded-md border border-line-200 bg-surface-50 px-3 py-2 text-[11px] text-ink-500">
                Les postes A, B, D seront calculés automatiquement depuis l'attachement validé et les paramètres du contrat. Les cessions se sélectionnent dans l'onglet Cessions après création.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!confirmDel}
        title="Supprimer le décompte"
        message={`Supprimer définitivement ${confirmDel?.code} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={async () => {
          try {
            await deleteMut.mutateAsync(confirmDel.id);
            addToast("Décompte supprimé.", "success");
          } catch {
            addToast("Erreur lors de la suppression.", "error");
          } finally {
            setConfirmDel(null);
          }
        }}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
