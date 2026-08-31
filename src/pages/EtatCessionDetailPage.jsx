import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Package, Truck, Users,
  RefreshCw, Download, Loader2, Check, Ban, AlertTriangle, FileText, Upload,
  X, Eye, Info, CheckCircle, Clock, History,
} from "lucide-react";
import { useEtatsCession } from "../context/EtatsCessionContext";
import { countAnomaliesJustifiees } from "../utils/etatCessionMetrics";
import { useContrats } from "../context/ContratsContext";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { useParametres } from "../context/ParametresContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import MoneyDisplay from "../components/MoneyDisplay";
import StatusBadge from "../components/StatusBadge";
import { formatDate } from "../utils/formatters";

const CAT_ICONS = { MTX: Package, MTL: Truck, RH: Users };
const CAT_LABELS = { MTX: "Matériaux (MTX)", MTL: "Matériel (MTL)", RH: "Ressources humaines (RH)" };
const fmt = n => new Intl.NumberFormat("fr-FR").format(n);

function firstDayOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastDayOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function iso(d) { return d.toISOString().slice(0, 10); }

function findBaremeLigne(ligne, categorie, contrat) {
  const catKey = categorie.toLowerCase();
  const baremeLines = contrat?.baremeCessions?.[catKey] || [];
  const ref = categorie === "MTX" ? ligne.codeArticleX3 : categorie === "MTL" ? ligne.codeMateriel : null;
  let match = ref ? baremeLines.find(b => b.baremeRefId === ref) : null;
  if (!match) {
    const designation = ligne.designation || ligne.qualification;
    match = baremeLines.find(b => b.designation === designation);
  }
  return match;
}

// ── Modal aperçu PDF simulé ────────────────────────────────────────────────
function PDFModal({ doc, onClose }) {
  if (!doc) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Aperçu document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-4 text-center">
          <div className="w-14 h-16 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-xs font-bold mx-auto mb-3">PDF</div>
          <p className="text-sm font-medium text-gray-900 break-all">{doc.nom}</p>
          {doc.type && <p className="text-xs text-gray-400 mt-1">{doc.type}</p>}
          {doc.dateAjout && <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.dateAjout)}</p>}
          <p className="text-xs text-gray-500 italic mt-4 border-t border-gray-200 pt-3">
            Aperçu PDF — document disponible en production
          </p>
        </div>
        <button onClick={onClose} className="w-full text-sm text-center text-gray-500 hover:text-gray-700 transition-colors">Fermer</button>
      </div>
    </div>
  );
}

