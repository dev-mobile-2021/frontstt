import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;

  // Calcule les numéros à afficher (max 5, avec ellipsis)
  function pages() {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const arr = new Set([1, totalPages, page]);
    if (page > 1) arr.add(page - 1);
    if (page < totalPages) arr.add(page + 1);
    return [...arr].sort((a, b) => a - b);
  }

  const nums = pages();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-white border-t border-gray-100">
      <p className="text-xs text-gray-500 whitespace-nowrap">
        Page <span className="font-medium">{page}</span> / {totalPages}
        {total != null && <> · <span className="font-medium">{total}</span> résultat{total > 1 ? "s" : ""}</>}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {nums.map((n, i) => {
          const prev = nums[i - 1];
          return (
            <span key={n} className="flex items-center gap-1">
              {prev && n - prev > 1 && (
                <span className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
              )}
              <button
                onClick={() => onPage(() => n)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  page === n
                    ? "bg-[#087F3E] text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            </span>
          );
        })}

        <button
          onClick={() => onPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
