import { useState, useEffect, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, RotateCcw, Plus, Eye, Loader2,
  FileText, FileSpreadsheet, ChevronDown, ChevronRight as ChevronRightIcon,
  Trash2, Archive, AlertTriangle, Pencil, FilePlus,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
import { useContratsPaginated, useSaveContrat, useDeleteContrat, useContratStatut } from "../hooks/useContrats";
import { usePeutFaire } from "../hooks/useParametres";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "../components/Table";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";
import { formatMontantCourt, formatDate } from "../utils/formatters";
import SearchSelect from "../components/SearchSelect";
import SousTraitantSelect from "../components/SousTraitantSelect";
import ActionsMenu from "../components/ActionsMenu";
import ArchiveContratDialog from "../components/ArchiveContratDialog";
import Pagination from "../components/Pagination";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";

const STATUTS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "actif",     label: "Actif" },
  { value: "suspendu",  label: "Suspendu" },
  { value: "resilie",   label: "Résilié" },
  { value: "termine",   label: "Terminé" },
  { value: "cloture",   label: "Clôturé" },
  { value: "archive",   label: "Archivé" },
];

const TYPES = [
  { value: "forfait",       label: "Forfait" },
  { value: "serie_de_prix", label: "Série de prix" },
  { value: "regie",         label: "Régie" },
];

const AVENANT_STATUT_COLORS = {
  brouillon: "bg-surface-50 text-ink-500 border-line-200",
  valide:    "bg-green-50 text-green-700 border-green-200",
};

const INIT = {
  chantier_id: "", soustraitant_id: "",
  libelle: "", objet: "", type_contrat: "",
  montant_initial: "", date_debut: "", date_fin_prevue: "",
  taux_rg:                  5,
  taux_revision_prix:       0,
  taux_avance:              20,
  taux_remboursement_avance: 6.25,
  taux_tva:                 18,
};

const SELECT_CLS = "h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100";

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

