import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Save, Send, ChevronRight, FileDown, Info, CheckCircle2,
  Clock, XCircle, Circle, RotateCcw, AlertTriangle, Plus, Trash2, RefreshCw,
} from "lucide-react";
import { useDecompte, useSaveDecompte, useValiderDecompte, useRejeterDecompte, usePayerDecompte, useDecompteCircuit, useDecompteCessions } from "../hooks/useDecomptes";
import { useContratsPaginated } from "../hooks/useContrats";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import http from "../services/http";
import SearchSelect from "../components/SearchSelect";

// ─── Helpers ────────────────────────────────────────────────────────────────
const num  = v => new Intl.NumberFormat("fr-FR").format(Math.round(Math.abs(v ?? 0)));
const fmtD = d => d ? new Date(d + "T00:00").toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtM = d => d ? new Date(d + "T00:00").toLocaleDateString("fr-FR", { month:"long", year:"numeric" }) : "—";

const TYPE_LABELS = {
  provisoire:               "Provisoire (mensuel)",
  final:                    "Final",
  restitution_rg_partielle: "Restitution RG partielle",
  restitution_rg_totale:    "Restitution RG totale",
  definitif_general:        "Décompte général et définitif",
};

const STATUT_COLORS = {
  brouillon:    "bg-gray-100 text-gray-600 border-gray-200",
  soumis:       "bg-blue-100 text-blue-700 border-blue-200",
  rejete:       "bg-red-100 text-red-700 border-red-200",
  paye:         "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function statutColor(statut) {
  return STATUT_COLORS[statut] || "bg-purple-100 text-purple-700 border-purple-200";
}

// ─── Checklists par étape ────────────────────────────────────────────────────
const CHECKLISTS = {
  dacc: [
    "Dossier d'attachement de la période validé — code et montantFinal vérifiés",
    "États de cession de la période arrêtés et visés",
    "Poste A = montantFinal du dossier d'attachement",
    "Lignes G/I/K = totaux des états de cession consommés",
    "Calculs Poste B (révision) et Poste D (RG) cohérents avec A",
  ],
  dexa: [
    "Montants des travaux cohérents avec le DQE et les avenants",
    "Pièces jointes obligatoires présentes",
    "Cohérence Poste A / dossier d'attachement",
  ],
  dcg: [
    "États de cession visés (quantités DCG + prix DACC)",
    "Montants G/I/K conformes aux états de cession",
    "Remboursements H/J/L cohérents avec les cessions cumulées",
    "Imputation analytique correcte (rubrique 6Axx)",
  ],
  dga: [
    "Solde BC suffisant pour couvrir ce décompte (net HT vs solde BC)",
    "Cumul travaux dans l'enveloppe du marché actualisé",
  ],
  dg: [
    "Les 4 visas précédents (DACC, DEXA, DCG, DGA) sont présents avec noms et dates",
    "Montant net TTC confirmé et cohérent",
  ],
};

