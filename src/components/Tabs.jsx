export default function Tabs({ items, activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px overflow-x-auto scrollbar-thin">
        {items.map((item, idx) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const prevItem = items[idx - 1];
          const showSep = idx > 0 && item.group && prevItem?.group !== item.group;
          return (
            <div key={item.id} className="flex items-stretch">
              {showSep && (
                <div className="flex items-center px-1">
                  <div className="w-px h-5 bg-gray-200 self-center" />
                </div>
              )}
              <button
                onClick={() => onChange(item.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150
                  ${isActive
                    ? "border-[#087F3E] text-[#087F3E]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-[#087F3E]" : "text-gray-400"}`} />}
                {item.label}
                {item.count !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
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
    </div>
  );
}
