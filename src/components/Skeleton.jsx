// Reusable skeleton loader block — pulsing gray rectangle
export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

// Full-row table skeleton (n rows × cols)
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 h-10" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} className={`h-4 ${c === 0 ? "w-36" : c === cols - 1 ? "w-20" : "w-24"} flex-shrink-0`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton for chantier cards
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonBlock className="h-5 w-48" />
      <SkeletonBlock className="h-3 w-32" />
      <SkeletonBlock className="h-2 w-full rounded-full" />
    </div>
  );
}
