import { cn } from "../lib/utils";

const LG_COLS = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export default function KpiStrip({ items, columns = 4 }) {
  return (
    <div className={cn("stagger-in grid grid-cols-2 gap-3 sm:grid-cols-3", LG_COLS[columns])}>
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="min-w-0 rounded-xl border border-line-200 bg-white p-6 shadow-xs transition-shadow duration-150 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              {Icon && (
                <div className="rounded-lg bg-green-100 p-2">
                  <Icon className="h-5 w-5 shrink-0 text-green-600" strokeWidth={1.75} />
                </div>
              )}
            </div>
            <div className="mt-2">
              <span className="truncate text-xs font-medium uppercase tracking-wide text-ink-500">{item.label}</span>
            </div>
            <div
              className={cn(
                "mt-1 text-[28px] font-bold leading-none tabular-nums text-ink-900",
                item.tone === "warning" && "text-green-700"
              )}
            >
              {item.value}
            </div>
            {item.caption && (
              <div className="mt-2 flex items-center gap-1 text-xs font-medium text-ink-500">{item.caption}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