export default function ContratsListPage() {
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const saveMut      = useSaveContrat();
  const { data: peutCreerContrat = false } = usePeutFaire("creer_contrat");
  const deleteMut    = useDeleteContrat();
  const statutMut    = useContratStatut();

  const [searchParams] = useSearchParams();
  const [search,    setSearch]    = useState("");
  const [statut,    setStatut]    = useState(searchParams.get("statut") ?? "");
  const [sttFilter, setSttFilter] = useState(searchParams.get("soustraitant_id") ?? "");
  const [page,      setPage]      = useState(1);
  const [debounced, setDebounced] = useState("");
  const [expanded,       setExpanded]       = useState({});
  const [showModal,      setShowModal]      = useState(false);
  const [form,           setForm]           = useState(INIT);
  const [errors,         setErrors]         = useState({});
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters = {
    code: debounced || undefined,
    statut: statut || undefined,
    soustraitant_id: sttFilter ? parseInt(sttFilter) : undefined,
    page, count: 15,
  };
  const { data, isLoading, isError } = useContratsPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut || sttFilter;

  const { data: chantiersData } = useChantiersPaginated({ count: 2000 });
  const chantiers = chantiersData?.data ?? [];

  const { data: sttData } = useSousTraitantsPaginated({ count: 500 });
  const sousTraitants = sttData?.data ?? [];

  function reset()    { setSearch(""); setStatut(""); setSttFilter(""); setPage(1); }
  function set(k, v)  { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }
  function openModal(){ setForm(INIT); setErrors({}); setShowModal(true); }
  function toggleExpand(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      addToast("Contrat supprimé", "success");
      setConfirmDelete(null);
    } catch (e) {
      addToast(e?.response?.data?.message ?? "Erreur lors de la suppression", "error");
      setConfirmDelete(null);
    }
  }

  async function handleArchive(id) {
    try {
      await statutMut.mutateAsync({ id, statut: "archive" });
      addToast("Contrat archivé", "success");
      setConfirmArchive(null);
    } catch (e) {
      addToast(e?.response?.data?.message ?? "Erreur lors de l'archivage", "error");
      setConfirmArchive(null);
    }
  }

  async function exportExcel() {
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    const token = localStorage.getItem("stt_token");
    const resp = await fetch(`${API_BASE}/excel/contrats?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `contrats-${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.chantier_id)       errs.chantier_id     = "Requis";
    if (!form.soustraitant_id)   errs.soustraitant_id = "Requis";
    if (!form.libelle.trim())    errs.libelle         = "Requis";
    if (!form.objet.trim())      errs.objet           = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const created = await saveMut.mutateAsync({
        chantier_id:               parseInt(form.chantier_id),
        soustraitant_id:           parseInt(form.soustraitant_id),
        libelle:                   form.libelle.trim(),
        objet:                     form.objet.trim(),
        type_contrat:              form.type_contrat  || null,
        date_debut:                form.date_debut      || null,
        date_fin_prevue:           form.date_fin_prevue || null,
        taux_rg:                   parseFloat(form.taux_rg)                   || 5,
        taux_revision_prix:        parseFloat(form.taux_revision_prix)        || 0,
        taux_avance:               parseFloat(form.taux_avance)               || 20,
        taux_remboursement_avance: parseFloat(form.taux_remboursement_avance) || 6.25,
        taux_tva:                  parseFloat(form.taux_tva)                  || 18,
        statut: "brouillon",
      });
      addToast("Contrat créé.", "success");
      setShowModal(false);
      if (created?.data?.id) navigate(`/contrats/${created.data.id}`);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la création.", "error");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contrats"
        description="Liste des contrats de sous-traitance — filtrer, exporter, créer."
        total={meta.total}
        actions={
          <>
            <Button variant="secondary" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            {peutCreerContrat && (
              <Button onClick={openModal}>
                <Plus className="h-4 w-4" /> Nouveau contrat
              </Button>
            )}
          </>
        }
      />

      {/* Barre de filtres */}
      <div className="rounded-xl border border-line-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              placeholder="Rechercher par code, objet…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statut}
            onChange={e => { setStatut(e.target.value); setPage(1); }}
            className={SELECT_CLS + " max-w-[180px]"}
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={sttFilter}
            onChange={e => { setSttFilter(e.target.value); setPage(1); }}
            className={SELECT_CLS + " max-w-[220px]"}
          >
            <option value="">Tous les sous-traitants</option>
            {sousTraitants.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
          </select>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : isError ? (
        <div className="rounded-xl border border-line-200 bg-white py-16 text-center text-[13px] text-red-500">
          Impossible de charger les contrats.
        </div>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <tr>
                {["Code", "Chantier", "Sous-traitant", "Objet", "Montant actualisé", "Validation", "Réalisé", "À réaliser", "Avenants", "Actions"].map(h => (
                  <TableHead
                    key={h}
                    className={cn(
                      ["Montant actualisé","Réalisé","À réaliser"].includes(h) && "text-right",
                      h === "Actions" && "sticky right-0 bg-green-800 text-center"
                    )}
                  >
                    {h}
                  </TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={10} icon={FileText} message="Aucun contrat ne correspond aux filtres." />
              ) : rows.map(c => {
                const realise     = parseFloat(c.montant_realise ?? 0);
                const contracte   = parseFloat(c.montant_actuel ?? c.montant_initial ?? 0);
                const aRealiser   = contracte - realise;
                const pct         = contracte > 0 ? Math.min(100, Math.round((realise / contracte) * 100)) : 0;
                const isModified  = c.montant_actuel != null && c.montant_actuel !== c.montant_initial;
                const hasAvenants = (c.avenants ?? []).length > 0;
                const isOpen      = expanded[c.id] && hasAvenants;

                return (
                  <Fragment key={c.id}>
                    <TableRow clickable onClick={() => navigate(`/contrats/${c.id}`)} className="group">
                      <TableCell>
                        <span className="font-mono font-semibold text-ink-900">{c.code}</span>
                        {c.type_contrat && <p className="mt-0.5 text-xs text-ink-400">{c.type_contrat}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[150px] truncate">{c.chantier?.designation ?? "—"}</p>
                        {c.chantier?.code && <p className="font-mono text-xs text-ink-400">{c.chantier.code}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[140px] truncate">{c.soustraitant?.raison_sociale ?? "—"}</p>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <p className="truncate">{c.objet}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay
                          amount={contracte}
                          variant="small"
                          className={isModified ? "font-semibold text-green-700" : ""}
                        />
                        {isModified && (
                          <p className="mt-0.5 text-xs text-ink-400">init. {formatMontantCourt(parseFloat(c.montant_initial ?? 0))}</p>
                        )}
                        {c.nb_bons_commande === 0 && !["resilie", "archive"].includes(c.statut) && (
                          <span
                            className="mt-1 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                            title="Aucun bon de commande Sage X3 lié"
                          >
                            <AlertTriangle className="h-2.5 w-2.5" /> Aucun BC lié
                          </span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge statut={c.statut} /></TableCell>
                      <TableCell className="text-right">
                        {realise > 0 ? (
                          <>
                            <MoneyDisplay amount={realise} variant="small" className="font-semibold text-green-700" />
                            <div className="mt-1 flex items-center justify-end gap-1.5">
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-line-100">
                                <div className="h-full rounded-full bg-green-600" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-ink-400">{pct}%</span>
                            </div>
                          </>
                        ) : <span className="text-xs text-ink-400">0%</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay
                          amount={Math.abs(aRealiser)}
                          variant="small"
                          className={aRealiser < 0 ? "font-semibold text-red-600" : "text-ink-700"}
                        />
                        {aRealiser < 0 && <p className="mt-0.5 text-xs text-red-500">Dépassement</p>}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {hasAvenants ? (
                            <>
                              <button
                                onClick={() => toggleExpand(c.id)}
                                className="rounded p-0.5 text-ink-400 transition-colors hover:text-green-600"
                              >
                                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                              </button>
                              <span className="whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                {c.avenants.length} avenant{c.avenants.length > 1 ? "s" : ""}
                              </span>
                            </>
                          ) : <span className="ml-5 text-xs text-ink-300">—</span>}
                        </div>
                      </TableCell>
                      <TableCell
                        className="sticky right-0 bg-white text-center shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.08)] group-hover:bg-green-50/60"
                        onClick={e => e.stopPropagation()}
                      >
                        <ActionsMenu items={[
                          { label: "Consulter", icon: Eye, to: `/contrats/${c.id}` },
                          { label: "Modifier", icon: Pencil, to: `/contrats/${c.id}` },
                          { label: "Créer un décompte", icon: FilePlus, to: `/decomptes/nouveau?contrat_id=${c.id}`,
                            disabled: c.statut !== "actif", hint: "Réservé aux contrats actifs" },
                          { divider: true },
                          { label: "Archiver", icon: Archive, onClick: () => setConfirmArchive(c),
                            disabled: !["brouillon", "soumis", "resilie", "cloture"].includes(c.statut),
                            hint: "Résiliez ou clôturez d'abord le contrat" },
                          { label: "Supprimer", icon: Trash2, danger: true, onClick: () => setConfirmDelete(c),
                            disabled: !["brouillon", "soumis"].includes(c.statut),
                            hint: "Seul un brouillon peut être supprimé" },
                        ]} />
                      </TableCell>
                    </TableRow>

                    {isOpen && c.avenants.map(a => (
                      <tr key={`avn-${a.id}`} className="border-l-2 border-green-200 bg-green-50/30">
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-green-300">↳</span>
                            <span className="font-mono text-xs font-medium text-green-700">{a.code}</span>
                          </div>
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-xs italic text-ink-500" colSpan={2}>{a.objet}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs font-semibold ${parseFloat(a.montant) >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {parseFloat(a.montant) >= 0 ? "+" : ""}{formatMontantCourt(parseFloat(a.montant))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", AVENANT_STATUT_COLORS[a.statut] ?? "bg-surface-50 text-ink-500 border-line-200")}>
                            {a.statut}
                          </span>
                        </TableCell>
                        <TableCell colSpan={4}>
                          {a.date_signature && <span className="text-xs text-ink-400">{formatDate(a.date_signature)}</span>}
                        </TableCell>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={meta.total} onPage={setPage} />
        </div>
      )}

      {/* Modal création */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <Field label="Chantier" required error={errors.chantier_id}>
                <SearchSelect
                  value={form.chantier_id}
                  onChange={e => { set("chantier_id", e.target.value); set("soustraitant_id", ""); }}
                  className={cn(SELECT_CLS, errors.chantier_id && "border-red-400")}
                >
                  <option value="">— Sélectionner un chantier —</option>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.designation} ({c.code})</option>)}
                </SearchSelect>
              </Field>

              <Field label="Sous-traitant" required error={errors.soustraitant_id}>
                <SousTraitantSelect
                  chantierId={form.chantier_id}
                  value={form.soustraitant_id}
                  onChange={e => set("soustraitant_id", e.target.value)}
                  className={cn(SELECT_CLS, errors.soustraitant_id && "border-red-400")}
                />
              </Field>

              <Field label="Libellé" required error={errors.libelle}>
                <Input
                  value={form.libelle}
                  onChange={e => set("libelle", e.target.value)}
                  placeholder="Ex: Terrassement gros œuvre Bâtiment A"
                  className={errors.libelle ? "border-red-400" : ""}
                />
              </Field>

              <Field label="Objet du contrat" required error={errors.objet}>
                <Input
                  value={form.objet}
                  onChange={e => set("objet", e.target.value)}
                  placeholder="Description de la prestation"
                  className={errors.objet ? "border-red-400" : ""}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Type de contrat">
                  <SearchSelect value={form.type_contrat} onChange={e => set("type_contrat", e.target.value)} className={SELECT_CLS}>
                    <option value="">— Type —</option>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </SearchSelect>
                </Field>
                <div />
                <Field label="Date de début">
                  <Input type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)} />
                </Field>
                <Field label="Date de fin prévue">
                  <Input type="date" value={form.date_fin_prevue} onChange={e => set("date_fin_prevue", e.target.value)} />
                </Field>
              </div>

              <div className="border-t border-line-200 pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Conditions financières</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Retenue de garantie (%)">
                    <Input type="number" step="0.01" min="0" value={form.taux_rg} onChange={e => set("taux_rg", e.target.value)} />
                  </Field>
                  <Field label="TVA (%)">
                    <Input type="number" step="0.01" min="0" value={form.taux_tva} onChange={e => set("taux_tva", e.target.value)} />
                  </Field>
                  <Field label="Révision de prix (%)">
                    <Input type="number" step="0.01" min="0" value={form.taux_revision_prix} onChange={e => set("taux_revision_prix", e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Avance démarrage (%)">
                    <Input type="number" step="0.01" min="0" value={form.taux_avance} onChange={e => set("taux_avance", e.target.value)} />
                  </Field>
                  <Field label="Remb. avance / décompte (%)">
                    <Input type="number" step="0.01" min="0" value={form.taux_remboursement_avance} onChange={e => set("taux_remboursement_avance", e.target.value)} />
                  </Field>
                </div>
              </div>
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

      {/* Confirmation suppression */}
      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-ink-500" strokeWidth={1.75} />
              Supprimer le contrat
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {confirmDelete && (
              <>
                <p className="font-mono text-xs text-ink-500">{confirmDelete.code}</p>
                <p className="mt-2 text-[13px] text-ink-700">
                  Cette action est irréversible. Le contrat et ses données associées seront supprimés définitivement.
                </p>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation archivage */}
      {confirmArchive && (
        <ArchiveContratDialog
          contrat={{
            code: confirmArchive.code,
            statut: confirmArchive.statut,
            nbBc: confirmArchive.nb_bons_commande ?? 0,
            nbAvenants: (confirmArchive.avenants ?? []).length,
          }}
          pending={statutMut.isPending}
          onCancel={() => setConfirmArchive(null)}
          onConfirm={() => handleArchive(confirmArchive.id)}
        />
      )}
    </div>
  );
}
