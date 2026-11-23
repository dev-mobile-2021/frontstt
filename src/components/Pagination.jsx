import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

export default function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;

  function pages() {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const arr = new Set([1, totalPages, page]);
    if (page > 1) arr.add(page - 1);
    if (page < totalPages) arr.add(page + 1);
    return [...arr].sort((a, b) => a - b);
  }

  const nums = pages();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-100 bg-white px-5 py-3">
      <p className="text-xs text-ink-500 whitespace-nowrap">
        Page <span className="font-medium text-ink-900">{page}</span> / {totalPages}
        {total != null && <> · <span className="font-medium text-ink-900">{total}</span> résultat{total > 1 ? "s" : ""}</>}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="Page précédente"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-all duration-150 hover:bg-surface-50 hover:text-ink-900 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {nums.map((n, i) => {
          const prev = nums[i - 1];
          return (
            <span key={n} className="flex items-center gap-1">
              {prev && n - prev > 1 && (
                <span className="flex h-7 w-5 items-center justify-center text-[12px] text-ink-300">…</span>
              )}
              <button
                onClick={() => onPage(() => n)}
                aria-current={page === n ? "page" : undefined}
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[12px] font-medium tabular-nums transition-all duration-150 active:scale-90",
                  page === n
                    ? "bg-green-600 text-white shadow-xs"
                    : "text-ink-500 hover:bg-surface-50 hover:text-ink-900"
                )}
              >
                {n}
              </button>
            </span>
          );
        })}

        <button
          onClick={() => onPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          aria-label="Page suivante"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-all duration-150 hover:bg-surface-50 hover:text-ink-900 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
