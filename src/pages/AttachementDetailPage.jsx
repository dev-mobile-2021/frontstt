import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Send, Plus, Trash2, Upload, FileText,
  X, Eye, AlertCircle, CheckCircle, Clock, Info, MessageCircle,
  RotateCcw, ChevronDown, ChevronUp, Edit3, Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAttachements } from "../hooks/useAttachements";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { pieceJointeService } from "../services/pieceJointeService";
import { attachementService } from "../services/attachementService";
import { fmtNum } from "../utils/formatters";

// ─── Helpers ────────────────────────────────────────────────────────────────
const num = (v) => fmtNum(Math.round(v || 0));
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const today = () => new Date().toISOString().slice(0, 10);
const fmtPeriode = (d) => {
  if (!d) return "—";
  const dateOnly = String(d).slice(0, 10);
  return new Date(dateOnly + "T00:00").toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
};
const STATUT_COLORS = {
  "Validé":                "bg-green-100 text-green-700 border-green-200",
  "Soumis au DACC":        "bg-purple-100 text-purple-700 border-purple-200",
  "Soumis à l'Asst DACC": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Soumis au DT":          "bg-blue-100 text-blue-700 border-blue-200",
  "En rapprochement":      "bg-orange-100 text-orange-700 border-orange-200",
  "En cours":              "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Ouvert":                "bg-gray-100 text-gray-600 border-gray-200",
  "Rejeté":                "bg-red-100 text-red-700 border-red-200",
};
const ROLE_PILL = {
  CT:              "bg-emerald-100 text-emerald-700",
  DT:              "bg-blue-100 text-blue-700",
  DACC:            "bg-purple-100 text-purple-700",
  "Assistant DACC":"bg-indigo-100 text-indigo-700",
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

// ─── CSE Export / Import — format X3 DQE_ATT ────────────────────────────────
function exportCSE(lignes, ref) {
  const dqeLignes = lignes.filter(l => l.source === "DQE");

  // Grouper par rubrique → poste
  const groups = [];
  for (const l of dqeLignes) {
    const rubKey   = l.rubriqueCodeX3 || l.rubriqueCode || l.refDQE || "";
    const rubLabel = l.rubriqueDesignation ?? "";
    const posteKey = l.posteNumero || l.posteDesignation || "";
    const posteLabel = l.posteDesignation ?? "";
    let rub = groups.find(g => g.rubKey === rubKey);
    if (!rub) { rub = { rubKey, rubLabel, postes: [] }; groups.push(rub); }
    let poste = rub.postes.find(p => p.posteKey === posteKey);
    if (!poste) { poste = { posteKey, posteLabel, lignes: [] }; rub.postes.push(poste); }
    poste.lignes.push(l);
  }

  const totalGeneral = dqeLignes.reduce((s, l) => s + (l.montant || 0), 0);

  // Construction manuelle des lignes AOA (array of arrays)
  const aoa = [];

  // Ligne 1 : titre
  aoa.push(["", "DQE ATTACHEMENT TRAVAUX REALISES", "", "", "", "", "", ""]);
  // Ligne 2 : vide
  aoa.push(["", "", "", "", "", "", "", ""]);
  // Ligne 3 : en-têtes
  aoa.push(["Rubriques analytiques", "", "N° Item", "Désignation", "U", "PU", "Qté\nCumulée", "Montants\nCumulés"]);
  // Ligne 4 : sous-en-têtes
  aoa.push(["RA", "Désignation", "", "", "", "Renseignée par la plateforme", "", "Calculé par la plateforme"]);
  // Ligne 5 : vide
  aoa.push(["", "", "", "", "", "", "", ""]);
  // Ligne 6 : total général
  aoa.push(["", "", "", "Montant Total", "", "", "", totalGeneral]);

  // Sous-totaux par rubrique
  for (const rub of groups) {
    const rubTotal = rub.postes.flatMap(p => p.lignes).reduce((s, l) => s + (l.montant || 0), 0);
    aoa.push([rub.rubKey, rub.rubLabel, "", "", "", "", "", rubTotal]);
  }

  aoa.push(["", "", "", "", "", "", "", ""]);

  // Lignes de détail groupées par poste
  for (const rub of groups) {
    for (const poste of rub.postes) {
      const posteTotal = poste.lignes.reduce((s, l) => s + (l.montant || 0), 0);
      aoa.push(["", "", poste.posteKey, poste.posteLabel, "", "", "", posteTotal]);
      for (const l of poste.lignes) {
        const itemNo = l.refDQEX3 || l.refDQE || "";
        aoa.push([
          rub.rubKey,
          rub.rubLabel,
          itemNo,
          l.designation ?? "",
          l.unite ?? "",
          l.prixUnitaireHT ?? 0,
          l.quantiteRealisee ?? 0,
          l.montant ?? 0,
        ]);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Largeurs colonnes
  ws["!cols"] = [
    { wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 40 },
    { wch: 6  }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  ];

  // Hauteur ligne 3 (en-tête multi-ligne)
  ws["!rows"] = [];
  ws["!rows"][2] = { hpt: 30 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DQE_ATT");
  XLSX.writeFile(wb, `DQE_ATT_${ref ?? "attachement"}.xlsx`);
}

function importCSELignes(file, lignes, onResult, onError) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type: "array" });
      const ws   = wb.Sheets["DQE_ATT"] ?? wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Les lignes de données commencent après la ligne 6 (index 6)
      // Une ligne de donnée a col[2] (N° Item) non vide et col[0] (RA) non vide
      const dataRows = rows.slice(6).filter(r => String(r[2] ?? "").trim() && String(r[0] ?? "").trim());

      const updated = lignes.map(l => {
        const itemNo = l.refDQEX3 || l.refDQE || "";
        const match = (itemNo ? dataRows.find(r => String(r[2] ?? "").trim() === itemNo) : null)
          ?? dataRows.find(r => String(r[3] ?? "").trim().toLowerCase() === String(l.designation ?? "").trim().toLowerCase());
        if (!match) return l;
        const raw = String(match[6] ?? "").replace(/\s/g, "").replace(",", ".");
        const qte = parseFloat(raw) || 0;
        return { ...l, quantiteRealisee: qte, montant: Math.round(qte * l.prixUnitaireHT) };
      });
      onResult(updated);
    } catch { onError(); }
  };
  reader.readAsArrayBuffer(file);
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

  // Group DQE lignes by rubrique then poste
  const groups = [];
  for (const l of dqeLignes) {
    const rubKey = l.rubriqueDesignation ?? l.refDQE ?? "—";
    const posteKey = l.posteDesignation ?? "—";
    let rub = groups.find(g => g.rubrique === rubKey);
    if (!rub) { rub = { rubrique: rubKey, refDQE: l.refDQE, rubriqueCodeX3: l.rubriqueCodeX3, rubriqueCode: l.rubriqueCode, postes: [] }; groups.push(rub); }
    let poste = rub.postes.find(p => p.poste === posteKey);
    if (!poste) { poste = { poste: posteKey, lignes: [] }; rub.postes.push(poste); }
    poste.lignes.push(l);
  }

  const colCount = editable ? 9 : 8;

  return (
    <>
      {groups.map(group => (
        <React.Fragment key={group.rubrique}>
          {/* Rubrique header */}
          <tr className="bg-[#087F3E]/8 border-b border-[#087F3E]/20">
            <td className="px-3 py-1.5">
              {group.rubriqueCode && <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{group.rubriqueCode}</span>}
            </td>
            <td className="py-1.5 pr-2">
              {group.rubriqueCodeX3 && <span className="font-mono text-[10px] font-semibold text-[#087F3E] bg-[#087F3E]/10 px-1.5 py-0.5 rounded">{group.rubriqueCodeX3}</span>}
            </td>
            <td colSpan={colCount - 2} className="py-1.5 pr-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#087F3E]">{group.rubrique}</span>
            </td>
          </tr>
          {group.postes.map(posteGroup => (
            <React.Fragment key={posteGroup.poste}>
              {/* Poste sub-header */}
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <td className="pl-5 pr-2 py-1" />
                <td className="pr-2 py-1">
                  {posteGroup.lignes[0]?.posteNumero && (
                    <span className="font-mono text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{posteGroup.lignes[0].posteNumero}</span>
                  )}
                </td>
                <td colSpan={colCount - 2} className="px-1 py-1">
                  <span className="text-[11px] font-semibold text-gray-600 italic">{posteGroup.poste}</span>
                </td>
              </tr>
              {posteGroup.lignes.map(l => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors">
                  <td className="pl-6 pr-2 py-2.5">
                    {l.refDQE && <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{l.refDQE}</span>}
                  </td>
                  <td className="pr-3 py-2.5">
                    {l.refDQEX3 && <span className="font-mono text-[10px] font-semibold text-[#087F3E] bg-[#087F3E]/10 px-1.5 py-0.5 rounded">{l.refDQEX3}</span>}
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
                        className={`w-24 text-right px-2 py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 tabular-nums
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
            </React.Fragment>
          ))}
        </React.Fragment>
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
function VueCT({ att, updateAttachement, soumettreAttachement, currentUser, readOnly }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [lignes, setLignes] = useState(() => att.voletCSE.lignes.map(l => ({ ...l })));
  const [savedFlag, setSavedFlag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const importRef = useRef(null);
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
  async function handleSoumettre() {
    setSubmitting(true);
    try {
      await new Promise(resolve => {
        updateAttachement(att.id, a => ({ ...a, voletCSE: { ...a.voletCSE, lignes, totalValorise: total } }));
        setTimeout(resolve, 300);
      });
      await soumettreAttachement(att.id);
      addToast(att.statut === "Rejeté" ? "Dossier resoumis pour vérification." : "Dossier soumis pour vérification.", "success");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors de la soumission. Réessayez.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-800">Volet CSE — Constat terrain</h3>
          <p className="text-xs text-gray-500 mt-0.5">{readOnly ? "Tableau en lecture seule" : "Saisir les quantités réalisées"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSE(lignes, att.reference)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
            <Download size={13} /> Exporter
          </button>
          {!readOnly && (
            <>
              <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return;
                importCSELignes(file, lignes, updated => { setLignes(updated); addToast("Quantités importées depuis Excel.", "success"); }, () => addToast("Erreur de lecture du fichier Excel.", "error"));
                e.target.value = "";
              }} />
              <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                <Upload size={13} /> Importer
              </button>
              <button onClick={handleEnregistrer} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
                {savedFlag ? <CheckCircle size={13} className="text-green-500" /> : <Save size={13} />}
                {savedFlag ? "Enregistré" : "Enregistrer"}
              </button>
              <button onClick={handleSoumettre} disabled={total === 0 || submitting} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#087F3E] text-white rounded-xl hover:bg-[#065A2C] disabled:opacity-40">
                {submitting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
                {att.statut === "Rejeté" ? "Resoumettre" : "Soumettre"}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              <th className="text-left px-3 py-3 w-16">Réf</th>
              <th className="text-left px-2 py-3 w-20">N° Item</th>
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
              <td className="px-3 py-3.5 text-right whitespace-nowrap">
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
function VueDT({ att, updateAttachement, soumettreAttachement, rejeterAttachement, currentUser, editable }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [lignes, setLignes] = useState(() => att.voletCSE.lignes.map(l => ({ ...l })));
  const [savedFlag, setSavedFlag] = useState(false);
  const [showRejet, setShowRejet] = useState(false);
  const [commentaireRejet, setCommentaireRejet] = useState("");
  const importRef = useRef(null);
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

  async function handleRenvoyer() {
    if (!commentaireRejet.trim()) { addToast("Commentaire obligatoire pour renvoyer.", "error"); return; }
    try {
      updateAttachement(att.id, a => ({ ...a, voletCSE: { ...a.voletCSE, lignes, totalValorise: total } }));
      await new Promise(r => setTimeout(r, 300));
      await rejeterAttachement(att.id, commentaireRejet.trim());
      addToast("Dossier renvoyé au CT pour correction.", "info");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors du renvoi. Réessayez.", "error");
    }
  }

  async function handleSoumettreAuDacc() {
    try {
      updateAttachement(att.id, a => ({ ...a, voletCSE: { ...a.voletCSE, lignes, totalValorise: total } }));
      await new Promise(r => setTimeout(r, 300));
      await soumettreAttachement(att.id);
      addToast("Dossier transmis au DACC pour validation.", "success");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors de la soumission. Réessayez.", "error");
    }
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
            <div className="flex items-center gap-2">
              <button onClick={() => exportCSE(lignes, att.reference)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Download size={12} /> Exporter
              </button>
              {editable && (
                <>
                  <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    importCSELignes(file, lignes, updated => { setLignes(updated); addToast("Quantités importées depuis Excel.", "success"); }, () => addToast("Erreur de lecture du fichier Excel.", "error"));
                    e.target.value = "";
                  }} />
                  <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Upload size={12} /> Importer
                  </button>
                  <button onClick={handleEnregistrer} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                    {savedFlag ? <CheckCircle size={12} className="text-green-500" /> : <Save size={12} />}
                    {savedFlag ? "Enregistré" : "Enregistrer"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 w-14">Réf</th>
                  <th className="text-left px-2 py-2.5 w-20">N° Item</th>
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
                  <td className="px-3 py-3 text-right whitespace-nowrap">
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
                  <button
                    onClick={handleSoumettreAuDacc}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-[#087F3E] text-white rounded-xl hover:bg-[#065A2C]"
                  >
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

      </div>
    </div>
  );
}

// ─── Vue Assistant DACC ──────────────────────────────────────────────────────
function VueAssistantDACC({ att, updateAttachement, soumettreAttachement, rejeterAttachement, currentUser }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [lignes, setLignes] = useState(() => att.voletCSE.lignes.map(l => ({ ...l })));
  const [savedFlag, setSavedFlag] = useState(false);
  const [showRejet, setShowRejet] = useState(false);
  const [commentaireRejet, setCommentaireRejet] = useState("");
  const [validatingDirect, setValidatingDirect] = useState(false);
  const [submittingToDT, setSubmittingToDT] = useState(false);
  const importRef = useRef(null);
  const total = useMemo(() => lignes.reduce((s, l) => s + (l.montant || 0), 0), [lignes]);

  useEffect(() => { setLignes(att.voletCSE.lignes.map(l => ({ ...l }))); }, [att.id]);

  function handleQteChange(id, raw) {
    const qte = parseFloat(raw) || 0;
    setLignes(prev => prev.map(l => l.id !== id ? l : { ...l, quantiteRealisee: qte, montant: Math.round(qte * l.prixUnitaireHT) }));
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

  function handleEnregistrer() {
    updateAttachement(att.id, a => ({ ...a, voletCSE: { ...a.voletCSE, lignes, totalValorise: total } }));
    setSavedFlag(true); setTimeout(() => setSavedFlag(false), 2500);
    addToast("Modifications enregistrées.", "success");
  }

  async function handleValiderDirect() {
    setValidatingDirect(true);
    try {
      updateAttachement(att.id, a => ({ ...a, voletCSE: { ...a.voletCSE, lignes, totalValorise: total } }));
      await new Promise(r => setTimeout(r, 300));
      await attachementService.changerStatut(att.code, "Validé", `Dossier validé directement par l'Asst DACC. Montant : ${num(total)} FCFA.`);
      addToast(`Dossier validé directement — ${num(total)} FCFA.`, "success");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors de la validation.", "error");
    } finally { setValidatingDirect(false); }
  }

  async function handleSoumettreAuDT() {
    setSubmittingToDT(true);
    try {
      updateAttachement(att.id, a => ({ ...a, voletCSE: { ...a.voletCSE, lignes, totalValorise: total } }));
      await new Promise(r => setTimeout(r, 300));
      await soumettreAttachement(att.id);
      addToast("Dossier transmis au DT pour révision.", "success");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors de la soumission.", "error");
    } finally { setSubmittingToDT(false); }
  }

  async function handleRenvoyer() {
    if (!commentaireRejet.trim()) { addToast("Commentaire obligatoire pour renvoyer.", "error"); return; }
    try {
      await rejeterAttachement(att.id, commentaireRejet.trim());
      addToast("Dossier renvoyé au CT pour correction.", "info");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors du renvoi.", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
        <Edit3 size={14} className="text-indigo-500 flex-shrink-0" />
        <p className="text-xs text-indigo-800 font-medium">Mode contrôle Asst DACC — vérifiez et corrigez les lignes avant de valider ou transmettre au DT</p>
      </div>

      {/* Tableau CSE éditable */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Volet CSE — Constat terrain</h3>
            <p className="text-xs text-gray-500 mt-0.5">Contrôle ligne par ligne — modifications tracées</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportCSE(lignes, att.reference)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Download size={12} /> Exporter
            </button>
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; if (!file) return;
              importCSELignes(file, lignes, updated => { setLignes(updated); addToast("Quantités importées depuis Excel.", "success"); }, () => addToast("Erreur de lecture du fichier Excel.", "error"));
              e.target.value = "";
            }} />
            <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Upload size={12} /> Importer
            </button>
            <button onClick={handleEnregistrer} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              {savedFlag ? <CheckCircle size={12} className="text-green-500" /> : <Save size={12} />}
              {savedFlag ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-3 py-2.5 w-16">Réf</th>
                <th className="text-left px-2 py-2.5">Désignation</th>
                <th className="text-center px-2 py-2.5 w-12">Unité</th>
                <th className="text-right px-2 py-2.5 w-16">Qté DQE</th>
                <th className="text-right px-2 py-2.5 w-20 text-indigo-500">Qté réalisée</th>
                <th className="text-right px-2 py-2.5 w-24">PU HT</th>
                <th className="text-right px-3 py-2.5 w-24">Montant</th>
                <th className="w-5" />
              </tr>
            </thead>
            <tbody>
              <TableauRows lignes={lignes} editable={true} isDTMode={false} onQteChange={handleQteChange} onLibreChange={handleLibreChange} onDeleteLibre={handleDeleteLibre} />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={7} className="px-3 py-3 text-right font-bold text-gray-700 text-sm">Total CSE</td>
                <td className="px-3 py-3 text-right">
                  <span className="font-bold text-[#087F3E]"><AnimatedTotal value={total} /></span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 px-4 py-4 space-y-3">
          {!showRejet ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setShowRejet(true)} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                <RotateCcw size={13} /> Renvoyer au CT
              </button>
              <button
                onClick={handleSoumettreAuDT}
                disabled={submittingToDT}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 disabled:opacity-40">
                {submittingToDT ? <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
                Soumettre au DT
              </button>
              <button
                onClick={handleValiderDirect}
                disabled={validatingDirect || total === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-[#087F3E] text-white rounded-xl hover:bg-[#065A2C] disabled:opacity-40 shadow-sm">
                {validatingDirect ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={14} />}
                Valider directement
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
                  <RotateCcw size={12} /> Confirmer le renvoi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vue DACC ────────────────────────────────────────────────────────────────
function VueDacc({ att, updateAttachement, validerAttachement, rejeterAttachement, currentUser }) {
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

  async function handleValider() {
    try {
      await validerAttachement(att.id, `Dossier validé par le DACC. Montant final : ${num(total)} FCFA.`);
      addToast(`Dossier validé — montant final ${num(total)} FCFA enregistré.`, "success");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors de la validation. Réessayez.", "error");
    }
  }

  async function handleRejeter() {
    if (!motifRejet.trim()) { addToast("Commentaire de rejet obligatoire.", "error"); return; }
    try {
      await rejeterAttachement(att.id, motifRejet.trim());
      addToast("Dossier rejeté et renvoyé au CT.", "info");
      navigate("/attachements");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      addToast(msg ? `Erreur : ${msg}` : "Erreur lors du rejet. Réessayez.", "error");
    }
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
                  <th className="text-left px-3 py-2.5 w-14">Réf</th>
                  <th className="text-left px-2 py-2.5 w-20">N° Item</th>
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

// ─── Zone Documents ──────────────────────────────────────────────────────────
function ZoneDocuments({ att, canEdit, updateAttachement }) {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const uploadRef = useRef(null);
  const docs = att.documents ?? [];

  const contratIdInt = parseInt(att.contratId, 10);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setLibelle("");
    setShowForm(true);
    if (uploadRef.current) uploadRef.current.value = "";
  }

  async function handleUpload() {
    if (!pendingFile) return;
    if (!contratIdInt) { addToast("Contrat introuvable pour l'upload.", "error"); return; }
    setUploading(true);
    try {
      const pj = await pieceJointeService.upload(contratIdInt, "autre", pendingFile);
      updateAttachement(att.id, a => ({
        ...a,
        documents: [...(a.documents ?? []), {
          id:       pj.id,
          nom:      pj.nom_original,
          libelle:  libelle.trim() || pj.nom_original,
          taille:   pj.taille_fmt,
          mime:     pj.mime_type,
          date:     pj.created_at,
          uploadBy: pj.uploaded_by,
        }],
      }));
      addToast(`Document "${libelle.trim() || pj.nom_original}" ajouté.`, "success");
      setShowForm(false);
      setLibelle("");
      setPendingFile(null);
    } catch {
      addToast("Erreur lors de l'upload.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc, preview = false) {
    try {
      const token = localStorage.getItem("stt_token");
      const url   = pieceJointeService.downloadUrl(doc.id);
      const resp  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) { addToast("Erreur lors du téléchargement.", "error"); return; }
      const blob  = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      if (preview) {
        window.open(objUrl, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = objUrl; a.download = doc.nom; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
    } catch {
      addToast("Erreur lors du téléchargement.", "error");
    }
  }

  async function handleDelete(doc) {
    try {
      await pieceJointeService.delete(doc.id);
      updateAttachement(att.id, a => ({
        ...a,
        documents: (a.documents ?? []).filter(d => d.id !== doc.id),
      }));
      addToast("Document supprimé.", "info");
    } catch {
      addToast("Erreur lors de la suppression.", "error");
    }
  }

  function mimeIcon(mime) {
    if (!mime) return <FileText size={14} className="text-gray-400" />;
    if (mime.includes("pdf")) return <FileText size={14} className="text-red-500" />;
    if (mime.includes("sheet") || mime.includes("excel") || mime.includes("xls"))
      return <FileText size={14} className="text-green-600" />;
    if (mime.includes("word") || mime.includes("doc"))
      return <FileText size={14} className="text-blue-600" />;
    if (mime.includes("image")) return <Eye size={14} className="text-purple-500" />;
    return <FileText size={14} className="text-gray-400" />;
  }

  const isViewable = (mime) => mime && (mime.includes("pdf") || mime.includes("image"));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm">Documents du dossier</h3>
        <span className="text-xs text-gray-400">{docs.length} fichier{docs.length > 1 ? "s" : ""}</span>
      </div>

      <div className="divide-y divide-gray-50">
        {docs.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-5">Aucun document joint</p>
        )}
        {docs.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60">
            <div className="flex-shrink-0">{mimeIcon(doc.mime)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{doc.libelle || doc.nom}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {doc.nom}{doc.taille ? ` · ${doc.taille}` : ""}{doc.date ? ` · ${doc.date}` : ""}{doc.uploadBy ? ` · ${doc.uploadBy}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isViewable(doc.mime) && (
                <button
                  onClick={() => handleDownload(doc, true)}
                  title="Visualiser"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <Eye size={14} />
                </button>
              )}
              <button
                onClick={() => handleDownload(doc, false)}
                title="Télécharger"
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#087F3E] hover:bg-green-50 transition-colors">
                <Download size={14} />
              </button>
              {canEdit && (
                <button
                  onClick={() => handleDelete(doc)}
                  title="Supprimer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-gray-100 space-y-3">
        <input
          ref={uploadRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={handleFileChange}
        />
        {showForm ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Fichier : <span className="font-normal text-gray-500">{pendingFile?.name}</span></p>
            <input
              type="text"
              value={libelle}
              onChange={e => setLibelle(e.target.value)}
              placeholder="Libellé du document (ex: Devis STT, PV de réception…)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setPendingFile(null); setLibelle(""); }} className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleUpload} disabled={uploading} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#087F3E] text-white rounded-lg hover:bg-[#065A2C] disabled:opacity-40">
                {uploading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Upload…</> : <><Upload size={12} /> Joindre</>}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => uploadRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-xs font-medium hover:border-[#087F3E] hover:text-[#087F3E] hover:bg-[#087F3E]/5 transition-colors">
            <Upload size={13} /> Joindre un document (PDF, Word, Excel, image)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function AttachementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { attachements, updateAttachement, soumettreAttachement, validerAttachement, rejeterAttachement } = useAttachements();
  const { currentUser, hasRole } = useUser();
  const attBase = attachements.find(a => a.id === id);
  const [attDetail, setAttDetail] = useState(null);
  useEffect(() => {
    if (attBase?._dbId) {
      attachementService.getById(attBase._dbId).then(setAttDetail).catch(() => {});
    }
  }, [attBase?._dbId]);
  const att = attDetail ? { ...attBase, ...attDetail } : attBase;

  if (!att) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <AlertCircle size={40} className="mb-3 opacity-40" />
        <p className="font-medium">Dossier introuvable</p>
        <button onClick={() => navigate("/attachements")} className="mt-4 text-sm text-blue-500 hover:underline">← Retour à la liste</button>
      </div>
    );
  }

  // Rôle utilisateur courant
  const roleCode        = currentUser?.role?.designation ?? "";
  const isCT            = roleCode === "CT"             || roleCode === "Admin";
  const isDT            = roleCode === "DT"             || roleCode === "Admin";
  const isDACC          = roleCode === "DACC"           || roleCode === "Admin";
  const isAssistantDACC = roleCode === "Assistant DACC" || roleCode === "Admin";

  // Vue active selon rôle + statut
  const isCTEditable        = isCT            && (att.statut === "Ouvert" || att.statut === "En cours" || att.statut === "Rejeté");
  const isAsstDACCView      = isAssistantDACC && att.statut === "Soumis à l'Asst DACC";
  const isDTView            = isDT            && (att.statut === "Soumis au DT" || att.statut === "En rapprochement");
  const isDTEditable        = isDTView;
  const isDACCView          = isDACC          && (att.statut === "Soumis au DACC" || att.statut === "Validé");

  // Accès en lecture seule : chaque rôle peut voir les dossiers dans d'autres étapes
  const canView = isCTEditable || isAsstDACCView || isDTView || isDACCView
    || (isCT            && ["Soumis à l'Asst DACC","Soumis au DT","Soumis au DACC","Validé","Rejeté"].includes(att.statut))
    || (isAssistantDACC && ["Soumis au DT","Soumis au DACC","Validé"].includes(att.statut))
    || (isDT            && ["Validé","Soumis au DACC"].includes(att.statut))
    || roleCode === "Admin";
  const statutColor = STATUT_COLORS[att.statut] || "bg-gray-100 text-gray-600 border-gray-200";

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <AlertCircle size={40} className="mb-3 opacity-60 text-amber-400" />
        <p className="font-medium text-gray-700">Accès non autorisé</p>
        <p className="text-sm text-gray-400 mt-1">
          Ce dossier est en statut « {att.statut} » et n'est pas accessible avec votre rôle ({roleCode || "inconnu"}).
        </p>
        <button onClick={() => navigate("/attachements")} className="mt-4 text-sm text-blue-500 hover:underline">← Retour à la liste</button>
      </div>
    );
  }

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

      {/* Cards montants */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-1">Montant partiel</p>
          <p className="text-lg font-bold text-gray-900">{num(att.montantFinal ?? att.voletCSE?.totalValorise ?? 0)} FCFA</p>
          <p className="text-xs text-gray-400 mt-0.5">Cet attachement</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-1">Montant cumulé</p>
          <p className="text-lg font-bold text-[#087F3E]">{num(att.montantCumule ?? 0)} FCFA</p>
          <p className="text-xs text-gray-400 mt-0.5">Attachements validés</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400 mb-1">Montant occasionné</p>
          <p className="text-lg font-bold text-gray-400">—</p>
          <p className="text-xs text-gray-400 mt-0.5">À définir</p>
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
      {att.statut === "Soumis à l'Asst DACC" && !isAsstDACCView && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Clock size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-800">En attente de contrôle — Asst DACC</p>
            <p className="text-xs text-indigo-700 mt-0.5">Le dossier est en cours de vérification par l'Assistant DACC.</p>
          </div>
        </div>
      )}
      {att.statut === "Soumis au DT" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Dossier soumis au DT — en attente de révision</p>
            <p className="text-xs text-blue-700 mt-0.5">Le tableau CSE est verrouillé. Le DT peut modifier et valider.</p>
          </div>
        </div>
      )}
      {att.statut === "Rejeté" && (() => {
        const motif = [...(att.discussion ?? [])].reverse().find(m => m.type === "rejet" || (m.type === "action" && m.message?.toLowerCase().includes("rejet")));
        const rejectedBy = motif?.roleId ?? "—";
        return (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Dossier renvoyé{rejectedBy !== "—" ? ` par le ${rejectedBy}` : ""} — corrections requises</p>
              {motif && <p className="text-xs text-red-700 mt-0.5">{motif.commentaire ?? motif.message}</p>}
              {isCT && <p className="text-xs text-red-600 font-medium mt-1">Vous pouvez modifier le dossier et le resoumettre.</p>}
            </div>
          </div>
        );
      })()}

      {/* Contenu principal */}
      {isDACCView ? (
        <VueDacc att={att} updateAttachement={updateAttachement} validerAttachement={validerAttachement} rejeterAttachement={rejeterAttachement} currentUser={currentUser} />
      ) : isDTView ? (
        <VueDT att={att} updateAttachement={updateAttachement} soumettreAttachement={soumettreAttachement} rejeterAttachement={rejeterAttachement} currentUser={currentUser} editable={isDTEditable} />
      ) : isAsstDACCView ? (
        <VueAssistantDACC att={att} updateAttachement={updateAttachement} soumettreAttachement={soumettreAttachement} rejeterAttachement={rejeterAttachement} currentUser={currentUser} />
      ) : (
        /* Vue CT — éditable si isCTEditable, lecture seule sinon (ex. DT qui consulte un dossier Ouvert) */
        <VueCT att={att} updateAttachement={updateAttachement} soumettreAttachement={soumettreAttachement} currentUser={currentUser} readOnly={!isCTEditable} />
      )}

      {/* Documents joints */}
      <ZoneDocuments att={att} canEdit={isCTEditable} updateAttachement={updateAttachement} />

      {/* Fil de discussion — toujours visible */}
      <FilDiscussion att={att} currentUser={currentUser} updateAttachement={updateAttachement} />
    </div>
  );
}
