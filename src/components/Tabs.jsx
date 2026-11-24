import { cn } from "../lib/utils";

export default function Tabs({ items, activeTab, onChange }) {
  return (
    <nav className="scrollbar-thin flex items-center overflow-x-auto border-b border-line-200">
      {items.map((item, idx) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        const prevItem = items[idx - 1];
        const showSep = idx > 0 && item.group && prevItem?.group !== item.group;
        return (
          <div key={item.id} className="flex flex-shrink-0 items-stretch">
            {showSep && (
              <div className="flex items-center px-1">
                <div className="h-4 w-px self-center bg-line-200" />
              </div>
            )}
            <button
              onClick={() => onChange(item.id)}
              className={cn(
                "relative -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none",
                isActive
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-ink-500 hover:text-ink-900"
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-green-600" : "text-ink-400"
                  )}
                  strokeWidth={1.75}
                />
              )}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    isActive ? "bg-green-100 text-green-700" : "bg-surface-50 text-ink-500"
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
