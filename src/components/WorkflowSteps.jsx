import { Check, Clock, X, ChevronRight } from "lucide-react";
import { formatDate } from "../utils/formatters";

function StepIcon({ statut }) {
  if (statut === "validé")     return <Check className="w-4 h-4 text-white" />;
  if (statut === "en attente") return <Clock className="w-4 h-4 text-yellow-700" />;
  if (statut === "rejeté")     return <X className="w-4 h-4 text-white" />;
  // à venir
  return <span className="w-2 h-2 rounded-full bg-gray-400" />;
}

function stepCircleClass(statut) {
  if (statut === "validé")     return "bg-[#087F3E] border-[#087F3E]";
  if (statut === "en attente") return "bg-yellow-50 border-yellow-400";
  if (statut === "rejeté")     return "bg-red-600 border-red-600";
  return "bg-gray-100 border-gray-300";
}

function connectorClass(statut) {
  if (statut === "validé") return "bg-[#087F3E]";
  return "bg-gray-200";
}

export default function WorkflowSteps({ steps, orientation = "horizontal" }) {
  if (orientation === "vertical") {
    return (
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={step.ordre} className="flex gap-4">
            {/* Indicator column */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${stepCircleClass(step.statut)}`}>
                <StepIcon statut={step.statut} />
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[24px] my-1 ${connectorClass(step.statut)}`} />
              )}
            </div>
            {/* Content */}
            <div className="pb-6 min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-900">{step.profil}</span>
                <span className="text-sm text-gray-600">— {step.nom}</span>
                {step.date && (
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{formatDate(step.date)}</span>
                )}
              </div>
              {step.commentaire && (
                <div className="mt-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
                  {step.commentaire}
                </div>
              )}
              {step.statut === "en attente" && !step.date && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-yellow-700 font-medium">
                  <Clock className="w-3 h-3" /> En attente de validation
                </span>
              )}
              {step.statut === "à venir" && (
                <span className="mt-1 text-xs text-gray-400">En attente</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="flex items-start overflow-x-auto pb-2">
      {steps.map((step, i) => (
        <div key={step.ordre} className="flex items-start flex-shrink-0">
          {/* Step bubble + label */}
          <div className="flex flex-col items-center gap-2 w-36">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${stepCircleClass(step.statut)}`}>
              <StepIcon statut={step.statut} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">{step.profil}</p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">{step.nom}</p>
              {step.date
                ? <p className="text-xs text-[#087F3E] mt-0.5">{formatDate(step.date)}</p>
                : step.statut === "en attente"
                  ? <p className="text-xs text-yellow-600 mt-0.5 font-medium">En attente</p>
                  : <p className="text-xs text-gray-400 mt-0.5">—</p>
              }
            </div>
          </div>

          {/* Connector */}
          {i < steps.length - 1 && (
            <div className="flex items-center mt-5 mx-1 flex-shrink-0">
              <div className={`h-0.5 w-8 ${connectorClass(step.statut)}`} />
              <ChevronRight className={`w-3.5 h-3.5 ${step.statut === "validé" ? "text-[#087F3E]" : "text-gray-300"}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
