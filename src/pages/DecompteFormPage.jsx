import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Save, Loader2, CheckCircle2, XCircle,
  FileDown, Circle, Clock, Upload, Download, File, Trash2, Plus, X,
} from "lucide-react";

import { useDecompte, useSaveDecompte, useValiderDecompte, useRejeterDecompte, usePayerDecompte, useDecompteCircuit, useDecomptesPaginated } from "../hooks/useDecomptes";
import { useSaveReleve } from "../hooks/useReleves";
import { useParametresPaginated } from "../hooks/useParametres";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { usePiecesJointes, useUploadPieceJointe, useDeletePieceJointe } from "../hooks/usePiecesJointes";
import { pieceJointeService } from "../services/pieceJointeService";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import Tabs from "../components/Tabs";
import { SkeletonCard } from "../components/Skeleton";

const fmtDate  = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtMois  = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtNum   = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));

// ─── Circuit stepper ─────────────────────────────────────────────
function CircuitStepper({ decompte, circuit, onValider, onRejeter, onPayer, onSoumettre }) {
  const [showRejet, setShowRejet] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");
  const { currentUser } = useUser();

  const statut      = decompte?.statut ?? "brouillon";
  const validations = decompte?.validations ?? [];
  const etapesSorted = [...circuit].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const lastStep     = etapesSorted[etapesSorted.length - 1];

  const steps = [
    { statut: "brouillon", label: "Création", profil: null },
    ...(etapesSorted.length > 0
      ? [{ statut: etapesSorted[0].statut_avant, label: "Soumis", profil: null }]
      : [{ statut: "soumis", label: "Soumis", profil: null }]),
    ...etapesSorted.map(e => ({ statut: e.statut_apres, label: e.profil_code.toUpperCase(), profil: e.profil_code, etape: e })),
    { statut: "paye", label: "Payé", profil: null },
  ];

  const currentIdx   = steps.findIndex(s => s.statut === statut);
  const isAfterLast  = !!(lastStep && statut === lastStep.statut_apres);
  const currentEtape = etapesSorted.find(e => e.statut_avant === statut);
  const isTerminal   = statut === "paye" || statut === "rejete";

  const userRole    = currentUser?.role?.designation?.toLowerCase() ?? "";
  const isAdmin     = userRole === "admin";
  const canValidate = isAdmin || !currentEtape || userRole === currentEtape.profil_code?.toLowerCase();

  const findVal  = (profil) => validations.find(v => v.profil_code === profil && v.action === "valide");
  const soumisVal = validations.find(v => v.action === "soumis");

  return (
    <div className="space-y-5">
      {statut === "rejete" ? (
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
          <XCircle size={16} /> Rejeté
          {decompte?.motif_rejet && (
            <span className="ml-2 text-xs font-normal text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
              {decompte.motif_rejet}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-0">
          {steps.map((step, idx) => {
            const done    = idx < currentIdx;
            const current = idx === currentIdx;
            const val     = step.profil ? findVal(step.profil)
                          : step.statut === "soumis" ? soumisVal : null;
            return (
              <div key={step.statut} className="flex-1 flex flex-col items-center">
                <div className="flex items-center w-full">
                  <div className={`flex-1 h-0.5 ${idx === 0 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors
                    ${done ? "bg-[#087F3E] border-[#087F3E] text-white" : current ? "bg-white border-[#087F3E] text-[#087F3E]" : "bg-white border-gray-200 text-gray-300"}`}>
                    {done ? <CheckCircle2 size={16} /> : current ? <Clock size={14} /> : <Circle size={14} />}
                  </div>
                  <div className={`flex-1 h-0.5 ${idx === steps.length - 1 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                </div>
                <div className="mt-2 text-center px-1 w-full">
                  <p className={`text-xs font-semibold ${done ? "text-[#087F3E]" : current ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
                  {val ? (
                    <>
                      <p className="text-[10px] text-[#087F3E] mt-0.5">{fmtDate(val.validated_at)}</p>
                      {val.user && <p className="text-[10px] text-gray-500 truncate">{val.user.prenom} {val.user.nom}</p>}
                    </>
                  ) : current && step.profil ? (
                    <p className="text-[10px] text-amber-500 mt-0.5">En attente</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isTerminal && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {statut === "brouillon" && (
            <button onClick={onSoumettre} className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors">
              Soumettre au circuit
            </button>
          )}
          {statut !== "brouillon" && !isAfterLast && (
            <>
              <p className="text-xs text-gray-500">
                En attente de validation par <strong className="text-gray-700">{currentEtape?.profil_code?.toUpperCase() ?? "un validateur"}</strong>
              </p>
              {!canValidate && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Vous n'avez pas le profil requis pour valider cette étape.
                </p>
              )}
              {canValidate && !showRejet && (
                <div className="flex gap-3">
                  <button onClick={onValider} className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors">
                    Valider — {currentEtape?.profil_code?.toUpperCase() ?? ""}
                  </button>
                  <button onClick={() => setShowRejet(true)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Rejeter
                  </button>
                </div>
              )}
              {canValidate && showRejet && (
                <div className="flex gap-2 flex-wrap">
                  <input autoFocus placeholder="Motif du rejet (obligatoire)…" value={motifRejet}
                    onChange={e => setMotifRejet(e.target.value)}
                    className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none" />
                  <button onClick={() => { onRejeter(motifRejet); setShowRejet(false); setMotifRejet(""); }}
                    disabled={!motifRejet.trim()}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    Confirmer
                  </button>
                  <button onClick={() => { setShowRejet(false); setMotifRejet(""); }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 rounded-lg">
                    Annuler
                  </button>
                </div>
              )}
            </>
          )}
          {isAfterLast && (
            <button onClick={onPayer} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
              Marquer comme payé
            </button>
          )}
        </div>
      )}
      {statut === "paye" && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-[#087F3E] font-medium">✓ Décompte payé</p>
        </div>
      )}
    </div>
  );
}

// ─── Poste row dans le tableau Structure ─────────────────────────
function PosteRow({ code, label, type, moisM, extra }) {
  const isInfo   = type === "info";
  const isMinus  = type === "minus";
  const isTotal  = type === "total";

  const valColor = isInfo ? "text-gray-500" : isMinus && moisM < 0 ? "text-red-600" : isMinus ? "text-red-600" : isTotal ? "text-[#087F3E] font-bold" : "text-gray-800 font-semibold";

  return (
    <tr className={`border-b border-gray-50 ${isTotal ? "bg-[#E8F5EE]/40 border-[#087F3E]/20" : "hover:bg-gray-50/60"}`}>
      <td className={`px-4 py-2.5 text-xs font-bold w-10 ${isTotal ? "text-[#087F3E]" : "text-gray-400"}`}>{code}</td>
      <td className="px-3 py-2.5 text-sm text-gray-700 flex-1">
        <div className="flex items-center gap-2">
          {isMinus && <span className="w-4 h-4 rounded bg-red-100 text-red-500 text-[10px] flex items-center justify-center font-bold flex-shrink-0">−</span>}
          {isInfo  && <span className="w-4 h-4 rounded bg-blue-100 text-blue-500 text-[10px] flex items-center justify-center font-bold flex-shrink-0">i</span>}
          {type === "plus" && <span className="w-4 h-4 rounded bg-green-100 text-green-600 text-[10px] flex items-center justify-center font-bold flex-shrink-0">+</span>}
          <span className={isTotal ? "font-semibold text-gray-900" : ""}>{label}</span>
        </div>
        {extra && <p className="text-[10px] text-gray-400 mt-0.5 ml-6">{extra}</p>}
      </td>
      <td className="px-4 py-2.5 text-right text-xs text-gray-300 w-28">—</td>
      <td className={`px-4 py-2.5 text-right text-sm w-36 ${valColor}`}>
        {moisM === 0 ? "0" : moisM ? fmtNum(Math.abs(moisM)) : "—"}
      </td>
      <td className={`px-4 py-2.5 text-right text-sm w-36 ${valColor}`}>
        {moisM === 0 ? "0" : moisM ? fmtNum(Math.abs(moisM)) : "—"}
      </td>
    </tr>
  );
}

// ─── Onglet Structure ─────────────────────────────────────────────
function StructureTab({ decompte, canEdit, form, setForm, onSave, savePending, parametresData, eCessionsData }) {
  const d = decompte;
  const isNew = !d;

  // Computed (live in edit mode, from model in view mode)
  const brut      = isNew ? 0 : parseFloat(d.montant_brut ?? 0);
  const rg        = isNew ? 0 : parseFloat(d.montant_retenue_garantie ?? 0);
  const avances   = isNew ? 0 : parseFloat(d.montant_avances_deduites ?? 0);
  const penalites = isNew ? 0 : parseFloat(d.montant_penalites ?? 0);
  const ht        = isNew ? 0 : parseFloat(d.montant_ht ?? 0);
  const tva       = isNew ? 0 : parseFloat(d.montant_tva ?? 0);
  const ttc       = isNew ? 0 : parseFloat(d.montant_ttc ?? 0);

  // Période from état de cession
  const ec = d?.etat_cession;
  const periode = ec?.periode_debut && ec?.periode_fin
    ? `${fmtMois(ec.periode_debut)} → ${fmtMois(ec.periode_fin)}`
    : "—";

  // Contrat financier data
  const contrat        = d?.contrat;
  const montantInitial = parseFloat(contrat?.montant_initial ?? 0);
  const montantActuel  = parseFloat(contrat?.montant_actuel ?? montantInitial);
  const avenants       = contrat?.avenants ?? [];
  const avenValides    = avenants.filter(a => a.statut === "valide");
  const totalAvenants  = avenValides.reduce((s, a) => s + parseFloat(a.montant ?? 0), 0);

  if (canEdit) {
    // Edit form (brouillon)
    const ecList = eCessionsData?.data ?? [];
    const selEC  = ecList.find(e => String(e.id) === String(form.etat_cession_id));
    const echeancePast = form.date_echeance && form.date_echeance < new Date().toISOString().slice(0, 10);

    return (
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paramètres du décompte</h3>

          {!d && (
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">État de cession *</label>
              <select value={form.etat_cession_id} onChange={e => setForm(f => ({ ...f, etat_cession_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none bg-white">
                <option value="">— Sélectionner un état de cession validé —</option>
                {ecList.map(ec => (
                  <option key={ec.id} value={ec.id}>{ec.code} · {fmtNum(ec.montant_total)} FCFA</option>
                ))}
              </select>
              {selEC && (
                <div className="mt-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-xs text-gray-600">
                  Montant brut : <span className="font-semibold">{fmtNum(selEC.montant_total)} FCFA</span>
                </div>
              )}
            </div>
          )}

          {d?.etat_cession && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400">État de cession</p>
              <p className="text-sm font-semibold text-gray-800">{d.etat_cession.code}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Taux RG (%)</label>
              <input type="number" value={form.taux_retenue_garantie} onChange={e => setForm(f => ({ ...f, taux_retenue_garantie: e.target.value }))}
                min={0} step={0.5} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Taux TVA (%)</label>
              <input type="number" value={form.taux_tva} onChange={e => setForm(f => ({ ...f, taux_tva: e.target.value }))}
                min={0} step={0.5} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Avances déduites (FCFA)</label>
              <input type="number" value={form.montant_avances_deduites} onChange={e => setForm(f => ({ ...f, montant_avances_deduites: e.target.value }))}
                min={0} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Pénalités (FCFA)</label>
              <input type="number" value={form.montant_penalites} onChange={e => setForm(f => ({ ...f, montant_penalites: e.target.value }))}
                min={0} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Date d'échéance</label>
              <input type="date" value={form.date_echeance} onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
              {echeancePast && <p className="text-xs text-amber-600 mt-1">⚠ Date dans le passé.</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Observations</label>
            <textarea rows={3} value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
              placeholder="Notes ou observations…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none resize-none" />
          </div>

          <div className="flex justify-end">
            <button onClick={onSave} disabled={savePending}
              className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60 transition-colors">
              {savePending ? <><Loader2 size={15} className="animate-spin" /> Enregistrement…</> : <><Save size={15} /> Enregistrer</>}
            </button>
          </div>
        </div>

        {/* Récap rapide */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 h-fit">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Récapitulatif financier</h3>
          {d ? (
            <>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Montant brut</span><span className="font-medium">{fmtNum(brut)} FCFA</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Retenue garantie ({d.taux_retenue_garantie}%)</span><span className="text-red-600">−{fmtNum(rg)} FCFA</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Avances déduites</span><span className="text-red-600">−{fmtNum(avances)} FCFA</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Pénalités</span><span className="text-red-600">−{fmtNum(penalites)} FCFA</span></div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2 font-semibold"><span className="text-[#087F3E]">Net HT</span><span className="text-[#087F3E]">{fmtNum(ht)} FCFA</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">TVA ({d.taux_tva}%)</span><span>{fmtNum(tva)} FCFA</span></div>
              <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2"><span>Net TTC</span><span>{fmtNum(ttc)} FCFA</span></div>
            </>
          ) : (
            <p className="text-xs text-gray-400">Sélectionnez un état de cession.</p>
          )}
        </div>
      </div>
    );
  }

  // View mode — tableau postes
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: tableau postes */}
      <div className="col-span-2 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-10">Poste</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Désignation</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Cumul M-1</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-36">Mois M</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-36">Cumul M</th>
              </tr>
            </thead>
            <tbody>
              <PosteRow code="A" type="plus"  label="Travaux exécutés"               moisM={brut} />
              <PosteRow code="C" type="info"  label={`Avance démarrage (${d.taux_retenue_garantie ?? 15}%)`} moisM={avances} extra="Remboursement sur avance de démarrage" />
              <PosteRow code="D" type="minus" label={`Retenue de garantie (${d.taux_retenue_garantie}%)`} moisM={-rg} />
              <PosteRow code="E" type="plus"  label="Restitution RG"                 moisM={0} />
              <PosteRow code="G" type="info"  label="Cessions matériaux (info)"      moisM={0} extra="État de cession" />
              <PosteRow code="H" type="minus" label="Remboursement cessions matériaux" moisM={0} extra={`Montant cédé sur la période : 0 FCFA · Déjà remboursé : 0 FCFA`} />
              <PosteRow code="I" type="info"  label="Cessions matériel (info)"       moisM={0} extra="État de cession" />
              <PosteRow code="J" type="minus" label="Remboursement cessions matériel" moisM={0} extra={`Montant cédé sur la période : 0 FCFA · Déjà remboursé : 0 FCFA`} />
              <PosteRow code="K" type="info"  label="Cessions ressources humaines (info)" moisM={0} extra="État de cession" />
              <PosteRow code="L" type="minus" label="Remboursement RH"               moisM={0} extra={`Montant cédé sur la période : 0 FCFA · Déjà remboursé : 0 FCFA`} />
            </tbody>
          </table>
        </div>

        {/* Barre totaux */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: "Travaux exécutés", value: brut, color: "text-gray-900" },
              { label: "Retenue de garantie", value: -rg, color: "text-red-600" },
              { label: "Remb. avance démarrage", value: -avances, color: "text-red-600" },
              { label: "Remboursement MTX", value: 0, color: "text-gray-500" },
              { label: "Net HT", value: ht, color: "text-[#087F3E] font-bold" },
              { label: `TVA ${d.taux_tva}%`, value: tva, color: "text-gray-600" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                <p className={`text-sm ${item.color}`}>{fmtNum(Math.abs(item.value))} FCFA</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Net TTC à payer · TVA {d.taux_tva}% incluse</p>
            <p className="text-2xl font-bold text-gray-900">{fmtNum(ttc)} FCFA</p>
          </div>
        </div>
      </div>

      {/* Right: Informations */}
      <div className="space-y-4">
        {/* Infos clés */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Informations</h3>
          <div className="space-y-2 text-sm">
            <div><p className="text-xs text-gray-400">Code</p><p className="font-mono font-semibold text-gray-900">{d.code}</p></div>
            <div><p className="text-xs text-gray-400">Période</p><p className="text-gray-700">{periode}</p></div>
            {d.date_echeance && <div><p className="text-xs text-gray-400">Échéance</p><p className="text-gray-700">{fmtDate(d.date_echeance)}</p></div>}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Montants clés</p>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Travaux exécutés</span><span className="font-semibold">{fmtNum(brut)} FCFA</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">RG + Avance</span><span className="text-red-600">−{fmtNum(rg + avances)} FCFA</span></div>
            <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1"><span>Net TTC</span><span className="text-[#087F3E]">{fmtNum(ttc)} FCFA</span></div>
          </div>
        </div>

        {/* Marché */}
        {contrat && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marché</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Montant initial</span><span>{fmtNum(montantInitial)} FCFA</span></div>
              {avenValides.map((a, i) => (
                <div key={a.id} className="flex justify-between text-violet-700">
                  <span>AVN-{String(i + 1).padStart(2, "0")}</span>
                  <span>{parseFloat(a.montant) >= 0 ? "+" : ""}{fmtNum(parseFloat(a.montant))} FCFA</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-2"><span className="text-[#087F3E]">Montant actualisé</span><span className="text-[#087F3E]">{fmtNum(montantActuel)} FCFA</span></div>
            </div>
            <Link to={`/contrats/${d.contrat_id}`} className="text-xs text-[#087F3E] hover:underline">
              Voir le contrat {contrat.code} →
            </Link>
          </div>
        )}

        {/* Retenues cumulées */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Retenues cumulées</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Retenue de garantie ({d.taux_retenue_garantie}%)</span>
                <span className="font-semibold">{fmtNum(rg)} FCFA</span>
              </div>
              <p className="text-[10px] text-gray-400">{montantActuel > 0 ? ((rg / montantActuel) * 100).toFixed(1) : 0}% du marché actualisé</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Avance démarrage</span>
                <span className="font-semibold">{fmtNum(avances)} FCFA</span>
              </div>
              <p className="text-[10px] text-gray-400">{montantActuel > 0 ? ((avances / montantActuel) * 100).toFixed(1) : 0}% du marché actualisé</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Onglet Cessions ─────────────────────────────────────────────
function CessionsDecTab({ contratId }) {
  const { data, isLoading } = useEtatsCessionPaginated({ contrat_id: contratId ? parseInt(contratId) : null, count: 50 });
  const cessions = data?.data ?? [];

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;
  if (cessions.length === 0) return (
    <div className="text-center py-12 text-gray-400 text-sm">
      <p>Aucun état de cession pour ce contrat.</p>
      <Link to={`/etats-cession/nouveau?contrat_id=${contratId}`} className="mt-2 inline-block text-xs text-[#087F3E] hover:underline">
        Créer un état de cession →
      </Link>
    </div>
  );

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {["Code", "Période", "Montant total", "Statut", ""].map(h => (
              <th key={h} className="text-left text-xs uppercase tracking-wide font-medium text-gray-400 pb-2 pr-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {cessions.map(ec => (
            <tr key={ec.id} className="hover:bg-gray-50">
              <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-gray-900">{ec.code}</td>
              <td className="py-2.5 pr-3 text-gray-500 text-xs">
                {ec.periode_debut && ec.periode_fin ? `${fmtMois(ec.periode_debut)} → ${fmtMois(ec.periode_fin)}` : "—"}
              </td>
              <td className="py-2.5 pr-3 font-semibold text-gray-800">{fmtNum(ec.montant_total)} FCFA</td>
              <td className="py-2.5 pr-3"><StatusBadge statut={ec.statut} /></td>
              <td className="py-2.5 text-right">
                <Link to={`/etats-cession/${ec.id}`} className="text-xs text-[#087F3E] hover:underline">Voir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Onglet Pièces jointes ───────────────────────────────────────
const CATEGORIES_PJ = [
  { value: "contrat",    label: "Contrat" },
  { value: "avenant",   label: "Avenant" },
  { value: "decompte",  label: "Décompte" },
  { value: "facture",   label: "Facture" },
  { value: "autre",     label: "Autre" },
];

function PiecesDecTab({ contratId }) {
  const { addToast }  = useToast();
  const [categorie, setCategorie]   = useState("decompte");
  const [filterCat, setFilterCat]   = useState("all");
  const [dragging, setDragging]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const { data: pieces = [], isLoading } = usePiecesJointes(contratId);
  const uploadMut = useUploadPieceJointe();
  const deleteMut = useDeletePieceJointe();

  const filtered = filterCat === "all" ? pieces : pieces.filter(p => p.categorie === filterCat);
  const counts   = CATEGORIES_PJ.reduce((acc, c) => { acc[c.value] = pieces.filter(p => p.categorie === c.value).length; return acc; }, {});

  async function handleFiles(files) {
    for (const f of Array.from(files)) {
      try {
        await uploadMut.mutateAsync({ contrat_id: contratId, categorie, fichier: f });
      } catch (err) {
        addToast(err.response?.data?.message ?? `Erreur upload ${f.name}`, "error");
      }
    }
    addToast("Fichier(s) ajouté(s).", "success");
  }

  async function handleDelete(pj) {
    try {
      await deleteMut.mutateAsync(pj.id);
      setConfirmDel(null);
    } catch (err) {
      addToast("Erreur suppression.", "error");
    }
  }

  async function handleDownload(pj) {
    const token = localStorage.getItem("stt_token");
    const resp  = await fetch(pieceJointeService.downloadUrl(pj.id), { headers: { Authorization: `Bearer ${token}` } });
    const blob  = await resp.blob();
    const a     = document.createElement("a");
    a.href      = URL.createObjectURL(blob);
    a.download  = pj.nom_original;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[200px_1fr] gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Catégorie</label>
          <select value={categorie} onChange={e => setCategorie(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none">
            {CATEGORIES_PJ.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors
            ${dragging ? "border-[#087F3E] bg-[#E8F5EE]/60" : "border-gray-200 hover:border-[#087F3E]/50 hover:bg-gray-50"}`}
          onClick={() => document.getElementById("pj-dec-input").click()}>
          <Upload size={20} className="text-gray-400" />
          <p className="text-sm text-gray-500">Glissez-déposez ou <span className="text-[#087F3E] font-medium">cliquez</span></p>
          <p className="text-xs text-gray-400">PDF, DOCX, XLSX, JPG, PNG — max 10 MB</p>
          <input id="pj-dec-input" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100">
        {[{ value: "all", label: "Toutes", count: pieces.length }, ...CATEGORIES_PJ.map(c => ({ ...c, count: counts[c.value] }))].map(t => (
          <button key={t.value} onClick={() => setFilterCat(t.value)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px
              ${filterCat === t.value ? "border-[#087F3E] text-[#087F3E]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.count > 0 && <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucun fichier dans cette catégorie.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(pj => (
            <div key={pj.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
              <File size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{pj.nom_original}</p>
                <p className="text-xs text-gray-400">{pj.taille_fmt} · {pj.created_at}</p>
              </div>
              <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                {CATEGORIES_PJ.find(c => c.value === pj.categorie)?.label ?? pj.categorie}
              </span>
              <button onClick={() => handleDownload(pj)} className="p-1.5 text-gray-400 hover:text-[#087F3E]"><Download size={15} /></button>
              {confirmDel === pj.id ? (
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="text-red-600">Supprimer ?</span>
                  <button onClick={() => handleDelete(pj)} className="text-red-600 font-medium">Oui</button>
                  <button onClick={() => setConfirmDel(null)} className="text-gray-400">Non</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDel(pj.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────
export default function DecompteFormPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const isNew      = !id || id === "nouveau";
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("structure");
  const [form, setForm] = useState({
    etat_cession_id:          params.get("etat_cession_id") ?? "",
    taux_retenue_garantie:    5,
    montant_avances_deduites: 0,
    montant_penalites:        0,
    taux_tva:                 18,
    date_echeance:            "",
    observations:             "",
  });

  const { data: decompte, isLoading, isError } = useDecompte(!isNew ? id : null);
  const { data: circuit = [] }   = useDecompteCircuit();
  const { data: parametresData } = useParametresPaginated({ count: 100 });
  const { data: eCessionsData }  = useEtatsCessionPaginated({ statut: "valide", count: 200 });
  const saveMut    = useSaveDecompte();
  const validerMut = useValiderDecompte();
  const rejeterMut = useRejeterDecompte();
  const payerMut   = usePayerDecompte();
  const releveMut  = useSaveReleve();

  useEffect(() => {
    if (decompte) {
      const findParam = (cle, fallback) => {
        const p = parametresData?.data?.find(p => p.cle === cle);
        return p ? parseFloat(p.valeur) : fallback;
      };
      setForm({
        etat_cession_id:          decompte.etat_cession_id ?? "",
        taux_retenue_garantie:    decompte.taux_retenue_garantie ?? findParam("taux_retenue_garantie", 5),
        montant_avances_deduites: decompte.montant_avances_deduites ?? 0,
        montant_penalites:        decompte.montant_penalites ?? 0,
        taux_tva:                 decompte.taux_tva ?? findParam("taux_tva", 18),
        date_echeance:            decompte.date_echeance?.slice(0, 10) ?? "",
        observations:             decompte.observations ?? "",
      });
    }
  }, [decompte, parametresData]);

  useEffect(() => {
    if (!isNew || !parametresData?.data) return;
    const findParam = (cle, fallback) => {
      const p = parametresData.data.find(p => p.cle === cle);
      return p ? parseFloat(p.valeur) : fallback;
    };
    setForm(f => ({
      ...f,
      taux_retenue_garantie: findParam("taux_retenue_garantie", f.taux_retenue_garantie),
      taux_tva:              findParam("taux_tva", f.taux_tva),
    }));
  }, [parametresData]); // eslint-disable-line

  async function handleSave() {
    if (!form.etat_cession_id) { addToast("L'état de cession est requis.", "error"); return; }
    const payload = {
      etat_cession_id:          parseInt(form.etat_cession_id, 10),
      taux_retenue_garantie:    parseFloat(form.taux_retenue_garantie),
      montant_avances_deduites: parseFloat(form.montant_avances_deduites) || 0,
      montant_penalites:        parseFloat(form.montant_penalites) || 0,
      taux_tva:                 parseFloat(form.taux_tva),
      date_echeance:            form.date_echeance || null,
      observations:             form.observations  || null,
    };
    if (!isNew) payload.id = parseInt(id, 10);
    try {
      const res = await saveMut.mutateAsync(payload);
      addToast(isNew ? "Décompte créé." : "Décompte mis à jour.", "success");
      if (isNew && res?.data?.id) navigate(`/decomptes/${res.data.id}`, { replace: true });
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleValider() {
    try { await validerMut.mutateAsync(parseInt(id, 10)); addToast("Décompte avancé.", "success"); }
    catch (err) { addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error"); }
  }
  async function handleRejeter(motif) {
    try { await rejeterMut.mutateAsync({ id: parseInt(id, 10), motif }); addToast("Décompte rejeté.", "success"); }
    catch (err) { addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error"); }
  }
  async function handlePayer() {
    try { await payerMut.mutateAsync(parseInt(id, 10)); addToast("Décompte marqué payé.", "success"); }
    catch (err) { addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error"); }
  }

  if (!isNew && isLoading) return <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  if (!isNew && (isError || !decompte)) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <p className="text-lg font-semibold">Décompte introuvable</p>
      <button onClick={() => navigate("/decomptes")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour</button>
    </div>
  );

  const canEdit = isNew || decompte?.statut === "brouillon";
  const d = decompte;

  const nbPJ = 0; // would need separate fetch

  const tabs = isNew ? [] : [
    { id: "structure", label: "Structure" },
    { id: "cessions",  label: "Cessions" },
    { id: "workflow",  label: "Workflow & Circuit" },
    { id: "pieces",    label: "Pièces jointes" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/decomptes")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Décomptes
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{isNew ? "Nouveau décompte" : d.code}</span>
      </div>

      <PageHeader
        title={isNew ? "Nouveau décompte" : d.code}
        subtitle={isNew ? "Remplir les paramètres du décompte" :
          [d.contrat?.code, d.contrat?.soustraitant?.raison_sociale].filter(Boolean).join(" · ")}
        action={!isNew && (
          <div className="flex items-center gap-2">
            <StatusBadge statut={d.statut} />
            <button onClick={async () => {
              const token = localStorage.getItem("stt_token");
              const resp = await fetch(`${import.meta.env.VITE_API_BASE}/api/pdf/decompte/${id}`, { headers: { Authorization: `Bearer ${token}` } });
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank");
              setTimeout(() => URL.revokeObjectURL(url), 60000);
            }} className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              <FileDown size={14} /> PDF
            </button>
          </div>
        )}
      />

      {/* Nouveau décompte : form direct sans tabs */}
      {isNew ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6">
            <StructureTab
              decompte={null}
              canEdit={true}
              form={form}
              setForm={setForm}
              onSave={handleSave}
              savePending={saveMut.isPending}
              parametresData={parametresData}
              eCessionsData={eCessionsData}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
          <div className="p-6">
            {activeTab === "structure" && (
              <StructureTab
                decompte={d}
                canEdit={canEdit}
                form={form}
                setForm={setForm}
                onSave={handleSave}
                savePending={saveMut.isPending}
                parametresData={parametresData}
                eCessionsData={eCessionsData}
              />
            )}

            {activeTab === "cessions" && (
              <CessionsDecTab contratId={d.contrat_id} />
            )}

            {activeTab === "workflow" && (
              <div className="max-w-2xl space-y-5">
                <CircuitStepper
                  decompte={d}
                  circuit={circuit}
                  onValider={handleValider}
                  onRejeter={handleRejeter}
                  onPayer={handlePayer}
                  onSoumettre={handleValider}
                />
                {d.statut === "paye" && (
                  <button onClick={async () => {
                    try {
                      const res = await releveMut.mutateAsync({ contrat_id: parseInt(d.contrat_id, 10), decompte_id: parseInt(id, 10) });
                      addToast("Relevé de compte généré.", "success");
                      if (res?.data?.id) navigate(`/releves/${res.data.id}`);
                    } catch (err) {
                      addToast(err.response?.data?.errors?.[0] ?? "Erreur génération relevé.", "error");
                    }
                  }} disabled={releveMut.isPending}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    {releveMut.isPending ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    Générer un relevé
                  </button>
                )}
              </div>
            )}

            {activeTab === "pieces" && (
              <PiecesDecTab contratId={d.contrat_id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
