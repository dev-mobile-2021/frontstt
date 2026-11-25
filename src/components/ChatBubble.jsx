import { CheckCircle, AlertCircle, Info, MessageSquare, XCircle } from "lucide-react";

const TYPE_STYLES = {
  commentaire: { bg: "bg-blue-50", border: "border-blue-100", icon: MessageSquare, iconColor: "text-blue-500" },
  validation:  { bg: "bg-[green-50]", border: "border-[#c6e8d4]", icon: CheckCircle, iconColor: "text-[green-600]" },
  rejet:       { bg: "bg-red-50", border: "border-red-100", icon: XCircle, iconColor: "text-red-500" },
  action:      { bg: "bg-amber-50", border: "border-amber-100", icon: Info, iconColor: "text-amber-500" },
};

function initials(nom) {
  return nom.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatBubble({ message }) {
  const { auteur, date, message: texte, type = "commentaire" } = message;
  const style = TYPE_STYLES[type] || TYPE_STYLES.commentaire;
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[green-600] text-white text-xs font-bold flex items-center justify-center">
          {auteur?.initiales || initials(auteur?.nom || "??")}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-ink-900">{auteur?.nom}</span>
            {auteur?.role && (
              <span className="text-xs bg-white border border-line-200 text-ink-500 px-1.5 py-0.5 rounded">
                {auteur.role}
              </span>
            )}
            <Icon size={14} className={`ml-auto flex-shrink-0 ${style.iconColor}`} />
          </div>

          {/* Message */}
          <p className="text-sm text-ink-900 leading-relaxed">{texte}</p>

          {/* Date */}
          <p className="text-xs text-ink-400 mt-1.5">{formatDate(date)}</p>
        </div>
      </div>
    </div>
  );
}
