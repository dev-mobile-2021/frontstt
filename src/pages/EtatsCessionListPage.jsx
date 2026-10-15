import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search, RotateCcw, ChevronLeft, ChevronRight, Plus, X, Loader2,
  FileText, FileSpreadsheet, CheckCircle2, Clock, FolderOpen, TrendingUp, Eye, Trash2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
function getAuthHeader() { const t = localStorage.getItem("stt_token"); return t ? { Authorization: `Bearer ${t}` } : {}; }
import { useEtatsCessionPaginated, useSaveEtatCession, useDeleteEtatCession } from "../hooks/useEtatsCession";
import { useContratsPaginated } from "../hooks/useContrats";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useToast } from "../context/ToastContext";
import { usePeutFaire } from "../hooks/useParametres";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonTable } from "../components/Skeleton";
import { formatMontantCourt, fmtNum } from "../utils/formatters";
import SearchSelect from "../components/SearchSelect";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "../components/Table";

// ─── MoisSelect ─────────────────────────────────────────────────
const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function buildMoisOptions(dateDebut) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const start = dateDebut
    ? new Date(dateDebut.slice(0, 7) + "-01")
    : new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const options = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    options.push({ key: `${y}-${String(m + 1).padStart(2, "0")}`, label: `25 ${MOIS_FR[m]} ${y}` });
    cur = new Date(y, m + 1, 1);
  }
  return options;
}

function moisToPeriode(key) {
  if (!key) return { periode_debut: "", periode_fin: "" };
  const [y, m] = key.split("-").map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const pad = n => String(n).padStart(2, "0");
  return { periode_debut: `${prevY}-${pad(prevM)}-26`, periode_fin: `${y}-${pad(m)}-25` };
}

