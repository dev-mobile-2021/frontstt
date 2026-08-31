import { Info, RefreshCw } from "lucide-react";
import MoneyDisplay from "./MoneyDisplay";

const STT_FAMILLE = "Sous-traitants";

function pct(engage, budget) {
  if (!budget) return 0;
  return Math.round((engage / budget) * 100);
}

function barColor(p) {
  if (p > 100) return "bg-red-500";
  if (p > 80)  return "bg-amber-400";
  return "bg-[#087F3E]";
}

function textColor(p) {
  if (p > 100) return "text-red-600 font-bold";
  if (p > 80)  return "text-amber-600 font-semibold";
  return "text-[#087F3E]";
}

function SourceBadge({ famille }) {
  if (famille === STT_FAMILLE) {
    return (
      <span
        title="Calculé en temps réel depuis les décomptes approuvés/payés du module Sous-traitance"
        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#065A2C] bg-[#E8F5EE] border border-[#b5ddc8] rounded px-1.5 py-0.5 cursor-default select-none"
      >
        <RefreshCw size={9} className="flex-shrink-0" />
        Temps réel
      </span>
    );
  }
  return (
    <span
      title="Donnée hors périmètre du module Sous-traitance — alimentée par les autres flux du système d'information (Sage X3, GMAO, Paie)"
      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 cursor-default select-none"
    >
      <Info size={9} className="flex-shrink-0" />
      Sage X3
    </span>
  );
}

export default function BudgetFamilleWidget({ familles = [] }) {
  const totalBudget  = familles.reduce((s, f) => s + f.budget,  0);
  const totalEngage  = familles.reduce((s, f) => s + f.engage,  0);
  const totalPct     = pct(totalEngage, totalBudget);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Budget par famille RAM</h3>
        <span className={`text-sm font-bold ${textColor(totalPct)}`}>{totalPct}% engagé</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {familles.map((f) => {
          const p = pct(f.engage, f.budget);
          return (
            <div key={f.famille} className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-700 font-medium truncate">{f.famille}</span>
                  <SourceBadge famille={f.famille} />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400 hidden sm:block">
                    <MoneyDisplay amount={f.engage} variant="small" /> / <MoneyDisplay amount={f.budget} variant="small" />
                  </span>
                  <span className={`text-xs font-semibold w-10 text-right tabular-nums ${textColor(p)}`}>{p}%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(p)}`}
                  style={{ width: `${Math.min(p, 100)}%` }}
                />
              </div>
              {p > 100 && (
                <p className="text-xs text-red-500 mt-0.5">Dépassement de budget</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Total</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            <MoneyDisplay amount={totalEngage} variant="small" className="font-semibold text-gray-700" /> engagé sur{" "}
            <MoneyDisplay amount={totalBudget} variant="small" />
          </span>
        </div>
      </div>
    </div>
  );
}