function ChecklistEtape({ profil }) {
  const items = CHECKLISTS[profil?.toLowerCase()] ?? [];
  const [checked, setChecked] = useState(() => new Array(items.length).fill(false));

  if (items.length === 0) return null;

  const nbOk = checked.filter(Boolean).length;

  function toggle(i) {
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  }

  return (
    <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
          Checklist de contrôle — {profil?.toUpperCase()}
        </p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${nbOk === items.length ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {nbOk}/{items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 cursor-pointer" onClick={() => toggle(i)}>
            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
              ${checked[i] ? "bg-[#087F3E] border-[#087F3E]" : "border-amber-400 bg-white"}`}>
              {checked[i] && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <span className={`text-xs leading-relaxed ${checked[i] ? "text-gray-400 line-through" : "text-amber-900"}`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-amber-600">Ces cases sont locales — elles ne sont pas enregistrées. Le bouton Valider reste actif indépendamment.</p>
    </div>
  );
}

// ─── Circuit Stepper ─────────────────────────────────────────────────────────
function CircuitStepper({ decompte, circuit, onValider, onRejeter, onPayer, onSoumettre }) {
  const [showRejet, setShowRejet]   = useState(false);
  const [motif, setMotif]           = useState("");
  const { currentUser } = useUser();

  const statut      = decompte?.statut ?? "brouillon";
  const validations = decompte?.validations ?? [];
  const etapes      = [...circuit].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const lastEtape   = etapes[etapes.length - 1];

  const steps = [
    { statut: "brouillon", label: "Création", profil: null },
    ...(etapes.length > 0 ? [{ statut: etapes[0].statut_avant, label: "Soumis", profil: null }] : []),
    ...etapes.map(e => ({ statut: e.statut_apres, label: e.profil_code?.toUpperCase(), profil: e.profil_code, etape: e })),
    { statut: "paye", label: "Payé", profil: null },
  ];

  const currentIdx    = steps.findIndex(s => s.statut === statut);
  const currentEtape  = etapes.find(e => e.statut_avant === statut);
  const isAfterLast   = !!(lastEtape && statut === lastEtape.statut_apres);
  const isTerminal    = statut === "paye" || statut === "rejete";

  const userRole   = currentUser?.role?.designation?.toLowerCase() ?? "";
  const isAdmin    = userRole === "admin";
  const canValidate = isAdmin || !currentEtape || userRole === currentEtape.profil_code?.toLowerCase();

  const findVal = profil => validations.find(v => v.profil_code === profil && v.action === "valide");

  const nbEtapesDone = steps.filter((s, i) => i < currentIdx && s.profil).length;
  const nbEtapesTotal = steps.filter(s => s.profil).length;

  return (
    <div className="space-y-5">
      {statut === "rejete" ? (
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
          <XCircle size={16} /> Rejeté
          {decompte?.motif_rejet && (
            <span className="ml-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">{decompte.motif_rejet}</span>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-0">
          {steps.map((step, idx) => {
            const done    = idx < currentIdx;
            const current = idx === currentIdx;
            const val     = step.profil ? findVal(step.profil) : null;
            return (
              <div key={step.statut + idx} className="flex-1 flex flex-col items-center">
                <div className="flex items-center w-full">
                  <div className={`flex-1 h-0.5 ${idx === 0 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors text-xs
                    ${done ? "bg-[#087F3E] border-[#087F3E] text-white" : current ? "bg-white border-[#087F3E] text-[#087F3E]" : "bg-white border-gray-200 text-gray-300"}`}>
                    {done ? <CheckCircle2 size={13} /> : current ? <Clock size={11} /> : <Circle size={11} />}
                  </div>
                  <div className={`flex-1 h-0.5 ${idx === steps.length - 1 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                </div>
                <div className="mt-1.5 text-center px-0.5 w-full">
                  <p className={`text-[10px] font-semibold ${done ? "text-[#087F3E]" : current ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
                  {val && <p className="text-[10px] text-[#087F3E]">{fmtD(val.validated_at?.slice(0,10))}</p>}
                  {val?.user && <p className="text-[10px] text-gray-400 truncate">{val.user.prenom} {val.user.nom}</p>}
                  {current && step.profil && !val && <p className="text-[10px] text-amber-500">En attente</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-gray-400 text-right">Étape {Math.max(nbEtapesDone, 0)}/{nbEtapesTotal}</div>

      {!isTerminal && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {statut === "brouillon" && (
            <button onClick={onSoumettre} className="w-full px-4 py-2.5 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-xl text-sm font-medium">
              Soumettre au circuit
            </button>
          )}
          {statut !== "brouillon" && !isAfterLast && (
            <>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <Clock size={11} className="text-amber-400" />
                En attente de validation par <strong className="text-gray-800">{currentEtape?.profil_code?.toUpperCase() ?? "—"}</strong>
              </div>
              {canValidate && !showRejet && (
                <div className="flex gap-2">
                  <button onClick={onValider} className="flex-1 px-3 py-2 bg-[#087F3E] text-white rounded-lg text-sm font-medium hover:bg-[#065A2C]">
                    Valider — {currentEtape?.profil_code?.toUpperCase()}
                  </button>
                  <button onClick={() => setShowRejet(true)} className="px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50">
                    Rejeter
                  </button>
                </div>
              )}
              {canValidate && showRejet && (
                <div className="space-y-2">
                  <input autoFocus placeholder="Motif du rejet (obligatoire)…" value={motif}
                    onChange={e => setMotif(e.target.value)}
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => { onRejeter(motif); setShowRejet(false); setMotif(""); }}
                      disabled={!motif.trim()}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      Confirmer le rejet
                    </button>
                    <button onClick={() => { setShowRejet(false); setMotif(""); }}
                      className="px-3 py-2 text-gray-500 border border-gray-200 rounded-lg text-sm">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {isAfterLast && (
            <button onClick={onPayer} className="w-full px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700">
              Marquer comme payé
            </button>
          )}
        </div>
      )}
      {statut === "paye" && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm text-[#087F3E] font-medium flex items-center gap-1.5"><CheckCircle2 size={14} /> Décompte payé</p>
        </div>
      )}
    </div>
  );
}

// ─── Panneau droite — Informations ──────────────────────────────────────────
function InfoPanel({ decompte, circuit }) {
  const d = decompte;
  const contrat       = d.contrat;
  const montantActuel = contrat?.montant_actuel ?? 0;
  const sit           = d.situation;

  const etapes = [...circuit].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const lastStatut = etapes[etapes.length - 1]?.statut_apres;
  const nbEtapesDone = (d.validations ?? []).filter(v => v.action === "valide").length;

  const pctPaye = montantActuel > 0 ? Math.min(100, (sit?.montant_paye ?? 0) / montantActuel * 100) : 0;
  const pctAppr = montantActuel > 0 ? Math.min(100, (sit?.montant_approuve ?? 0) / montantActuel * 100) : 0;
  const pctEnVal = montantActuel > 0 ? Math.min(100, (sit?.montant_en_validation ?? 0) / montantActuel * 100) : 0;

  const payload = d.payload ?? {};
  const postes  = payload.postes ?? {};

  return (
    <div className="space-y-4">
      {/* Infos clés */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations</h3>
        <div className="space-y-2 text-sm">
          <div><p className="text-xs text-gray-400">Code</p><p className="font-mono font-semibold text-gray-900">{d.code}</p></div>
          <div><p className="text-xs text-gray-400">Type</p><p className="text-gray-700">{TYPE_LABELS[d.type] ?? d.type}</p></div>
          <div><p className="text-xs text-gray-400">Période</p><p className="text-gray-700">{fmtD(d.date_debut)} → {fmtD(d.date_fin)}</p></div>
          <div><p className="text-xs text-gray-400">Étape validation</p>
            <p className="text-gray-700">{nbEtapesDone}/{etapes.length} {lastStatut && d.statut === lastStatut ? "(approuvé)" : ""}</p>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Montants clés</p>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Travaux exécutés</span><span className="font-semibold">{num(postes.A?.cumulM ?? d.montant_brut)} FCFA</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">RG + AD</span><span className="text-red-600">−{num((postes.D?.cumulM ?? 0) + (postes.C?.cumulM ?? 0))} FCFA</span></div>
          {sit?.montant_en_validation > 0 && (
            <div className="flex justify-between text-sm"><span className="text-gray-500">Cessions</span><span className="text-gray-600">{num(postes.G?.cumulM ?? 0)} FCFA</span></div>
          )}
          <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1"><span>Net TTC</span><span className="text-[#087F3E]">{num(d.montant_ttc)} FCFA</span></div>
        </div>
      </div>

      {/* Marché */}
      {contrat && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Marché</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Montant initial</span><span>{num(contrat.montant_initial)} FCFA</span></div>
            {(contrat.avenants ?? []).map((a, i) => (
              <div key={i} className="flex justify-between text-violet-600 text-xs">
                <span>{a.code}</span><span>{a.montant >= 0 ? "+" : ""}{num(a.montant)} FCFA</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t pt-1.5 text-[#087F3E]">
              <span>Montant actualisé</span><span>{num(montantActuel)} FCFA</span>
            </div>
            {sit && <div className="flex justify-between text-sm"><span className="text-gray-500">Solde du bon de commande</span><span className="font-medium">{num(sit.solde_bc)} FCFA</span></div>}
          </div>
          <Link to={`/contrats/${d.contrat_id}`} className="text-xs text-[#087F3E] hover:underline">Voir le contrat {contrat.code} →</Link>
        </div>
      )}

      {/* Situation financière */}
      {sit && montantActuel > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Situation financière</h3>
          <div className="text-xs text-gray-500 mb-1">{num(montantActuel)} FCFA · {sit.pct_realise ?? 0}% réalisé</div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
            <div className="bg-emerald-500 transition-all" style={{ width: `${pctPaye}%` }} title={`Payé : ${num(sit.montant_paye)} FCFA`} />
            <div className="bg-blue-400 transition-all" style={{ width: `${pctAppr}%` }} title={`Approuvé : ${num(sit.montant_approuve)} FCFA`} />
            <div className="bg-amber-300 transition-all" style={{ width: `${pctEnVal}%` }} title={`En validation : ${num(sit.montant_en_validation)} FCFA`} />
          </div>
          <div className="flex gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Payé</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Approuvé</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />En validation</span>
          </div>
          <div className="space-y-1 text-sm pt-1 border-t border-gray-100">
            <div className="flex justify-between"><span className="text-gray-500">Payé</span><span className="font-medium text-emerald-700">{num(sit.montant_paye)} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Approuvé (à payer)</span><span className="font-medium text-blue-700">{num(sit.montant_approuve)} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">En cours de validation</span><span className="font-medium text-amber-700">{num(sit.montant_en_validation)} FCFA</span></div>
            <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Solde restant</span><span>{num(sit.solde_bc)} FCFA</span></div>
          </div>
        </div>
      )}

      {/* Retenues cumulées */}
      {sit && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Retenues cumulées</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-0.5">
                <span className="text-gray-500">Retenue de garantie (5%)</span>
                <span className="font-semibold">{num(sit.retenue_cumulee)} FCFA</span>
              </div>
              {montantActuel > 0 && <p className="text-[10px] text-gray-400">{((sit.retenue_cumulee / montantActuel) * 100).toFixed(1)}% du marché actualisé</p>}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-0.5">
                <span className="text-gray-500">Avance démarrage (15%)</span>
                <span className="font-semibold">{num(sit.avance_cumulee)} FCFA</span>
              </div>
              {montantActuel > 0 && <p className="text-[10px] text-gray-400">{((sit.avance_cumulee / montantActuel) * 100).toFixed(1)}% du marché actualisé</p>}
            </div>
          </div>
        </div>
      )}

      {/* Stats décomptes */}
      {sit && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Décomptes</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "Total", val: sit.total },
              { label: "Payés", val: sit.payes, color: "text-emerald-700" },
              { label: "En validation", val: sit.en_validation, color: "text-amber-700" },
              { label: "Brouillons", val: sit.brouillons, color: "text-gray-500" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between border-b border-gray-50 pb-1">
                <span className="text-gray-500">{label}</span>
                <span className={`font-semibold ${color ?? "text-gray-800"}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ligne de poste ──────────────────────────────────────────────────────────
function PosteLigne({ code, type, label, taux, cumulM1, mensuelM, cumulM, editable, onChange, extra, extra2, children }) {
  const isInfo  = type === "info";
  const isMinus = type === "minus";

  const badge = {
    "plus":  <span className="w-4 h-4 rounded bg-green-100 text-green-600 text-[9px] flex items-center justify-center font-bold flex-shrink-0">+</span>,
    "minus": <span className="w-4 h-4 rounded bg-red-100 text-red-500 text-[9px] flex items-center justify-center font-bold flex-shrink-0">−</span>,
    "info":  <span className="w-4 h-4 rounded bg-blue-100 text-blue-500 text-[9px] flex items-center justify-center font-bold flex-shrink-0">i</span>,
  }[type] ?? null;

  const valColor = isInfo ? "text-gray-400 italic" : isMinus ? "text-red-600" : "text-gray-800 font-medium";

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/60 group">
        <td className="px-4 py-2.5 w-12">
          <span className="text-xs font-bold text-gray-400">{code}</span>
        </td>
        <td className="px-2 py-2.5">
          <div className="flex items-start gap-2">
            {badge}
            <div>
              <span className="text-sm text-gray-800">{label}</span>
              {taux && <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{taux}%</span>}
              {extra  && <p className="text-[10px] text-gray-400 mt-0.5">{extra}</p>}
              {extra2 && <p className="text-[10px] text-gray-400">{extra2}</p>}
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right text-xs text-gray-300 w-32 tabular-nums">
          {cumulM1 != null && cumulM1 !== 0 ? num(cumulM1) : "—"}
        </td>
        <td className="px-3 py-2.5 text-right text-sm w-32 tabular-nums text-gray-500 italic">
          {mensuelM != null ? (mensuelM !== 0 ? num(mensuelM) : "0") : "—"}
        </td>
        <td className={`px-4 py-2.5 text-right text-sm w-36 tabular-nums ${valColor}`}>
          {editable && !isInfo ? (
            <input
              type="number" min={0} value={cumulM ?? 0}
              onChange={e => onChange && onChange(parseFloat(e.target.value) || 0)}
              className="w-full text-right px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 tabular-nums"
            />
          ) : (
            cumulM != null ? (cumulM === 0 ? "0" : num(cumulM)) : "—"
          )}
        </td>
      </tr>
      {children}
    </>
  );
}

// Sous-ligne de détail (indentée, lecture seule)
function SousLigne({ label, cumulM1, mensuelM, cumulM, highlight }) {
  return (
    <tr className="bg-gray-50/70 border-b border-gray-50">
      <td className="px-4 py-1.5 w-12" />
      <td className="px-2 py-1.5 pl-8">
        <span className="text-[11px] text-gray-500">└ {label}</span>
      </td>
      <td className="px-3 py-1.5 text-right text-[11px] text-gray-400 tabular-nums">
        {cumulM1 != null && cumulM1 !== 0 ? num(cumulM1) : "—"}
      </td>
      <td className="px-3 py-1.5 text-right text-[11px] text-gray-400 tabular-nums">
        {mensuelM != null && mensuelM !== 0 ? num(mensuelM) : "—"}
      </td>
      <td className={`px-4 py-1.5 text-right text-[11px] tabular-nums ${highlight ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
        {cumulM != null && cumulM !== 0 ? `⚡${num(cumulM)}` : "0"}
      </td>
    </tr>
  );
}

// ─── Onglet Structure ────────────────────────────────────────────────────────
function StructureTab({ decompte, canEdit, onSave, saving }) {
  const d       = decompte;
  const payload = d.payload ?? {};
  const prev    = d.precedent?.postes ?? {};

  const [mode, setMode]     = useState(payload.mode ?? "cumulatif");
  const [libelleM, setLibelleM] = useState(() => (decompte.payload?.postes?.M?.libelle ?? ""));
  const [postes, setPostes] = useState(() => {
    const p = payload.postes ?? {};
    return {
      B2:   p.B2?.cumulM ?? 0,
      tauxE: p.E?.tauxE  ?? 0,
      tauxH: p.H?.tauxH  ?? 100,
      tauxJ: p.J?.tauxJ  ?? 100,
      tauxL: p.L?.tauxL  ?? 100,
      F:    p.F?.cumulM  ?? 0,
      M:    p.M?.cumulM  ?? 0,
    };
  });

  useEffect(() => {
    const p = (decompte.payload?.postes) ?? {};
    setLibelleM(p.M?.libelle ?? "");
    setPostes({
      B2:   p.B2?.cumulM ?? 0,
      tauxE: p.E?.tauxE  ?? 0,
      tauxH: p.H?.tauxH  ?? 100,
      tauxJ: p.J?.tauxJ  ?? 100,
      tauxL: p.L?.tauxL  ?? 100,
      F:    p.F?.cumulM  ?? 0,
      M:    p.M?.cumulM  ?? 0,
    });
  }, [decompte.id]);

  const p = payload.postes ?? {};

  // Computed cumuls M-1
  const cM1 = code => prev[code]?.cumulM ?? 0;

  // Poste A
  const cumulA   = p.A?.cumulM ?? d.montant_brut ?? 0;
  const mensuelA = cumulA - cM1("A");

  // Poste C — Avance démarrage (depuis payload backend)
  const tauxAD          = p.C?.tauxAD          ?? d.contrat?.taux_avance               ?? 20;
  const tauxRembAD      = p.C?.tauxRembAD       ?? d.contrat?.taux_remboursement_avance ?? 6.25;
  // C1 — montant avance accordée
  const montantAvance   = p.C?.montant_avance   ?? 0;
  // C2 — cumul avances M-1
  const prevCumulAvance = p.C?.prev_cumul_avance ?? montantAvance;
  // C3 — cumul avances M (= C1)
  const cumulAvanceM    = p.C?.cumul_avance_m   ?? montantAvance;
  // C4 — remboursement mensuel
  const rembMensuelC    = p.C?.remb_mensuel     ?? 0;
  // C5 — cumul remb M-1
  const prevCumulRembAD = p.C?.prev_cumul_remb  ?? 0;
  // C6 — cumul remb M
  const cumulRembAD     = p.C?.cumul_remboursements ?? 0;
  // C7 — restant
  const restantAD       = p.C?.restant          ?? montantAvance;
  const mensuelC        = rembMensuelC;
  const cumulC          = cumulRembAD;

  // Poste D (RG = tauxRG% × A) — négatif
  const tauxRG   = p.D?.tauxRG ?? (d.taux_retenue_garantie ?? 5);
  const cumulD   = p.D?.cumulM ?? Math.round(cumulA * tauxRG / 100);
  const mensuelD = cumulD - cM1("D");

  // Poste B — auto (tauxRevisionPrix × A)
  const tauxRevisionPrix = p.B?.tauxRevision ?? d.contrat?.taux_revision_prix ?? 0;
  const cumulB   = p.B?.cumulM ?? Math.round(cumulA * tauxRevisionPrix / 100);
  const mensuelB = cumulB - cM1("B");

  // Postes saisissables
  const mensuelB2 = postes.B2 - cM1("B2");
  const mensuelF  = postes.F  - cM1("F");
  const mensuelM  = postes.M  - cM1("M");

  // Poste E — Restitution RG (taux saisi × reliquat RG M-1)
  const prevCumulE   = p.E?.cumulM1 ?? cM1("E");
  const reliquatRgM1 = Math.max(0, cM1("D") - prevCumulE);
  const mensuelE     = Math.round(postes.tauxE / 100 * reliquatRgM1);
  const cumulE       = prevCumulE + mensuelE;
  const reliquatRgM  = Math.max(0, cumulD - cumulE);

  // Postes G/I/K — cessions (depuis payload backend)
  const mensuelG = p.G?.mensuelM ?? 0;
  const cumulGM1 = p.G?.cumulM1  ?? 0;
  const cumulG   = p.G?.cumulM   ?? 0;
  const mensuelI = p.I?.mensuelM ?? 0;
  const cumulIM1 = p.I?.cumulM1  ?? 0;
  const cumulI   = p.I?.cumulM   ?? 0;
  const mensuelK = p.K?.mensuelM ?? 0;
  const cumulKM1 = p.K?.cumulM1  ?? 0;
  const cumulK   = p.K?.cumulM   ?? 0;

  // Postes H/J/L — remboursements (taux saisi × mensuel cession)
  const rembMensuelH = Math.round(postes.tauxH / 100 * mensuelG);
  const cumulHM1     = p.H?.cumulM1  ?? 0;
  const cumulH       = Math.min(cumulG, cumulHM1 + rembMensuelH);
  const reliquatG    = cumulG - cumulH;
  const rembMensuelJ = Math.round(postes.tauxJ / 100 * mensuelI);
  const cumulJM1     = p.J?.cumulM1  ?? 0;
  const cumulJ       = Math.min(cumulI, cumulJM1 + rembMensuelJ);
  const reliquatI    = cumulI - cumulJ;
  const rembMensuelL = Math.round(postes.tauxL / 100 * mensuelK);
  const cumulLM1     = p.L?.cumulM1  ?? 0;
  const cumulL       = Math.min(cumulK, cumulLM1 + rembMensuelL);
  const reliquatK    = cumulK - cumulL;

  // Net HT = A + B + B2 − C − D + E − H − J + L − M − F
  const netHt  = mensuelA + mensuelB + mensuelB2 - mensuelC - mensuelD + mensuelE - rembMensuelH - rembMensuelJ + rembMensuelL - mensuelM - mensuelF;
  const tva    = Math.round(netHt * (d.taux_tva ?? 18) / 100);
  const netTtc = netHt + tva;

  function handleSet(code, val) { setPostes(prev => ({ ...prev, [code]: val })); }

  function buildPayload() {
    return {
      mode,
      postes: {
        B2: { cumulM: postes.B2 },
        E:  { tauxE: postes.tauxE },
        H:  { tauxH: postes.tauxH },
        J:  { tauxJ: postes.tauxJ },
        L:  { tauxL: postes.tauxL },
        F:  { cumulM: postes.F  },
        M:  { cumulM: postes.M, libelle: libelleM },
      },
    };
  }

  function handleSaveWithValidation() {
    if (postes.M !== 0 && !libelleM.trim()) {
      alert("Le libellé du Poste M (Autres retenues) est obligatoire quand le montant est renseigné.");
      return;
    }
    onSave(buildPayload());
  }

  const attachementCode = p.A?.attachementCode;
  const nbCessionsCourants = (p.G?.cessionsIds ?? []).length + (p.I?.cessionsIds ?? []).length + (p.K?.cessionsIds ?? []).length;

  return (
    <div className="flex gap-5 items-start">
      {/* Tableau principal */}
      <div className="flex-[3] min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Mode : {mode === "cumulatif" ? "Saisie cumulative" : "Saisie mensuelle"}</p>
          {canEdit && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 text-xs">
              <button onClick={() => setMode("cumulatif")} className={`px-3 py-1.5 rounded-md font-medium transition-colors ${mode === "cumulatif" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Saisie cumulative</button>
              <button onClick={() => setMode("mensuel")} className={`px-3 py-1.5 rounded-md font-medium transition-colors ${mode === "mensuel" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Saisie mensuelle</button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-12">Poste</th>
                <th className="px-2 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Désignation</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-32">Cumul(M-1)</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-32">Mois(M)</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-blue-500 uppercase tracking-wide w-36">
                  Cumul(M){canEdit ? " ↑ saisie" : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              <PosteLigne code="A" type="plus" label="Travaux exécutés"
                extra={attachementCode ? `Dossier ${attachementCode}` : "Aucun attachement — initier depuis le contrat"}
                cumulM1={cM1("A")} mensuelM={mensuelA} cumulM={cumulA} editable={false} />

              <PosteLigne code="B" type="plus"
                label={`Révisions de prix${tauxRevisionPrix > 0 ? ` (${tauxRevisionPrix}% × A)` : " — taux non configuré"}`}
                extra={tauxRevisionPrix === 0 ? "Configurer le taux dans l'onglet Paramétrage du contrat" : null}
                cumulM1={cM1("B")} mensuelM={mensuelB} cumulM={cumulB} editable={false} />

              <PosteLigne code="B2" type="plus" label="Sommes à faire valoir"
                cumulM1={cM1("B2")} mensuelM={mensuelB2} cumulM={postes.B2}
                editable={canEdit} onChange={v => handleSet("B2", v)} />

              <PosteLigne code="C" type="info"
                label={`Avance démarrage — remb. ${tauxRembAD}% × mensuel A`}
                taux={tauxAD}
                extra={`Montant avance : ${num(montantAvance)} FCFA (${tauxAD}% × marché initial) — seul C4 entre dans le Net HT`}
                cumulM1={prevCumulRembAD} mensuelM={rembMensuelC} cumulM={cumulRembAD} editable={false}>
                <SousLigne label="C1 — Montant avance accordée"  cumulM1={null}           mensuelM={null}         cumulM={montantAvance} highlight />
                <SousLigne label="C2 — Cumul avances M-1"        cumulM1={null}           mensuelM={null}         cumulM={prevCumulAvance} />
                <SousLigne label="C3 — Cumul avances M"          cumulM1={null}           mensuelM={null}         cumulM={cumulAvanceM} />
                <SousLigne label="C4 — Remboursement mensuel"    cumulM1={prevCumulRembAD} mensuelM={rembMensuelC} cumulM={cumulRembAD} highlight />
                <SousLigne label="C5 — Cumul remb. M-1"          cumulM1={null}           mensuelM={null}         cumulM={prevCumulRembAD} />
                <SousLigne label="C6 — Cumul remb. M"            cumulM1={null}           mensuelM={null}         cumulM={cumulRembAD} highlight />
                <SousLigne label="C7 — Restant à rembourser"     cumulM1={null}           mensuelM={null}         cumulM={restantAD} />
              </PosteLigne>

              <PosteLigne code="D" type="minus" label="Retenue de garantie" taux={tauxRG}
                cumulM1={cM1("D")} mensuelM={mensuelD} cumulM={cumulD} editable={false} />

              <PosteLigne code="E" type="plus"
                label={`Restitution RG${postes.tauxE > 0 ? ` (${postes.tauxE}% × reliquat)` : ""}`}
                extra={`Reliquat RG disponible : ${num(reliquatRgM1)} FCFA`}
                cumulM1={prevCumulE} mensuelM={mensuelE} cumulM={cumulE} editable={false}>
                {canEdit && (
                  <tr className="bg-blue-50/60 border-b border-gray-50">
                    <td className="px-4 py-1.5 w-12" />
                    <td className="px-2 py-1.5 pl-8">
                      <span className="text-[11px] text-blue-600">└ Taux restitution (%)</span>
                    </td>
                    <td colSpan={2} />
                    <td className="px-4 py-1.5 text-right">
                      <input type="number" min={0} max={100} step={1}
                        value={postes.tauxE}
                        onChange={e => handleSet("tauxE", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 text-right px-2 py-1 rounded-lg border border-blue-200 bg-white text-blue-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </td>
                  </tr>
                )}
                <SousLigne label="Restitution mensuelle"     cumulM1={null}    mensuelM={mensuelE}  cumulM={null} />
                <SousLigne label="Cumul restitutions M-1"    cumulM1={null}    mensuelM={null}      cumulM={prevCumulE} />
                <SousLigne label="Cumul restitutions M"      cumulM1={null}    mensuelM={null}      cumulM={cumulE} highlight />
                <SousLigne label="Reliquat RG restant"       cumulM1={null}    mensuelM={null}      cumulM={reliquatRgM} />
              </PosteLigne>

              <PosteLigne code="F" type="minus" label="Pénalités"
                cumulM1={cM1("F")} mensuelM={mensuelF} cumulM={postes.F}
                editable={canEdit} onChange={v => handleSet("F", v)} />

              <PosteLigne code="G" type="info" label="Cessions matériaux (MTX)"
                extra={nbCessionsCourants > 0 ? `${nbCessionsCourants} état(s) de cession sur la période` : "Aucune cession sur la période"}
                cumulM1={cumulGM1} mensuelM={mensuelG} cumulM={cumulG} editable={false}>
                <SousLigne label="Cessions mensuel MTX"        cumulM1={null}    mensuelM={mensuelG} cumulM={null} />
                <SousLigne label="Cumul cessions MTX M-1"      cumulM1={null}    mensuelM={null}     cumulM={cumulGM1} />
                <SousLigne label="Cumul cessions MTX M"        cumulM1={null}    mensuelM={null}     cumulM={cumulG} highlight />
              </PosteLigne>

              <PosteLigne code="H" type="minus" label="Remboursement cessions MTX"
                extra={`Taux remb. : ${postes.tauxH}% × cession mensuelle`}
                extra2={`Reliquat MTX : ${num(reliquatG)} FCFA`}
                cumulM1={cumulHM1} mensuelM={rembMensuelH} cumulM={cumulH} editable={false}>
                {canEdit && (
                  <tr className="bg-blue-50/60 border-b border-gray-50">
                    <td className="px-4 py-1.5 w-12" />
                    <td className="px-2 py-1.5 pl-8">
                      <span className="text-[11px] text-blue-600">└ Taux remboursement (%)</span>
                    </td>
                    <td colSpan={2} />
                    <td className="px-4 py-1.5 text-right">
                      <input type="number" min={0} max={100} step={1}
                        value={postes.tauxH}
                        onChange={e => handleSet("tauxH", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 text-right px-2 py-1 rounded-lg border border-blue-200 bg-white text-blue-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </td>
                  </tr>
                )}
                <SousLigne label="Remboursement mensuel MTX"   cumulM1={null}    mensuelM={rembMensuelH} cumulM={null} />
                <SousLigne label="Cumul remb. MTX M-1"         cumulM1={null}    mensuelM={null}         cumulM={cumulHM1} />
                <SousLigne label="Cumul remb. MTX M"           cumulM1={null}    mensuelM={null}         cumulM={cumulH} highlight />
                <SousLigne label="Reliquat MTX"                cumulM1={null}    mensuelM={null}         cumulM={reliquatG} />
              </PosteLigne>

              <PosteLigne code="I" type="info" label="Cessions matériel (MTL)"
                extra="état de cession"
                cumulM1={cumulIM1} mensuelM={mensuelI} cumulM={cumulI} editable={false}>
                <SousLigne label="Cessions mensuel MTL"        cumulM1={null}    mensuelM={mensuelI} cumulM={null} />
                <SousLigne label="Cumul cessions MTL M-1"      cumulM1={null}    mensuelM={null}     cumulM={cumulIM1} />
                <SousLigne label="Cumul cessions MTL M"        cumulM1={null}    mensuelM={null}     cumulM={cumulI} highlight />
              </PosteLigne>

              <PosteLigne code="J" type="minus" label="Remboursement cessions MTL"
                extra={`Taux remb. : ${postes.tauxJ}% × cession mensuelle`}
                extra2={`Reliquat MTL : ${num(reliquatI)} FCFA`}
                cumulM1={cumulJM1} mensuelM={rembMensuelJ} cumulM={cumulJ} editable={false}>
                {canEdit && (
                  <tr className="bg-blue-50/60 border-b border-gray-50">
                    <td className="px-4 py-1.5 w-12" />
                    <td className="px-2 py-1.5 pl-8">
                      <span className="text-[11px] text-blue-600">└ Taux remboursement (%)</span>
                    </td>
                    <td colSpan={2} />
                    <td className="px-4 py-1.5 text-right">
                      <input type="number" min={0} max={100} step={1}
                        value={postes.tauxJ}
                        onChange={e => handleSet("tauxJ", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 text-right px-2 py-1 rounded-lg border border-blue-200 bg-white text-blue-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </td>
                  </tr>
                )}
                <SousLigne label="Remboursement mensuel MTL"   cumulM1={null}    mensuelM={rembMensuelJ} cumulM={null} />
                <SousLigne label="Cumul remb. MTL M-1"         cumulM1={null}    mensuelM={null}         cumulM={cumulJM1} />
                <SousLigne label="Cumul remb. MTL M"           cumulM1={null}    mensuelM={null}         cumulM={cumulJ} highlight />
                <SousLigne label="Reliquat MTL"                cumulM1={null}    mensuelM={null}         cumulM={reliquatI} />
              </PosteLigne>

              <PosteLigne code="K" type="info" label="Cessions ressources humaines (RH)"
                extra="état de cession"
                cumulM1={cumulKM1} mensuelM={mensuelK} cumulM={cumulK} editable={false}>
                <SousLigne label="Cessions mensuel RH"         cumulM1={null}    mensuelM={mensuelK} cumulM={null} />
                <SousLigne label="Cumul cessions RH M-1"       cumulM1={null}    mensuelM={null}     cumulM={cumulKM1} />
                <SousLigne label="Cumul cessions RH M"         cumulM1={null}    mensuelM={null}     cumulM={cumulK} highlight />
              </PosteLigne>

              <PosteLigne code="L" type="minus" label="Remboursement cessions RH"
                extra={`Taux remb. : ${postes.tauxL}% × cession mensuelle`}
                extra2={`Reliquat RH : ${num(reliquatK)} FCFA`}
                cumulM1={cumulLM1} mensuelM={rembMensuelL} cumulM={cumulL} editable={false}>
                {canEdit && (
                  <tr className="bg-blue-50/60 border-b border-gray-50">
                    <td className="px-4 py-1.5 w-12" />
                    <td className="px-2 py-1.5 pl-8">
                      <span className="text-[11px] text-blue-600">└ Taux remboursement (%)</span>
                    </td>
                    <td colSpan={2} />
                    <td className="px-4 py-1.5 text-right">
                      <input type="number" min={0} max={100} step={1}
                        value={postes.tauxL}
                        onChange={e => handleSet("tauxL", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 text-right px-2 py-1 rounded-lg border border-blue-200 bg-white text-blue-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </td>
                  </tr>
                )}
                <SousLigne label="Remboursement mensuel RH"    cumulM1={null}    mensuelM={rembMensuelL} cumulM={null} />
                <SousLigne label="Cumul remb. RH M-1"          cumulM1={null}    mensuelM={null}         cumulM={cumulLM1} />
                <SousLigne label="Cumul remb. RH M"            cumulM1={null}    mensuelM={null}         cumulM={cumulL} highlight />
                <SousLigne label="Reliquat RH"                 cumulM1={null}    mensuelM={null}         cumulM={reliquatK} />
              </PosteLigne>

              <PosteLigne code="M" type="minus"
                label={libelleM ? `Autres retenues — ${libelleM}` : "Autres retenues"}
                extra={canEdit ? null : (libelleM || "Aucun libellé")}
                cumulM1={cM1("M")} mensuelM={mensuelM} cumulM={postes.M}
                editable={canEdit} onChange={v => handleSet("M", v)}>
                {canEdit && (
                  <tr className="bg-gray-50/70 border-b border-gray-50">
                    <td className="px-4 py-1.5 w-12" />
                    <td className="px-2 py-1.5 pl-8" colSpan={4}>
                      <input
                        type="text"
                        placeholder="Libellé obligatoire si montant ≠ 0 …"
                        value={libelleM}
                        onChange={e => setLibelleM(e.target.value)}
                        className={`w-full text-xs px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-300
                          ${postes.M !== 0 && !libelleM.trim()
                            ? "border-red-300 bg-red-50 text-red-700 placeholder-red-300"
                            : "border-gray-200 bg-white text-gray-700"}`}
                      />
                    </td>
                  </tr>
                )}
              </PosteLigne>
            </tbody>
          </table>

          {/* Totaux */}
          <div className="border-t-2 border-gray-200 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-700">NET À RÉGLER (HT)</span>
              <span className={`font-bold tabular-nums ${netHt < 0 ? "text-red-600" : "text-gray-900"}`}>{netHt < 0 ? "−" : ""}{num(netHt)} FCFA</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA ({d.taux_tva ?? 18}%)</span>
              <span className="tabular-nums">{num(tva)} FCFA</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2">
              <span className="text-gray-900">NET TTC À PAYER</span>
              <span className={`tabular-nums ${netHt < 0 ? "text-red-600" : "text-[#087F3E]"}`}>{netHt < 0 ? "−" : ""}{num(netTtc)} FCFA</span>
            </div>
          </div>
        </div>

        {netHt < 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm">
            <AlertTriangle size={14} className="flex-shrink-0" />
            Net HT négatif — les cessions dépassent les travaux certifiés. Une alerte est émise vers le DCG et la DGA.
          </div>
        )}

        {/* Cards résumé */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: "Travaux exécutés",       value: mensuelA,  color: "text-gray-900" },
              { label: "Révisions de prix",       value: mensuelB,  color: "text-green-700" },
              { label: "Sommes à faire valoir",   value: mensuelB2, color: "text-green-700" },
              { label: "Retenue de garantie",     value: -mensuelD, color: "text-red-600" },
              { label: "Remb. avance démarrage",  value: -mensuelC, color: "text-red-600" },
              { label: "Remboursement MTX",       value: -rembMensuelH, color: "text-red-600" },
              { label: "Remboursement MTL",       value: -rembMensuelJ, color: "text-red-600" },
              { label: "Remboursement RH",        value: -rembMensuelL, color: "text-red-600" },
              { label: "Autres retenues",         value: -mensuelM, color: "text-red-600" },
              { label: "Net HT",                  value: netHt,     color: netHt < 0 ? "text-red-600 font-bold" : "text-[#087F3E] font-bold" },
              { label: `TVA ${d.taux_tva ?? 18}%`, value: tva,     color: "text-gray-600" },
            ].filter(item => item.value !== 0).map(item => (
              <div key={item.label} className="text-center">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1 leading-tight">{item.label}</p>
                <p className={`text-sm ${item.color}`}>{item.value < 0 ? "−" : ""}{num(item.value)}<span className="text-[9px] text-gray-400 ml-0.5">FCFA</span></p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Net TTC à régler · TVA {d.taux_tva ?? 18}% incluse</p>
            <p className={`text-2xl font-bold ${netHt < 0 ? "text-red-600" : "text-gray-900"}`}>{netHt < 0 ? "−" : ""}{num(netTtc)} FCFA</p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center justify-between gap-3">
            {/* Réinitialisation par niveau */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Réinitialiser :</span>
              <button
                onClick={() => onSave(buildPayload())}
                disabled={saving}
                title="Re-lit le Poste A depuis l'attachement validé"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50">
                <RefreshCw size={11} /> Attachement
              </button>
              <button
                onClick={() => {
                  setPostes(prev => ({ ...prev, tauxH: 100, tauxJ: 100, tauxL: 100 }));
                  onSave({
                    mode,
                    postes: {
                      B:  { cumulM: postes.B  },
                      B2: { cumulM: postes.B2 },
                      E:  { tauxE: postes.tauxE },
                      H:  { tauxH: 100 },
                      J:  { tauxJ: 100 },
                      L:  { tauxL: 100 },
                      F:  { cumulM: postes.F  },
                      M:  { cumulM: postes.M  },
                    },
                  });
                }}
                disabled={saving}
                title="Taux remboursement → 100% pour MTX, MTL, RH"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50">
                <RefreshCw size={11} /> Cessions 100% (MTX/MTL/RH)
              </button>
            </div>

            <button onClick={handleSaveWithValidation} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#087F3E] text-white rounded-xl text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
              Enregistrer le brouillon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Onglet Cessions ─────────────────────────────────────────────────────────
function CessionsTab({ decompte, canEdit, onSave, saving }) {
  const { data, isLoading, refetch } = useDecompteCessions(decompte?.id);
  const attachees     = data?.attachees     ?? [];
  const disponibles   = data?.disponibles   ?? [];
  const nonEligibles  = data?.non_eligibles ?? [];
  const [showNonElig, setShowNonElig] = useState(false);

  // IDs sélectionnés (attachés à ce décompte)
  const [selected, setSelected] = useState(() => new Set(attachees.map(e => e.id)));

  useEffect(() => {
    setSelected(new Set((data?.attachees ?? []).map(e => e.id)));
  }, [data]);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    const payload = decompte.payload ?? {};
    await onSave({ ...payload, cessions_ids: [...selected] });
    refetch();
  }

  const fmtPeriode = (debut, fin) => {
    const d = debut ? new Date(debut + "T00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "?";
    const f = fin   ? new Date(fin   + "T00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "?";
    return `${d} → ${f}`;
  };

  const totalSelected = [...selected].reduce((sum, id) => {
    const ec = [...attachees, ...disponibles].find(e => e.id === id);
    return sum + (ec?.montant_total ?? 0);
  }, 0);

  if (isLoading) return <div className="py-10 text-center text-sm text-gray-400">Chargement…</div>;

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {selected.size} état(s) sélectionné(s) · Total : <span className="text-[#087F3E]">{num(totalSelected)} FCFA</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {disponibles.length} état(s) disponible(s) non consommé(s)
          </p>
        </div>
        {canEdit && (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#087F3E] text-white rounded-xl text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
            {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
            Enregistrer la sélection
          </button>
        )}
      </div>

      {/* États attachés à ce décompte */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Attachés à ce décompte ({attachees.length})
        </p>
        {attachees.length === 0 ? (
          <p className="text-sm text-gray-400 py-3">Aucun état de cession sélectionné.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {canEdit && <th className="px-3 py-2 w-8" />}
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Période</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody>
                {attachees.map(ec => (
                  <tr key={ec.id} className="border-b border-gray-50 hover:bg-gray-50">
                    {canEdit && (
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(ec.id)} onChange={() => toggle(ec.id)}
                          className="accent-[#087F3E]" />
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{ec.code}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{fmtPeriode(ec.periode_debut, ec.periode_fin)}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-gray-800 tabular-nums">{num(ec.montant_total)} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* États disponibles non consommés */}
      {canEdit && disponibles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Disponibles — non consommés ({disponibles.length})
          </p>
          <div className="border border-blue-100 rounded-xl overflow-hidden bg-blue-50/30">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  <th className="px-3 py-2 w-8" />
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-blue-400 uppercase">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-blue-400 uppercase">Période</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-blue-400 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody>
                {disponibles.map(ec => (
                  <tr key={ec.id} className="border-b border-blue-50 hover:bg-blue-50">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(ec.id)} onChange={() => toggle(ec.id)}
                        className="accent-[#087F3E]" />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{ec.code}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{fmtPeriode(ec.periode_debut, ec.periode_fin)}</td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-gray-800 tabular-nums">{num(ec.montant_total)} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Cochez les états à inclure dans ce décompte puis enregistrez.</p>
        </div>
      )}

      {!canEdit && disponibles.length > 0 && (
        <p className="text-xs text-gray-400">
          {disponibles.length} état(s) de cession disponible(s) non inclus dans ce décompte.
        </p>
      )}

      {/* États non éligibles */}
      {nonEligibles.length > 0 && (
        <div>
          <button onClick={() => setShowNonElig(v => !v)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronRight size={13} className={`transition-transform ${showNonElig ? "rotate-90" : ""}`} />
            {nonEligibles.length} état(s) non éligible(s)
          </button>
          {showNonElig && (
            <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Code</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Période</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase">Montant</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {nonEligibles.map(ec => (
                    <tr key={ec.id} className="border-b border-gray-50 bg-gray-50/50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{ec.code}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{fmtPeriode(ec.periode_debut, ec.periode_fin)}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-400 tabular-nums">{num(ec.montant_total)} FCFA</td>
                      <td className="px-3 py-2 text-xs text-amber-600">{ec.motif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire nouveau décompte ─────────────────────────────────────────────
function NouveauForm({ onSave, saving }) {
  const { data: contratsData } = useContratsPaginated({ count: 100 });
  const contrats = contratsData?.data ?? [];

  const [form, setForm] = useState({
    contrat_id: "",
    type:       "provisoire",
    date_debut: "",
    date_fin:   "",
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="max-w-xl space-y-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informations générales</h3>

      <div className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block mb-1.5">Contrat *</label>
          <SearchSelect value={form.contrat_id} onChange={e => set("contrat_id", e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none bg-white">
            <option value="">— Sélectionner un contrat —</option>
            {contrats.map(c => (
              <option key={c.id} value={c.id}>{c.code} — {c.objet ?? c.soustraitant?.raison_sociale ?? ""}</option>
            ))}
          </SearchSelect>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block mb-1.5">Type de décompte *</label>
          <SearchSelect value={form.type} onChange={e => set("type", e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none bg-white">
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </SearchSelect>
        </div>

        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 mb-0.5">Mode de renseignement</p>
          <p className="text-sm font-medium text-gray-700">Saisie manuelle</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block mb-1.5">Date de début *</label>
            <input type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block mb-1.5">Date de fin *</label>
            <input type="date" value={form.date_fin} onChange={e => set("date_fin", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
          </div>
        </div>
      </div>

      <button onClick={() => onSave(form)} disabled={!form.contrat_id || !form.date_debut || !form.date_fin || saving}
        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#087F3E] text-white rounded-xl text-sm font-medium hover:bg-[#065A2C] disabled:opacity-50">
        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
        Enregistrer le brouillon
      </button>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function DecompteFormPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addToast } = useToast();
  const isNew        = !id || id === "nouveau";

  const [activeTab, setActiveTab] = useState("structure");

  const { data: decompte, isLoading, isError } = useDecompte(!isNew ? id : null);
  const { data: circuit = [] } = useDecompteCircuit();

  const saveMut    = useSaveDecompte();
  const validerMut = useValiderDecompte();
  const rejeterMut = useRejeterDecompte();
  const payerMut   = usePayerDecompte();

  // Décompte verrouillé si le DG a déjà validé (même si rejeté ensuite)
  const lockedByDg = !isNew && (decompte?.validations ?? []).some(
    v => v.profil_code?.toLowerCase() === "dg" && v.action === "valide"
  );
  const canEdit = !lockedByDg && (isNew || decompte?.statut === "brouillon");
  const d       = decompte;

  async function handleCreate(form) {
    try {
      const res = await saveMut.mutateAsync({
        contrat_id: parseInt(form.contrat_id, 10),
        type:       form.type,
        date_debut: form.date_debut,
        date_fin:   form.date_fin,
      });
      addToast("Décompte créé.", "success");
      if (res?.data?.id) navigate(`/decomptes/${res.data.id}`, { replace: true });
    } catch (err) {
      addToast(err.response?.data?.error ?? err.response?.data?.message ?? "Erreur lors de la création.", "error");
    }
  }

  async function handleSavePayload(payload) {
    try {
      await saveMut.mutateAsync({ id: parseInt(id, 10), payload });
      addToast("Brouillon enregistré.", "success");
    } catch (err) {
      addToast(err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleValider() {
    try {
      await validerMut.mutateAsync(parseInt(id, 10));
      addToast("Décompte avancé dans le circuit.", "success");
    } catch (err) {
      addToast(err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleRejeter(motif) {
    try {
      await rejeterMut.mutateAsync({ id: parseInt(id, 10), motif });
      addToast("Décompte rejeté.", "info");
    } catch (err) {
      addToast(err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handlePayer() {
    try {
      await payerMut.mutateAsync(parseInt(id, 10));
      addToast("Décompte marqué payé.", "success");
    } catch (err) {
      addToast(err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handlePdf() {
    const token = localStorage.getItem("stt_token");
    const resp  = await fetch(`${import.meta.env.VITE_API_BASE}/api/pdf/decompte/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob  = await resp.blob();
    const url   = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  if (!isNew && isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }
  if (!isNew && (isError || !d)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="font-medium">Décompte introuvable</p>
        <button onClick={() => navigate("/decomptes")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour</button>
      </div>
    );
  }

  const nbCessionsAttachees = (d?.payload?.postes?.G?.cessionsIds ?? []).length
    + (d?.payload?.postes?.I?.cessionsIds ?? []).length
    + (d?.payload?.postes?.K?.cessionsIds ?? []).length;

  const tabs = [
    { id: "structure", label: "Structure" },
    { id: "cessions",  label: `Cessions (${nbCessionsAttachees})` },
    { id: "workflow",  label: `Workflow & Discussion (${(d?.validations ?? []).length})` },
    { id: "pieces",    label: "Pièces jointes" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/decomptes")} className="hover:text-[#087F3E] flex items-center gap-1">
          <ArrowLeft size={14} /> Décomptes
        </button>
        <ChevronRight size={14} />
        {!isNew && d && (
          <>
            <button className="hover:text-[#087F3E] truncate max-w-[160px]">{d.code}</button>
          </>
        )}
        {isNew && <span className="text-gray-900 font-medium">Nouveau décompte</span>}
      </div>

      {/* Header */}
      {isNew ? (
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nouveau décompte</h1>
        </div>
      ) : d && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{d.code}</h1>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statutColor(d.statut)}`}>
                {d.statut === "paye" ? "Payé" : d.statut === "brouillon" ? "Brouillon" : d.statut === "rejete" ? "Rejeté" : "En validation"}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Contrat {d.contrat?.code} — {d.contrat?.objet ?? ""} · {fmtD(d.date_debut)} → {fmtD(d.date_fin)}
              {d.contrat?.soustraitant?.raison_sociale && <span className="ml-2">{d.contrat.soustraitant.raison_sociale}</span>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Mode : Saisie manuelle</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Bandeau verrouillage DG */}
            {lockedByDg && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                <XCircle size={12} /> Verrouillé — validé par le DG, aucune modification possible
              </div>
            )}
            {/* Bandeau statut en validation */}
            {!lockedByDg && d.statut !== "brouillon" && d.statut !== "paye" && d.statut !== "rejete" && (() => {
              const etapes = [...circuit].sort((a, b) => a.ordre - b.ordre);
              const cur = etapes.find(e => e.statut_avant === d.statut);
              return cur ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  <Clock size={12} /> En attente de validation par <strong>{cur.profil_code.toUpperCase()}</strong>
                </div>
              ) : null;
            })()}
            <button onClick={handlePdf}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              <FileDown size={14} /> PDF
            </button>
          </div>
        </div>
      )}

      {/* Nouveau décompte — form simple */}
      {isNew ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="grid grid-cols-[1fr_auto] gap-6">
            <NouveauForm onSave={handleCreate} saving={saveMut.isPending} />
            {/* Tabs vides pour respecter la maquette */}
            <div className="w-56" />
          </div>
          {/* Tabs factices */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex gap-1 border-b border-gray-100">
              {["Structure", "Cessions 0", "Workflow & Discussion 0", "Pièces jointes 0"].map(t => (
                <span key={t} className="px-3 py-2 text-xs text-gray-400 border-b-2 border-transparent">{t}</span>
              ))}
            </div>
            <div className="py-8 text-center text-sm text-gray-400">
              Enregistrer d'abord le brouillon pour accéder aux onglets.
            </div>
          </div>
        </div>
      ) : d && (
        <div className="flex gap-5 items-start">
          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 px-2 pt-1">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === t.id ? "border-[#087F3E] text-[#087F3E]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === "structure" && (
                  <StructureTab decompte={d} canEdit={canEdit} onSave={handleSavePayload} saving={saveMut.isPending} />
                )}

                {activeTab === "cessions" && (
                  <CessionsTab decompte={d} canEdit={canEdit} onSave={handleSavePayload} saving={saveMut.isPending} />
                )}

                {activeTab === "workflow" && (
                  <div className="max-w-xl">
                    {(() => {
                      const etapes = [...circuit].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
                      const currentEtape = etapes.find(e => e.statut_avant === d.statut);
                      const userRole = currentUser?.role?.designation?.toLowerCase() ?? "";
                      const isAdmin  = userRole === "admin";
                      const canVal   = currentEtape && (isAdmin || userRole === currentEtape.profil_code?.toLowerCase());
                      return canVal ? <ChecklistEtape profil={currentEtape.profil_code} /> : null;
                    })()}
                    <CircuitStepper
                      decompte={d}
                      circuit={circuit}
                      onValider={handleValider}
                      onRejeter={handleRejeter}
                      onPayer={handlePayer}
                      onSoumettre={handleValider}
                    />
                  </div>
                )}

                {activeTab === "pieces" && (
                  <div className="text-sm text-gray-400 text-center py-8">Pièces jointes — à venir.</div>
                )}
              </div>
            </div>
          </div>

          {/* Panneau droite */}
          <div className="w-72 flex-shrink-0">
            <InfoPanel decompte={d} circuit={circuit} />
          </div>
        </div>
      )}
    </div>
  );
}