function MoisSelect({ value, onChange, dateDebut }) {
  const options  = buildMoisOptions(dateDebut);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.key === value);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:border-[#087F3E] focus:outline-none">
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? selected.label : "— Sélectionner un mois —"}
        </span>
        <ChevronRight size={13} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-[999] mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <ul className="max-h-52 overflow-y-auto py-1">
            {options.map(o => (
              <li key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-green-50 hover:text-[#087F3E] ${value === o.key ? "bg-green-50 text-[#087F3E] font-medium" : "text-gray-700"}`}>
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const STATUTS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "soumis",    label: "Soumis" },
  { value: "valide",    label: "Validé / Arrêté" },
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

function KPICard({ icon: Icon, label, value, sub, color = "text-gray-500", bg = "bg-gray-50" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className={`mt-0.5 p-2 rounded-lg ${bg} ${color}`}><Icon size={16} /></div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function EtatsCessionListPage() {
  const navigate     = useNavigate();
  const { addToast }             = useToast();
  const { data: peutCreer }      = usePeutFaire("creer_etat_cession");
  const saveMut      = useSaveEtatCession();
  const deleteMut    = useDeleteEtatCession();
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, code }

  const [search,        setSearch]       = useState("");
  const [statut,        setStatut]       = useState("");
  const [contratFilter, setContratFilter] = useState("");
  const [sttFilter,     setSttFilter]    = useState("");
  const [chantierFilter,setChantierFilter] = useState("");
  const [page,          setPage]         = useState(1);
  const [debounced,     setDebounced]    = useState("");
  const [debouncedContrat, setDebouncedContrat] = useState("");
  const [debouncedStt,     setDebouncedStt]     = useState("");
  const [showModal,     setShowModal]    = useState(false);
  const [form,          setForm]         = useState(INIT);
  const [errors,        setErrors]       = useState({});
  const [selectedMois,  setSelectedMois] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedContrat(contratFilter.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [contratFilter]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedStt(sttFilter.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [sttFilter]);

  const filters = {
    code:             debounced         || undefined,
    statut:           statut            || undefined,
    contrat_code:     debouncedContrat  || undefined,
    soustraitant_nom: debouncedStt      || undefined,
    chantier_id:      chantierFilter ? parseInt(chantierFilter) : undefined,
    page,
    count: 15,
  };

  const { data, isLoading, isError } = useEtatsCessionPaginated(filters);
  const rows       = data?.data ?? [];
  const meta       = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;
  const hasFilter  = search || statut || debouncedContrat || debouncedStt || chantierFilter;

  const { data: allData } = useEtatsCessionPaginated({ count: 500 });
  const allEC = allData?.data ?? [];

  const { data: contratsData } = useContratsPaginated({ count: 200 });
  const contrats = contratsData?.data ?? [];

  const { data: sttData } = useSousTraitantsPaginated({ count: 500 });
  const soustraitants = sttData?.data ?? []; // used in modal form only

  const { data: chantiersData } = useChantiersPaginated({ count: 500 });
  const chantiers = chantiersData?.data ?? [];

  const kpis = useMemo(() => {
    const now = new Date();
    const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      ouverts:   allEC.filter(e => e.statut === "brouillon").length,
      enControle: allEC.filter(e => e.statut === "soumis").length,
      arretes:   allEC.filter(e => e.statut === "valide").length,
      totalMois: allEC
        .filter(e => (e.created_at ?? "").startsWith(moisCourant))
        .reduce((s, e) => s + parseFloat(e.montant_total ?? 0), 0),
    };
  }, [allEC]);

  // Auto-sélection du mois quand le contrat change dans le modal
  useEffect(() => {
    if (!form.contrat_id || !showModal) return;
    const contrat = contrats.find(c => String(c.id) === String(form.contrat_id));
    fetch(`${API_BASE}/etats-cession?contrat_id=${form.contrat_id}&per_page=1&sort=periode_fin&dir=desc`, {
      headers: getAuthHeader(),
    })
      .then(r => r.json())
      .then(res => {
        const last = res?.data?.[0];
        let debutStr;
        if (last?.periode_fin) {
          const d = new Date(last.periode_fin);
          d.setDate(d.getDate() + 1);
          debutStr = d.toISOString().slice(0, 10);
        } else if (contrat?.date_debut) {
          debutStr = contrat.date_debut.slice(0, 10);
        } else return;
        // Retrouve le mois correspondant (début = 26 du mois M-1, donc mois cible = mois de debutStr + 1)
        const d = new Date(debutStr);
        const targetY = d.getDate() >= 26 ? (d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()) : d.getFullYear();
        const targetM = d.getDate() >= 26 ? (d.getMonth() + 1) % 12 + 1 : d.getMonth() + 1;
        const key = `${targetY}-${String(targetM).padStart(2, "0")}`;
        setSelectedMois(key);
        const { periode_debut, periode_fin } = moisToPeriode(key);
        setForm(f => ({ ...f, periode_debut, periode_fin }));
      })
      .catch(() => {});
  }, [form.contrat_id, showModal]);

  async function handleDelete() {
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      addToast(`État ${confirmDelete.code} supprimé.`, "success");
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la suppression.", "error");
    } finally {
      setConfirmDelete(null);
    }
  }

  function reset()     { setSearch(""); setStatut(""); setContratFilter(""); setSttFilter(""); setChantierFilter(""); setPage(1); }
  function set(k, v)  { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }
  function openModal() { setForm(INIT); setErrors({}); setSelectedMois(""); setShowModal(true); }

  async function exportExcel() {
    try {
      const params = new URLSearchParams();
      if (statut) params.set("statut", statut);
      const resp = await fetch(`${API_BASE}/excel/etatscessions?${params.toString()}`, { headers: getAuthHeader() });
      if (!resp.ok) throw new Error("Erreur export");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `etatscessions-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast("Erreur lors de l'export Excel.", "error");
    }
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
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur.", "error");
    }
  }

  const fmtPeriode = (debut, fin) => {
    const d = debut ? new Date(debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : null;
    const f = fin   ? new Date(fin).toLocaleDateString("fr-FR",   { day: "2-digit", month: "short", year: "numeric" }) : null;
    if (d && f) return `${d} → ${f}`;
    return d ?? "—";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="États de cession"
        subtitle="Arrêtés périodiques MTX/MTL/RH, contrôlés et visés, consommés par les décomptes"
        action={
          <div className="flex items-center gap-2">
{peutCreer && (
              <button onClick={openModal}
                className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
                <Plus size={16} /> Nouvel état de cession
              </button>
            )}
          </div>
        }
      />

      {/* KPI Bandeau */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={FolderOpen}    label="États ouverts"           value={kpis.ouverts}    sub="En brouillon"            color="text-gray-500"    bg="bg-gray-100" />
        <KPICard icon={Clock}         label="États en contrôle"       value={kpis.enControle} sub="Soumis, en attente"       color="text-amber-600"   bg="bg-amber-50" />
        <KPICard icon={CheckCircle2}  label="Arrêtés"                 value={kpis.arretes}    sub="Validés, consommables"    color="text-[#087F3E]"   bg="bg-[#E8F5EE]" />
        <KPICard icon={TrendingUp}    label="Total valorisé (mois)"   value={formatMontantCourt(kpis.totalMois)} sub="Mois courant"         color="text-violet-600"  bg="bg-violet-50" />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Code, contrat, sous-traitant…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
          </div>
          <SearchSelect value={statut} onChange={e => { setStatut(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </SearchSelect>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              placeholder="Code contrat (ex: CTR-CSE-2305)"
              value={contratFilter}
              onChange={e => setContratFilter(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] w-52"
            />
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              placeholder="Sous-traitant…"
              value={sttFilter}
              onChange={e => setSttFilter(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] w-44"
            />
          </div>
          <SearchSelect value={chantierFilter} onChange={e => { setChantierFilter(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 max-w-[200px]">
            <option value="">Tous les chantiers</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.designation}</option>)}
          </SearchSelect>
          {hasFilter && (
            <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#087F3E] transition-colors">
              <RotateCcw size={13} /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
          Impossible de charger les états de cession.
        </div>
      ) : (
        <div className="space-y-2">
          <Table>
            <TableHeader>
              <TableRow>
                {["Code", "Contrat / STT", "Chantier", "Période", "MTX", "MTL", "RH", "GASOIL", "Total", "Statut", ""].map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={11} icon={FileText} message="Aucun état de cession ne correspond aux filtres." />
              ) : rows.map(e => (
                <TableRow key={e.id} clickable onClick={() => navigate(`/etats-cession/${e.id}`)}>
                  <TableCell><span className="font-mono font-semibold">{e.code}</span></TableCell>
                  <TableCell>
                    <p className="font-mono text-gray-700">{e.contrat?.code ?? "—"}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{e.contrat?.soustraitant?.raison_sociale}</p>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[120px] truncate">{e.contrat?.chantier?.designation ?? "—"}</TableCell>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">{fmtPeriode(e.periode_debut, e.periode_fin)}</TableCell>
                  {["MTX", "MTL", "RH", "GASOIL"].map(type => {
                    const lignes = e.lignes ?? [];
                    const total = lignes.filter(l => l.poste === type).reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);
                    const hasType = lignes.some(l => l.poste === type);
                    return (
                      <TableCell key={type} className="text-xs tabular-nums">
                        {hasType
                          ? <span className="font-medium text-gray-700">{fmtNum(Math.round(total))} FCFA</span>
                          : <span className="text-gray-300">—</span>}
                      </TableCell>
                    );
                  })}
                  <TableCell><MoneyDisplay amount={e.montant_total ?? 0} variant="small" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge statut={e.statut} />
                      {e.statut === "brouillon" && (e.lignes ?? []).some(l => !l.prix_unitaire || parseFloat(l.prix_unitaire) <= 0) && (
                        <span title="Lignes sans prix — soumission bloquée" className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          ⚠ Prix
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={ev => ev.stopPropagation()}>
                    {e.statut === "brouillon" && (
                      <button
                        onClick={() => setConfirmDelete({ id: e.id, code: e.code })}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-gray-500">Page {meta.current_page} / {meta.last_page} — {meta.total} résultat{meta.total !== 1 ? "s" : ""}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${n === page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-100 text-gray-600"}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-50"><Trash2 size={18} className="text-red-500" /></div>
              <h2 className="text-base font-bold text-gray-900">Supprimer {confirmDelete.code} ?</h2>
            </div>
            <p className="text-sm text-gray-500">Toutes les lignes seront supprimées. Cette action est irréversible.</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteMut.isPending && <Loader2 size={14} className="animate-spin" />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">Nouvel état de cession</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Contrat" required>
                <SearchSelect value={form.contrat_id} onChange={e => set("contrat_id", e.target.value)}
                  className={`${INPUT} ${errors.contrat_id ? "border-red-400" : ""}`}>
                  <option value="">— Sélectionner un contrat actif —</option>
                  {contrats.filter(c => c.statut === "actif").map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.soustraitant?.raison_sociale ?? "?"}</option>
                  ))}
                </SearchSelect>
                {errors.contrat_id && <p className="text-xs text-red-500 mt-1">{errors.contrat_id}</p>}
              </Field>
              <Field label="Mois" required>
                <MoisSelect
                  value={selectedMois}
                  dateDebut={contrats.find(c => String(c.id) === String(form.contrat_id))?.date_debut}
                  onChange={key => {
                    setSelectedMois(key);
                    const { periode_debut, periode_fin } = moisToPeriode(key);
                    setForm(f => ({ ...f, periode_debut, periode_fin }));
                    setErrors(e => ({ ...e, periode_debut: undefined, periode_fin: undefined }));
                  }}
                />
                {form.periode_debut && form.periode_fin && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Période : <span className="font-medium text-gray-700">
                      {new Date(form.periode_debut + "T00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span> → <span className="font-medium text-gray-700">
                      {new Date(form.periode_fin + "T00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </p>
                )}
                {(errors.periode_debut || errors.periode_fin) && <p className="text-xs text-red-500 mt-1">Sélectionner un mois</p>}
              </Field>
              <Field label="Observations">
                <textarea value={form.observations} onChange={e => set("observations", e.target.value)}
                  rows={2} className={INPUT} placeholder="Notes optionnelles…" />
              </Field>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
                <button type="submit" disabled={saveMut.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {saveMut.isPending && <Loader2 size={14} className="animate-spin" />} Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