// ── Formulaire upload BR (section-level) ─────────────────────────────────
function UploadBRForm({ onSubmit, onCancel }) {
  const [refBR, setRefBR] = useState("");
  const [dtSignataire, setDtSignataire] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  function handleUpload() {
    if (!refBR.trim()) { addToast("La référence du bon de réception est requise.", "error"); return; }
    setLoading(true);
    setTimeout(() => {
      const nomFichier = `BR_${refBR.trim().replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      onSubmit({ refBR: refBR.trim(), dtSignataire: dtSignataire.trim(), nomFichier });
      setLoading(false);
    }, 800);
  }

  return (
    <div className="border border-[#087F3E]/30 bg-[#E8F5EE] rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[#065A2C] flex items-center gap-1.5">
        <Upload size={12} /> Uploader le bon de réception
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Référence BR *</label>
          <input
            value={refBR} onChange={e => setRefBR(e.target.value)}
            placeholder="BR-CTR001-08-0001"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#087F3E] bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">DT signataire</label>
          <input
            value={dtSignataire} onChange={e => setDtSignataire(e.target.value)}
            placeholder="Prénom NOM"
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#087F3E] bg-white"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs border border-dashed border-[#087F3E]/50 text-[#087F3E] px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/60 transition-colors">
          <Upload size={11} /> Parcourir…
          <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={() => {}} />
        </label>
        <button
          onClick={handleUpload} disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-[#087F3E] disabled:opacity-60 text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {loading ? "Upload en cours…" : "Valider l'upload"}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition-colors">Annuler</button>
      </div>
    </div>
  );
}

// ── Messages informatifs par type d'anomalie ─────────────────────────────
const ANOMALIE_INFO = {
  "BR manquant": {
    couleur: "red",
    message: "Le bon de réception chantier (BR) n'a pas encore été uploadé pour ce bon de sortie X3. Sans BR, les quantités ne peuvent être certifiées.",
    voie1: "Le DT peut uploader le BR directement depuis cette page (bouton « Uploader un BR »).",
    voie2: "En l'absence de BR physique, le DCG peut justifier en joignant tout document probant (attestation de réception, relevé de chantier, etc.). Attention : la justification documentaire d'un BR manquant ne se substitue pas au BR — elle permet de débloquer le visa en attendant l'original.",
  },
  "Sous-traitant divergent": {
    couleur: "orange",
    message: "Le sous-traitant mentionné sur le bon de sortie X3 diffère de celui qui a signé le bon de réception chantier. Cela indique une livraison par un prestataire non prévu au contrat.",
    voie1: "Si l'anomalie est une erreur de saisie dans X3, lancer une « Réactualisation X3 » pour récupérer les données corrigées.",
    voie2: "Si le recours à ce sous-traitant était légitime, justifier documentairement en joignant l'accord de substitution ou l'ordre de service correspondant.",
  },
  "Écart de quantité": {
    couleur: "amber",
    message: "La quantité réceptionnée sur le BR est inférieure à celle du bon de sortie X3. Un écart non justifié bloque le visa des quantités.",
    voie1: "Si la différence est due à une erreur X3, lancer une « Réactualisation X3 » pour récupérer la quantité corrigée.",
    voie2: "Si l'écart est réel et expliqué (coulage partiel, retour de matériaux…), joindre un relevé de chantier ou tout justificatif.",
  },
};

const ANOMALIE_STATUT_STYLE = {
  "Active":                { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-700",    dot: "bg-red-500",    label: "Active" },
  "Justifiée":             { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700",  dot: "bg-amber-400",  label: "Justifiée" },
  "Levée par réactualisation": { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500", label: "Levée" },
};

function AnomalieBadge({ anomalie }) {
  if (!anomalie) return null;
  const style = ANOMALIE_STATUT_STYLE[anomalie.statut] || ANOMALIE_STATUT_STYLE["Active"];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {anomalie.type} · {style.label}
    </span>
  );
}

function AnomalieInfoPanel({ anomalie, onClose }) {
  const info = ANOMALIE_INFO[anomalie.type];
  if (!info) return null;
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${anomalie.statut === "Active" ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-gray-800">{anomalie.type}</p>
          <AnomalieBadge anomalie={anomalie} />
        </div>
        {onClose && <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>}
      </div>
      <p className="text-xs text-gray-700 leading-relaxed">{info.message}</p>
      {anomalie.statut === "Active" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Voies de résolution</p>
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-[#087F3E] uppercase tracking-wide">Voie 1 — Réactualisation X3</p>
            <p className="text-xs text-gray-600">{info.voie1}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Voie 2 — Justification documentaire</p>
            <p className="text-xs text-gray-600">{info.voie2}</p>
          </div>
        </div>
      )}
      {anomalie.resolution && anomalie.statut !== "Active" && (
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Résolution — {anomalie.resolution.voie}</p>
          {anomalie.resolution.motif && <p className="text-xs text-gray-700">{anomalie.resolution.motif}</p>}
          {anomalie.resolution.pieceJointe && (
            <p className="text-xs text-gray-500 flex items-center gap-1"><FileText size={10} className="text-red-400" /> {anomalie.resolution.pieceJointe}</p>
          )}
          <p className="text-[10px] text-gray-400">Par {anomalie.resolution.parUtilisateur} le {formatDate(anomalie.resolution.dateResolution)}</p>
        </div>
      )}
      {(anomalie.historique || []).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1"><History size={10} /> Historique</p>
          {anomalie.historique.map((h, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-500">
              <Clock size={9} className="mt-0.5 flex-shrink-0 text-gray-300" />
              <span>{formatDate(h.date)} — {h.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JustificationForm({ ligne, cat, onJustifier, onCancel }) {
  const [motif, setMotif] = useState("");
  const [nomDoc, setNomDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const isBRManquant = ligne.anomalie?.type === "BR manquant";

  function handleSubmit() {
    if (!motif.trim()) { addToast("Le motif est obligatoire.", "error"); return; }
    setLoading(true);
    setTimeout(() => {
      onJustifier(ligne.id, { motif: motif.trim(), pieceJointe: nomDoc.trim() || null });
      setLoading(false);
    }, 600);
  }

  return (
    <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
        <CheckCircle size={12} /> Justifier l'anomalie — Voie 2 (justification documentaire)
      </p>
      {isBRManquant && (
        <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-1.5">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>Attention : justifier un BR manquant sans document ne lève pas l'obligation de produire le BR physique. Cette action permet uniquement de débloquer le visa en attente de l'original.</span>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-700 mb-1">Motif de justification <span className="text-red-500">*</span></label>
        <textarea
          value={motif} onChange={e => setMotif(e.target.value)} rows={3}
          placeholder="Décrire la raison de l'anomalie et les éléments justificatifs…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-400 bg-white resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-700 mb-1">Document joint (optionnel)</label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs border border-dashed border-amber-400 text-amber-700 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-amber-100/60 transition-colors">
            <Upload size={11} /> Parcourir…
            <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={e => { if (e.target.files?.[0]) setNomDoc(e.target.files[0].name); }} />
          </label>
          {nomDoc && <span className="text-xs text-gray-600 truncate max-w-[200px]">{nomDoc}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleSubmit} disabled={loading || !motif.trim()}
          className="flex items-center gap-1.5 text-xs bg-amber-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">
          {loading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
          {loading ? "Enregistrement…" : "Marquer comme justifiée"}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition-colors">Annuler</button>
      </div>
    </div>
  );
}

// ── Bloc documents MTX (BS groupés + BR uploadés) ────────────────────────
function MTXDocumentsBlock({ section, isDT, canUpload, onUploaderBR, onViewPDF }) {
  const [showUpload, setShowUpload] = useState(false);
  const lignes = section.lignes || [];
  const pieceJointesBR = section.pieceJointesBR || [];

  // BS uniques groupés par refBonSortieX3
  const bsGroups = useMemo(() => {
    const map = new Map();
    lignes.forEach(l => {
      if (!l.refBonSortieX3) return;
      if (!map.has(l.refBonSortieX3)) {
        map.set(l.refBonSortieX3, { ref: l.refBonSortieX3, doc: l.pieceJointesBS?.[0] || null, dateSortie: l.dateSortie });
      }
    });
    return [...map.values()];
  }, [lignes]);

  // BR depuis les données (refBonReceptionChantier distincts)
  const brDataRefs = useMemo(() => [...new Set(lignes.map(l => l.refBonReceptionChantier).filter(Boolean))], [lignes]);
  const hasMissingBR = lignes.some(l => !l.refBonReceptionChantier);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
      {/* ── Bons de sortie X3 ── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Bons de sortie X3 ({bsGroups.length})
        </p>
        {bsGroups.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucun bon de sortie dans cette section.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bsGroups.map(bs => (
              <button
                key={bs.ref}
                onClick={() => bs.doc && onViewPDF(bs.doc)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${bs.doc ? "border-gray-200 bg-white hover:border-red-300 cursor-pointer" : "border-dashed border-gray-200 bg-white/60 cursor-default"}`}
              >
                <FileText size={11} className={bs.doc ? "text-red-400" : "text-gray-300"} />
                <span className="font-mono text-gray-700">{bs.ref}</span>
                {bs.dateSortie && <span className="text-gray-400">· {formatDate(bs.dateSortie)}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Bons de réception chantier ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Bons de réception chantier ({brDataRefs.length + pieceJointesBR.length})
          </p>
          {hasMissingBR && canUpload && !showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 text-xs border border-[#087F3E] text-[#087F3E] px-2.5 py-1 rounded-lg hover:bg-[#E8F5EE] transition-colors"
            >
              <Upload size={10} /> Uploader un BR
            </button>
          )}
          {hasMissingBR && !canUpload && (
            <span className="text-[10px] text-gray-400 italic">upload BR attendu par DT</span>
          )}
        </div>

        {/* BR dans les données */}
        {brDataRefs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {brDataRefs.map(ref => {
              const ligne = lignes.find(l => l.refBonReceptionChantier === ref);
              const doc = { nom: `BR_${ref}.pdf`, type: "Bon de réception chantier", dateAjout: ligne?.dateSortie };
              return (
                <button
                  key={ref}
                  onClick={() => onViewPDF(doc)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-green-300 transition-colors"
                >
                  <FileText size={11} className="text-red-400" />
                  <span className="font-mono text-gray-700">{ref}</span>
                  {ligne?.sousTraitantBonReception && <span className="text-gray-400 truncate max-w-[140px]">· {ligne.sousTraitantBonReception}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* BR uploadés (section.pieceJointesBR) */}
        {pieceJointesBR.length > 0 && (
          <div className="space-y-1.5">
            {pieceJointesBR.map((pj, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                <FileText size={11} className="text-red-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 flex-1 truncate">{pj.nom}</span>
                {pj.dtSignataire && <span className="text-[10px] text-gray-400 flex-shrink-0">DT: {pj.dtSignataire}</span>}
                {pj.dateAjout && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatDate(pj.dateAjout)}</span>}
                <button onClick={() => onViewPDF(pj)} className="text-gray-400 hover:text-[#087F3E] transition-colors flex-shrink-0">
                  <Eye size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Indicateur BR manquants */}
        {hasMissingBR && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle size={11} className="flex-shrink-0" />
            {lignes.filter(l => !l.refBonReceptionChantier).length} ligne(s) sans BR associé
          </div>
        )}

        {/* Formulaire upload */}
        {showUpload && (
          <div className="mt-3">
            <UploadBRForm
              onSubmit={(data) => { onUploaderBR(data); setShowUpload(false); }}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Table plate MTX (lignes triées par date) ─────────────────────────────
function MTXFlatTable({ lignes, isDCG, cat, onViewPDF, onJustifier }) {
  const [expandedInfo, setExpandedInfo] = useState(null);   // ligneId with AnomalieInfoPanel open
  const [justifyingId, setJustifyingId] = useState(null);   // ligneId with JustificationForm open

  const sorted = useMemo(() => [...lignes].sort((a, b) => (a.dateSortie || "").localeCompare(b.dateSortie || "")), [lignes]);
  if (sorted.length === 0) return null;

  function rowBg(l) {
    if (!l.anomalie) return "hover:bg-gray-50/60";
    if (l.anomalie.statut === "Active") return "bg-red-50/40";
    if (l.anomalie.statut === "Justifiée") return "bg-amber-50/30";
    return "bg-green-50/20";
  }

  return (
    <div className="space-y-1">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-400 border-b border-gray-200">
              <th className="text-left py-2 pr-2 font-medium">Date sortie</th>
              <th className="text-left py-2 pr-2 font-medium">Article</th>
              <th className="text-right py-2 pr-2 font-medium">Qté</th>
              <th className="text-left py-2 pr-2 font-medium">Unité</th>
              <th className="text-right py-2 pr-2 font-medium">Prix unit.</th>
              <th className="text-right py-2 pr-2 font-medium">Montant</th>
              <th className="text-left py-2 pr-2 font-medium">Réf. BS</th>
              <th className="text-left py-2 font-medium">Réf. BR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(l => (
              <>
                <tr key={l.id} className={rowBg(l)}>
                  <td className="py-2 pr-2 text-gray-500 whitespace-nowrap">{formatDate(l.dateSortie)}</td>
                  <td className="py-2 pr-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-800 font-medium truncate max-w-[160px]" title={l.designation}>{l.designation}</span>
                      </div>
                      {l.anomalie && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <AnomalieBadge anomalie={l.anomalie} />
                          <button
                            onClick={() => setExpandedInfo(expandedInfo === l.id ? null : l.id)}
                            className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors"
                          >
                            <Info size={9} /> détails
                          </button>
                          {isDCG && l.anomalie.statut === "Active" && (
                            <button
                              onClick={() => setJustifyingId(justifyingId === l.id ? null : l.id)}
                              className="text-[10px] text-amber-600 hover:text-amber-800 flex items-center gap-0.5 transition-colors"
                            >
                              <CheckCircle size={9} /> justifier
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-right text-gray-700 align-top">{fmt(l.quantiteSortie)}</td>
                  <td className="py-2 pr-2 text-gray-500 align-top">{l.unite}</td>
                  <td className="py-2 pr-2 text-right text-gray-700 whitespace-nowrap align-top">{fmt(l.prixUnitaireApplique)}</td>
                  <td className="py-2 pr-2 text-right font-semibold text-gray-900 whitespace-nowrap align-top">{fmt(l.montantValorise)}</td>
                  <td className="py-2 pr-2 align-top">
                    <button
                      onClick={() => l.pieceJointesBS?.[0] && onViewPDF(l.pieceJointesBS[0])}
                      className="flex items-center gap-1 font-mono text-gray-600 hover:text-[#087F3E] transition-colors"
                    >
                      <FileText size={10} className="text-red-300 flex-shrink-0" />
                      <span className="truncate max-w-[100px]">{l.refBonSortieX3 || "—"}</span>
                    </button>
                  </td>
                  <td className="py-2 align-top">
                    {l.refBonReceptionChantier
                      ? <span className="font-mono text-[#065A2C]">{l.refBonReceptionChantier}</span>
                      : <span className="bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium">manquant</span>
                    }
                  </td>
                </tr>
                {expandedInfo === l.id && l.anomalie && (
                  <tr key={`${l.id}-info`}>
                    <td colSpan={8} className="px-2 pb-2">
                      <AnomalieInfoPanel anomalie={l.anomalie} onClose={() => setExpandedInfo(null)} />
                    </td>
                  </tr>
                )}
                {justifyingId === l.id && isDCG && l.anomalie?.statut === "Active" && (
                  <tr key={`${l.id}-justify`}>
                    <td colSpan={8} className="px-2 pb-2">
                      <JustificationForm
                        ligne={l} cat={cat}
                        onJustifier={(ligneId, data) => { onJustifier(ligneId, data); setJustifyingId(null); }}
                        onCancel={() => setJustifyingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LigneRowMTL({ ligne }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{ligne.designation}</p>
          <p className="text-xs text-gray-400">
            {formatDate(ligne.dateUtilisation)} · {ligne.dureeUtilisee} {ligne.uniteFacturation === "heure" ? "heure(s)" : "jour(s)"}
            {" × "}{fmt(ligne.tarifApplique)} FCFA
            {" · "}{ligne.refPointage}{ligne.operateur ? ` · ${ligne.operateur}` : ""}
          </p>
        </div>
        <MoneyDisplay amount={ligne.montantValorise} variant="small" />
      </div>
    </div>
  );
}

function LigneRowRH({ ligne }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{ligne.qualification}</p>
          <p className="text-xs text-gray-400">
            {ligne.typePersonnel === "journalier" ? "Journalier" : "Permanent"} · {ligne.nombreJoursHomme} jour(s)-homme
            {" × "}{fmt(ligne.coutUnitaireApplique)} FCFA
            {" · Paie "}{ligne.periodePaie} · {ligne.refImportPaie}
          </p>
        </div>
        <MoneyDisplay amount={ligne.montantValorise} variant="small" />
      </div>
    </div>
  );
}

const LIGNE_ROWS = { MTL: LigneRowMTL, RH: LigneRowRH };

// ── SectionCard principale ────────────────────────────────────────────────
function SectionCard({ categorie, section, etat, contrat, currentUser, onAlimenter, onReactualiser, onViser, onRejeter, onUploaderBR, onViewPDF, onJustifier }) {
  const [open, setOpen] = useState(section.statut !== "Non renseignée");
  const [rejectingType, setRejectingType] = useState(null);
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const Icon = CAT_ICONS[categorie];
  const isDCG = currentUser?.roleId === "DCG";
  const isDACC = currentUser?.roleId === "DACC";
  const isDT = currentUser?.roleId === "DT";

  // Comptage anomalies — toujours depuis lignes plates
  const isMTX = categorie === "MTX";
  const lignes = section.lignes || [];

  const nActiveAnomalies = useMemo(() => lignes.filter(l => l.anomalie?.statut === "Active").length, [lignes]);
  const nJustifiees = useMemo(() => lignes.filter(l => l.anomalie?.statut === "Justifiée").length, [lignes]);

  // Détail anomalies MTX actives pour checklist DCG
  const nBRManquant = isMTX ? lignes.filter(l => l.anomalie?.statut === "Active" && l.anomalie?.type === "BR manquant").length : 0;
  const nSTTDivergent = isMTX ? lignes.filter(l => l.anomalie?.statut === "Active" && l.anomalie?.type === "Sous-traitant divergent").length : 0;
  const nEcartQte = isMTX ? lignes.filter(l => l.anomalie?.statut === "Active" && l.anomalie?.type === "Écart de quantité").length : 0;

  const lignesJustifiees = useMemo(() => isMTX ? lignes.filter(l => l.anomalie?.statut === "Justifiée") : [], [lignes, isMTX]);

  const alimentationLabel = categorie === "MTX" ? "Récupérer depuis Sage X3" : categorie === "MTL" ? "Importer le pointage journalier" : "Importer le fichier de paie";
  const modeleLabel = categorie === "MTL" ? "Télécharger le modèle de pointage" : categorie === "RH" ? "Télécharger le modèle de paie" : null;

  const canViserMTX = nActiveAnomalies === 0;

  const recap = useMemo(() => {
    return lignes.map(l => {
      const bareme = findBaremeLigne(l, categorie, contrat);
      return { ligne: l, negocie: bareme && bareme.statutPrix && bareme.statutPrix !== "Prix de référence" };
    });
  }, [lignes, categorie, contrat]);
  const nNegocies = recap.filter(r => r.negocie).length;
  const totalLignes = lignes.length;

  function handleAlimenter() {
    setLoading(true);
    setTimeout(() => { onAlimenter(); setLoading(false); }, 800);
  }
  function handleReactualiser() {
    setLoading(true);
    setTimeout(() => {
      onReactualiser();
      setLoading(false);
      addToast("Section réactualisée — anomalies résolues effacées.", "success");
    }, 700);
  }
  function confirmerRejet() {
    if (!motif.trim()) return;
    onRejeter(rejectingType, motif.trim());
    setRejectingType(null);
    setMotif("");
  }

  const hasData = lignes.length > 0;
  const isEditable = ["Ouvert", "En contrôle"].includes(etat.statutGlobal);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 bg-gray-50">
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
          <Icon size={16} className="text-gray-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-800">{CAT_LABELS[categorie]}</span>
          <StatusBadge statut={section.statut} />
          {nActiveAnomalies > 0 && (
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
              {nActiveAnomalies} anomalie{nActiveAnomalies > 1 ? "s" : ""} active{nActiveAnomalies > 1 ? "s" : ""}
            </span>
          )}
          {nJustifiees > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              {nJustifiees} justifiée{nJustifiees > 1 ? "s" : ""}
            </span>
          )}
        </button>
        <MoneyDisplay amount={section.totalValorise} />
      </div>

      {open && (
        <div className="p-4 space-y-3 border-t border-gray-100">
          {/* Boutons alimentation — DCG ou DT selon catégorie */}
          {isEditable && (["Non renseignée", "Alimentée", "Anomalies détectées"].includes(section.statut)) && (
            (isDCG || (isDT && categorie === "MTX")) && (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleAlimenter} disabled={loading}
                  className="flex items-center gap-1.5 text-xs border border-[#087F3E] text-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] disabled:opacity-60 transition-colors">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {alimentationLabel}
                </button>
                {modeleLabel && isDCG && (
                  <button onClick={() => addToast("Modèle téléchargé.", "success")}
                    className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download size={12} /> {modeleLabel}
                  </button>
                )}
                {section.statut === "Anomalies détectées" && isMTX && (
                  <button onClick={handleReactualiser} disabled={loading}
                    className="flex items-center gap-1.5 text-xs border border-amber-400 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-60 transition-colors">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Réactualiser depuis Sage X3
                  </button>
                )}
              </div>
            )
          )}

          {section.derniereRecuperation && (
            <p className="text-[11px] text-gray-400">Dernière alimentation : {new Date(section.derniereRecuperation).toLocaleString("fr-FR")}</p>
          )}

          {/* ── MTX — documents en haut + table plate ─────────────────── */}
          {isMTX && lignes.length > 0 && (
            <div className="space-y-3">
              <MTXDocumentsBlock
                section={section}
                isDT={isDT}
                canUpload={isDT && isEditable}
                onUploaderBR={onUploaderBR}
                onViewPDF={onViewPDF}
              />
              <MTXFlatTable
                lignes={lignes}
                isDCG={isDCG}
                cat={categorie}
                onViewPDF={onViewPDF}
                onJustifier={(ligneId, data) => onJustifier && onJustifier(ligneId, data)}
              />
            </div>
          )}

          {/* ── MTL / RH — lignes classiques ──────────────────────────────── */}
          {!isMTX && lignes.length > 0 && (
            <div className="space-y-2">
              {lignes.map(l => {
                const Row = LIGNE_ROWS[categorie];
                return <Row key={l.id} ligne={l} />;
              })}
            </div>
          )}

          {/* ── Documents de section MTL / RH ─────────────────────────────── */}
          {!isMTX && (section.pieceJointesSection || []).length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Documents importés</p>
              <div className="space-y-1.5">
                {section.pieceJointesSection.map((pj, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <FileText size={11} className="text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">{pj.nom}</p>
                      <p className="text-[10px] text-gray-400">{pj.nbLignes} ligne(s) · {formatDate(pj.dateImport)}</p>
                    </div>
                    <button onClick={() => onViewPDF(pj)} className="text-gray-400 hover:text-[#087F3E] transition-colors flex-shrink-0">
                      <Eye size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejet conservé */}
          {section.dernierRejet && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <strong>Rejet {section.dernierRejet.typeVisa === "quantites" ? "des quantités" : "des prix/montants"}</strong>
              {" "}par {section.dernierRejet.par} le {formatDate(section.dernierRejet.date)} — motif : {section.dernierRejet.motif}
            </div>
          )}

          {/* ── Visa quantités DCG ─────────────────────────────────────────── */}
          {hasData && (["Alimentée", "Anomalies détectées"].includes(section.statut)) && isDCG && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {/* Checklist MTX — anomalies actives bloquantes */}
              {isMTX && nActiveAnomalies > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-red-800">Anomalies actives — visa bloqué ({nActiveAnomalies}) :</p>
                  {nBRManquant > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-700">
                      <AlertTriangle size={11} className="flex-shrink-0" />
                      {nBRManquant} ligne(s) sans bon de réception — utilisez le bouton « justifier » sur chaque ligne ou demandez au DT d'uploader le BR
                    </div>
                  )}
                  {nSTTDivergent > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-700">
                      <AlertTriangle size={11} className="flex-shrink-0" />
                      {nSTTDivergent} ligne(s) avec sous-traitant divergent — réactualisez depuis X3 ou justifiez documentairement
                    </div>
                  )}
                  {nEcartQte > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-700">
                      <AlertTriangle size={11} className="flex-shrink-0" />
                      {nEcartQte} ligne(s) avec écart de quantité — réactualisez depuis X3 ou justifiez via relevé de chantier
                    </div>
                  )}
                  <p className="text-[10px] text-red-600 italic">Cliquez sur « justifier » dans le tableau pour chaque ligne, ou lancez une réactualisation X3 (Voie 1).</p>
                </div>
              )}

              {/* Recap anomalies justifiées (non bloquantes) */}
              {isMTX && nJustifiees > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <CheckCircle size={11} /> {nJustifiees} anomalie{nJustifiees > 1 ? "s" : ""} justifiée{nJustifiees > 1 ? "s" : ""} — non bloquante{nJustifiees > 1 ? "s" : ""}
                  </p>
                  {lignesJustifiees.map(l => (
                    <div key={l.id} className="text-xs text-amber-700 pl-4 flex items-start gap-1">
                      <span className="flex-shrink-0">·</span>
                      <span><strong>{l.designation}</strong> — {l.anomalie.type} · justifié par {l.anomalie.resolution?.parUtilisateur} : {l.anomalie.resolution?.motif?.slice(0, 80)}{l.anomalie.resolution?.motif?.length > 80 ? "…" : ""}</span>
                    </div>
                  ))}
                </div>
              )}

              {isMTX && nActiveAnomalies === 0 && hasData && (
                <div className="bg-[#E8F5EE] border border-[#087F3E]/20 rounded-lg px-3 py-2.5 space-y-1">
                  <p className="text-xs font-semibold text-[#065A2C]">Checklist DCG — MTX :</p>
                  {[
                    "Bons de réception associés à toutes les lignes",
                    "Concordance STT BS/BR vérifiée",
                    "Écarts de quantité levés ou justifiés",
                  ].map(item => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-[#065A2C]">
                      <Check size={11} className="text-[#087F3E] flex-shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {rejectingType === "quantites" ? (
                  <>
                    <input autoFocus type="text" value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif du rejet (obligatoire)…"
                      className="flex-1 border border-red-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400" />
                    <button onClick={confirmerRejet} disabled={!motif.trim()} className="text-xs bg-red-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">Confirmer</button>
                    <button onClick={() => { setRejectingType(null); setMotif(""); }} className="text-xs text-gray-500 px-2 py-1.5 hover:text-gray-700">Annuler</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onViser("quantites")}
                      disabled={isMTX ? !canViserMTX : nActiveAnomalies > 0}
                      title={nActiveAnomalies > 0 ? `Bloqué — ${nActiveAnomalies} anomalie(s) active(s) restante(s)` : ""}
                      className="flex items-center gap-1.5 text-xs bg-[#087F3E] disabled:opacity-40 text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C]"
                    >
                      <Check size={12} /> Valider les quantités {nActiveAnomalies > 0 ? `(bloqué)` : nJustifiees > 0 ? `(${nJustifiees} justifiée${nJustifiees > 1 ? "s" : ""})` : ""}
                    </button>
                    <button onClick={() => setRejectingType("quantites")} className="flex items-center gap-1.5 text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      <Ban size={12} /> Rejeter
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Visa montants DACC ─────────────────────────────────────────── */}
          {section.statut === "Quantités validées" && isDACC && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {/* Encart orange DACC — anomalies justifiées par le DCG */}
              {isMTX && lignesJustifiees.length > 0 && (
                <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Anomalies justifiées par le DCG — à votre attention ({lignesJustifiees.length})
                  </p>
                  <p className="text-[10px] text-orange-700">Ces anomalies ont été justifiées documentairement par le DCG et ne bloquent plus le visa. Vérifiez les motifs et documents avant de valider les montants.</p>
                  {lignesJustifiees.map(l => (
                    <div key={l.id} className="bg-white rounded-lg border border-orange-200 px-3 py-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <AnomalieBadge anomalie={l.anomalie} />
                        <span className="text-xs font-medium text-gray-800">{l.designation}</span>
                      </div>
                      {l.anomalie.resolution?.motif && (
                        <p className="text-xs text-gray-700 italic">« {l.anomalie.resolution.motif} »</p>
                      )}
                      {l.anomalie.resolution?.pieceJointe && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <FileText size={10} className="text-red-400" /> {l.anomalie.resolution.pieceJointe}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400">Par {l.anomalie.resolution?.parUtilisateur} le {formatDate(l.anomalie.resolution?.dateResolution)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-[#E8F5EE] rounded-lg px-3 py-2 text-xs text-[#065A2C] space-y-1">
                <p><strong>{totalLignes}</strong> ligne(s) valorisée(s) · total <strong>{fmt(section.totalValorise)} FCFA</strong></p>
                {nNegocies > 0 && <p>{nNegocies} ligne(s) au prix négocié (hors référence barème)</p>}
              </div>
              {rejectingType === "montants" ? (
                <div className="flex items-center gap-2">
                  <input autoFocus type="text" value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif du rejet (obligatoire)…"
                    className="flex-1 border border-red-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400" />
                  <button onClick={confirmerRejet} disabled={!motif.trim()} className="text-xs bg-red-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">Confirmer</button>
                  <button onClick={() => { setRejectingType(null); setMotif(""); }} className="text-xs text-gray-500 px-2 py-1.5 hover:text-gray-700">Annuler</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => onViser("montants")} className="flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C]">
                    <Check size={12} /> Valider les prix et montants
                  </button>
                  <button onClick={() => setRejectingType("montants")} className="flex items-center gap-1.5 text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                    <Ban size={12} /> Rejeter
                  </button>
                </div>
              )}
            </div>
          )}

          {section.visaQuantites && (
            <p className="text-[11px] text-gray-400">
              Quantités visées par {section.visaQuantites.par} le {formatDate(section.visaQuantites.date)}
              {section.visaMontants ? ` · Montants visés par ${section.visaMontants.par} le ${formatDate(section.visaMontants.date)}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Formulaire de création ─────────────────────────────────────────────────
function NouvelEtatForm() {
  const { contrats } = useContrats();
  const { creerEtat } = useEtatsCession();
  const { cessionsParams } = useParametres();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [contratId, setContratId] = useState(searchParams.get("contratId") || "");
  const [periodeDebut, setPeriodeDebut] = useState(iso(firstDayOfMonth()));
  const [periodeFin, setPeriodeFin] = useState(iso(lastDayOfMonth()));

  const contrat = contrats.find(c => c.id === contratId);

  function submit() {
    if (!contrat) { addToast("Sélectionnez un contrat.", "error"); return; }
    const nouvel = creerEtat({ contratId, chantierId: contrat.chantierId, periodeDebut, periodeFin });
    addToast(`État ${nouvel.code} créé.`, "success");
    navigate(`/etats-cession/${nouvel.id}`);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 max-w-xl">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contrat *</label>
        <select value={contratId} onChange={e => setContratId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none">
          <option value="">Sélectionner un contrat…</option>
          {contrats.filter(c => c.baremeCessions).map(c => <option key={c.id} value={c.id}>{c.code} — {c.objet}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Début de période</label>
          <input type="date" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fin de période</label>
          <input type="date" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
        </div>
      </div>
      <p className="text-xs text-gray-400">Arrêté proposé le {cessionsParams.jourArreteMensuel} du mois suivant la fin de période (modifiable dans le Paramétrage).</p>
      <button onClick={submit} className="bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#065A2C] transition-colors">
        Créer l'état de cession
      </button>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────
export default function EtatCessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    etats, recupererMTX, reactualiserMTX, importerPointageMTL, importerPaieRH,
    viserQuantites, viserMontants, rejeterVisa, uploaderBR, justifierAnomalie,
  } = useEtatsCession();
  const { contrats } = useContrats();
  const { currentUser } = useUser();
  const { addToast } = useToast();

  const [pdfModal, setPdfModal] = useState(null);

  const isNew = !id || id === "nouveau";
  const etat = useMemo(() => isNew ? null : etats.find(e => e.id === id), [isNew, etats, id]);
  const contrat = etat ? contrats.find(c => c.id === etat.contratId) : null;
  const chantier = etat ? chantiers.find(c => c.id === etat.chantierId) : null;
  const stt = contrat ? sousTraitants.find(s => s.id === contrat.sousTraitantId) : null;

  if (isNew) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
            <ArrowLeft size={14} /> États de cession
          </button>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">Nouvel état</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvel état de cession</h1>
        <NouvelEtatForm />
      </div>
    );
  }

  if (!etat) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Package size={40} className="mb-3" />
        <p className="text-lg font-semibold">État de cession introuvable</p>
        <button onClick={() => navigate("/etats-cession")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour à la liste</button>
      </div>
    );
  }

  const totalConsolide = ["MTX", "MTL", "RH"].reduce((s, cat) => s + (etat.sections[cat]?.totalValorise || 0), 0);

  function alimenter(cat) {
    if (cat === "MTX") { recupererMTX(etat.id, contrat, stt?.raisonSociale); addToast("Récupération Sage X3 terminée.", "success"); }
    if (cat === "MTL") { importerPointageMTL(etat.id, contrat); addToast("Pointage journalier importé.", "success"); }
    if (cat === "RH") { importerPaieRH(etat.id, contrat); addToast("Fichier de paie importé.", "success"); }
  }

  function viser(cat, type) {
    if (type === "quantites") { viserQuantites(etat.id, cat, currentUser); addToast(`Quantités ${cat} validées.`, "success"); }
    if (type === "montants") { viserMontants(etat.id, cat, currentUser); addToast(`Prix et montants ${cat} validés.`, "success"); }
  }

  function rejeter(cat, type, motifText) {
    rejeterVisa(etat.id, cat, type, motifText, currentUser);
    addToast(`Visa ${type === "quantites" ? "quantités" : "montants"} rejeté — section renvoyée à « Alimentée ».`, "error");
  }

  function handleUploaderBR(cat, data) {
    uploaderBR(etat.id, data);
    addToast(`BR uploadé — section MTX mise à jour.`, "success");
  }

  function handleJustifierAnomalie(cat, ligneId, data) {
    justifierAnomalie(etat.id, cat, ligneId, { ...data, parUtilisateur: currentUser?.nom || "DCG" });
    addToast(`Anomalie justifiée — ligne marquée comme justifiée.`, "success");
  }

  return (
    <>
      {pdfModal && <PDFModal doc={pdfModal} onClose={() => setPdfModal(null)} />}

      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
            <ArrowLeft size={14} /> États de cession
          </button>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">{etat.code}</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#087F3E] to-[#10A651] px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-white/90 text-xs mb-1">
                <Link to={`/contrats/${contrat?.id}`} className="underline hover:text-white">{contrat?.code}</Link>
                <span>·</span>
                <span>{chantier?.nom}</span>
                <span>·</span>
                <span>{stt?.raisonSociale}</span>
              </div>
              <h1 className="text-xl font-bold text-white">{etat.code}</h1>
              <p className="text-white/80 text-sm mt-0.5">
                {formatDate(etat.periodeDebut)} → {formatDate(etat.periodeFin)}
                {etat.dateArrete ? ` · Arrêté le ${formatDate(etat.dateArrete)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge statut={etat.statutGlobal} />
              <div className="text-right">
                <p className="text-white/70 text-xs uppercase tracking-wide">Total consolidé</p>
                <p className="text-white text-lg font-bold">{fmt(totalConsolide)} FCFA</p>
              </div>
            </div>
          </div>
        </div>

        {etat.decomptesConsommateurs?.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
            Consommé par le décompte{etat.decomptesConsommateurs.length > 1 ? "s" : ""}{" "}
            {etat.decomptesConsommateurs.map((dId, i) => (
              <span key={dId}>
                {i > 0 && ", "}
                <Link to={`/decomptes/${dId}`} className="underline font-semibold hover:text-blue-900">{dId}</Link>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {["MTX", "MTL", "RH"].map(cat => (
            <SectionCard
              key={cat}
              categorie={cat}
              section={etat.sections[cat]}
              etat={etat}
              contrat={contrat}
              currentUser={currentUser}
              onAlimenter={() => alimenter(cat)}
              onReactualiser={() => { reactualiserMTX(etat.id, contrat, stt?.raisonSociale); }}
              onViser={(type) => viser(cat, type)}
              onRejeter={(type, motif) => rejeter(cat, type, motif)}
              onUploaderBR={(data) => handleUploaderBR(cat, data)}
              onViewPDF={(doc) => setPdfModal(doc)}
              onJustifier={(ligneId, data) => handleJustifierAnomalie(cat, ligneId, data)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
