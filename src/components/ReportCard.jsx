import { ArrowRight, Clock } from "lucide-react";

export default function ReportCard({ icon: Icon, title, description, status = "disponible", onView }) {
  const available = status === "disponible";

  return (
    <div className={`bg-white rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200 ${
      available
        ? "border-gray-200 hover:border-[#087F3E] hover:shadow-md cursor-pointer group"
        : "border-gray-100 opacity-60"
    }`}
      onClick={available ? onView : undefined}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          available ? "bg-[#E8F5EE]" : "bg-gray-100"
        }`}>
          <Icon size={20} className={available ? "text-[#087F3E]" : "text-gray-400"} />
        </div>
        {!available && (
          <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            <Clock size={10} />
            Bientôt
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className={`text-sm font-semibold ${available ? "text-gray-900 group-hover:text-[#087F3E]" : "text-gray-500"} transition-colors`}>
          {title}
        </h3>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>
      </div>

      {available && (
        <div className="flex items-center gap-1 text-xs text-[#087F3E] font-medium">
          Voir le rapport
          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  );
}
