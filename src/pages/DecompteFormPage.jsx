import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronLeft, Send, Save, RotateCcw, Plus, Trash2,
  FileText, CheckCircle2, MessageSquare, Paperclip,
  ChevronRight, Download, Eye, Calendar, Building2,
  Package, Truck, Users, ChevronDown, ChevronUp, X,
  CheckCheck, Clock, XCircle, AlertCircle, RefreshCw,
  Loader2, ReceiptText, Lock, FileStack,
} from "lucide-react";
import { useDecomptes } from "../context/DecomptesContext";
import { useContrats } from "../context/ContratsContext";
import { useUser } from "../context/UserContext";
import { useBonsCommande } from "../context/BonsCommandeContext";
import { useReleves } from "../context/RelevesContext";
import { useFactures } from "../context/FacturesContext";
import { useEtatsCession } from "../context/EtatsCessionContext";
import { useAttachements } from "../context/AttachementsContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import { buildLignesFromContrat, getCumulsPrecedents } from "../data/decomptes";
import { CIRCUIT_DECOMPTE, CIBLE_LABELS } from "../data/circuits";
import {
  getEtatsConsommesParDecompte, getTotalSectionConsommee,
  getEtatsArretesNonConsommes, getCumulRembourseAnterieur, getCumulCedeAnterieur,
} from "../utils/etatCessionMetrics";
import { buildMontantsFromLignes, computeRestitutionRG, computeNetHT } from "../utils/decompteCalcul";
import { getBCDuContrat, getSoldeDisponible } from "../utils/bcMetrics";
import { buildLignesFactureDepuisDecompte, computeMontantHTFacture } from "../utils/factureCalcul";
import Tabs from "../components/Tabs";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import ChatBubble from "../components/ChatBubble";
import ModeToggle from "../components/ModeToggle";
import DecompteLineTable from "../components/DecompteLineTable";
import SituationChantierWidget from "../components/SituationChantierWidget";
import WorkflowSteps from "../components/WorkflowSteps";
import { useToast } from "../context/ToastContext";

// ── helpers ──────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fileIcon(type) {
  if (type === "pdf") return "📄";
  if (["xlsx", "xls"].includes(type)) return "📊";
  return "📁";
}

const CAT_ICONS = { MTX: Package, MTL: Truck, RH: Users };
const CAT_LABELS = { MTX: "Matériaux", MTL: "Matériel", RH: "Ressources humaines" };
const CAT_COLORS = {
  MTX: "bg-orange-50 text-orange-700 border-orange-100",
  MTL: "bg-blue-50 text-blue-700 border-blue-100",
  RH:  "bg-purple-50 text-purple-700 border-purple-100",
};

const TYPE_LABELS = {
  provisoire: "Provisoire (mensuel)",
  final: "Final",
  definitif_general: "Définitif général",
  restitution_rg_partielle: "Restitution RG partielle",
  restitution_rg_totale: "Restitution RG totale",
};

