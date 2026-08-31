import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const VARIANTS = {
  success: { bg: "bg-[#087F3E]", icon: CheckCircle2, text: "text-white" },
  error:   { bg: "bg-red-600",   icon: XCircle,      text: "text-white" },
  info:    { bg: "bg-blue-600",  icon: Info,          text: "text-white" },
};

export default function Toast({ message, type = "success", onClose }) {
  const [visible, setVisible] = useState(false);
  const v = VARIANTS[type] || VARIANTS.success;
  const Icon = v.icon;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl min-w-[260px] max-w-[380px] transition-all duration-300 ${v.bg} ${v.text} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}
