import { FileText, Upload } from "lucide-react";

export default function ModeToggle({ value, onChange, disabled = false }) {
  const options = [
    { id: "saisie", label: "Saisie manuelle", icon: FileText },
    { id: "import", label: "Import Excel", icon: Upload },
  ];

  return (
    <div className="flex items-center gap-1 bg-line-100 rounded-lg p-1">
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => !disabled && onChange(id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              active
                ? "bg-white text-[green-600] shadow-sm border border-line-200"
                : "text-ink-500 hover:text-ink-700"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