// ── Rendu inline des données dynamiques de checklist ─────────────
function ChecklistDynamicRow({ dynamic: dyn, decompte, attachementInfo, etatsConsommes,
  totalSectionMTX, totalSectionMTL, totalSectionRH, bcInfoDecompte, contrat, lines }) {
  const fmt = v => new Intl.NumberFormat("fr-FR").format(v ?? 0);
  const getLine = code => (lines || []).find(l => l.codePoste === code);

  if (dyn === "att_validé") {
    if (!attachementInfo || attachementInfo.statut === "Aucun")
      return <div className="ml-6 mt-1 text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded">⚠ Aucun dossier d'attachement trouvé pour cette période</div>;
    const ok = attachementInfo.statut === "Validé";
    return (
      <div className={`ml-6 mt-1 flex items-center gap-3 text-[10px] px-2 py-1 rounded ${ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
        <span>{attachementInfo.code} · <strong>{attachementInfo.statut}</strong></span>
        <span>Montant final : <strong>{fmt(attachementInfo.montantFinal)} FCFA</strong></span>
        {!ok && <span>⚠ Pas encore validé</span>}
      </div>
    );
  }

  if (dyn === "poste_a_vs_att") {
    const ligneA = getLine("A");
    const posteA = ligneA?.mensuel ?? 0;
    const attM   = attachementInfo?.montantFinal ?? 0;
    const match  = posteA === attM;
    return (
      <div className={`ml-6 mt-1 flex items-center gap-3 text-[10px] px-2 py-1 rounded ${match ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
        <span>Poste A : <strong>{fmt(posteA)} FCFA</strong></span>
        <span>Attachement : <strong>{fmt(attM)} FCFA</strong></span>
        <span>{match ? "✓ Concordant" : "✗ Écart"}</span>
      </div>
    );
  }

  if (dyn === "etats_arretés") {
    if (!etatsConsommes?.length)
      return <div className="ml-6 mt-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">Aucun état de cession consommé dans ce décompte</div>;
    return (
      <div className="ml-6 mt-1 space-y-0.5">
        {etatsConsommes.map(e => {
          const tot = (e.sections?.MTX?.totalValorise ?? 0) + (e.sections?.MTL?.totalValorise ?? 0) + (e.sections?.RH?.totalValorise ?? 0);
          return (
            <div key={e.id} className="flex items-center gap-2 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded">
              <span className="font-medium">{e.code}</span>
              <span>{formatDateShort(e.periodeFin)}</span>
              <span>· MTX {fmt(e.sections?.MTX?.totalValorise ?? 0)} / MTL {fmt(e.sections?.MTL?.totalValorise ?? 0)} / RH {fmt(e.sections?.RH?.totalValorise ?? 0)}</span>
              <span className="font-semibold">= {fmt(tot)} FCFA</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (dyn === "etats_visas") {
    if (!etatsConsommes?.length)
      return <div className="ml-6 mt-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">Aucun état consommé</div>;
    return (
      <div className="ml-6 mt-1 space-y-0.5">
        {etatsConsommes.map(e => (
          <div key={e.id} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded flex items-center gap-2">
            <span className="font-medium">{e.code}</span>
            {["MTX","MTL","RH"].map(cat => {
              const s = e.sections?.[cat];
              if (!s || s.statut === "Non renseignée") return null;
              return (
                <span key={cat} className={s.visaQuantites && s.visaMontants ? "text-green-600" : "text-amber-600"}>
                  {cat} : {s.visaQuantites ? `qté ✓` : "qté ?"} / {s.visaMontants ? `prix ✓` : "prix ?"}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  if (dyn === "gik_vs_etats") {
    const gVal = getLine("G")?.mensuel ?? 0;
    const iVal = getLine("I")?.mensuel ?? 0;
    const kVal = getLine("K")?.mensuel ?? 0;
    return (
      <div className="ml-6 mt-1 flex items-center gap-4 text-[10px] bg-gray-50 px-2 py-1 rounded text-gray-600">
        <span className={gVal === totalSectionMTX ? "text-green-700" : "text-red-700"}>G : {fmt(gVal)} / {fmt(totalSectionMTX)} FCFA</span>
        <span className={iVal === totalSectionMTL ? "text-green-700" : "text-red-700"}>I : {fmt(iVal)} / {fmt(totalSectionMTL)} FCFA</span>
        <span className={kVal === totalSectionRH  ? "text-green-700" : "text-red-700"}>K : {fmt(kVal)} / {fmt(totalSectionRH)} FCFA</span>
      </div>
    );
  }

  if (dyn === "hjl_vs_cessions") {
    const hVal = getLine("H")?.mensuel ?? 0;
    const jVal = getLine("J")?.mensuel ?? 0;
    const lVal = getLine("L")?.mensuel ?? 0;
    return (
      <div className="ml-6 mt-1 flex items-center gap-4 text-[10px] bg-gray-50 px-2 py-1 rounded text-gray-600">
        <span>H (remb. MTX) : <strong>{fmt(hVal)} FCFA</strong></span>
        <span>J (remb. MTL) : <strong>{fmt(jVal)} FCFA</strong></span>
        <span>L (remb. RH) : <strong>{fmt(lVal)} FCFA</strong></span>
      </div>
    );
  }

  if (dyn === "bd_calculs") {
    const ligneA = getLine("A");
    const aVal = ligneA?.mensuel ?? 0;
    const bVal = getLine("B")?.mensuel ?? 0;
    const dVal = getLine("D")?.mensuel ?? 0;
    const tauxB  = contrat?.tauxRevisionPrix ?? 0;
    const tauxRG = contrat?.tauxRG ?? 5;
    const bExp = Math.round(aVal * tauxB  / 100);
    const dExp = Math.round(aVal * tauxRG / 100);
    return (
      <div className="ml-6 mt-1 flex items-center gap-4 text-[10px] bg-gray-50 px-2 py-1 rounded text-gray-600">
        <span className={bVal === bExp ? "text-green-700" : "text-red-700"}>B = A × {tauxB}% = {fmt(bExp)} FCFA</span>
        <span className={dVal === dExp ? "text-green-700" : "text-red-700"}>D = A × {tauxRG}% = {fmt(dExp)} FCFA</span>
      </div>
    );
  }

  if (dyn === "bc_solde" && bcInfoDecompte) {
    return (
      <div className={`ml-6 mt-1 flex items-center gap-3 text-[10px] px-2 py-1 rounded ${bcInfoDecompte.bloque ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>
        <span>Net décompte : <strong>{fmt(bcInfoDecompte.netHT)} FCFA</strong></span>
        <span>Solde BC dispo : <strong>{fmt(bcInfoDecompte.solde)} FCFA</strong></span>
        {bcInfoDecompte.bloque && <span className="font-bold">⛔ Dépassement +{fmt(bcInfoDecompte.depassement)} FCFA</span>}
      </div>
    );
  }

  if (dyn === "cumul_vs_marche") {
    const aLine = getLine("A");
    const cumulA = aLine?.cumulM ?? 0;
    const enveloppe = (contrat?.montantHT ?? 0) +
      (contrat?.avenants ?? []).filter(a => a.statutValidationDFC === "Validé").reduce((s, a) => s + (a.montant ?? 0), 0);
    const ratio = enveloppe > 0 ? Math.round(cumulA / enveloppe * 100) : 0;
    const ok = cumulA <= enveloppe;
    return (
      <div className={`ml-6 mt-1 flex items-center gap-3 text-[10px] px-2 py-1 rounded ${ok ? "bg-gray-50 text-gray-600" : "bg-amber-50 text-amber-700"}`}>
        <span>Cumul travaux : <strong>{fmt(cumulA)} FCFA</strong></span>
        <span>Enveloppe marché : <strong>{fmt(enveloppe)} FCFA</strong></span>
        <span>({ratio}% consommé)</span>
      </div>
    );
  }

  if (dyn === "visa_summary") {
    const hist = decompte?.historique ?? [];
    const visas = hist.filter(h => h.action === "Validation" || h.action?.includes("Approbation") || h.action?.includes("Validation"));
    if (!visas.length) return <div className="ml-6 mt-1 text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">Aucun visa enregistré</div>;
    return (
      <div className="ml-6 mt-1 space-y-0.5">
        {visas.map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded">
            <span className="font-medium">{h.utilisateur}</span>
            <span>·</span>
            <span>{formatDateShort(h.date)}</span>
            <span>·</span>
            <span>{h.action}</span>
          </div>
        ))}
      </div>
    );
  }

  if (dyn === "net_ttc") {
    const m = decompte?.montantsCalcules;
    if (!m) return null;
    return (
      <div className="ml-6 mt-1 flex items-center gap-4 text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded">
        <span>Net HT : <strong>{fmt(m.net_ht)} FCFA</strong></span>
        <span>TVA {contrat?.tauxTVA ?? 18}% : <strong>{fmt(m.montant_tva)} FCFA</strong></span>
        <span>Net TTC : <strong className="text-green-700">{fmt(m.net_ttc)} FCFA</strong></span>
      </div>
    );
  }

  return null;
}

// ── Validation circuit mini-component ────────────────────────────
function EtapeChip({ etape, isActive }) {
  const icons = { validé: CheckCircle2, "en attente": Clock, "à venir": Clock, rejeté: XCircle };
  const colors = {
    validé: "bg-[#E8F5EE] text-[#087F3E] border-[#b5ddc8]",
    "en attente": "bg-amber-50 text-amber-700 border-amber-200",
    "à venir": "bg-gray-50 text-gray-400 border-gray-200",
    rejeté: "bg-red-50 text-red-600 border-red-200",
  };
  const Icon = icons[etape.statut] || Clock;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${colors[etape.statut] || colors["à venir"]} ${isActive ? "ring-2 ring-amber-300" : ""}`}>
      <Icon size={14} />
      <div>
        <div className="font-semibold text-xs">{etape.profil}</div>
        <div className="text-xs opacity-70">{etape.nom}</div>
      </div>
      {etape.date && <div className="ml-auto text-xs opacity-60">{new Date(etape.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</div>}
    </div>
  );
}

// ── État de cession consommé — carte dépliable (MTX/MTL/RH + visas) ──
function EtatConsommeCard({ etat, isEditable, onDetach }) {
  const [open, setOpen] = useState(false);
  const totalEtat = ["MTX", "MTL", "RH"].reduce((s, cat) => s + (etat.sections[cat]?.totalValorise || 0), 0);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => setOpen(v => !v)}>
        {open ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <Link to={`/etats-cession/${etat.id}`} onClick={e => e.stopPropagation()} className="text-sm font-semibold text-gray-900 hover:text-[#087F3E] hover:underline">
            {etat.code}
          </Link>
          <p className="text-xs text-gray-400">{formatDateShort(etat.periodeDebut)} → {formatDateShort(etat.periodeFin)} · Arrêté le {formatDateShort(etat.dateArrete)}</p>
        </div>
        <MoneyDisplay amount={totalEtat} />
        {isEditable && (
          <button
            onClick={(e) => { e.stopPropagation(); onDetach?.(etat); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Détacher du décompte"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {open && (
        <div className="divide-y divide-gray-100">
          {["MTX", "MTL", "RH"].map(cat => {
            const section = etat.sections[cat];
            if (!section || section.statut === "Non renseignée") return null;
            const CatIcon = CAT_ICONS[cat];
            return (
              <div key={cat} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CatIcon size={13} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-700">{CAT_LABELS[cat]}</span>
                  <StatusBadge statut={section.statut} />
                  <MoneyDisplay amount={section.totalValorise} variant="small" className="ml-auto" />
                </div>
                {(section.visaQuantites || section.visaMontants) && (
                  <div className="text-[11px] text-gray-400 flex flex-wrap gap-x-3 mb-2">
                    {section.visaQuantites && <span>Quantités visées par {section.visaQuantites.par} le {formatDateShort(section.visaQuantites.date)}</span>}
                    {section.visaMontants && <span>Montants visés par {section.visaMontants.par} le {formatDateShort(section.visaMontants.date)}</span>}
                  </div>
                )}
                <div className="space-y-1">
                  {section.lignes.map(l => (
                    <div key={l.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      <span>{l.designation || l.qualification}</span>
                      <span>{new Intl.NumberFormat("fr-FR").format(l.montantValorise)} FCFA</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function DecompteFormPage() {
  const { decomptes, addDecompte, updateDecompte, addFilMessage } = useDecomptes();
  const { contrats, updateContrat } = useContrats();
  const { bonsCommande, addReception } = useBonsCommande();
  const { releves, addReleve } = useReleves();
  const { factures, addFacture, updateFacture } = useFactures();
  const { etats, consommerEtatsPourDecompte, detacherEtatDuDecompte } = useEtatsCession();
  const { getAttachementForPeriodeRange } = useAttachements();
  const { currentUser } = useUser();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isNew = !id || id === "nouveau";

  const decompte = useMemo(() => isNew ? null : decomptes.find(d => d.id === id), [id, isNew, decomptes]);
  const preselectedContratId = searchParams.get("contratId");

  // Liaison automatique des états au chargement d'un décompte existant
  useEffect(() => {
    if (!isNew && decompte) consommerEtatsPourDecompte(decompte);
  }, [isNew, decompte?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Creation form state
  const [newContratId, setNewContratId] = useState(preselectedContratId || "");
  const [newType, setNewType] = useState("provisoire");
  const [newDateDebut, setNewDateDebut] = useState("");
  const [newDateFin, setNewDateFin] = useState("");
  const [modeRenseignement, setModeRenseignement] = useState("saisie");

  // Existing draft date editing
  const [editDateDebut, setEditDateDebut] = useState(decompte?.dateDebut || "");
  const [editDateFin, setEditDateFin] = useState(decompte?.dateFin || "");

  // UI state
  const [activeTab, setActiveTab] = useState("structure");
  const [terrainValidated, setTerrainValidated] = useState({ CT: false, DT: false });

  // Reject form
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectMotif, setRejectMotif] = useState("");

  // Payment form (reference de règlement)
  const [showPayForm, setShowPayForm] = useState(false);
  const [referencePaiement, setReferencePaiement] = useState("");

  // Checklist local state (resets are cosmetic; not persisted)
  const [checklistStates, setChecklistStates] = useState({});

  // Active circuit step definition (for checklist + delay)
  const activeStepDef = useMemo(() => {
    const profil = decompte?.validationEtape?.profilEnAttente;
    if (!profil || decompte?.statut !== "En validation") return null;
    return CIRCUIT_DECOMPTE.find(s => s.profil === profil) || null;
  }, [decompte?.validationEtape?.profilEnAttente, decompte?.statut]);

  // Delay computation for active step
  const delaiInfo = useMemo(() => {
    const etape = decompte?.validationEtape;
    if (!etape?.dateDebutEtape || !activeStepDef?.delaiJours) return null;
    const debut = new Date(etape.dateDebutEtape);
    const echeance = new Date(debut);
    echeance.setDate(echeance.getDate() + activeStepDef.delaiJours);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((echeance - today) / (1000 * 60 * 60 * 24));
    return { enRetard: diffDays < 0, jours: Math.abs(diffDays), echeance };
  }, [decompte?.validationEtape, activeStepDef]);
  const [rejectRetour, setRejectRetour] = useState(0);

  // Discussion
  const [newMessage, setNewMessage] = useState("");

  // Import simulation
  const [importLoading, setImportLoading] = useState(false);

  // Local lines state — lifted from DecompteLineTable for real-time widget update
  const [localLignes, setLocalLignes] = useState(null);
  const [saisieMode, setSaisieMode] = useState("cumulative");

  // Dépassement enveloppe — confirmation
  const [depassementConfirme, setDepassementConfirme] = useState(false);

  // Resolve contrat — uses newContratId so sidebar updates as user picks contract
  const contrat = useMemo(() => {
    const cid = decompte?.contratId || newContratId || preselectedContratId;
    return cid ? contrats.find(c => c.id === cid) : null;
  }, [decompte, newContratId, preselectedContratId]);

  // Attachement pour la période du décompte → alimente Poste A (4 cas selon statut)
  // Fonctionne aussi pour les nouveaux décomptes (isNew) dès que contrat + dateFin sont renseignés
  const attachementActif = useMemo(() => {
    const cid     = isNew ? newContratId : decompte?.contratId;
    const dateFin = isNew ? newDateFin   : decompte?.dateFin;
    if (!cid || !dateFin) return null;
    return getAttachementForPeriodeRange(cid, dateFin);
  }, [isNew, newContratId, newDateFin, decompte, getAttachementForPeriodeRange]);

  const attachementInfoForTable = useMemo(() => {
    const cid = isNew ? newContratId : decompte?.contratId;
    if (!cid) return null;
    if (!attachementActif) {
      return { statut: "Aucun", contratId: cid, code: null, id: null, montantFinal: 0 };
    }
    const st = attachementActif.statut;
    const montant = st === "Validé" ? (attachementActif.montantFinal ?? 0) : (attachementActif.voletCSE?.totalValorise ?? 0);
    return { code: attachementActif.code, id: attachementActif.id, montantFinal: montant, statut: st };
  }, [isNew, newContratId, attachementActif, decompte]);

  // D5 — navigation précédent/suivant dans le contrat
  const contratDecomptes = useMemo(() => {
    if (isNew || !decompte?.contratId) return [];
    return [...decomptes.filter(d => d.contratId === decompte.contratId)]
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  }, [isNew, decompte, decomptes]);
  const navIdx    = contratDecomptes.findIndex(d => d.id === id);
  const prevDec   = navIdx > 0 ? contratDecomptes[navIdx - 1] : null;
  const nextDec   = navIdx >= 0 && navIdx < contratDecomptes.length - 1 ? contratDecomptes[navIdx + 1] : null;

  if (!isNew && !decompte) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <AlertCircle size={40} className="mb-3" />
        <p className="text-lg font-semibold">Décompte introuvable</p>
        <button onClick={() => navigate("/decomptes")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const isEditable = isNew || decompte?.statut === "Brouillon" || decompte?.statut === "Rejeté";
  const isDefinitif = !isNew && ["definitif_general", "final"].includes(decompte?.type);
  const isRestitution = !isNew && ["restitution_rg_partielle", "restitution_rg_totale"].includes(decompte?.type);

  const chantierDec = useMemo(() => {
    const chantierId = contrat?.chantierId;
    return chantierId ? chantiers.find(c => c.id === chantierId) : null;
  }, [contrat]);

  const sttDec = useMemo(() =>
    contrat ? sousTraitants.find(s => s.id === contrat.sousTraitantId) : null,
  [contrat]);

  // Lines — for new decomptes, build from contrat model (zero values, editable)
  const linesForDisplay = useMemo(() => {
    if (isNew) return contrat ? buildLignesFromContrat(contrat, {}, {}) : [];
    return decompte?.lignes || [];
  }, [isNew, contrat, decompte]);

  // Last rejection message for bandeau
  const lastRejetMessage = useMemo(() => {
    if (isNew || decompte?.statut !== "Rejeté") return null;
    return [...(decompte?.fil_discussion || [])].reverse().find(m => m.type === "rejet") || null;
  }, [isNew, decompte]);

  const circuitTerrain = useMemo(() => {
    if (!chantierDec) return [];
    const items = [];
    if (chantierDec.conducteurTravaux?.nom) items.push({ profil: "CT", nom: chantierDec.conducteurTravaux.nom, statut: "à venir", date: null, commentaire: "Constat terrain — Niveau 1" });
    if (chantierDec.directeurTravaux?.nom)  items.push({ profil: "DT", nom: chantierDec.directeurTravaux.nom,  statut: "à venir", date: null, commentaire: "Direction travaux — Niveau 2" });
    return items;
  }, [chantierDec]);

  const circuitSteps = useMemo(() => CIRCUIT_DECOMPTE.map(s => ({
    ...s,
    nom: s.libelle,
    statut: (() => {
      if (!decompte) return "à venir";
      if (decompte.statut === "Payé" || decompte.statut === "Approuvé") return "validé";
      const e = decompte.validationEtape;
      if (!e) return "à venir";
      if (s.ordre <= e.actuelle) return "validé";
      if (s.ordre === e.actuelle + 1 && e.profilEnAttente) return "en attente";
      return "à venir";
    })(),
  })), [decompte]);

  // ── Validation helpers ────────────────────────────────────────
  const STATUTS_DECOMPTE_AUTORISES = ["Approuvé final", "En cours d'exécution"];
  const selectedContrat = isNew ? contrat : null;
  const contractBlocked = selectedContrat && !STATUTS_DECOMPTE_AUTORISES.includes(selectedContrat.statut);

  const creationErrors = useMemo(() => {
    if (!isNew) return [];
    const errs = [];
    if (!newContratId) errs.push("Veuillez sélectionner un contrat.");
    if (!newDateDebut || !newDateFin) errs.push("Les dates de début et de fin sont obligatoires.");
    if (newDateDebut && newDateFin && newDateFin < newDateDebut) errs.push("La date de fin doit être postérieure à la date de début.");
    if (contractBlocked && selectedContrat) errs.push(`Le contrat ${selectedContrat.code} est "${selectedContrat.statut}" — seuls les contrats "Approuvé final" ou "En cours d'exécution" acceptent un décompte.`);
    return errs;
  }, [isNew, newContratId, newDateDebut, newDateFin, contractBlocked, selectedContrat]);

  // Chevauchement de période — information non bloquante (plusieurs décomptes peuvent coexister
  // sur un même contrat ; seuls les décomptes Approuvé/Payé alimentent les cumuls, ce qui protège
  // contre le double comptage même en cas de périodes qui se recoupent).
  const overlappingDecomptes = useMemo(() => {
    const contratId = isNew ? newContratId : decompte?.contratId;
    const dDebut = isNew ? newDateDebut : (editDateDebut || decompte?.dateDebut);
    const dFin = isNew ? newDateFin : (editDateFin || decompte?.dateFin);
    const excludeId = isNew ? null : decompte?.id;
    if (!contratId || !dDebut || !dFin || dFin < dDebut) return [];
    return decomptes.filter(d =>
      d.id !== excludeId &&
      d.contratId === contratId &&
      d.dateDebut <= dFin &&
      d.dateFin >= dDebut
    );
  }, [isNew, newContratId, newDateDebut, newDateFin, decompte, editDateDebut, editDateFin, decomptes]);

  const canSaveDraft = isNew && creationErrors.length === 0 && newContratId && newDateDebut && newDateFin;

  // ── Actions ───────────────────────────────────────────────────
  function handleSaveNew() {
    if (!canSaveDraft) return;
    const c = contrat;
    const [, contratYear, contratNum] = c.code.split("-");
    const contratCode = `CTR${contratNum}`;
    const suffix = newType === "definitif_general" ? "DEF" : newType === "restitution_rg_partielle" ? "RGP" : newType === "restitution_rg_totale" ? "RGD" : newType === "final" ? "FIN" : `M${String(decomptes.filter(d => d.contratId === newContratId).length + 1).padStart(2, "0")}`;
    const newId = `DEC-${contratYear}-${contratCode}-${suffix}`;
    const tauxTVA = c.tauxTVA ?? 18;
    const tvaApplicable = c.tvaApplicable ?? true;
    const cumulsPrecedents = getCumulsPrecedents(newContratId, newDateFin, decomptes);
    let lignes = buildLignesFromContrat(c, {}, cumulsPrecedents);

    // Pre-fill ligne E for restitution types
    const isRestitutionNew = newType === "restitution_rg_partielle" || newType === "restitution_rg_totale";
    let note = undefined;
    if (isRestitutionNew) {
      const rgMontant = computeRestitutionRG(newContratId, newType, decomptes);
      lignes = lignes.map(l =>
        l.codePoste === "E"
          ? { ...l, mensuel: rgMontant, cumulM: (l.cumulMoins1 || 0) + rgMontant }
          : l
      );
      note = `Restitution RG calculée automatiquement : ${new Intl.NumberFormat("fr-FR").format(rgMontant)} FCFA`;
    }

    const montantsCalcules = buildMontantsFromLignes(lignes, tauxTVA);
    addDecompte({
      id: newId,
      code: newId,
      contratId: newContratId,
      type: newType,
      dateDebut: newDateDebut,
      dateFin: newDateFin,
      statut: "Brouillon",
      tauxTVA,
      tvaApplicable,
      validationEtape: {
        actuelle: 0,
        total: CIRCUIT_DECOMPTE.length,
        profilEnAttente: CIRCUIT_DECOMPTE[0].profil,
        dateDebutEtape: new Date().toISOString().split("T")[0],
      },
      modeRenseignement,
      lignes,
      montantsCalcules,
      note,
      fil_discussion: [],
      historique: [{ date: new Date().toISOString(), utilisateur: currentUser?.nom || "Utilisateur", action: "Création", details: `Décompte créé par ${currentUser?.nom || "utilisateur"}` }],
      pieceJointes: [],
    });
    consommerEtatsPourDecompte({ id: newId, contratId: newContratId, dateDebut: newDateDebut, dateFin: newDateFin });
    navigate(`/decomptes/${newId}`);
    addToast("Brouillon enregistré.", "success");
  }

  function handleSaveDraft() {
    if (editDateDebut && editDateFin && editDateFin < editDateDebut) {
      addToast("La date de fin doit être postérieure à la date de début.", "error");
      return;
    }
    const updates = { dateDebut: editDateDebut || decompte.dateDebut, dateFin: editDateFin || decompte.dateFin };
    if (localLignes) {
      updates.lignes = localLignes;
      updates.montantsCalcules = buildMontantsFromLignes(localLignes, decompte.tauxTVA ?? 18);
    }
    updateDecompte(decompte.id, updates);
    consommerEtatsPourDecompte({ id: decompte.id, contratId: decompte.contratId, dateDebut: updates.dateDebut, dateFin: updates.dateFin });
    addToast("Décompte enregistré.", "success");
  }

  function handleSubmitForValidation() {
    if (depassementInfo && !depassementConfirme) {
      addToast("Veuillez confirmer le dépassement avant de soumettre.", "error");
      return;
    }
    const isResubmit = decompte?.statut === "Rejeté";
    updateDecompte(decompte.id, { statut: "En validation" });
    const msgs = [];
    msgs.push({
      id: `msg-${Date.now()}`,
      auteur: { nom: currentUser.nom, role: currentUser.roleId, initiales: currentUser.initiales },
      date: new Date().toISOString(),
      message: isResubmit
        ? `Décompte resoumis par ${currentUser.nom} après correction.`
        : `Décompte soumis pour validation par ${currentUser.nom}.`,
      type: "action",
    });
    if (depassementInfo) {
      msgs.push({
        id: `msg-dep-${Date.now()}`,
        auteur: { nom: "Système", role: "SYS", initiales: "SY" },
        date: new Date().toISOString(),
        message: `⚠ Dépassement de l'enveloppe contractuelle signalé : cumul travaux ${depassementInfo.cumulTotal.toLocaleString("fr-FR")} FCFA / marché actualisé ${depassementInfo.enveloppe.toLocaleString("fr-FR")} FCFA (écart +${depassementInfo.depassement.toLocaleString("fr-FR")} FCFA). Un avenant de régularisation est-il prévu ?`,
        type: "action",
      });
    }
    msgs.forEach(m => addFilMessage(decompte.id, m));
    setDepassementConfirme(false);
    addToast(isResubmit ? "Décompte resoumis avec succès." : "Décompte soumis pour validation.", "success");
  }

  function handleValidate() {
    const e = decompte.validationEtape;
    const isLast = e.actuelle + 1 === e.total;
    const today = new Date().toISOString().split("T")[0];
    if (isLast) {
      if (bcInfoDecompte?.bloque) {
        addToast(
          `Blocage : net HT du décompte ${new Intl.NumberFormat("fr-FR").format(bcInfoDecompte.netHT)} FCFA > solde disponible du BC ${new Intl.NumberFormat("fr-FR").format(bcInfoDecompte.solde)} FCFA (dépassement de ${new Intl.NumberFormat("fr-FR").format(bcInfoDecompte.depassement)} FCFA). Un avenant est probablement nécessaire.`,
          "error"
        );
        return;
      }
      updateDecompte(decompte.id, { statut: "Approuvé", validationEtape: { ...e, actuelle: e.total, profilEnAttente: null } });
      addFilMessage(decompte.id, { id: `msg-${Date.now()}`, auteur: { nom: currentUser.nom, role: currentUser.roleId, initiales: currentUser.initiales }, date: new Date().toISOString(), message: `Validé par ${currentUser.roleId} — décompte approuvé.`, type: "validation" });
      if (bcInfoDecompte?.bc) {
        addReception(contrat.id, {
          decompteId: decompte.id,
          codeDecompte: decompte.code,
          montantNetHT: bcInfoDecompte.netHT,
          dateReception: today,
        });
      }
      addToast("Décompte approuvé.", "success");
    } else {
      const nextStep = CIRCUIT_DECOMPTE.find(s => s.ordre === e.actuelle + 2);
      updateDecompte(decompte.id, { validationEtape: { ...e, actuelle: e.actuelle + 1, profilEnAttente: nextStep?.profil || null, dateDebutEtape: today } });
      addFilMessage(decompte.id, { id: `msg-${Date.now()}`, auteur: { nom: currentUser.nom, role: currentUser.roleId, initiales: currentUser.initiales }, date: new Date().toISOString(), message: `Validé par ${currentUser.roleId}. Transmis à ${nextStep?.profil || "l'étape suivante"}.`, type: "validation" });
      addToast(`Validé. Transmis à ${nextStep?.profil || "l'étape suivante"}.`, "success");
    }
    setShowRejectForm(false);
  }

  function handleConfirmReject() {
    if (!rejectMotif.trim()) return;
    const e = decompte.validationEtape;
    const retourOrdre = rejectRetour === 0 ? 1 : rejectRetour;
    const retourStep = CIRCUIT_DECOMPTE.find(s => s.ordre === retourOrdre);
    const newActuelle = retourOrdre - 1;
    const newProfil = retourStep?.profil || CIRCUIT_DECOMPTE[0].profil;
    updateDecompte(decompte.id, { statut: "Rejeté", validationEtape: { ...e, actuelle: newActuelle, profilEnAttente: newProfil } });
    addFilMessage(decompte.id, {
      id: `msg-${Date.now()}`,
      auteur: { nom: currentUser.nom, role: currentUser.roleId, initiales: currentUser.initiales },
      date: new Date().toISOString(),
      message: `${currentUser.nom} (${currentUser.roleId}) a rejeté le décompte — retour à l'étape ${retourOrdre} (${newProfil}). Motif : ${rejectMotif}`,
      type: "rejet",
    });
    addToast("Décompte rejeté.", "error");
    setShowRejectForm(false);
    setRejectMotif("");
    setRejectRetour(0);
  }

  function handleConfirmMarkPaid() {
    if (!referencePaiement.trim()) { addToast("La référence de règlement est requise.", "error"); return; }
    const today = new Date().toISOString().slice(0, 10);
    const isDefinitifGeneral = decompte?.type === "definitif_general";
    updateDecompte(decompte.id, { statut: "Payé" });
    if (factureCSEExistante) {
      updateFacture(factureCSEExistante.id, { statut: "Payée", datePaiement: today, referenceReglement: referencePaiement.trim() });
      if (factureCSEExistante.factureLieeId) {
        updateFacture(factureCSEExistante.factureLieeId, { statut: "Payée", datePaiement: today, referenceReglement: referencePaiement.trim() });
      }
    }
    addFilMessage(decompte.id, { id: `msg-${Date.now()}`, auteur: { nom: currentUser.nom, role: "TRESORERIE", initiales: currentUser.initiales }, date: new Date().toISOString(), message: `Paiement effectué — décompte marqué comme payé (réf. ${referencePaiement.trim()}).`, type: "validation" });
    if (isDefinitifGeneral && contrat) {
      updateContrat(contrat.id, { statut: "Clôturé" });
      addFilMessage(decompte.id, { id: `msg-${Date.now() + 1}`, auteur: { nom: "Système", role: "SYS", initiales: "SY" }, date: new Date().toISOString(), message: `Décompte définitif payé — le contrat ${contrat.code} est désormais clôturé.`, type: "action" });
    }
    addToast(isDefinitifGeneral ? `Payé. Contrat ${contrat?.code} automatiquement clôturé.` : "Décompte marqué comme payé.", "success");
    setShowPayForm(false);
    setReferencePaiement("");
  }

  function handleGenererFactureCSE() {
    const lignes = buildLignesFactureDepuisDecompte(decompte);
    const montantHT = computeMontantHTFacture(lignes);
    const tauxTVA = decompte.tauxTVA ?? 18;
    const montantTVA = Math.round(montantHT * (tauxTVA / 100));
    const newId = `fac-cse-${decompte.id}-${Date.now()}`;
    const code = `FAC-CSE-${new Date().getFullYear()}-${String(factures.filter(f => f.type === "cse").length + 1).padStart(3, "0")}`;
    addFacture({
      id: newId, code, type: "cse",
      contratId: contrat.id, decompteId: decompte.id, releveId: null, factureLieeId: null,
      dateEmission: new Date().toISOString().slice(0, 10),
      lignes, montantHT, tauxTVA, montantTVA, montantTTC: montantHT + montantTVA,
      statut: "Émise",
      ecartRapprochement: null, motifRejet: null,
      dateControleDACC: null, dateValidationDFC: null, datePaiement: null, referenceReglement: null,
    });
    addToast(`Facture CSE ${code} générée.`, "success");
    navigate(`/factures/${newId}`);
  }

  function handleGenererReleve() {
    const year = new Date().getFullYear();
    const code = `REL-${year}-${String(releves.length + 1).padStart(3, "0")}`;
    const newId = `rel-${Date.now()}`;
    addReleve({
      id: newId,
      code,
      decompteId: decompte.id,
      contratId: contrat.id,
      dateGeneration: new Date().toISOString().slice(0, 10),
      statut: "Généré",
      dateEnvoi: null,
      dateReponse: null,
      motifContestation: null,
      ligneContestee: null,
    });
    addToast(`Relevé ${code} généré.`, "success");
    navigate(`/releves/${newId}`);
  }

  function handleSendMessage() {
    const txt = newMessage.trim();
    if (!txt || isNew) return;
    addFilMessage(decompte.id, {
      id: `msg-${Date.now()}`,
      auteur: { nom: currentUser.nom, role: currentUser.roleId, initiales: currentUser.initiales },
      date: new Date().toISOString(),
      message: txt,
      type: "commentaire",
    });
    setNewMessage("");
  }

  function handleSimulateImport() {
    if (!contrat) { addToast("Sélectionnez d'abord un contrat.", "error"); return; }
    setImportLoading(true);
    setTimeout(() => {
      setImportLoading(false);
      setModeRenseignement("saisie");
      addToast("Fichier décompte_import.xlsx chargé avec succès", "success");
    }, 600);
  }

  // ── Dépassement enveloppe contractuelle ──────────────────────
  const depassementInfo = useMemo(() => {
    if (!contrat) return null;
    const effectiveLignes = localLignes || decompte?.lignes || linesForDisplay;
    const ligneA = effectiveLignes.find(l => l.codePoste === "A");
    if (!ligneA) return null;
    const montantMoisA = ligneA.mensuel || 0;
    const cumulPrecA   = ligneA.cumulMoins1 || 0;
    const cumulTotal   = cumulPrecA + montantMoisA;
    const enveloppe    = (contrat.montantInitialHT ?? contrat.montantHT) +
      (contrat.avenants || []).filter(a => a.statutValidationDFC === "Validé").reduce((s, a) => s + (a.montant || 0), 0);
    if (cumulTotal > enveloppe) {
      return { cumulTotal, enveloppe, depassement: cumulTotal - enveloppe };
    }
    return null;
  }, [contrat, localLignes, decompte, linesForDisplay]);

  // ── Solde du bon de commande — blocage sur dépassement ────────
  const isLastStepPending = !isNew && decompte?.statut === "En validation" && decompte.validationEtape.actuelle + 1 === decompte.validationEtape.total;
  const bcInfoDecompte = useMemo(() => {
    if (!contrat) return null;
    const bc = getBCDuContrat(contrat.id, bonsCommande);
    if (!bc) return null;
    const netHT = decompte?.montantsCalcules?.net_ht || 0;
    const solde = getSoldeDisponible(bc);
    return { bc, netHT, solde, depassement: netHT - solde, bloque: netHT > solde };
  }, [contrat, decompte, bonsCommande]);

  // ── Relevé de compte existant pour ce décompte ────────────────
  // On ignore les documents dans un état terminal négatif (Contesté / Écart détecté) : ils restent
  // consultables comme historique, mais ne doivent pas bloquer la génération d'un nouveau document
  // après correction et re-approbation du décompte — sinon le cycle contestation/écart n'aurait pas d'issue.
  const releveExistant = !isNew ? releves.find(r => r.decompteId === decompte?.id && r.statut !== "Contesté") : null;
  const factureCSEExistante = !isNew ? factures.find(f => f.type === "cse" && f.decompteId === decompte?.id && f.statut !== "Écart détecté") : null;
  const paiementBloque = !factureCSEExistante || factureCSEExistante.statut !== "Validée DFC";

  // ── Net HT effectif — applique l'override attachement (A.cumulM) avant computeNetHT ──
  const netHTEffectif = useMemo(() => {
    if (!decompte) return null;
    const lignes = localLignes || decompte.lignes || [];
    if (!lignes.length) return decompte.montantsCalcules?.net_ht ?? null;
    const lignesOverridden = lignes.map(l => {
      if (l.codePoste === "A" && attachementInfoForTable && attachementInfoForTable.statut !== "Aucun") {
        const mensuel = attachementInfoForTable.montantFinal || 0;
        return { ...l, mensuel, cumulM: (l.cumulMoins1 || 0) + mensuel };
      }
      return l;
    });
    return computeNetHT(lignesOverridden);
  }, [decompte, localLignes, attachementInfoForTable]);

  // ── États de cession consommés (arrêtés uniquement) ─────────────
  const etatsConsommes = useMemo(() => decompte ? getEtatsConsommesParDecompte(decompte.id, etats) : [], [decompte, etats]);
  const etatsDisponibles = useMemo(() => (!isNew && contrat) ? getEtatsArretesNonConsommes(etats, contrat.id) : [], [isNew, contrat, etats]);
  const etatsNonRetenus = useMemo(() => {
    if (isNew || !contrat || !decompte) return [];
    return etats
      .filter(e => e.contratId === contrat.id && !(e.decomptesConsommateurs || []).includes(decompte.id))
      .map(e => {
        let raison;
        if (e.statutGlobal !== "Arrêté") raison = `Non arrêté (statut : ${e.statutGlobal})`;
        else if (e.periodeFin > decompte.dateFin) raison = `Période non encore échue (fin ${formatDate(e.periodeFin)} > dateFin décompte ${formatDate(decompte.dateFin)})`;
        else if ((e.decomptesConsommateurs || []).length > 0) {
          const autreId = e.decomptesConsommateurs.find(id => id !== decompte.id);
          raison = `Déjà consommé par ${autreId || e.decomptesConsommateurs[0]}`;
        } else raison = "Non éligible";
        return { ...e, raison };
      });
  }, [isNew, contrat, decompte, etats]);
  const totalSectionMTX = useMemo(() => decompte ? getTotalSectionConsommee(decompte.id, "MTX", etats) : 0, [decompte, etats]);
  const totalSectionMTL = useMemo(() => decompte ? getTotalSectionConsommee(decompte.id, "MTL", etats) : 0, [decompte, etats]);
  const totalSectionRH  = useMemo(() => decompte ? getTotalSectionConsommee(decompte.id, "RH", etats)  : 0, [decompte, etats]);
  const cumulRembMTX = useMemo(() => (!isNew && contrat) ? getCumulRembourseAnterieur(contrat.id, "MTX", decompte.dateFin, decomptes) : 0, [isNew, contrat, decompte, decomptes]);
  const cumulRembMTL = useMemo(() => (!isNew && contrat) ? getCumulRembourseAnterieur(contrat.id, "MTL", decompte.dateFin, decomptes) : 0, [isNew, contrat, decompte, decomptes]);
  const cumulRembRH  = useMemo(() => (!isNew && contrat) ? getCumulRembourseAnterieur(contrat.id, "RH",  decompte.dateFin, decomptes) : 0, [isNew, contrat, decompte, decomptes]);
  const cumulCedeMTX = useMemo(() => (!isNew && contrat) ? getCumulCedeAnterieur(contrat.id, "MTX", decompte.dateFin, decomptes) : 0, [isNew, contrat, decompte, decomptes]);
  const cumulCedeMTL = useMemo(() => (!isNew && contrat) ? getCumulCedeAnterieur(contrat.id, "MTL", decompte.dateFin, decomptes) : 0, [isNew, contrat, decompte, decomptes]);
  const cumulCedeRH  = useMemo(() => (!isNew && contrat) ? getCumulCedeAnterieur(contrat.id, "RH",  decompte.dateFin, decomptes) : 0, [isNew, contrat, decompte, decomptes]);

  function handleDetacherEtat(etat) {
    if (!window.confirm(`Détacher l'état ${etat.code} de ce décompte ? Il redeviendra disponible pour un autre décompte.`)) return;
    detacherEtatDuDecompte(etat.id, decompte.id);
    addToast("État de cession détaché — de nouveau disponible.", "success");
  }

  // ── Tabs ──────────────────────────────────────────────────────
  const tabs = [
    { id: "structure",  label: "Structure",     icon: FileText },
    { id: "cessions",   label: "Cessions",      icon: Package, count: etatsConsommes.length },
    { id: "workflow",   label: "Workflow & Discussion", icon: MessageSquare, count: decompte?.fil_discussion?.length || 0 },
    { id: "pj",         label: "Pièces jointes", icon: Paperclip, count: decompte?.pieceJointes?.length || 0 },
  ];

  const totalCessions = totalSectionMTX + totalSectionMTL + totalSectionRH;
  const effectiveLignesRemb = localLignes || decompte?.lignes || linesForDisplay;
  const totalRemboursements = ["H", "J", "L"].reduce((s, code) => s + (effectiveLignesRemb.find(l => l.codePoste === code)?.mensuel || 0), 0);

  // Mémoisation pour éviter la boucle infinie onChange↔infoTotals
  const infoTotalsMemo = useMemo(
    () => ({ G: totalSectionMTX, I: totalSectionMTL, K: totalSectionRH }),
    [totalSectionMTX, totalSectionMTL, totalSectionRH]
  );
  const remboursementInfoMemo = useMemo(
    () => ({
      H: { totalCede: totalSectionMTX, cumulAnterieur: cumulRembMTX, cumulCedeAnterieur: cumulCedeMTX },
      J: { totalCede: totalSectionMTL, cumulAnterieur: cumulRembMTL, cumulCedeAnterieur: cumulCedeMTL },
      L: { totalCede: totalSectionRH,  cumulAnterieur: cumulRembRH,  cumulCedeAnterieur: cumulCedeRH },
    }),
    [totalSectionMTX, totalSectionMTL, totalSectionRH, cumulRembMTX, cumulRembMTL, cumulRembRH, cumulCedeMTX, cumulCedeMTL, cumulCedeRH]
  );

  // ── Layout ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Breadcrumb + nav */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/decomptes")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} />
          Décomptes
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">
          {isNew ? "Nouveau décompte" : decompte.code}
        </span>
        {isDefinitif && <span className="ml-2 text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full font-semibold">Décompte {decompte?.type === "final" ? "final" : "définitif général"}</span>}
        {isRestitution && <span className="ml-2 text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-semibold">Restitution RG</span>}
        {!isNew && (prevDec || nextDec) && (
          <div className="ml-auto flex items-center gap-1">
            {prevDec ? (
              <Link to={`/decomptes/${prevDec.id}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#087F3E] border border-gray-200 rounded-lg px-2 py-1 transition-colors" title={prevDec.code}>
                <ChevronLeft size={13} /> {prevDec.code}
              </Link>
            ) : <span className="w-6" />}
            {nextDec ? (
              <Link to={`/decomptes/${nextDec.id}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#087F3E] border border-gray-200 rounded-lg px-2 py-1 transition-colors" title={nextDec.code}>
                {nextDec.code} <ChevronRight size={13} />
              </Link>
            ) : <span className="w-6" />}
          </div>
        )}
      </div>

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#087F3E] to-[#10A651] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{isNew ? "Nouveau décompte" : decompte.code}</h1>
              {contrat && (
                <p className="text-sm text-white/80 mt-0.5">
                  Contrat{" "}
                  <Link to={`/contrats/${contrat.id}`} className="underline hover:text-white transition-colors">{contrat.code}</Link>
                  {" — "}{contrat.objet}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">{!isNew && <StatusBadge statut={decompte.statut} />}</div>
          </div>

          {!isNew && (
            <div className="flex flex-wrap gap-4 mt-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5"><Calendar size={13} />{formatDate(decompte.dateDebut)} → {formatDate(decompte.dateFin)}</span>
              {contrat && <span className="flex items-center gap-1.5"><Building2 size={13} />{sttDec?.raisonSociale || contrat.sousTraitantId}</span>}
              <span className="flex items-center gap-1.5"><FileText size={13} />Mode : {decompte.modeRenseignement === "import" ? "Import Excel" : "Saisie manuelle"}</span>
            </div>
          )}
        </div>

        {/* Action bandeau */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
          {isNew ? (
            <>
              <button
                onClick={handleSaveNew}
                disabled={!canSaveDraft}
                title={creationErrors.length ? creationErrors[0] : ""}
                className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <Save size={15} />
                Enregistrer le brouillon
              </button>
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <X size={15} />
                Annuler
              </button>
            </>
          ) : isEditable ? (
            <>
              <button
                onClick={handleSubmitForValidation}
                className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {decompte.statut === "Rejeté" ? <><RefreshCw size={15} />Resoumettre</> : <><Send size={15} />Soumettre pour validation</>}
              </button>
              <button onClick={handleSaveDraft} className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Save size={15} />
                Enregistrer
              </button>
            </>
          ) : decompte.statut === "En validation" && (
            <>
              {currentUser?.roleId === decompte.validationEtape?.profilEnAttente ? (
                <div className="flex flex-col gap-3 w-full">
                  {/* Delay badge */}
                  {delaiInfo && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border self-start ${
                      delaiInfo.enRetard
                        ? "bg-red-50 border-red-200 text-red-700"
                        : delaiInfo.jours <= 1
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      <Clock size={12} />
                      {delaiInfo.enRetard
                        ? `En retard de ${delaiInfo.jours} jour${delaiInfo.jours > 1 ? "s" : ""}`
                        : delaiInfo.jours === 0
                        ? "Échéance aujourd'hui"
                        : `Échéance dans ${delaiInfo.jours} jour${delaiInfo.jours > 1 ? "s" : ""}`}
                    </div>
                  )}
                  {/* Checklist */}
                  {activeStepDef?.pointsControle?.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Points de contrôle</h4>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          Object.values(checklistStates).filter(Boolean).length === activeStepDef.pointsControle.length
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {Object.values(checklistStates).filter(Boolean).length}/{activeStepDef.pointsControle.length} vérifiés
                        </span>
                      </div>
                      <div className="space-y-2">
                        {activeStepDef.pointsControle.map((pc, i) => {
                          const dynLines = localLignes || decompte?.lignes || linesForDisplay || [];
                          return (
                            <div key={i}>
                              <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={checklistStates[i] || false}
                                  onChange={() => setChecklistStates(prev => ({ ...prev, [i]: !prev[i] }))}
                                  className="mt-0.5 accent-[#087F3E] flex-shrink-0"
                                />
                                <span className={`text-xs flex-1 ${checklistStates[i] ? "text-gray-400 line-through" : "text-gray-700"}`}>
                                  {pc.libelle}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab(pc.cible)}
                                  className="text-[10px] text-[#087F3E] hover:underline whitespace-nowrap font-medium"
                                >
                                  → {CIBLE_LABELS[pc.cible] || pc.cible}
                                </button>
                              </label>
                              {pc.dynamic && (
                                <ChecklistDynamicRow
                                  dynamic={pc.dynamic}
                                  decompte={decompte}
                                  attachementInfo={attachementInfoForTable}
                                  etatsConsommes={etatsConsommes}
                                  totalSectionMTX={totalSectionMTX}
                                  totalSectionMTL={totalSectionMTL}
                                  totalSectionRH={totalSectionRH}
                                  bcInfoDecompte={bcInfoDecompte}
                                  contrat={contrat}
                                  lines={dynLines}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleValidate}
                      disabled={isLastStepPending && bcInfoDecompte?.bloque}
                      title={isLastStepPending && bcInfoDecompte?.bloque ? "Solde du bon de commande insuffisant — validation bloquée" : ""}
                      className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <CheckCircle2 size={15} />
                      Valider
                    </button>
                    {!showRejectForm ? (
                      <button onClick={() => setShowRejectForm(true)} className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <XCircle size={15} />
                        Rejeter
                      </button>
                    ) : (
                      <button onClick={() => { setShowRejectForm(false); setRejectMotif(""); }} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <X size={15} />
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    <Clock size={14} />
                    En attente de validation par <strong>{decompte.validationEtape.profilEnAttente}</strong>
                  </div>
                  {delaiInfo && (
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                      delaiInfo.enRetard ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      <Clock size={11} />
                      {delaiInfo.enRetard ? `Retard ${delaiInfo.jours}j` : `${delaiInfo.jours}j restant${delaiInfo.jours > 1 ? "s" : ""}`}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => addToast("Fonctionnalité disponible en version finale", "info")} className="ml-auto flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm transition-colors">
                <Download size={14} />
                Télécharger PDF
              </button>
            </>
          )}
          {decompte?.statut === "Approuvé" && currentUser?.roleId === "TRESORERIE" && (
            paiementBloque ? (
              <button
                disabled
                title="La facture doit être validée par la DFC avant paiement"
                className="flex items-center gap-2 bg-gray-200 text-gray-400 px-4 py-2 rounded-lg text-sm font-semibold opacity-70 cursor-not-allowed"
              >
                <Lock size={15} />
                Marquer comme payé
              </button>
            ) : (
              <button onClick={() => setShowPayForm(true)} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <CheckCheck size={15} />
                Marquer comme payé
              </button>
            )
          )}
          {decompte?.statut === "Approuvé" && currentUser?.roleId === "DACC" && (
            <>
              {releveExistant ? (
                <Link to={`/releves/${releveExistant.id}`} className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <ReceiptText size={15} />
                  Voir le relevé de compte ({releveExistant.statut})
                </Link>
              ) : (
                <button onClick={handleGenererReleve} className="flex items-center gap-2 border border-[#087F3E] text-[#087F3E] hover:bg-[#E8F5EE] px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <ReceiptText size={15} />
                  Générer le relevé de compte
                </button>
              )}
              {factureCSEExistante ? (
                <Link to={`/factures/${factureCSEExistante.id}`} className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <FileStack size={15} />
                  Voir la facture CSE ({factureCSEExistante.statut})
                </Link>
              ) : (
                <button onClick={handleGenererFactureCSE} className="flex items-center gap-2 border border-[#087F3E] text-[#087F3E] hover:bg-[#E8F5EE] px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <FileStack size={15} />
                  Générer la facture CSE
                </button>
              )}
            </>
          )}
          {(decompte?.statut === "Payé" || decompte?.statut === "Approuvé") && (
            <button onClick={() => addToast("Fonctionnalité disponible en version finale", "info")} className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm transition-colors">
              <Download size={14} />
              Télécharger PDF
            </button>
          )}
        </div>

        {/* Inline reject form */}
        {showRejectForm && (
          <div className="px-6 py-4 border-t border-red-100 bg-red-50 space-y-3">
            <p className="text-sm font-semibold text-red-800">Formulaire de rejet</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Motif du rejet *</label>
              <textarea
                value={rejectMotif}
                onChange={e => setRejectMotif(e.target.value)}
                rows={2}
                placeholder="Décrivez le motif du rejet…"
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Retourner à l'étape</label>
              <select
                value={rejectRetour}
                onChange={e => setRejectRetour(Number(e.target.value))}
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value={0}>Reprendre depuis le début (étape 1 — {CIRCUIT_DECOMPTE[0].profil})</option>
                {CIRCUIT_DECOMPTE
                  .filter(s => s.ordre > 1 && s.ordre <= decompte.validationEtape.actuelle + 1)
                  .map(s => (
                    <option key={s.ordre} value={s.ordre}>Retourner à l'étape {s.ordre} — {s.profil}</option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmReject}
                disabled={!rejectMotif.trim()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <XCircle size={14} />
                Confirmer le rejet
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectMotif(""); setRejectRetour(0); }}
                className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Inline payment form */}
        {showPayForm && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Confirmer le paiement</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Référence de règlement *</label>
              <input
                type="text"
                value={referencePaiement}
                onChange={e => setReferencePaiement(e.target.value)}
                placeholder="Ex. VIR-2026-1452"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmMarkPaid}
                disabled={!referencePaiement.trim()}
                className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <CheckCheck size={14} />
                Confirmer le paiement
              </button>
              <button
                onClick={() => { setShowPayForm(false); setReferencePaiement(""); }}
                className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creation errors */}
      {isNew && creationErrors.length > 0 && (newContratId || newDateDebut || newDateFin) && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
          {creationErrors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Chevauchement de période — information non bloquante */}
      {(isNew || isEditable) && overlappingDecomptes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1.5">
          {overlappingDecomptes.map(d => {
            const fmtD = (s) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
            return (
              <div key={d.id} className="flex items-start gap-2 text-sm text-blue-800">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Période qui se recoupe avec{" "}
                  <Link to={`/decomptes/${d.id}`} className="font-semibold underline hover:text-blue-900">{d.code}</Link>
                  {" "}({fmtD(d.dateDebut)} → {fmtD(d.dateFin)}, statut <strong>{d.statut}</strong>) — vérifiez qu'il n'y a pas de double comptage des attachements ou cessions.
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Dépassement enveloppe contractuelle */}
      {depassementInfo && isEditable && !isNew && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Dépassement de l'enveloppe contractuelle</p>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                Le cumul des travaux (poste A) atteint{" "}
                <strong>{depassementInfo.cumulTotal.toLocaleString("fr-FR")} FCFA</strong> et excède
                le montant du marché actualisé{" "}
                (<strong>{depassementInfo.enveloppe.toLocaleString("fr-FR")} FCFA</strong>)
                de <strong className="text-amber-900">+{depassementInfo.depassement.toLocaleString("fr-FR")} FCFA</strong>.
                Un avenant de régularisation est-il prévu ?
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={depassementConfirme}
              onChange={e => setDepassementConfirme(e.target.checked)}
              className="w-4 h-4 accent-amber-600"
            />
            <span className="text-sm font-medium text-amber-900">
              Je confirme soumettre ce décompte malgré le dépassement constaté
            </span>
          </label>
        </div>
      )}

      {/* Blocage solde bon de commande — dernière étape uniquement */}
      {isLastStepPending && bcInfoDecompte?.bloque && (
        <div className="bg-red-50 border-2 border-red-400 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <Lock size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">Validation bloquée — solde du bon de commande insuffisant</p>
              <p className="text-sm text-red-800 mt-1 leading-relaxed">
                Le net HT de ce décompte (<strong>{new Intl.NumberFormat("fr-FR").format(bcInfoDecompte.netHT)} FCFA</strong>) dépasse
                le solde disponible du bon de commande {bcInfoDecompte.bc.code}{" "}
                (<strong>{new Intl.NumberFormat("fr-FR").format(bcInfoDecompte.solde)} FCFA</strong>)
                de <strong className="text-red-900">+{new Intl.NumberFormat("fr-FR").format(bcInfoDecompte.depassement)} FCFA</strong>.
                Un avenant est probablement nécessaire pour couvrir ce dépassement.
              </p>
              <Link to={`/contrats/${contrat.id}`} className="text-xs text-red-900 font-semibold underline hover:text-red-950 mt-1.5 inline-block">
                → Aller à l'onglet Avenants du contrat {contrat.code}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Rejection bandeau */}
      {lastRejetMessage && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Décompte rejeté — correction requise</p>
            <p className="text-sm text-red-700 mt-1 leading-relaxed">{lastRejetMessage.message}</p>
            <p className="text-xs text-red-400 mt-1.5">{formatDateShort(lastRejetMessage.date)}</p>
          </div>
        </div>
      )}

      {/* Bandeau net HT négatif — situation autorisée, alerte DCG/DGA */}
      {!isNew && (() => {
        const netHT = netHTEffectif ?? 0;
        return netHT < 0 ? (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Montant net négatif : {new Intl.NumberFormat("fr-FR").format(netHT)} FCFA
              </p>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                Les cessions de la période dépassent les travaux certifiés. Situation autorisée — une alerte sera émise vers le DCG et la DGA.
              </p>
            </div>
          </div>
        ) : null;
      })()}

      {/* STT status banner */}
      {sttDec && (sttDec.statut === "Blacklisté" || sttDec.statut === "Suspendu") && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${sttDec.statut === "Blacklisté" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <AlertCircle size={16} className={`flex-shrink-0 ${sttDec.statut === "Blacklisté" ? "text-red-500" : "text-amber-500"}`} />
          <p className={`text-sm ${sttDec.statut === "Blacklisté" ? "text-red-800" : "text-amber-800"}`}>
            {sttDec.statut === "Blacklisté"
              ? `Attention : le sous-traitant ${sttDec.raisonSociale} est blacklisté. Ce décompte est rattaché à un contrat existant — toute nouvelle opération avec ce tiers est bloquée.`
              : `Attention : le sous-traitant ${sttDec.raisonSociale} est actuellement suspendu. Vérifier la situation avant de soumettre ce décompte.`}
          </p>
        </div>
      )}

      {/* ── 2-col layout ── */}
      <div className="flex gap-6 items-start">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Creation / draft date form */}
          {(isNew || (isEditable && !isNew)) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {isNew ? "Informations générales" : "Modifier les dates"}
              </h3>
              {isNew && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Contrat *</label>
                    <select
                      value={newContratId}
                      onChange={e => setNewContratId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    >
                      <option value="">Sélectionner un contrat</option>
                      {contrats.map(c => {
                        const ok = ["Approuvé final", "En cours d'exécution"].includes(c.statut);
                        return (
                          <option key={c.id} value={c.id} disabled={!ok} style={!ok ? { color: "#9ca3af" } : undefined}>
                            {c.code} — {c.objet}{!ok ? ` (${c.statut})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Type de décompte *</label>
                    <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]">
                      <option value="provisoire">Provisoire (mensuel)</option>
                      <option value="final">Final</option>
                      <option value="definitif_general">Définitif général</option>
                      <option value="restitution_rg_partielle">Restitution RG partielle</option>
                      <option value="restitution_rg_totale">Restitution RG totale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Mode de renseignement</label>
                    <ModeToggle value={modeRenseignement} onChange={setModeRenseignement} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Date de début *</label>
                  <input
                    type="date"
                    value={isNew ? newDateDebut : editDateDebut}
                    onChange={e => isNew ? setNewDateDebut(e.target.value) : setEditDateDebut(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Date de fin *</label>
                  <input
                    type="date"
                    value={isNew ? newDateFin : editDateFin}
                    onChange={e => isNew ? setNewDateFin(e.target.value) : setEditDateFin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-5 pt-2">
              <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>

            <div className="p-5">
              {/* ── Tab: Structure ── */}
              {activeTab === "structure" && (
                <div className="space-y-4">
                  {!isNew && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Mode :{" "}
                        {isEditable ? (
                          <ModeToggle value={modeRenseignement} onChange={setModeRenseignement} />
                        ) : (
                          <span className="font-medium text-gray-800">{decompte.modeRenseignement === "import" ? "Import Excel" : "Saisie manuelle"}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {modeRenseignement === "import" ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        {importLoading ? <Loader2 size={22} className="text-[#087F3E] animate-spin" /> : <FileText size={22} className="text-[#087F3E]" />}
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">{importLoading ? "Import en cours…" : "Importer le bordereau Excel"}</p>
                      <p className="text-xs text-gray-400 mb-4">Format .xlsx — modèle disponible en téléchargement</p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={handleSimulateImport}
                          disabled={importLoading}
                          className="flex items-center gap-2 bg-[#087F3E] disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
                        >
                          {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          Parcourir…
                        </button>
                        <button
                          onClick={() => addToast("Modèle téléchargé", "success")}
                          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        >
                          <Download size={14} />
                          Télécharger le modèle
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Toggle saisie cumulative / mensuelle — visible uniquement en mode édition */}
                      {isEditable && (
                        <div className="flex items-center gap-1 mb-3">
                          <span className="text-xs text-gray-500 mr-2 font-medium">Mode saisie :</span>
                          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium shadow-sm">
                            <button
                              onClick={() => setSaisieMode("cumulative")}
                              className={`px-3 py-1.5 transition-colors ${saisieMode === "cumulative" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                              Saisie cumulative
                            </button>
                            <button
                              onClick={() => setSaisieMode("mensuel")}
                              className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${saisieMode === "mensuel" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                            >
                              Saisie mensuelle
                            </button>
                          </div>
                        </div>
                      )}
                      <DecompteLineTable
                        lignes={linesForDisplay}
                        tauxRG={contrat?.tauxRG || 5}
                        tauxAD={contrat?.tauxAD || 15}
                        tauxRevisionPrix={contrat?.tauxRevisionPrix || 0}
                        tauxTVA={decompte?.tauxTVA ?? 18}
                        saisieMode={saisieMode}
                        editable={isEditable}
                        isImport={!isNew && decompte?.modeRenseignement === "import"}
                        infoTotals={infoTotalsMemo}
                        remboursementInfo={remboursementInfoMemo}
                        attachementInfo={attachementInfoForTable}
                        onChange={isEditable ? setLocalLignes : undefined}
                      />
                    </>
                  )}

                  {isRestitution && decompte.note && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                      <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Note de calcul</p>
                        <p className="text-xs text-amber-700">{decompte.note}</p>
                        <p className="text-xs text-amber-600 mt-1 italic">Taux de répartition par défaut (50/50) — à confirmer avec le client</p>
                      </div>
                    </div>
                  )}

                  {!isNew && (
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[
                        { label: "Travaux exécutés",         val: decompte.montantsCalcules?.a_travauxExecutes, color: "text-gray-900" },
                        { label: "Retenue de garantie",      val: decompte.montantsCalcules?.d_retenueGarantie, color: "text-red-600", sign: "-" },
                        { label: "Remb. avance démarrage",   val: decompte.montantsCalcules?.cp_rembourseAD,    color: "text-red-600", sign: "-" },
                        { label: "Remboursement MTX",        val: decompte.montantsCalcules?.h_rembourseMTX,    color: "text-orange-600", sign: "-" },
                        { label: "Net HT",                   val: decompte.montantsCalcules?.net_ht,            color: "text-[#087F3E] font-bold" },
                        { label: `TVA ${decompte.tauxTVA ?? 18}%`,           val: decompte.montantsCalcules?.montant_tva,       color: "text-gray-600" },
                      ].map(({ label, val, color, sign }) => (
                        <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                          <MoneyDisplay amount={val || 0} sign={sign} className={color} />
                        </div>
                      ))}
                    </div>
                  )}

                  {!isNew && (
                    <div className="rounded-xl bg-[#087F3E] px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-xs uppercase tracking-wide">Net TTC à régler</p>
                        <p className="text-white text-xs mt-0.5">TVA {decompte.tauxTVA ?? 18}% incluse</p>
                      </div>
                      <span className="text-2xl font-bold text-white tabular-nums">
                        {new Intl.NumberFormat("fr-FR").format(decompte.montantsCalcules?.net_ttc || 0)}{" "}
                        <span className="text-sm font-normal opacity-75">FCFA</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Cessions ── */}
              {activeTab === "cessions" && (
                <div className="space-y-4">
                  <div className="bg-[#E8F5EE] border-l-4 border-[#087F3E] px-4 py-3 rounded-r-xl">
                    <p className="text-xs text-[#065A2C] leading-relaxed">
                      Le décompte consomme tous les états de cession <strong>ARRÊTÉS</strong> du contrat dont la <strong>période de fin (periodeFin) est ≤ dateFin du décompte</strong> et qui ne sont pas déjà consommés par un autre décompte. Les postes G / I / K sont calculés automatiquement depuis ces états.
                    </p>
                  </div>

                  {/* ── États consommés ── */}
                  {!isNew && etatsConsommes.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {["MTX", "MTL", "RH"].map(cat => {
                          const total = cat === "MTX" ? totalSectionMTX : cat === "MTL" ? totalSectionMTL : totalSectionRH;
                          const CatIcon = CAT_ICONS[cat];
                          return (
                            <div key={cat} className={`rounded-xl border p-3 ${CAT_COLORS[cat]}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <CatIcon size={13} />
                                <span className="text-xs font-semibold">{CAT_LABELS[cat]}</span>
                              </div>
                              <MoneyDisplay amount={total} variant="small" />
                            </div>
                          );
                        })}
                      </div>
                      <div className="space-y-2">
                        {etatsConsommes.map(e => (
                          <EtatConsommeCard key={e.id} etat={e} isEditable={isEditable} onDetach={handleDetacherEtat} />
                        ))}
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-orange-50 rounded-xl border border-orange-100">
                        <span className="text-sm font-medium text-gray-700">Total cessions (postes informatifs)</span>
                        <MoneyDisplay amount={totalCessions} className="text-orange-700 font-bold" />
                      </div>
                      {totalRemboursements > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-[#E8F5EE] rounded-xl border border-[#c6e8d4]">
                          <span className="text-sm font-medium text-gray-700">Total remboursements saisis</span>
                          <MoneyDisplay amount={totalRemboursements} className="text-[#087F3E] font-bold" />
                        </div>
                      )}
                    </>
                  ) : !isNew ? (
                    <div className="text-center py-8 text-gray-400">
                      <Package size={36} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-gray-500">Aucun état consommé par ce décompte.</p>
                      <p className="text-xs mt-1">Pour qu'un état soit rattaché, il doit être Arrêté et avoir sa periodeFin ≤ {decompte ? formatDate(decompte.dateFin) : "—"}.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">Enregistrez d'abord le brouillon — les états de cession arrêtés du contrat se rattacheront automatiquement.</p>
                  )}

                  {/* ── États non retenus ── */}
                  {!isNew && etatsNonRetenus.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-600">États non retenus ({etatsNonRetenus.length})</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {etatsNonRetenus.map(e => (
                          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Link to={`/etats-cession/${e.id}`} className="text-xs font-medium text-gray-800 hover:text-[#087F3E] hover:underline">{e.code}</Link>
                                <span className="text-[10px] text-gray-400">{formatDate(e.periodeDebut)} → {formatDate(e.periodeFin)}</span>
                              </div>
                            </div>
                            <span className="text-xs text-red-600 italic flex-shrink-0">{e.raison}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isNew && etatsNonRetenus.length === 0 && etatsConsommes.length > 0 && contrat && (
                    <p className="text-xs text-gray-400 text-center">Tous les états du contrat {contrat.code} sont soit consommés, soit non encore arrêtés.</p>
                  )}

                  {!isNew && contrat && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <Link to={`/etats-cession?contratId=${contrat.id}`} className="text-xs text-blue-900 font-semibold underline hover:text-blue-950 whitespace-nowrap">
                        Voir tous les états de cession du contrat →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Workflow & Discussion ── */}
              {activeTab === "workflow" && (
                <div className="space-y-6">
                  {circuitTerrain.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Circuit terrain — validation de chantier</h3>
                      <p className="text-xs text-gray-400 mb-3">Ces deux rôles interviennent avant le circuit administratif central.</p>
                      <div className="flex flex-col gap-2 mb-4">
                        {circuitTerrain.map((step, i) => {
                          const profil = step.profil;
                          const validated = terrainValidated[profil];
                          const prevValidated = i === 0 || terrainValidated[circuitTerrain[i - 1]?.profil];
                          const canValidate = isEditable && prevValidated && !validated;
                          return (
                            <div key={profil} className="flex items-center gap-3">
                              <div className="flex-1">
                                <EtapeChip etape={{ ...step, statut: validated ? "validé" : canValidate ? "en attente" : "à venir" }} isActive={canValidate} />
                              </div>
                              {canValidate && (
                                <button onClick={() => setTerrainValidated(prev => ({ ...prev, [profil]: true }))} className="flex items-center gap-1 text-xs bg-[#087F3E] text-white px-2.5 py-1 rounded-lg hover:bg-[#065A2C] transition-colors font-medium whitespace-nowrap">
                                  <CheckCircle2 size={12} />
                                  Valider ({profil})
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Circuit administratif de validation</h3>
                    {circuitSteps.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {circuitSteps.map((step, i) => (
                          <EtapeChip key={i} etape={step} isActive={!isNew && step.statut === "en attente"} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Circuit non défini — sélectionnez un contrat pour voir le circuit.</p>
                    )}
                  </div>

                  {!isNew && decompte.historique?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Historique</h3>
                      <WorkflowSteps
                        steps={decompte.historique.map((h, i) => ({ ordre: i + 1, nom: h.utilisateur, profil: h.action, statut: "validé", date: h.date, commentaire: h.details }))}
                        orientation="vertical"
                      />
                    </div>
                  )}

                  {/* Fil de discussion */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      Fil de discussion
                      {!isNew && decompte.fil_discussion?.length > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{decompte.fil_discussion.length}</span>
                      )}
                    </h3>

                    {!isNew && decompte.fil_discussion?.length > 0 ? (
                      <div className="space-y-3">
                        {decompte.fil_discussion.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 py-4 text-center">Aucun message</p>
                    )}

                    {!isNew && (
                      <div className="mt-4 flex gap-2">
                        <textarea
                          rows={2}
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          placeholder="Ajouter un commentaire… (Entrée pour envoyer, Shift+Entrée pour sauter une ligne)"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] resize-none"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className="flex-shrink-0 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Pièces jointes ── */}
              {activeTab === "pj" && (
                <div className="space-y-3">
                  {!isNew && decompte.pieceJointes?.length > 0 ? (
                    decompte.pieceJointes.map(pj => (
                      <div key={pj.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group">
                        <span className="text-2xl">{fileIcon(pj.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{pj.nom}</p>
                          <p className="text-xs text-gray-400">{pj.categorie} · {pj.taille} · {formatDate(pj.dateAjout)}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Eye size={14} /></button>
                          <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><Download size={14} /></button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <Paperclip size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Aucune pièce jointe</p>
                    </div>
                  )}
                  {isEditable && (
                    <button onClick={() => addToast("Fonctionnalité disponible en version finale", "info")} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-500 hover:border-[#087F3E] hover:text-[#087F3E] transition-colors">
                      <Plus size={15} />
                      Ajouter une pièce jointe
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky Sidebar ── */}
        <div className="w-[350px] flex-shrink-0 sticky top-[96px] space-y-4">
          {!isNew && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Informations</h4>
              {[
                { label: "Code",              value: decompte.code },
                { label: "Type",              value: TYPE_LABELS[decompte.type] || decompte.type },
                { label: "Période",           value: `${formatDate(decompte.dateDebut)} → ${formatDate(decompte.dateFin)}` },
                { label: "Étape validation",  value: `${decompte.validationEtape?.actuelle}/${decompte.validationEtape?.total}${decompte.validationEtape?.profilEnAttente ? ` (${decompte.validationEtape.profilEnAttente})` : ""}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-xs text-gray-800 text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}

          {!isNew && (
            <div className="bg-[#E8F5EE] rounded-xl border border-[#b5ddc8] p-4">
              <p className="text-xs font-semibold text-[#065A2C] uppercase tracking-wide mb-2">Montants clés</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Travaux exécutés</span>
                  <MoneyDisplay amount={decompte.montantsCalcules?.a_travauxExecutes} variant="small" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-600">RG + AD</span>
                  <MoneyDisplay amount={(decompte.montantsCalcules?.cp_rembourseAD || 0) + (decompte.montantsCalcules?.d_retenueGarantie || 0)} variant="small" className="text-red-600" />
                </div>
                {totalCessions > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-orange-600">Cessions</span>
                    <MoneyDisplay amount={totalCessions - totalRemboursements} variant="small" className="text-orange-600" />
                  </div>
                )}
                <div className="border-t border-[#b5ddc8] pt-1.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-[#065A2C]">Net TTC</span>
                  <MoneyDisplay amount={decompte.montantsCalcules?.net_ttc} variant="small" className="text-[#065A2C] font-bold" />
                </div>
              </div>
            </div>
          )}

          {contrat && (
            <SituationChantierWidget
              contrat={contrat}
              decomptes={decomptes}
              lignesEnCours={isEditable ? localLignes : null}
              decompteId={isNew ? null : decompte?.id}
              bonsCommande={bonsCommande}
            />
          )}

          {contrat && (
            <Link
              to={`/contrats/${contrat.id}`}
              className="flex items-center justify-between gap-2 bg-white rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-[#087F3E] hover:text-[#087F3E] transition-colors group"
            >
              <span>Voir le contrat {contrat.code}</span>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
