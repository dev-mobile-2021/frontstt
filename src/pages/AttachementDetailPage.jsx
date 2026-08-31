import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Send, Plus, Trash2, Upload, FileText,
  X, Eye, AlertCircle, CheckCircle, Clock, Info, MessageCircle,
  RotateCcw, ChevronDown, ChevronUp, Edit3,
} from "lucide-react";
import { useAttachements } from "../context/AttachementsContext";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";

// ─── Helpers ────────────────────────────────────────────────────────────────
const num = (v) => new Intl.NumberFormat("fr-FR").format(Math.round(v || 0));
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const today = () => new Date().toISOString().slice(0, 10);
const fmtPeriode = (d) => {
  if (!d) return "—";
  return new Date(d + "T00:00").toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
};
const STATUT_COLORS = {
  "Validé":          "bg-green-100 text-green-700 border-green-200",
  "Soumis au DACC":  "bg-purple-100 text-purple-700 border-purple-200",
  "Soumis au DT":    "bg-blue-100 text-blue-700 border-blue-200",
  "En rapprochement":"bg-orange-100 text-orange-700 border-orange-200",
  "En cours":        "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Ouvert":          "bg-gray-100 text-gray-600 border-gray-200",
  "Rejeté":          "bg-red-100 text-red-700 border-red-200",
};
const ROLE_PILL = {
  CT:   "bg-emerald-100 text-emerald-700",
  DT:   "bg-blue-100 text-blue-700",
  DACC: "bg-purple-100 text-purple-700",
};

// ─── AnimatedTotal ──────────────────────────────────────────────────────────
function AnimatedTotal({ value }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      setFlash(true);
      const t = setTimeout(() => { setDisplay(value); prev.current = value; setFlash(false); }, 120);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span className={`tabular-nums transition-all duration-150 inline-block ${flash ? "opacity-40 scale-105" : ""}`}>
      {num(display)} FCFA
    </span>
  );
}

