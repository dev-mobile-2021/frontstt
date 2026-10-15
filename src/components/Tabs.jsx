export default function Tabs({ items, activeTab, onChange }) {
  return (
    <nav className="flex items-center border-b border-gray-200 overflow-x-auto scrollbar-thin">
      {items.map((item, idx) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        const prevItem = items[idx - 1];
        const showSep = idx > 0 && item.group && prevItem?.group !== item.group;
        return (
          <div key={item.id} className="flex items-stretch flex-shrink-0">
            {showSep && (
              <div className="flex items-center px-1">
                <div className="w-px h-4 bg-gray-200 self-center" />
              </div>
            )}
            <button
              onClick={() => onChange(item.id)}
              className={`relative -mb-px flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 whitespace-nowrap transition-all duration-150 focus-visible:outline-none ${
                isActive
                  ? "border-[#087F3E] text-[#087F3E]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-[#087F3E]" : "text-gray-400"}`} />}
              {item.label}
              {item.count !== undefined && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none ${
                  isActive ? "bg-[#E8F5EE] text-[#087F3E]" : "bg-gray-100 text-gray-500"
                }`}>
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
