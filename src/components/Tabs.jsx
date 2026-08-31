export default function Tabs({ items, activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px overflow-x-auto">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-200
                ${isActive
                  ? "border-[#087F3E] text-[#087F3E]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? "text-[#087F3E]" : "text-gray-400"}`} />}
              {item.label}
              {item.count !== undefined && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isActive ? "bg-[#E8F5EE] text-[#087F3E]" : "bg-gray-100 text-gray-500"
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