// ─── STT Document Modal ─────────────────────────────────────────────────────
function STTDocumentModal({ fichier, att, onClose }) {
  const lignes = att.voletCSE.lignes;
  const totalHT = lignes.reduce((s, l) => s + (l.montant || 0), 0);
  const tva = Math.round(totalHT * 0.18);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <FileText size={16} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{fichier.nom}</p>
              <p className="text-xs text-gray-500">Chargé le {fmtDate(fichier.dateUpload)} par {fichier.uploadePar}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="border border-gray-200 rounded-xl overflow-hidden font-mono text-sm">
            <div className="bg-[#1a3a6b] text-white px-6 py-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg tracking-wide">FALL &amp; FRÈRES BÂTIMENT</p>
                  <p className="text-blue-200 text-xs mt-0.5">SARL au capital de 50 000 000 FCFA</p>
                  <p className="text-blue-200 text-xs">NINEA: 007823400 V2 · Cité Keur Gorgui — Dakar</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-xl">DEVIS</p>
                  <p className="text-blue-200 text-xs mt-1">N° {fichier.id?.toUpperCase()}</p>
                  <p className="text-blue-200 text-xs">{fmtDate(fichier.dateUpload)}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 font-sans">
              <p className="text-xs text-gray-500">Objet</p>
              <p className="font-semibold text-gray-800 text-sm">Devis de sous-traitance — Période {fmtPeriode(att.periodeDebut)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Contrat {att.contratId} · Chantier {att.chantierId}</p>
            </div>
            <div className="overflow-x-auto font-sans">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Désignation</th>
                    <th className="text-center px-3 py-2.5">Unité</th>
                    <th className="text-right px-3 py-2.5">Quantité</th>
                    <th className="text-right px-3 py-2.5">PU HT</th>
                    <th className="text-right px-4 py-2.5">Montant HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lignes.filter(l => l.montant > 0 || l.quantiteRealisee > 0).map((l, i) => (
                    <tr key={l.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-2">
                        <span className="font-medium text-gray-800">{l.designation}</span>
                        {l.source === "Libre" && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Hors DQE</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{l.unite}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.quantiteRealisee}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-500">{num(l.prixUnitaireHT)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{num(l.montant)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-white">
                    <td colSpan={4} className="px-4 py-2.5 text-right font-semibold text-gray-700 text-xs">Total HT</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold">{num(totalHT)}</td>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={4} className="px-4 py-2 text-right text-gray-500 text-xs">TVA 18%</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-500 text-xs">{num(tva)}</td>
                  </tr>
                  <tr className="bg-[#1a3a6b]/5">
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-[#1a3a6b] text-sm">TOTAL TTC</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-[#1a3a6b] text-sm">{num(totalHT + tva)} FCFA</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 font-sans">
              <p className="text-[10px] text-gray-400 italic">Document simulé · Référence: {fichier.nom}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Zone STT ───────────────────────────────────────────────────────────────
function ZoneSTT({ att, canEdit, updateAttachement, currentUser, compact }) {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewFichier, setPreviewFichier] = useState(null);
  const inputRef = useRef(null);
  const fichiers = att.voletSTT.fichiers;

  function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    setTimeout(() => {
      const nouveau = { id:`f${Date.now()}`, nom:file.name, type:file.name.split(".").pop().toLowerCase(), dateUpload:today(), uploadePar:currentUser?.nom ?? "—", apercu:"simulé" };
      updateAttachement(att.id, a => ({ ...a, voletSTT: { statut:"Chargé", fichiers:[...a.voletSTT.fichiers, nouveau] } }));
      setUploading(false);
      addToast(`Devis "${file.name}" chargé.`, "success");
    }, 1100);
  }
  function handleDelete(fichId) {
    updateAttachement(att.id, a => {
      const reste = a.voletSTT.fichiers.filter(f => f.id !== fichId);
      return { ...a, voletSTT: { statut: reste.length > 0 ? "Chargé" : "Vide", fichiers: reste } };
    });
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col ${compact ? "" : ""}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className={`font-semibold text-gray-800 ${compact ? "text-sm" : ""}`}>Volet STT</h3>
          {!compact && <p className="text-xs text-gray-500 mt-0.5">Devis sous-traitant</p>}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${att.voletSTT.statut === "Chargé" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
          {att.voletSTT.statut}
        </span>
      </div>
      <div className="p-4 flex-1 space-y-3">
        {fichiers.length > 0 && (
          <div className="space-y-2">
            {fichiers.map(f => (
              <div key={f.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 group">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={13} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{f.nom}</p>
                  <p className="text-[10px] text-gray-400">{fmtDate(f.dateUpload)} · {f.uploadePar}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {f.apercu === "simulé" && (
                    <button onClick={() => setPreviewFichier(f)} title="Aperçu" className="p-1 rounded hover:bg-blue-50 text-blue-500">
                      <Eye size={13} />
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={() => handleDelete(f.id)} className="p-1 rounded hover:bg-red-50 text-red-400">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" className="sr-only" onChange={e => handleUpload(e.target.files?.[0])} />
        {canEdit ? (
          fichiers.length === 0 ? (
            <button onClick={() => inputRef.current?.click()} disabled={uploading} className="w-full flex flex-col items-center justify-center gap-1.5 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50/30 transition-colors group disabled:opacity-60">
              {uploading ? <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={18} className="group-hover:scale-110 transition-transform" />}
              <span className="text-xs font-medium">{uploading ? "Chargement…" : "Charger le devis STT"}</span>
            </button>
          ) : (
            <button onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
              <Plus size={12} />{uploading ? "Chargement…" : "Ajouter un document"}
            </button>
          )
        ) : fichiers.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">Aucun document STT chargé</p>
        ) : null}
      </div>
      {previewFichier && <STTDocumentModal fichier={previewFichier} att={att} onClose={() => setPreviewFichier(null)} />}
    </div>
  );
}

// ─── Fil de discussion ───────────────────────────────────────────────────────
function FilDiscussion({ att, currentUser, updateAttachement }) {
  const [msg, setMsg] = useState("");
  const messages = att.discussion ?? [];

  function handleEnvoyer() {
    if (!msg.trim()) return;
    const entry = { id:`msg-${Date.now()}`, auteur:currentUser?.nom ?? "—", roleId:currentUser?.roleId ?? "CT", date:today(), message:msg.trim(), type:"commentaire" };
    updateAttachement(att.id, a => ({ ...a, discussion: [...(a.discussion ?? []), entry] }));
    setMsg("");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <MessageCircle size={16} className="text-gray-400" />
        <h3 className="font-semibold text-gray-800 text-sm">Fil de suivi du dossier</h3>
        <span className="ml-auto text-xs text-gray-400">{messages.length} message{messages.length > 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Aucun message</p>
        ) : messages.map(m => (
          <div key={m.id} className={`px-5 py-3 ${m.type === "action" ? "bg-gray-50/70" : "bg-white"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_PILL[m.roleId] ?? "bg-gray-100 text-gray-500"}`}>{m.roleId}</span>
              <span className="text-xs font-medium text-gray-800">{m.auteur}</span>
              <span className="text-[10px] text-gray-400 ml-auto">{fmtDate(m.date)}</span>
            </div>
            <p className={`text-xs leading-relaxed ${m.type === "action" ? "text-gray-500 italic" : "text-gray-700"}`}>{m.message}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEnvoyer(); }}
          placeholder="Ajouter un commentaire… (Ctrl+Entrée pour envoyer)"
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button onClick={handleEnvoyer} disabled={!msg.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#087F3E] text-white text-sm font-medium rounded-xl hover:bg-[#065A2C] transition-colors disabled:opacity-40 self-end">
          <Send size={13} /> Envoyer
        </button>
      </div>
    </div>
  );
}

// ─── Tableau CSE rows (shared rendering logic) ──────────────────────────────
function TableauRows({ lignes, editable, isDTMode, onQteChange, onLibreChange, onDeleteLibre }) {
  const dqeLignes = lignes.filter(l => l.source === "DQE");
  const libreLignes = lignes.filter(l => l.source === "Libre");

  return (
    <>
      {dqeLignes.map(l => (
        <tr key={l.id} className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors">
          <td className="px-3 py-2.5">
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{l.refDQE}</span>
          </td>
          <td className="px-3 py-2.5">
            <span className="text-gray-800 text-sm">{l.designation}</span>
            {isDTMode && l.modifiedByDT && (
              <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Modifié DT</span>
            )}
          </td>
          <td className="px-2 py-2.5 text-center text-gray-500 text-xs">{l.unite}</td>
          <td className="px-2 py-2.5 text-right tabular-nums text-gray-400 text-xs">{l.quantitePrevueDQE}</td>
          <td className="px-2 py-2.5 text-right">
            {editable ? (
              <input
                type="number" min={0} step={l.unite === "ff" ? 0.01 : 1}
                value={l.quantiteRealisee}
                onChange={e => onQteChange(l.id, e.target.value)}
                className={`w-20 text-right px-2 py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 tabular-nums
                  ${isDTMode
                    ? "border-orange-200 bg-orange-50 text-orange-800 focus:ring-orange-300"
                    : "border-blue-200 bg-blue-50 text-blue-800 focus:ring-blue-300"}`}
              />
            ) : (
              <span className="tabular-nums font-medium text-gray-800 text-sm">{l.quantiteRealisee}</span>
            )}
          </td>
          <td className="px-2 py-2.5 text-right tabular-nums text-gray-500 text-xs">{num(l.prixUnitaireHT)}</td>
          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900 text-sm">{num(l.montant)}</td>
          {editable && <td />}
        </tr>
      ))}
      {libreLignes.map(l => (
        <tr key={l.id} className="border-b border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors">
          <td className="px-3 py-2.5">
            <span className="text-[10px] font-semibold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wide">Hors DQE</span>
          </td>
          <td className="px-2 py-2.5">
            {editable ? (
              <input type="text" value={l.designation} onChange={e => onLibreChange(l.id, "designation", e.target.value)} placeholder="Désignation" className="w-full px-2 py-1 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            ) : (
              <span className="text-gray-800 text-sm">{l.designation}</span>
            )}
          </td>
          <td className="px-2 py-2.5 text-center">
            {editable ? (
              <input type="text" value={l.unite} onChange={e => onLibreChange(l.id, "unite", e.target.value)} placeholder="U" className="w-12 text-center px-1 py-1 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            ) : (
              <span className="text-gray-500 text-xs">{l.unite}</span>
            )}
          </td>
          <td className="px-2 py-2.5 text-right text-gray-400 text-xs">—</td>
          <td className="px-2 py-2.5 text-right">
            {editable ? (
              <input type="number" min={0} step={0.01} value={l.quantiteRealisee} onChange={e => onLibreChange(l.id, "quantiteRealisee", e.target.value)} className="w-20 text-right px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 tabular-nums" />
            ) : (
              <span className="tabular-nums font-medium text-amber-800 text-sm">{l.quantiteRealisee}</span>
            )}
          </td>
          <td className="px-2 py-2.5 text-right">
            {editable ? (
              <input type="number" min={0} value={l.prixUnitaireHT} onChange={e => onLibreChange(l.id, "prixUnitaireHT", e.target.value)} className="w-24 text-right px-2 py-1 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 tabular-nums" />
            ) : (
              <span className="tabular-nums text-gray-600 text-xs">{num(l.prixUnitaireHT)}</span>
            )}
          </td>
          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-800 text-sm">{num(l.montant)}</td>
          {editable && (
            <td className="pr-2">
              <button onClick={() => onDeleteLibre(l.id)} className="p-1 rounded hover:bg-red-100 text-red-400"><Trash2 size={12} /></button>
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

// ─── Vue CT ──────────────────────────────────────────────────────────────────
function VueCT({ att, updateAttachement, currentUser, readOnly }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [lignes, setLignes] = useState(() => att.voletCSE.lignes.map(l => ({ ...l })));
  const [savedFlag, setSavedFlag] = useState(false);
  const total = useMemo(() => lignes.reduce((s, l) => s + (l.montant || 0), 0), [lignes]);

  useEffect(() => { setLignes(att.voletCSE.lignes.map(l => ({ ...l }))); }, [att.id]);

  function handleQteChange(id, raw) {
    const qte = parseFloat(raw) || 0;
    setLignes(prev => prev.map(l => l.id !== id ? l : { ...l, quantiteRealisee: qte, montant: Math.round(qte * l.prixUnitaireHT), modifiedByDT: false }));
  }
  function handleLibreChange(id, field, raw) {
    setLignes(prev => prev.map(l => {
      if (l.id !== id) return l;
      const value = (field === "quantiteRealisee" || field === "prixUnitaireHT") ? (parseFloat(raw) || 0) : raw;
      const updated = { ...l, [field]: value };
      if (field === "quantiteRealisee" || field === "prixUnitaireHT") updated.montant = Math.round(updated.quantiteRealisee * updated.prixUnitaireHT);
      return updated;
    }));
  }
  function handleDeleteLibre(id) { setLignes(prev => prev.filter(l => l.id !== id)); }
  function handleAjouterLibre() {
    setLignes(prev => [...prev, { id:`libre-${Date.now()}`, source:"Libre", refDQE:null, designation:"", unite:"", quantitePrevueDQE:null, prixUnitaireHT:0, quantiteRealisee:0, montant:0 }]);
  }
  function handleEnregistrer() {
    updateAttachement(att.id, a => ({ ...a, statut: a.statut === "Ouvert" ? "En cours" : a.statut, voletCSE: { ...a.voletCSE, lignes, totalValorise: total } }));
    setSavedFlag(true); setTimeout(() => setSavedFlag(false), 2500);
    addToast("Dossier enregistré.", "success");
  }
  function handleSoumettre() {
    const msg = { id:`msg-${Date.now()}`, auteur:currentUser?.nom ?? "CT", roleId:"CT", date:today(), message:`Dossier soumis au DT le ${new Date().toLocaleDateString("fr-FR")} — Total CSE : ${num(total)} FCFA.`, type:"action" };
    updateAttachement(att.id, a => ({ ...a, statut:"Soumis au DT", voletCSE:{ ...a.voletCSE, lignes, totalValorise:total }, discussion:[...(a.discussion ?? []), msg] }));
    addToast("Dossier soumis au DT.", "success");
    navigate("/attachements");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-800">Volet CSE — Constat terrain</h3>
          <p className="text-xs text-gray-500 mt-0.5">{readOnly ? "Tableau en lecture seule" : "Saisir les quantités réalisées"}</p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button onClick={handleEnregistrer} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
              {savedFlag ? <CheckCircle size={13} className="text-green-500" /> : <Save size={13} />}
              {savedFlag ? "Enregistré" : "Enregistrer"}
            </button>
            <button onClick={handleSoumettre} disabled={total === 0} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#087F3E] text-white rounded-xl hover:bg-[#065A2C] disabled:opacity-40">
              <Send size={13} /> Soumettre au DT
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-3 py-3 w-20">Réf DQE</th>
              <th className="text-left px-3 py-3">Désignation</th>
              <th className="text-center px-2 py-3 w-14">Unité</th>
              <th className="text-right px-2 py-3 w-20">Qté DQE</th>
              <th className="text-right px-2 py-3 w-24 text-blue-500">Qté réalisée</th>
              <th className="text-right px-2 py-3 w-28">PU HT (FCFA)</th>
              <th className="text-right px-3 py-3 w-28">Montant</th>
              {!readOnly && <th className="w-6" />}
            </tr>
          </thead>
          <tbody>
            <TableauRows lignes={lignes} editable={!readOnly} isDTMode={false} onQteChange={handleQteChange} onLibreChange={handleLibreChange} onDeleteLibre={handleDeleteLibre} />
          </tbody>
          <tfoot>
            {!readOnly && (
              <tr className="border-t border-dashed border-amber-200 bg-amber-50/30">
                <td colSpan={8} className="px-3 py-2.5">
                  <button onClick={handleAjouterLibre} className="flex items-center gap-1.5 text-sm text-amber-700 font-medium hover:text-amber-900">
                    <Plus size={14} /> Ajouter une prestation hors DQE
                  </button>
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={readOnly ? 6 : 7} className="px-3 py-3.5 text-right font-bold text-gray-700">Total valorisé</td>
              <td className="px-3 py-3.5 text-right">
                <span className="font-bold text-lg text-[#087F3E]"><AnimatedTotal value={total} /></span>
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Vue DT ──────────────────────────────────────────────────────────────────
function VueDT({ att, updateAttachement, currentUser, editable }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [lignes, setLignes] = useState(() => att.voletCSE.lignes.map(l => ({ ...l })));
  const [savedFlag, setSavedFlag] = useState(false);
  const [showRejet, setShowRejet] = useState(false);
  const [commentaireRejet, setCommentaireRejet] = useState("");
  const total = useMemo(() => lignes.reduce((s, l) => s + (l.montant || 0), 0), [lignes]);

  useEffect(() => { setLignes(att.voletCSE.lignes.map(l => ({ ...l }))); }, [att.id]);

  function handleQteChange(id, raw) {
    const qte = parseFloat(raw) || 0;
    setLignes(prev => prev.map(l => {
      if (l.id !== id) return l;
      const changed = qte !== att.voletCSE.lignes.find(o => o.id === id)?.quantiteRealisee;
      return { ...l, quantiteRealisee: qte, montant: Math.round(qte * l.prixUnitaireHT), modifiedByDT: changed };
    }));
  }
  function handleLibreChange(id, field, raw) {
    setLignes(prev => prev.map(l => {
      if (l.id !== id) return l;
      const value = (field === "quantiteRealisee" || field === "prixUnitaireHT") ? (parseFloat(raw) || 0) : raw;
      const updated = { ...l, [field]: value, modifiedByDT: true };
      if (field === "quantiteRealisee" || field === "prixUnitaireHT") updated.montant = Math.round(updated.quantiteRealisee * updated.prixUnitaireHT);
      return updated;
    }));
  }
  function handleDeleteLibre(id) { setLignes(prev => prev.filter(l => l.id !== id)); }
  function handleAjouterLibre() {
    setLignes(prev => [...prev, { id:`libre-${Date.now()}`, source:"Libre", refDQE:null, designation:"", unite:"", quantitePrevueDQE:null, prixUnitaireHT:0, quantiteRealisee:0, montant:0, modifiedByDT:true }]);
  }

  function addMsg(message, type = "action") {
    return { id:`msg-${Date.now()}`, auteur:currentUser?.nom ?? "DT", roleId:"DT", date:today(), message, type };
  }

  function handleEnregistrer() {
    const nbModif = lignes.filter(l => l.modifiedByDT).length;
    const msgs = nbModif > 0
      ? [addMsg(`DT a modifié ${nbModif} ligne(s) du tableau CSE.`, "action")]
      : [];
    updateAttachement(att.id, a => ({ ...a, voletCSE:{ ...a.voletCSE, lignes, totalValorise:total }, discussion:[...(a.discussion ?? []), ...msgs] }));
    setSavedFlag(true); setTimeout(() => setSavedFlag(false), 2500);
    addToast("Modifications DT enregistrées.", "success");
  }

  function handleRenvoyer() {
    if (!commentaireRejet.trim()) { addToast("Commentaire obligatoire pour renvoyer.", "error"); return; }
    const msg = addMsg(`Dossier renvoyé au CT. Motif : ${commentaireRejet.trim()}`);
    updateAttachement(att.id, a => ({ ...a, statut:"En cours", voletCSE:{ ...a.voletCSE, lignes, totalValorise:total }, discussion:[...(a.discussion ?? []), msg] }));
    addToast("Dossier renvoyé au CT.", "info");
    navigate("/attachements");
  }

  function handleSoumettreAuDacc() {
    const msg = addMsg(`Dossier soumis au DACC le ${new Date().toLocaleDateString("fr-FR")} — Total CSE validé : ${num(total)} FCFA.`);
    updateAttachement(att.id, a => ({ ...a, statut:"Soumis au DACC", voletCSE:{ ...a.voletCSE, lignes, totalValorise:total }, discussion:[...(a.discussion ?? []), msg] }));
    addToast("Dossier soumis au DACC.", "success");
    navigate("/attachements");
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
          <Edit3 size={14} className="text-orange-500 flex-shrink-0" />
          <p className="text-xs text-orange-800 font-medium">Mode révision DT — vous pouvez modifier le constat CT avant validation</p>
        </div>
      )}
      <div className="flex gap-4 items-start">
        {/* Panneau gauche — Tableau CSE */}
        <div className="flex-[3] min-w-0 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Volet CSE — Constat terrain</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {editable ? "Les modifications DT sont tracées" : "Lecture seule"}
              </p>
            </div>
            {editable && (
              <button onClick={handleEnregistrer} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                {savedFlag ? <CheckCircle size={12} className="text-green-500" /> : <Save size={12} />}
                {savedFlag ? "Enregistré" : "Enregistrer"}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 w-16">Réf</th>
                  <th className="text-left px-2 py-2.5">Désignation</th>
                  <th className="text-center px-2 py-2.5 w-12">Unité</th>
                  <th className="text-right px-2 py-2.5 w-16">Qté DQE</th>
                  <th className={`text-right px-2 py-2.5 w-20 ${editable ? "text-orange-500" : ""}`}>Qté réalisée</th>
                  <th className="text-right px-2 py-2.5 w-24">PU HT</th>
                  <th className="text-right px-3 py-2.5 w-24">Montant</th>
                  {editable && <th className="w-5" />}
                </tr>
              </thead>
              <tbody>
                <TableauRows lignes={lignes} editable={editable} isDTMode={true} onQteChange={handleQteChange} onLibreChange={handleLibreChange} onDeleteLibre={handleDeleteLibre} />
              </tbody>
              <tfoot>
                {editable && (
                  <tr className="border-t border-dashed border-amber-200 bg-amber-50/30">
                    <td colSpan={8} className="px-3 py-2">
                      <button onClick={handleAjouterLibre} className="flex items-center gap-1 text-xs text-amber-700 font-medium hover:text-amber-900">
                        <Plus size={12} /> Ajouter hors DQE
                      </button>
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={editable ? 7 : 6} className="px-3 py-3 text-right font-bold text-gray-700 text-sm">Total CSE</td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-bold text-[#087F3E]"><AnimatedTotal value={total} /></span>
                  </td>
                  {editable && <td />}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actions DT */}
          {editable && (
            <div className="border-t border-gray-100 px-4 py-4 space-y-3">
              {!showRejet ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowRejet(true)} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <RotateCcw size={13} /> Renvoyer au CT
                  </button>
                  <button onClick={handleSoumettreAuDacc} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-[#087F3E] text-white rounded-xl hover:bg-[#065A2C]">
                    <Send size={13} /> Soumettre au DACC
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Motif de renvoi au CT (obligatoire) :</p>
                  <textarea
                    value={commentaireRejet}
                    onChange={e => setCommentaireRejet(e.target.value)}
                    rows={2}
                    placeholder="Expliquez les corrections attendues…"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowRejet(false)} className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
                    <button onClick={handleRenvoyer} disabled={!commentaireRejet.trim()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40">
                      <RotateCcw size={12} /> Confirmer le renvoi au CT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panneau droit — Devis STT */}
        <div className="flex-[2] min-w-0 min-h-[200px]">
          <ZoneSTT att={att} canEdit={editable} updateAttachement={updateAttachement} currentUser={currentUser} compact={true} />
        </div>
      </div>
    </div>
  );
}

// ─── Vue DACC ────────────────────────────────────────────────────────────────
function VueDacc({ att, updateAttachement, currentUser }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [showRejet, setShowRejet] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");
  const lignes = att.voletCSE.lignes;
  const total = att.voletCSE.totalValorise;
  const lignesModifiees = lignes.filter(l => l.modifiedByDT).length;

  // Reconstruct CT/DT actors from discussion
  const msgCT = att.discussion?.find(m => m.roleId === "CT" && m.type === "action");
  const msgDT = att.discussion?.find(m => m.roleId === "DT" && m.type === "action");
  const nomCT = msgCT?.auteur ?? att.initiePar?.nom ?? "—";
  const dateCT = fmtDate(msgCT?.date ?? att.dateCreation);
  const nomDT = msgDT?.auteur ?? "—";
  const dateDT = fmtDate(msgDT?.date);

  function addMsg(message, type = "action") {
    return { id:`msg-${Date.now()}`, auteur:currentUser?.nom ?? "DACC", roleId:"DACC", date:today(), message, type };
  }

  function handleValider() {
    const msg = addMsg(`Dossier validé par le DACC. Montant final : ${num(total)} FCFA.`);
    updateAttachement(att.id, a => ({
      ...a,
      statut: "Validé",
      visaDacc: { par: currentUser?.nom ?? "DACC", date: today() },
      montantFinal: total,
      discussion: [...(a.discussion ?? []), msg],
    }));
    addToast("Dossier validé — le Poste A du décompte est mis à jour.", "success");
    navigate("/attachements");
  }

  function handleRejeter() {
    if (!motifRejet.trim()) { addToast("Commentaire de rejet obligatoire.", "error"); return; }
    const msg = addMsg(`Dossier rejeté par le DACC. Motif : ${motifRejet.trim()}`);
    updateAttachement(att.id, a => ({
      ...a,
      statut: "Rejeté",
      discussion: [...(a.discussion ?? []), msg],
    }));
    addToast("Dossier rejeté.", "info");
    navigate("/attachements");
  }

  const isReadOnly = att.statut === "Validé";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-xl">
        <CheckCircle size={14} className="text-purple-500 flex-shrink-0" />
        <p className="text-xs text-purple-800 font-medium">
          {isReadOnly ? "Dossier validé — lecture seule" : "Mode visa DACC — tableau en consultation"}
        </p>
      </div>

      <div className="flex gap-4 items-start">
        {/* Panneau gauche — Tableau CSE read-only */}
        <div className="flex-[3] min-w-0 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Volet CSE — Constat terrain</h3>
            <p className="text-xs text-gray-500 mt-0.5">Lecture seule — modifications DT tracées</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 w-16">Réf</th>
                  <th className="text-left px-2 py-2.5">Désignation</th>
                  <th className="text-center px-2 py-2.5 w-12">Unité</th>
                  <th className="text-right px-2 py-2.5 w-16">Qté DQE</th>
                  <th className="text-right px-2 py-2.5 w-20">Qté réalisée</th>
                  <th className="text-right px-2 py-2.5 w-24">PU HT</th>
                  <th className="text-right px-3 py-2.5 w-24">Montant</th>
                </tr>
              </thead>
              <tbody>
                <TableauRows lignes={lignes} editable={false} isDTMode={true} onQteChange={()=>{}} onLibreChange={()=>{}} onDeleteLibre={()=>{}} />
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={6} className="px-3 py-3.5 text-right font-bold text-gray-700 text-sm">Total final</td>
                  <td className="px-3 py-3.5 text-right font-bold text-lg text-[#087F3E]">{num(total)} FCFA</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Panneau droit — STT */}
        <div className="flex-[2] min-w-0">
          <ZoneSTT att={att} canEdit={false} updateAttachement={updateAttachement} currentUser={currentUser} compact={true} />
        </div>
      </div>

      {/* Encart synthèse */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">Synthèse du dossier</h3>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500">Saisi par CT</span>
            <span className="font-medium text-gray-800">{nomCT} — {dateCT}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500">Révisé par DT</span>
            <span className="font-medium text-gray-800">{nomDT || "—"} {dateDT !== "—" ? `— ${dateDT}` : ""}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500">Lignes modifiées par DT</span>
            <span className={`font-medium ${lignesModifiees > 0 ? "text-orange-700" : "text-gray-500"}`}>{lignesModifiees} ligne{lignesModifiees > 1 ? "s" : ""}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <span className="text-gray-500">Devis STT</span>
            <span className={`font-medium ${att.voletSTT.statut === "Chargé" ? "text-green-700" : "text-amber-700"}`}>{att.voletSTT.statut}</span>
          </div>
          <div className="col-span-2 flex justify-between pt-1">
            <span className="font-bold text-gray-900">TOTAL FINAL</span>
            <span className="font-bold text-xl text-[#087F3E]">{num(total)} FCFA</span>
          </div>
        </div>
      </div>

      {/* Actions DACC */}
      {!isReadOnly && (
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-5 space-y-4">
          {!showRejet ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setShowRejet(true)} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50">
                <X size={13} /> Rejeter le dossier
              </button>
              <button onClick={handleValider} className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-[#087F3E] text-white rounded-xl hover:bg-[#065A2C] shadow-sm">
                <CheckCircle size={14} /> Valider le dossier
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Motif du rejet (obligatoire) :</p>
              <textarea value={motifRejet} onChange={e => setMotifRejet(e.target.value)} rows={3} placeholder="Expliquer les corrections attendues…" className="w-full text-sm border border-red-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-200" />
              <div className="flex gap-2">
                <button onClick={() => setShowRejet(false)} className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
                <button onClick={handleRejeter} disabled={!motifRejet.trim()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40">
                  <X size={12} /> Confirmer le rejet
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function AttachementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { attachements, updateAttachement } = useAttachements();
  const { currentUser } = useUser();
  const att = attachements.find(a => a.id === id);

  if (!att) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <AlertCircle size={40} className="mb-3 opacity-40" />
        <p className="font-medium">Dossier introuvable</p>
        <button onClick={() => navigate("/attachements")} className="mt-4 text-sm text-blue-500 hover:underline">← Retour à la liste</button>
      </div>
    );
  }

  const role = currentUser?.roleId;
  const isCTEditable = role === "CT" && (att.statut === "Ouvert" || att.statut === "En cours");
  const isDTView = role === "DT";
  const isDTEditable = isDTView && (att.statut === "Soumis au DT" || att.statut === "En rapprochement");
  const isDACCView = role === "DACC" && (att.statut === "Soumis au DACC" || att.statut === "Validé");
  const statutColor = STATUT_COLORS[att.statut] || "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate("/attachements")} className="mt-0.5 p-2 rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{att.code}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statutColor}`}>{att.statut}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Contrat {att.contratId} · Période {fmtPeriode(att.periodeDebut)}
            {att.montantFinal != null && <span className="ml-2 font-semibold text-[#087F3E]">{num(att.montantFinal)} FCFA</span>}
          </p>
        </div>
      </div>

      {/* Bandeaux informatifs */}
      {att.statut === "Validé" && att.visaDacc && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Dossier validé par le DACC</p>
            <p className="text-xs text-green-700 mt-0.5">Visa DACC : {att.visaDacc.par} le {fmtDate(att.visaDacc.date)} — {att.visaDacc.commentaire}</p>
            <p className="text-xs text-green-700 font-semibold mt-0.5">Poste A du décompte : {num(att.montantFinal)} FCFA</p>
          </div>
        </div>
      )}
      {att.statut === "Soumis au DACC" && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Clock size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">En attente de validation DACC</p>
            <p className="text-xs text-purple-700 mt-0.5">Le dossier a été soumis au DACC — en lecture seule.</p>
          </div>
        </div>
      )}
      {att.statut === "Soumis au DT" && role === "CT" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Dossier soumis au DT — en attente de révision</p>
            <p className="text-xs text-blue-700 mt-0.5">Le tableau CSE est verrouillé. Le DT peut modifier et valider.</p>
          </div>
        </div>
      )}
      {att.statut === "Rejeté" && role === "DT" && (() => {
        const motif = [...(att.discussion ?? [])].reverse().find(m => m.roleId === "DACC" && m.type === "action");
        return (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Dossier rejeté par le DACC</p>
              {motif && <p className="text-xs text-red-700 mt-0.5">{motif.message}</p>}
            </div>
          </div>
        );
      })()}

      {/* Contenu principal */}
      {isDACCView ? (
        <VueDacc att={att} updateAttachement={updateAttachement} currentUser={currentUser} />
      ) : isDTView ? (
        <VueDT att={att} updateAttachement={updateAttachement} currentUser={currentUser} editable={isDTEditable} />
      ) : (
        <>
          <VueCT att={att} updateAttachement={updateAttachement} currentUser={currentUser} readOnly={!isCTEditable} />
          <ZoneSTT att={att} canEdit={isCTEditable} updateAttachement={updateAttachement} currentUser={currentUser} />
        </>
      )}

      {/* Fil de discussion — toujours visible */}
      <FilDiscussion att={att} currentUser={currentUser} updateAttachement={updateAttachement} />
    </div>
  );
}
