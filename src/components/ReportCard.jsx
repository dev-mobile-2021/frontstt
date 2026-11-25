import { ArrowRight, Clock, Download } from "lucide-react";

export default function ReportCard({ icon: Icon, title, description, status = "disponible", badge, onView, onDownload }) {
  const available = status === "disponible";

  return (
    <div className={`bg-white rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200 ${
      available ? "border-line-200 hover:shadow-md" : "border-line-100 opacity-60"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          available ? "bg-[green-50]" : "bg-line-100"
        }`}>
          <Icon size={20} className={available ? "text-[green-600]" : "text-ink-400"} />
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-xs font-bold bg-[green-50] text-[green-600] px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
          {!available && (
            <span className="flex items-center gap-1 text-xs bg-line-100 text-ink-500 px-2 py-0.5 rounded-full font-medium">
              <Clock size={10} />
              Bientôt
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className={`text-sm font-semibold leading-snug ${available ? "text-ink-900" : "text-ink-500"}`}>
          {title}
        </h3>
        <p className="text-xs text-ink-400 mt-1 leading-relaxed">{description}</p>
      </div>

      {/* Actions */}
      {available && (
        <div className="flex gap-2 mt-1">
          {onView && (
            <button
              onClick={onView}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[green-600] hover:bg-[green-50] py-1.5 rounded-lg transition-colors group"
            >
              Analyser
              <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className={`flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-[green-600] hover:bg-[green-700] py-1.5 rounded-lg transition-colors ${onView ? "px-3" : "flex-1 px-3"}`}
            >
              <Download size={11} />
              {onView ? "Excel" : "Télécharger Excel"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
