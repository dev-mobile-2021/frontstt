export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {Icon && (
        <div className="p-4 bg-gray-100 rounded-2xl">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
