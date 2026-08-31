import { TrendingUp, AlertTriangle, CheckCircle2, Edit3, Layers } from "lucide-react";
import MoneyDisplay from "./MoneyDisplay";
import { getMontantActualise } from "../utils/contratMetrics";
import { computeNetHT } from "../utils/decompteCalcul";
import { getBCDuContrat, getSoldeDisponible } from "../utils/bcMetrics";

function ProgressBar({ value, max, colorClass = "bg-[#087F3E]" }) {
  const rawPct = max > 0 ? Math.round((value / max) * 100) : 0;
  const pct = Math.min(rawPct, 100);
  const overflow = rawPct > 100;
  const danger = rawPct > 90;
  const warn = rawPct > 75 && rawPct <= 90;
  const barColor = overflow ? "bg-red-600" : danger ? "bg-red-500" : warn ? "bg-amber-400" : colorClass;

  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className={overflow ? "text-red-600 font-bold" : ""}>{rawPct}% réalisé</span>
        <span className={overflow ? "text-red-600 font-bold" : danger ? "text-red-600 font-semibold" : warn ? "text-amber-600 font-semibold" : "text-gray-400"}>
          {overflow ? "⛔ Dépassement" : danger ? "⚠ Proche du solde" : warn ? "Surveiller" : ""}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StackedBar({ paye, approuve, enValidation, max }) {
  if (max <= 0) return null;
  const pctPaye = Math.min(100, Math.round((paye / max) * 100));
  const pctApprouve = Math.min(100 - pctPaye, Math.round((approuve / max) * 100));
  const pctEnVal = Math.min(100 - pctPaye - pctApprouve, Math.round((enValidation / max) * 100));
  return (
    <div className="mt-2">
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
        {pctPaye > 0 && <div className="h-full bg-[#087F3E]" style={{ width: `${pctPaye}%` }} />}
        {pctApprouve > 0 && <div className="h-full bg-blue-500" style={{ width: `${pctApprouve}%` }} />}
        {pctEnVal > 0 && <div className="h-full bg-amber-400" style={{ width: `${pctEnVal}%` }} />}
      </div>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full bg-[#087F3E] inline-block" />Payé</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Approuvé</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />En validation</span>
      </div>
    </div>
  );
}

function StatRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function fmt1(n) { return n.toFixed(1).replace(".", ","); }

export default function SituationChantierWidget({ contrat, decomptes: allDecomptes, lignesEnCours, decompteId, bonsCommande = [] }) {
  if (!contrat) return null;

  const decomptes = allDecomptes.filter(d => d.contratId === contrat.id);
  const bc = getBCDuContrat(contrat.id, bonsCommande);
  const soldeBC = bc ? getSoldeDisponible(bc) : null;
  const totalPaye     = decomptes.filter(d => d.statut === "Payé").reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);
  const totalApprouve = decomptes.filter(d => d.statut === "Approuvé").reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);
  const enValidation  = decomptes.filter(d => d.statut === "En validation").length;
  const totalEnValidation = decomptes.filter(d => d.statut === "En validation").reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);

  const montantHT  = getMontantActualise(contrat);
  const montantInitial = contrat.montantInitialHT ?? contrat.montantHT;
  const resteAPayer = montantHT - totalPaye - totalApprouve;

  const totalRG = decomptes.reduce((s, d) => s + (d.montantsCalcules?.d_retenueGarantie || 0), 0);
  const totalAD = decomptes.reduce((s, d) => s + (d.montantsCalcules?.cp_rembourseAD || d.montantsCalcules?.c_avanceDemarrage || 0), 0);

  const provisionalNetHT = lignesEnCours ? computeNetHT(lignesEnCours) : null;
  const hasProvisional   = provisionalNetHT !== null && provisionalNetHT > 0;

  const rgRate = montantHT > 0 ? fmt1(totalRG / montantHT * 100) : "0,0";
  const adRate = montantHT > 0 ? fmt1(totalAD / montantHT * 100) : "0,0";

  const validatedAvenants = (contrat.avenants || []).filter(a => a.statutValidationDFC === "Validé");

  return (
    <div className="space-y-4">
      {/* ── Bloc Marché ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Layers size={13} />
          Marché
        </h4>
        <div className="space-y-0">
          <StatRow label="Montant initial">
            <MoneyDisplay amount={montantInitial} variant="small" />
          </StatRow>
          {validatedAvenants.map((avt, i) => (
            <StatRow key={avt.id} label={avt.numero || `Avenant ${i + 1}`}>
              <span className={`text-xs font-semibold ${avt.montant >= 0 ? "text-blue-600" : "text-red-500"}`}>
                {avt.montant >= 0 ? "+" : ""}
                {new Intl.NumberFormat("fr-FR").format(avt.montant)} FCFA
              </span>
            </StatRow>
          ))}
          <StatRow label="Montant actualisé">
            <MoneyDisplay amount={montantHT} variant="small" className="font-bold text-gray-900" />
          </StatRow>
          {bc && (
            <StatRow label="Solde du bon de commande">
              <MoneyDisplay
                amount={soldeBC}
                variant="small"
                className={`font-semibold ${hasProvisional && provisionalNetHT > soldeBC ? "text-red-600" : "text-gray-700"}`}
              />
            </StatRow>
          )}
        </div>
      </div>

      {/* ── Situation financière ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <TrendingUp size={13} />
          Situation financière
          {hasProvisional && (
            <span className="ml-auto flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[10px] font-semibold">
              <Edit3 size={9} />
              En saisie
            </span>
          )}
        </h4>

        <div className="mb-3">
          <div className="flex items-end justify-between mb-0.5">
            <span className="text-xs text-gray-500">Montant HT actualisé</span>
            <MoneyDisplay amount={montantHT} variant="small" />
          </div>
          <ProgressBar value={totalPaye + totalApprouve + (hasProvisional ? provisionalNetHT : 0)} max={montantHT} />
          <StackedBar paye={totalPaye} approuve={totalApprouve} enValidation={totalEnValidation} max={montantHT} />
        </div>

        <div className="space-y-0">
          <StatRow label="Payé">
            <MoneyDisplay amount={totalPaye} className="text-[#087F3E] text-xs font-bold" />
          </StatRow>
          <StatRow label="Approuvé (à payer)">
            <MoneyDisplay amount={totalApprouve} className="text-blue-600 text-xs font-semibold" />
          </StatRow>
          {totalEnValidation > 0 && (
            <StatRow label="En cours de validation">
              <MoneyDisplay amount={totalEnValidation} className="text-amber-600 text-xs font-semibold" />
            </StatRow>
          )}
          {hasProvisional && (
            <StatRow label="En cours de saisie ✱">
              <MoneyDisplay amount={provisionalNetHT} className="text-amber-600 text-xs font-semibold" />
            </StatRow>
          )}
          <StatRow label={hasProvisional ? "Solde restant prévisionnel" : "Solde restant"}>
            <MoneyDisplay amount={resteAPayer - (hasProvisional ? provisionalNetHT : 0)} className={`text-xs font-semibold ${hasProvisional ? "text-amber-700" : "text-gray-700"}`} />
          </StatRow>
        </div>
        {hasProvisional && (
          <p className="text-[10px] text-amber-500 mt-2 italic">✱ provisoire — non enregistré</p>
        )}
      </div>

      {/* ── Retenues ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Retenues cumulées</h4>
        <div className="space-y-0">
          <StatRow label={`Retenue de garantie (${contrat.tauxRG}%)`}>
            <div className="text-right">
              <MoneyDisplay amount={totalRG} variant="small" />
              {totalRG > 0 && <p className="text-[10px] text-gray-400 mt-0.5">{rgRate}% du marché actualisé</p>}
            </div>
          </StatRow>
          <StatRow label={`Avance démarrage (${contrat.tauxAD}%)`}>
            <div className="text-right">
              <MoneyDisplay amount={totalAD} variant="small" />
              {totalAD > 0 && <p className="text-[10px] text-gray-400 mt-0.5">{adRate}% du marché actualisé</p>}
            </div>
          </StatRow>
        </div>
      </div>

      {/* ── Décomptes ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Décomptes</h4>
        <div className="space-y-0">
          <StatRow label="Total">
            <span className="text-sm font-bold text-gray-800">{decomptes.length}</span>
          </StatRow>
          <StatRow label="Payés">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-[#087F3E]" />
              <span className="text-xs font-semibold text-[#087F3E]">{decomptes.filter(d => d.statut === "Payé").length}</span>
            </div>
          </StatRow>
          <StatRow label="En validation">
            {enValidation > 0 ? (
              <div className="flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-600">{enValidation}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </StatRow>
          <StatRow label="Brouillons">
            <span className="text-xs text-gray-500">{decomptes.filter(d => d.statut === "Brouillon").length}</span>
          </StatRow>
        </div>
      </div>
    </div>
  );
}
