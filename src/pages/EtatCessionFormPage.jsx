import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, ChevronDown, Save, Loader2, Plus, X, Trash2,
  CheckCircle2, XCircle, Search, FileText, Fuel, FileDown, Sheet, RotateCcw,
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/Table";

// ─── MoisSelect : sélection "25 Mois YYYY" ──────────────────────
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

// Pour une clé "YYYY-MM" (représente le 25 de ce mois), calcule :
// periode_debut = 26 du mois précédent, periode_fin = 25 du mois
function computePeriodeFromMois(moisKey) {
  if (!moisKey) return { periode_debut: "", periode_fin: "" };
  const [y, m] = moisKey.split("-").map(Number);
  // mois précédent
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear  = m === 1 ? y - 1 : y;
  const pad = n => String(n).padStart(2, "0");
  return {
    periode_debut: `${prevYear}-${pad(prevMonth)}-26`,
    periode_fin:   `${y}-${pad(m)}-25`,
  };
}

function MoisSelect({ value, onChange, options }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);

  const selected = options.find(o => o.key === value);
  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(k) { onChange(k); setOpen(false); setSearch(""); }

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-line-200 bg-white px-2.5 text-[13px] transition-colors hover:border-ink-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100">
        <span className={selected ? "truncate text-ink-900" : "text-ink-400"}>
          {selected ? selected.label : "— Sélectionner un mois —"}
        </span>
        <ChevronDown className={`ml-2 h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 z-[999] mt-1 w-full overflow-hidden rounded-md border border-line-200 bg-white shadow-popover">
          <div className="border-b border-line-100 p-2">
            <div className="flex items-center gap-2 rounded-md bg-surface-50 px-3 py-1.5">
              <Search className="h-3 w-3 shrink-0 text-ink-400" />
              <input autoFocus type="text" placeholder="Rechercher un mois..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-ink-900 outline-none placeholder:text-ink-400" />
              {search && <button type="button" onClick={() => setSearch("")}><X className="h-3 w-3 text-ink-400 hover:text-ink-700" /></button>}
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto scrollbar-thin p-1">
            {filtered.length === 0 && <li className="px-3 py-3 text-center text-[13px] text-ink-400">Aucun résultat</li>}
            {filtered.map(o => (
              <li key={o.key} onClick={() => pick(o.key)}
                className={`cursor-pointer rounded-sm px-3 py-1.5 text-[13px] transition-colors hover:bg-green-50 hover:text-green-700 ${value === o.key ? "bg-green-50 font-medium text-green-700" : "text-ink-900"}`}>
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── ContratSelect : sélection avec search ──────────────────────
function ContratSelect({ value, onChange, contrats }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);

  const actifs   = contrats.filter(c => c.statut === "actif");
  const selected = actifs.find(c => String(c.id) === String(value));
  const filtered = actifs.filter(c => {
    if (!search) return true;
    const txt = `${c.code} ${c.soustraitant?.raison_sociale ?? ""} ${c.objet ?? ""}`.toLowerCase();
    return txt.includes(search.toLowerCase());
  });

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(id) { onChange(id); setOpen(false); setSearch(""); }

  function render(c) {
    return `${c.code} · ${c.soustraitant?.raison_sociale ?? "?"} · ${c.objet ?? ""}`;
  }

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-line-200 bg-white px-2.5 text-[13px] transition-colors hover:border-ink-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100">
        <span className={selected ? "truncate text-left text-ink-900" : "text-ink-400"}>
          {selected ? render(selected) : "— Sélectionner un contrat actif —"}
        </span>
        <ChevronDown className={`ml-2 h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 z-[999] mt-1 w-full overflow-hidden rounded-md border border-line-200 bg-white shadow-popover">
          <div className="border-b border-line-100 p-2">
            <div className="flex items-center gap-2 rounded-md bg-surface-50 px-3 py-1.5">
              <Search className="h-3 w-3 shrink-0 text-ink-400" />
              <input autoFocus type="text" placeholder="Rechercher (code, STT, objet)..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-ink-900 outline-none placeholder:text-ink-400" />
              {search && <button type="button" onClick={() => setSearch("")}><X className="h-3 w-3 text-ink-400 hover:text-ink-700" /></button>}
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto scrollbar-thin p-1">
            {filtered.length === 0 && <li className="px-3 py-3 text-center text-[13px] text-ink-400">Aucun contrat actif</li>}
            {filtered.map(c => (
              <li key={c.id} onClick={() => pick(String(c.id))}
                className={`cursor-pointer rounded-sm px-3 py-1.5 text-[13px] transition-colors hover:bg-green-50 hover:text-green-700 ${String(value) === String(c.id) ? "bg-green-50 font-medium text-green-700" : "text-ink-900"}`}>
                {render(c)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import {
  useEtatCession, useSaveEtatCession, useSaveLigneEC,
  useDeleteLigneEC, useDeleteLignesPosteEC, useEtatCessionStatut, useEtatCessionStatutBloc, useDeleteEtatCession,
} from "../hooks/useEtatsCession";
import { useContratsPaginated } from "../hooks/useContrats";
import { useContratBaremes } from "../hooks/useContratBaremes";
import { usePeutFaire } from "../hooks/useParametres";
import { x3Service } from "../services/x3Service";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { SkeletonCard } from "../components/Skeleton";
import SearchSelect from "../components/SearchSelect";

const fmtNum  = n => {
  const v = n ?? 0;
  const hasDecimals = v % 1 !== 0;
  return new Intl.NumberFormat("fr-FR", hasDecimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {}).format(v);
};
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Rôles DCG — ne voient pas le bloc RH
const DCG_ROLES = ["DCG", "Assistant DCG"];

const POSTE_CONFIG = {
  MTX: {
    label:  "Cession Matériaux (MTX)",
    color:  { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", dot: "bg-green-600", btn: "text-green-700" },
    prixEditable: true,
  },
  GASOIL: {
    label:  "Gasoil",
    color:  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500", btn: "text-amber-700" },
    prixEditable: true,
  },
  MTL: {
    label:  "Cession Matériel (MTL)",
    color:  { bg: "bg-surface-50", border: "border-line-200", badge: "bg-line-100 text-ink-700", dot: "bg-ink-500", btn: "text-ink-700" },
    prixEditable: false,
    gmao: true,
  },
  RH: {
    label:  "Ressources Humaines (RH)",
    color:  { bg: "bg-green-50", border: "border-green-300", badge: "bg-green-100 text-green-800", dot: "bg-green-700", btn: "text-green-700" },
    prixEditable: false,
  },
};

const LIGNE_INIT = { bareme_cb_id: "", designation: "", unite: "", quantite: "", prix_unitaire: "" };

// Mapping poste → type barème
const POSTE_TO_TYPE = { MTX: "mtx", GASOIL: "gasoil", MTL: "mtl", RH: "rh" };

// Labels statuts bloc
const STATUT_BLOC_LABEL = {
  vide:         { label: "Vide",               color: "bg-surface-50 text-ink-500 border border-line-200" },
  alimente:     { label: "Alimenté",           color: "bg-green-50 text-green-700 border border-green-200" },
  qte_visees:   { label: "Quantités visées",   color: "bg-amber-50 text-amber-700 border border-amber-200" },
  prix_valides: { label: "Prix validés",       color: "bg-green-100 text-green-700 border border-green-300" },
  arrete:       { label: "Arrêté",             color: "bg-green-100 text-green-800 border border-green-300" },
};

// ─── Bons de Transfert dynamiques ────────────────────────────────
const EC_API = import.meta.env.VITE_API_BASE + "/api";
function getAuthHdr() {
  const t = localStorage.getItem("stt_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function BtDocumentsBloc({ x3Config }) {
  const periode = x3Config?.periode_debut?.slice(0, 7) ?? null; // YYYY-MM

  const { data: btDocs = [], isLoading } = useQuery({
    queryKey: ["bt_documents", x3Config?.chantier_code, x3Config?.soustraitant_code, periode],
    enabled: !!(x3Config?.chantier_code && x3Config?.soustraitant_code && periode),
    queryFn: () => axios.get(`${EC_API}/bt-documents`, {
      headers: getAuthHdr(),
      params: {
        chantier_code:     x3Config.chantier_code,
        soustraitant_code: x3Config.soustraitant_code,
        periode,
      },
    }).then(r => r.data.data ?? []),
  });

  async function handleDownload(doc) {
    const resp = await fetch(`${EC_API}/bt-documents/${doc.id}/download`, { headers: getAuthHdr() });
    const blob = await resp.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = doc.filename; a.click();
  }

  if (isLoading) return (
    <div className="border-b border-line-100 bg-surface-50 px-5 py-3 text-xs text-ink-500">
      Chargement des bons de transfert…
    </div>
  );

  if (!btDocs.length) return null;

  return (
    <div className="border-b border-line-100 bg-surface-50 px-5 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        <FileText className="h-3 w-3" /> Bons de transfert ({btDocs.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {btDocs.map(doc => (
          <button key={doc.id} onClick={() => handleDownload(doc)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-200 bg-white px-2.5 py-1 font-mono text-xs text-green-700 transition-colors hover:border-green-400 hover:bg-green-50">
            <FileDown className="h-2.5 w-2.5" />
            {doc.filename}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Bloc par poste ──────────────────────────────────────────────
function PosteSection({ poste, lignes, canEdit, etatId, contratBaremes, x3Config, statutBloc, onStatutBloc, viseQtePar, viseQteLe, visePrixPar, visePrixLe, onDownloadBon }) {
  const { addToast }                = useToast();
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(LIGNE_INIT);
  const [confirmDel, setConfirmDel] = useState(null);
  const [x3Loading, setX3Loading]     = useState(false);
  const [gmaoLoading, setGmaoLoading] = useState(false);
  const [reloadingId, setReloadingId] = useState(null);
  const x3LockRef   = useRef(false);
  const gmaoLockRef = useRef(false);

  const saveMut          = useSaveLigneEC();
  const deleteMut        = useDeleteLigneEC();
  const deleteLignesMut  = useDeleteLignesPosteEC();

  const cfg   = POSTE_CONFIG[poste];
  const c     = cfg.color;
  const total = lignes.reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);

  // Articles du barème contrat pour ce type (MTX/MTL/RH) — vide pour GASOIL
  const baremeType = POSTE_TO_TYPE[poste] ?? null;
  const articlesBareme = baremeType
    ? contratBaremes.filter(cb => cb.bareme?.type === baremeType)
    : [];
  const useBareme = articlesBareme.length > 0;

  // Quand l'utilisateur sélectionne un article du barème
  function handleSelectArticle(cbId) {
    if (!cbId) { setForm(LIGNE_INIT); return; }
    const cb = articlesBareme.find(a => String(a.id) === String(cbId));
    if (!cb) return;
    const prix = cb.prix_contrat != null ? parseFloat(cb.prix_contrat) : parseFloat(cb.bareme?.prix_unitaire ?? 0);
    setForm(f => ({
      ...f,
      bareme_cb_id:  cb.id,
      designation:   cb.bareme?.designation ?? "",
      unite:         cb.bareme?.unite ?? "",
      prix_unitaire: String(prix),
    }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.designation) return addToast("Désignation obligatoire.", "error");
    if (!form.quantite)    return addToast("Quantité obligatoire.", "error");
    if (cfg.prixEditable && !form.prix_unitaire) return addToast("Prix unitaire obligatoire.", "error");
    try {
      await saveMut.mutateAsync({
        etat_cession_id: parseInt(etatId, 10),
        poste,
        designation:    form.designation,
        unite:          form.unite || null,
        quantite:       parseFloat(form.quantite),
        prix_unitaire:  parseFloat(form.prix_unitaire || 0),
      });
      addToast("Ligne ajoutée.", "success");
      setShowForm(false);
      setForm(LIGNE_INIT);
    } catch (err) {
      addToast(err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      setConfirmDel(null);
    } catch {
      addToast("Erreur suppression.", "error");
    }
  }

  // Trouve le prix effectif pour un article X3 (prix_contrat > prix_herite > prix_base)
  function getPrixBareme(codeArticle) {
    const cb = contratBaremes.find(cb => cb.bareme?.code === codeArticle);
    if (!cb) return null;
    return cb.prix_contrat ?? cb.prix_herite ?? cb.bareme?.prix_unitaire ?? null;
  }

  async function handleX3Import() {
    if (x3LockRef.current) return;
    if (!x3Config?.chantier_code) return addToast("Ce chantier n'a pas de code X3 configuré.", "error");
    x3LockRef.current = true;
    setX3Loading(true);
    try {
      if (!x3Config?.soustraitant_code) return addToast("Le sous-traitant n'a pas de code STT configuré.", "error");
      const rows = await x3Service.getCessionsMtx({
        chantier_code:    x3Config.chantier_code,
        soustraitant_code: x3Config.soustraitant_code,
        periode_debut:    x3Config.periode_debut,
        periode_fin:      x3Config.periode_fin,
      });
      const gasoilCodes = contratBaremes
        .filter(cb => cb.bareme?.type === "gasoil")
        .map(cb => cb.bareme?.code);
      const filtered = poste === "GASOIL"
        ? rows.filter(r => gasoilCodes.includes(r.code_article))
        : rows.filter(r => !gasoilCodes.includes(r.code_article));

      if (filtered.length === 0) return addToast("Aucune donnée X3 pour cette période.", "info");

      // Supprimer toutes les lignes du poste en une seule requête
      await deleteLignesMut.mutateAsync({ etatId: parseInt(etatId, 10), poste });

      for (const row of filtered) {
        const prixX3     = parseFloat(row.prix_unitaire);
        const prixBareme = getPrixBareme(row.code_article);
        const prix       = !isNaN(prixX3) && prixX3 > 0 ? prixX3 : (prixBareme ?? 0);
        await saveMut.mutateAsync({
          etat_cession_id: parseInt(etatId, 10),
          poste,
          code_article:  row.code_article ?? null,
          date_sortie:   row.date_sortie ?? null,
          ref_bs:        row.ref_bs ?? null,
          ref_br:        row.ref_br ?? null,
          designation:   row.designation,
          unite:         row.unite ?? null,
          quantite:      parseFloat(row.quantite) || 0,
          prix_unitaire: prix,
        });
      }
      addToast(`${filtered.length} lignes importées depuis X3.`, "success");
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Erreur inconnue";
      addToast(`Erreur import X3 : ${msg}`, "error");
    } finally {
      x3LockRef.current = false;
      setX3Loading(false);
    }
  }

  async function handleGmaoImport() {
    if (gmaoLockRef.current) return;
    if (!x3Config?.chantier_code) return addToast("Ce chantier n'a pas de code X3 configuré.", "error");
    if (!x3Config?.soustraitant_code) return addToast("Le sous-traitant n'a pas de code STT configuré.", "error");
    gmaoLockRef.current = true;
    setGmaoLoading(true);
    try {
      const resp = await axios.get(`${EC_API}/gmao/pointages`, {
        headers: getAuthHdr(),
        params: {
          debut:             x3Config.periode_debut,
          fin:               x3Config.periode_fin,
          chantier_code:     x3Config.chantier_code,
          soustraitant_code: x3Config.soustraitant_code,
        },
      });
      const gmaoData = resp.data?.data ?? {};
      const lignesGmao = gmaoData.lignes ?? [];

      if (lignesGmao.length === 0) return addToast("Aucune donnée GMAO pour cette période.", "info");

      await deleteLignesMut.mutateAsync({ etatId: parseInt(etatId, 10), poste: "MTL" });

      for (const row of lignesGmao) {
        await saveMut.mutateAsync({
          etat_cession_id: parseInt(etatId, 10),
          poste:           "MTL",
          code_article:    row.equipement?.code ?? null,
          date_sortie:     row.date ?? null,
          designation:     `${row.equipement?.libelle ?? ""} — ${row.bareme?.type ?? ""}`.trim(),
          unite:           row.bareme?.mode ?? "horaire",
          quantite:        parseFloat(row.heures) || 0,
          prix_unitaire:   parseFloat(row.bareme?.taux) || 0,
        });
      }
      addToast(`${lignesGmao.length} lignes importées depuis la GMAO.`, "success");
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Erreur inconnue";
      addToast(`Erreur import GMAO : ${msg}`, "error");
    } finally {
      gmaoLockRef.current = false;
      setGmaoLoading(false);
    }
  }

  async function handleReloadPrix(l) {
    const prix = getPrixBareme(l.code_article);
    if (prix == null) return addToast("Article introuvable dans le barème du contrat.", "error");
    setReloadingId(l.id);
    try {
      await saveMut.mutateAsync({
        id:              l.id,
        etat_cession_id: parseInt(etatId, 10),
        poste,
        code_article:    l.code_article ?? null,
        date_sortie:     l.date_sortie  ?? null,
        ref_bs:          l.ref_bs       ?? null,
        ref_br:          l.ref_br       ?? null,
        designation:     l.designation  ?? "",
        unite:           l.unite        ?? "",
        quantite:        l.quantite     ?? 0,
        prix_unitaire:   parseFloat(prix),
      });
      addToast("Prix rechargé depuis le barème contrat.", "success");
    } catch (err) {
      addToast(err?.response?.data?.error ?? "Erreur.", "error");
    } finally {
      setReloadingId(null);
    }
  }

  const montantPreview = form.quantite && form.prix_unitaire
    ? parseFloat(form.quantite) * parseFloat(form.prix_unitaire)
    : 0;

  return (
    <div className={`overflow-hidden rounded-xl border shadow-xs ${c.border}`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5 ${c.bg} ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${c.dot}`} />
          <span className="text-[13px] font-semibold text-ink-900">{cfg.label}</span>
          {cfg.gmao && <span className="rounded-full border border-ink-900/15 bg-white px-2 py-0.5 text-[10px] font-medium text-ink-700">GMAO</span>}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.badge}`}>
            {lignes.length} ligne{lignes.length !== 1 ? "s" : ""}
          </span>
          {statutBloc && (() => {
            const s = STATUT_BLOC_LABEL[statutBloc] ?? STATUT_BLOC_LABEL.vide;
            return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>;
          })()}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tabular-nums text-ink-900">{fmtNum(total)} FCFA</span>
          {/* Boutons validation bloc */}
          {statutBloc === "alimente" && onStatutBloc && (
            <button onClick={() => onStatutBloc(poste.toLowerCase(), "qte_visees")}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-amber-500 px-2.5 text-xs font-medium text-white hover:bg-amber-600">
              <CheckCircle2 className="h-3 w-3" /> Viser quantités
            </button>
          )}
          {statutBloc === "qte_visees" && onStatutBloc && (
            <>
              <button onClick={() => onStatutBloc(poste.toLowerCase(), "prix_valides")}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-green-600 px-2.5 text-xs font-medium text-white hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3" /> Valider les prix
              </button>
              <button onClick={() => onStatutBloc(poste.toLowerCase(), "alimente")}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-red-500 px-2.5 text-xs font-medium text-white hover:bg-red-600">
                <XCircle className="h-3 w-3" /> Rejeter
              </button>
            </>
          )}
          {/* Charger X3 pour MTX et GASOIL */}
          {canEdit && (poste === "MTX" || poste === "GASOIL") && x3Config?.chantier_code && (
            <button onClick={handleX3Import} disabled={x3Loading}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-green-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60">
              {x3Loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              Charger X3
            </button>
          )}
          {canEdit && poste === "MTL" && x3Config?.chantier_code && (
            <button onClick={handleGmaoImport} disabled={gmaoLoading}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-ink-700 px-2.5 text-xs font-medium text-white transition-colors hover:bg-ink-900 disabled:opacity-60">
              {gmaoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              Charger GMAO
            </button>
          )}
          {canEdit && !cfg.gmao && poste !== "MTX" && poste !== "GASOIL" && statutBloc !== "prix_valides" && (
            <button onClick={() => { setShowForm(s => !s); setForm(LIGNE_INIT); }}
              className={`text-xs font-medium hover:underline ${c.btn}`}>
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Traceabilité */}
      {(viseQtePar || visePrixPar) && (
        <div className="flex flex-wrap gap-3 border-b border-line-100 bg-surface-50 px-5 py-2 text-xs text-ink-500">
          {viseQtePar && (
            <span>
              Quantités visées par <strong className="text-ink-900">{viseQtePar}</strong>
              {viseQteLe && <> le {new Date(viseQteLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</>}
            </span>
          )}
          {visePrixPar && (
            <span>
              · Montants visés par <strong className="text-ink-900">{visePrixPar}</strong>
              {visePrixLe && <> le {new Date(visePrixLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</>}
            </span>
          )}
        </div>
      )}

      {/* Bons de transfert (MTX seulement) */}
      {poste === "MTX" && <BtDocumentsBloc x3Config={x3Config} />}

      {/* GMAO notice */}
      {cfg.gmao && lignes.length === 0 && canEdit && (
        <div className="bg-surface-50 px-5 py-6 text-center text-[13px] text-ink-500">
          Cliquez sur <strong className="text-ink-900">Charger GMAO</strong> pour importer les heures engins de cette période.
        </div>
      )}

      {/* Tableau lignes */}
      {(!cfg.gmao || lignes.length > 0) && lignes.length === 0 && !showForm ? (
        <div className="px-5 py-6 text-center text-[13px] text-ink-400">
          Aucune ligne. {canEdit && "Cliquez sur « Ajouter » pour commencer."}
        </div>
      ) : lignes.length > 0 && (
        <div className="px-5 pt-3 pb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code article</TableHead>
                <TableHead>Désignation</TableHead>
                {poste === "MTX" && <TableHead>Date sortie</TableHead>}
                {poste === "MTX" && <TableHead>Réf. BS</TableHead>}
                {poste === "MTX" && <TableHead>Réf. BR</TableHead>}
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Prix unit.</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                {canEdit && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map(l => (
                <TableRow key={l.id}>
                  <TableCell>
                    {l.code_article
                      ? <span className="rounded bg-line-100 px-1.5 py-0.5 font-mono text-xs text-ink-700">{l.code_article}</span>
                      : <span className="text-ink-300">—</span>}
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-ink-900">{l.designation}</TableCell>
                  {poste === "MTX" && <TableCell className="text-xs text-ink-500">{l.date_sortie ? new Date(l.date_sortie).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric"}) : "—"}</TableCell>}
                  {poste === "MTX" && <TableCell><span className="font-mono text-xs text-green-700">{l.ref_bs ?? "—"}</span></TableCell>}
                  {poste === "MTX" && <TableCell><span className="font-mono text-xs text-green-600">{l.ref_br ?? "—"}</span></TableCell>}
                  <TableCell className="text-xs uppercase text-ink-500">{l.unite || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-ink-900">{fmtNum(l.quantite)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs">
                    <span className={`tabular-nums ${!l.prix_unitaire || parseFloat(l.prix_unitaire) <= 0 ? "font-semibold text-amber-700" : "text-ink-700"}`}>
                      {!l.prix_unitaire || parseFloat(l.prix_unitaire) <= 0
                        ? <span title="Prix manquant">⚠ 0 FCFA</span>
                        : <>{fmtNum(l.prix_unitaire)} FCFA</>}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-ink-900">{fmtNum(l.montant)} FCFA</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {l.code_article && (
                          <button onClick={() => handleReloadPrix(l)} disabled={reloadingId === l.id} title="Recharger le prix depuis le barème contrat"
                            className="text-ink-400 transition-colors hover:text-green-600 disabled:opacity-40">
                            {reloadingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <button onClick={() => setConfirmDel(l.id)} className="text-ink-400 transition-colors hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Total footer */}
          <div className="mt-1 flex items-center justify-between border-t border-line-100 px-3 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Total {cfg.label}</span>
            <span className="font-bold tabular-nums text-ink-900">{fmtNum(total)} FCFA</span>
          </div>
        </div>
      )}

      {/* Formulaire ajout (barème ou libre) */}
      {showForm && canEdit && useBareme && (
        <div className={`border-t px-5 py-4 ${c.border} ${c.bg}`}>
          <form onSubmit={handleAdd}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">Article du barème *</label>
                <SearchSelect value={form.bareme_cb_id} onChange={e => handleSelectArticle(e.target.value)}
                  className="h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100" autoFocus>
                  <option value="">— Sélectionner un article —</option>
                  {articlesBareme.map(cb => (
                    <option key={cb.id} value={cb.id}>
                      {cb.bareme?.designation} — {fmtNum(cb.prix_contrat ?? cb.bareme?.prix_unitaire)} FCFA / {cb.bareme?.unite}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              {form.bareme_cb_id && (
                <div className="grid grid-cols-[120px_auto] items-end gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">Quantité *</label>
                    <input type="number" value={form.quantite}
                      onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                      required min="0" step="any" placeholder="0" autoFocus
                      className="h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] tabular-nums text-ink-900 placeholder:text-ink-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100" />
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <button type="submit" disabled={saveMut.isPending}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-green-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800 disabled:opacity-60">
                      {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} OK
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="rounded-md p-2 text-ink-400 hover:text-ink-900"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
              {!form.bareme_cb_id && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForm(false)} className="text-xs text-ink-500 hover:text-ink-900">Annuler</button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {showForm && canEdit && !useBareme && (
        <div className={`border-t px-5 py-4 ${c.border} ${c.bg}`}>
          <form onSubmit={handleAdd}>
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_70px_90px_110px_auto]">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">Désignation *</label>
                  <input type="text" value={form.designation}
                    onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                    autoFocus required placeholder="Description…"
                    className="h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">Unité</label>
                  <input type="text" value={form.unite}
                    onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}
                    placeholder="T, L…"
                    className="h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">Quantité *</label>
                  <input type="number" value={form.quantite}
                    onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                    required min="0" step="any" placeholder="0"
                    className="h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] tabular-nums text-ink-900 placeholder:text-ink-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-500">Prix unit. {cfg.prixEditable && <span className="text-amber-600">*</span>}</label>
                  <input type="number" value={form.prix_unitaire}
                    onChange={e => setForm(f => ({ ...f, prix_unitaire: e.target.value }))}
                    required={cfg.prixEditable} min="0" step="any" placeholder="0"
                    disabled={!cfg.prixEditable}
                    className={`h-9 w-full rounded-md border px-2.5 text-[13px] tabular-nums outline-none ${cfg.prixEditable ? "border-amber-300 bg-white text-ink-900 placeholder:text-ink-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100" : "cursor-not-allowed border-line-200 bg-line-100 text-ink-500"}`} />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <button type="submit" disabled={saveMut.isPending}
                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-green-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800 disabled:opacity-60">
                    {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} OK
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-md p-2 text-ink-400 hover:text-ink-900"><X className="h-4 w-4" /></button>
                </div>
              </div>

            {montantPreview > 0 && (
              <p className="mt-2 text-xs font-medium tabular-nums text-green-700">
                Montant : {fmtNum(montantPreview)} FCFA
              </p>
            )}
          </form>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDel && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
          <div className="dialog-content w-full max-w-sm rounded-lg border border-line-200 bg-white shadow-popover">
            <div className="border-b border-line-200 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Trash2 className="h-4 w-4 text-ink-500" strokeWidth={1.75} />
                Supprimer la ligne ?
              </h3>
              <p className="mt-1 text-xs text-ink-500">Cette action est irréversible.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line-200 px-5 py-3">
              <button onClick={() => setConfirmDel(null)}
                className="inline-flex h-9 items-center rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 hover:bg-surface-50 hover:border-ink-300">
                Annuler
              </button>
              <button onClick={() => handleDelete(confirmDel)} disabled={deleteMut.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 transition-colors hover:bg-ink-900 hover:text-white disabled:opacity-60">
                {deleteMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Formulaire de création ──────────────────────────────────────
function CreationForm({ contrats, form, set, saving, onSubmit, onCancel, inputCls, fmtDate }) {
  const EC_API = import.meta.env.VITE_API_BASE + "/api";
  const [selectedMois, setSelectedMois] = useState("");

  const contrat = contrats.find(c => String(c.id) === String(form.contrat_id));
  const moisOptions = buildMoisOptions(contrat?.date_debut);

  // Quand le contrat change (ou au montage si pré-rempli) : auto-sélectionner le bon mois
  useEffect(() => {
    if (!form.contrat_id) return;
    fetch(`${EC_API}/etats-cession?contrat_id=${form.contrat_id}&per_page=1&sort=periode_fin&dir=desc`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("stt_token")}` },
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
        const d = new Date(debutStr);
        const targetY = d.getDate() >= 26 ? (d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()) : d.getFullYear();
        const targetM = d.getDate() >= 26 ? (d.getMonth() + 1) % 12 + 1 : d.getMonth() + 1;
        const key = `${targetY}-${String(targetM).padStart(2, "0")}`;
        setSelectedMois(key);
        const { periode_debut, periode_fin } = computePeriodeFromMois(key);
        set("periode_debut", periode_debut);
        set("periode_fin",   periode_fin);
      })
      .catch(() => {});
  }, [form.contrat_id, contrats.length]);

  function handleMoisChange(key) {
    setSelectedMois(key);
    const { periode_debut, periode_fin } = computePeriodeFromMois(key);
    set("periode_debut", periode_debut);
    set("periode_fin",   periode_fin);
  }

  const periodeLabel = form.periode_debut && form.periode_fin
    ? `${fmtDate(form.periode_debut)} → ${fmtDate(form.periode_fin)}`
    : null;

  const LABEL_CLS = "mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-500";
  const TEXTAREA_CLS = "w-full resize-none rounded-md border border-line-200 bg-white px-2.5 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100";

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <div className="space-y-5 rounded-xl border border-line-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-semibold text-ink-900">Nouvel état de cession</h2>

        {/* Contrat */}
        <div>
          <label className={LABEL_CLS}>Contrat *</label>
          <ContratSelect value={form.contrat_id} onChange={v => set("contrat_id", v)} contrats={contrats} />
        </div>

        {/* Mois */}
        <div>
          <label className={LABEL_CLS}>Mois *</label>
          <MoisSelect value={selectedMois} onChange={handleMoisChange} options={moisOptions} />
          {periodeLabel && (
            <p className="mt-1.5 text-xs font-medium text-green-700">{periodeLabel}</p>
          )}
        </div>

        {/* Observations */}
        <div>
          <label className={LABEL_CLS}>Observations</label>
          <textarea value={form.observations} onChange={e => set("observations", e.target.value)}
            rows={3} placeholder="Notes optionnelles…" className={TEXTAREA_CLS} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-line-200 bg-white px-4 text-[13px] font-medium text-ink-900 transition-colors hover:bg-surface-50 hover:border-ink-300">
          Annuler
        </button>
        <button type="submit" disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-green-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800 disabled:opacity-60">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Créer l'état de cession
        </button>
      </div>
    </form>
  );
}

// ─── Page principale ─────────────────────────────────────────────
export default function EtatCessionFormPage() {
  const { id }          = useParams();
  const isNew           = !id || id === "nouveau";
  const navigate        = useNavigate();
  const { addToast }    = useToast();
  const { currentUser } = useUser();
  const [searchParams]  = useSearchParams();

  const { data: peutCreer }   = usePeutFaire("creer_etat_cession");
  const { data: peutValider } = usePeutFaire("valider_etat_cession");

  const isDCG = DCG_ROLES.includes(currentUser?.role?.designation);

  // Postes visibles selon profil
  const POSTES_VISIBLES = isNew ? [] :
    Object.keys(POSTE_CONFIG).filter(p => !(p === "RH" && isDCG));

  const [form, setForm]           = useState({ contrat_id: searchParams.get("contrat_id") ?? "", periode_debut: "", periode_fin: "", observations: "" });
  const [selectedMois, setSelectedMois] = useState("");
  const moisOptions = buildMoisOptions();
  const [pendingStatut, setPendingStatut] = useState(null);
  const [motifRejet,    setMotifRejet]    = useState("");

  const handleDownload = async (url, filename) => {
    try {
      const token = localStorage.getItem("stt_token");
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Erreur téléchargement");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    } catch (e) {
      addToast("Erreur lors du téléchargement", "error");
    }
  };
  const handlePdf   = () => handleDownload(`${import.meta.env.VITE_API_BASE}/api/pdf/etatcession/${id}`,   `dossier-cession-${etat?.code ?? id}.pdf`);
  const handleExcel = () => handleDownload(`${import.meta.env.VITE_API_BASE}/api/excel/etatcession/${id}`, `dossier-cession-${etat?.code ?? id}.xlsx`);

  const { data: etat, isLoading, isError } = useEtatCession(isNew ? null : id);
  const { data: contratsData } = useContratsPaginated({ count: 200 });
  const contrats = contratsData?.data ?? [];
  const { data: contratBaremes = [] } = useContratBaremes(isNew ? null : etat?.contrat_id ?? null);

  const saveMut      = useSaveEtatCession();
  const statutMut    = useEtatCessionStatut();
  const statutBlocMut = useEtatCessionStatutBloc();
  const deleteMut    = useDeleteEtatCession();

  useEffect(() => {
    if (!isNew && etat) {
      setForm({
        contrat_id:    etat.contrat_id ?? "",
        periode_debut: etat.periode_debut?.slice(0, 10) ?? "",
        periode_fin:   etat.periode_fin?.slice(0, 10)   ?? "",
        observations:  etat.observations ?? "",
      });
    }
  }, [isNew, etat]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.contrat_id)    return addToast("Sélectionnez un contrat.", "error");
    if (!form.periode_debut) return addToast("La date de début est obligatoire.", "error");
    if (!form.periode_fin)   return addToast("La date de fin est obligatoire.", "error");

    const payload = {
      contrat_id:    parseInt(form.contrat_id, 10),
      periode_debut: form.periode_debut,
      periode_fin:   form.periode_fin,
      observations:  form.observations || null,
    };
    if (!isNew) payload.id = parseInt(id, 10);

    try {
      const res = await saveMut.mutateAsync(payload);
      addToast(isNew ? "État de cession créé." : "Mis à jour.", "success");
      const newId = res?.data?.id ?? id;
      navigate(`/etats-cession/${newId}`, { replace: true });
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleStatut(statut, motif) {
    try {
      await statutMut.mutateAsync({ id: parseInt(id, 10), statut, motif: motif ?? null });
      addToast(
        statut === "soumis"    ? "État soumis à la validation DCG."       :
        statut === "valide"    ? "État validé et arrêté."                  :
        statut === "brouillon" ? "Remis en brouillon — vous pouvez corriger les lignes." :
        "État rejeté.",
        statut === "rejete" ? "error" : "success"
      );
      setPendingStatut(null);
      setMotifRejet("");
    } catch (err) {
      addToast(err.response?.data?.error ?? err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  async function handleDelete() {
    try {
      await deleteMut.mutateAsync(parseInt(id, 10));
      addToast("État de cession supprimé.", "success");
      navigate("/etats-cession");
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  if (!isNew && isLoading) return <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  if (!isNew && (isError || !etat)) return (
    <div className="flex flex-col items-center justify-center py-24">
      <p className="text-base font-semibold text-ink-700">État de cession introuvable</p>
      <button onClick={() => navigate("/etats-cession")} className="mt-4 text-[13px] font-medium text-green-600 hover:text-green-700">Retour</button>
    </div>
  );

  // Édition des lignes : brouillon uniquement
  const canEdit = isNew || etat?.statut === "brouillon";
  // Avancement des statuts de bloc (Viser qtés, Valider prix) : soumis uniquement
  const canAdvanceBloc = etat?.statut === "soumis";
  const lignes       = etat?.lignes ?? [];
  const totalEC      = lignes.reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);
  const lignesSansPrix = lignes.filter(l => !l.prix_unitaire || parseFloat(l.prix_unitaire) <= 0);
  const baremeEnAttente = contratBaremes.filter(cb => cb.statut_prix === "en_attente").length;

  const x3Config = !isNew && etat ? {
    chantier_code:    etat.contrat?.chantier?.code_x3 ?? null,
    soustraitant_code: etat.contrat?.soustraitant?.code ?? null,
    periode_debut:    etat.periode_debut?.slice(0, 10) ?? null,
    periode_fin:      etat.periode_fin?.slice(0, 10)   ?? null,
  } : null;

  const inputCls = "h-9 w-full rounded-md border border-line-200 bg-white px-2.5 text-[13px] text-ink-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100";

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate("/etats-cession")} className="flex items-center gap-1 text-[13px] text-ink-500 transition-colors hover:text-ink-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux états de cession
      </button>

      <PageHeader
        title={isNew ? "Nouvel état de cession" : etat.code}
        description={isNew ? "Renseignez le contrat et la période" :
          [etat.contrat?.code, etat.contrat?.chantier?.designation, etat.contrat?.soustraitant?.raison_sociale].filter(Boolean).join(" · ")}
        actions={!isNew && (
          <>
            <button onClick={() => setPendingStatut("brouillon_delete")}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
            <button onClick={handlePdf}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 transition-colors hover:bg-surface-50 hover:border-ink-300">
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={handleExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 transition-colors hover:bg-surface-50 hover:border-ink-300">
              <Sheet className="h-3.5 w-3.5" /> Excel
            </button>
            <StatusBadge statut={etat.statut} />

            {/* brouillon : soumettre */}
            {etat.statut === "brouillon" && peutCreer && (
              lignesSansPrix.length > 0 ? (
                <span title={`${lignesSansPrix.length} ligne(s) sans prix — validez les prix dans le barème du contrat`}
                  className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-4 text-[13px] font-medium text-amber-700">
                  ⚠ {lignesSansPrix.length} ligne{lignesSansPrix.length > 1 ? "s" : ""} sans prix
                </span>
              ) : baremeEnAttente > 0 ? (
                <span title={`${baremeEnAttente} prix en attente de validation dans le barème — le DACC ou DEX doit valider avant soumission`}
                  className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-4 text-[13px] font-medium text-amber-700">
                  ⚠ {baremeEnAttente} prix barème en attente
                </span>
              ) : (
                <button onClick={() => setPendingStatut("soumis")}
                  className="inline-flex h-9 items-center rounded-md bg-green-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800">
                  Soumettre
                </button>
              )
            )}

            {/* soumis : valider, rejeter ou retourner au CT */}
            {etat.statut === "soumis" && peutValider && (
              <>
                <button onClick={() => setPendingStatut("valide")}
                  className="inline-flex h-9 items-center rounded-md bg-green-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-green-700 active:bg-green-800">
                  Valider / Arrêter
                </button>
                <button onClick={() => setPendingStatut("retourner")}
                  className="inline-flex h-9 items-center rounded-md bg-amber-500 px-4 text-[13px] font-medium text-white transition-colors hover:bg-amber-600">
                  Retourner au CT
                </button>
                <button onClick={() => setPendingStatut("rejete")}
                  className="inline-flex h-9 items-center rounded-md bg-red-500 px-4 text-[13px] font-medium text-white transition-colors hover:bg-red-600">
                  Rejeter
                </button>
              </>
            )}

            {/* rejete : remettre en brouillon pour correction */}
            {etat.statut === "rejete" && (
              <button onClick={() => setPendingStatut("brouillon")}
                className="inline-flex h-9 items-center rounded-md bg-amber-500 px-4 text-[13px] font-medium text-white transition-colors hover:bg-amber-600">
                Corriger (remettre en brouillon)
              </button>
            )}
          </>
        )}
      />

      {/* Infos globales */}
      {!isNew && (
        <div className="rounded-xl border border-line-200 bg-white p-5 shadow-xs">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500">Période</p>
              <p className="truncate text-[13px] font-semibold text-ink-900">
                {fmtDate(etat.periode_debut)} → {fmtDate(etat.periode_fin)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500">Contrat</p>
              <Link to={`/contrats/${etat.contrat_id}`} className="text-[13px] font-semibold text-green-600 hover:text-green-700">
                {etat.contrat?.code ?? "—"}
              </Link>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500">Sous-traitant</p>
              <p className="text-[13px] text-ink-700">{etat.contrat?.soustraitant?.raison_sociale ?? "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500">Total consolidé</p>
              <p className="text-base font-bold tabular-nums text-ink-900 md:text-xl">{fmtNum(etat.montant_total ?? totalEC)} FCFA</p>
            </div>
          </div>
          {/* Bandeaux d'état */}
          {etat.statut === "soumis" && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>En attente de validation DCG — les lignes ne peuvent plus être modifiées.</span>
            </div>
          )}
          {etat.statut === "rejete" && etat.motif_rejet && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Rejeté</p>
                <p className="mt-0.5">{etat.motif_rejet}</p>
                <p className="mt-1 text-xs text-red-600">Cliquez sur « Corriger » dans la barre d'actions pour remettre en brouillon et modifier les lignes.</p>
              </div>
            </div>
          )}
          {etat.statut === "rejete" && !etat.motif_rejet && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              <XCircle className="h-4 w-4" /> Rejeté — cliquez sur « Corriger » pour remettre en brouillon.
            </div>
          )}
          {etat.statut === "valide" && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Arrêté et validé — consommable par les décomptes. Les lignes sont verrouillées.
            </div>
          )}
          {etat.statut === "brouillon" && etat.motif_rejet && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Retourné par le DT — corrections demandées</p>
                <p className="mt-0.5">{etat.motif_rejet}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulaire création */}
      {isNew && (
        <CreationForm
          contrats={contrats}
          form={form}
          set={set}
          saving={saveMut.isPending}
          onSubmit={handleSave}
          onCancel={() => navigate("/etats-cession")}
          inputCls={inputCls}
          fmtDate={fmtDate}
        />
      )}

      {/* Blocs par poste */}
      {!isNew && (
        <div className="space-y-5">
          {POSTES_VISIBLES.map(poste => (
            <PosteSection
              key={poste}
              poste={poste}
              lignes={lignes.filter(l => l.poste === poste)}
              canEdit={canEdit}
              etatId={id}
              contratBaremes={contratBaremes}
              x3Config={x3Config}
              statutBloc={etat?.["statut_" + poste.toLowerCase()] ?? "vide"}
              onStatutBloc={canAdvanceBloc ? async (bloc, statut) => {
                try {
                  await statutBlocMut.mutateAsync({ id: parseInt(id, 10), bloc, statut });
                  addToast(`Statut ${bloc.toUpperCase()} mis à jour.`, "success");
                } catch (e) {
                  addToast(`Erreur : ${e?.response?.data?.error ?? e?.message ?? "Impossible de changer le statut."}`, "error");
                }
              } : null}
              viseQtePar={etat?.vise_qte_par}
              viseQteLe={etat?.vise_qte_le}
              visePrixPar={etat?.vise_prix_par}
              visePrixLe={etat?.vise_prix_le}
              onDownloadBon={(ref) => handleDownload(
                `${import.meta.env.VITE_API_BASE}/api/pdf/bon-transfert/${id}/${encodeURIComponent(ref)}`,
                `bon-transfert-${ref}.pdf`
              )}
            />
          ))}

          {/* Résumé total */}
          {lignes.length > 0 && (
            <div className="rounded-xl border border-line-200 bg-white p-5 shadow-xs">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {POSTES_VISIBLES.map(poste => {
                  const montant = lignes.filter(l => l.poste === poste).reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);
                  const cfg = POSTE_CONFIG[poste];
                  const c   = cfg.color;
                  return (
                    <div key={poste} className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-500">{poste}</p>
                      <p className="text-lg font-bold tabular-nums text-ink-900">{fmtNum(montant)} FCFA</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line-100 pt-4">
                <span className="text-[13px] font-semibold text-ink-900">Total consolidé</span>
                <span className="text-xl font-bold tabular-nums text-green-700">{fmtNum(totalEC)} FCFA</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmation statut */}
      {pendingStatut && pendingStatut !== "brouillon_delete" && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={() => setPendingStatut(null)}>
          <div className="dialog-content w-full max-w-sm rounded-lg border border-line-200 bg-white shadow-popover" onClick={e => e.stopPropagation()}>
            <div className="border-b border-line-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-ink-900">
                {pendingStatut === "soumis"    ? "Soumettre l'état de cession ?"          :
                 pendingStatut === "valide"    ? "Valider et arrêter l'état de cession ?" :
                 pendingStatut === "brouillon" ? "Remettre en brouillon ?"                :
                 pendingStatut === "retourner" ? "Retourner au chargé de travaux ?"       :
                 "Rejeter l'état de cession ?"}
              </h3>
              <p className="mt-1 text-xs text-ink-500">
                {pendingStatut === "soumis"    ? "L'état passera en contrôle DCG. Les lignes seront verrouillées." :
                 pendingStatut === "valide"    ? "L'état sera arrêté et consommable par les décomptes. Action irréversible." :
                 pendingStatut === "brouillon" ? "Les lignes seront de nouveau modifiables pour correction." :
                 pendingStatut === "retourner" ? "L'état repassera en brouillon. Le CT pourra le corriger et re-soumettre. Saisissez le motif du retour." :
                 "L'état sera rejeté. Saisissez un motif."}
              </p>
            </div>

            {/* Motif de rejet ou retour */}
            {(pendingStatut === "rejete" || pendingStatut === "retourner") && (
              <div className="px-5 py-4">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-500">
                  {pendingStatut === "retourner" ? "Motif du retour" : "Motif du rejet"} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motifRejet ?? ""}
                  onChange={e => setMotifRejet(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-line-200 bg-white px-2.5 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  placeholder={pendingStatut === "retourner" ? "Corrections demandées…" : "Raison du rejet…"}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-line-200 px-5 py-3">
              <button onClick={() => { setPendingStatut(null); setMotifRejet(""); }}
                className="inline-flex h-9 items-center rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 hover:bg-surface-50 hover:border-ink-300">
                Annuler
              </button>
              <button
                onClick={() => handleStatut(
                  pendingStatut === "retourner" ? "brouillon" : pendingStatut,
                  (pendingStatut === "rejete" || pendingStatut === "retourner") ? motifRejet : undefined
                )}
                disabled={statutMut.isPending || ((pendingStatut === "rejete" || pendingStatut === "retourner") && !motifRejet?.trim())}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13px] font-medium text-white transition-colors disabled:opacity-60
                  ${pendingStatut === "rejete"    ? "bg-red-500 hover:bg-red-600"       :
                    pendingStatut === "retourner" ? "bg-amber-500 hover:bg-amber-600"   :
                    pendingStatut === "brouillon" ? "bg-amber-500 hover:bg-amber-600"   :
                    "bg-green-600 hover:bg-green-700 active:bg-green-800"}`}>
                {statutMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {pendingStatut === "brouillon_delete" && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={() => setPendingStatut(null)}>
          <div className="dialog-content w-full max-w-sm rounded-lg border border-line-200 bg-white shadow-popover" onClick={e => e.stopPropagation()}>
            <div className="border-b border-line-200 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Trash2 className="h-4 w-4 text-ink-500" strokeWidth={1.75} />
                Supprimer l'état de cession ?
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-ink-700">Toutes les lignes seront supprimées. Action irréversible.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line-200 px-5 py-3">
              <button onClick={() => setPendingStatut(null)}
                className="inline-flex h-9 items-center rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 hover:bg-surface-50 hover:border-ink-300">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-200 bg-white px-3 text-[13px] font-medium text-ink-900 transition-colors hover:bg-ink-900 hover:text-white disabled:opacity-60">
                {deleteMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
