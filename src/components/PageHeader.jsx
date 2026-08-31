export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
