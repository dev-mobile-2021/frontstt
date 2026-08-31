import { TrendingUp, TrendingDown } from "lucide-react";

export default function KPICard({ icon: Icon, label, value, variation, variationLabel, iconColor = "text-[#087F3E]" }) {
  const isPositive = variation > 0;
  const isNeutral = variation === 0 || variation === undefined;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-lg bg-[#E8F5EE]">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>

      {variationLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isNeutral ? "text-gray-500" : isPositive ? "text-[#087F3E]" : "text-red-600"}`}>
          {!isNeutral && (
            isPositive
              ? <TrendingUp className="w-3.5 h-3.5" />
              : <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{variationLabel}</span>
        </div>
      )}
    </div>
  );
}
