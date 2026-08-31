import { useState } from "react";
import { Link2, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";

function formatNow() {
  const d = new Date();
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Bandeau "Référentiel synchronisé depuis X" avec bouton de synchronisation simulée
 * (délai 800ms, toast de résultat, mise à jour de la date affichée).
 */
export default function SyncBadge({ source, initialSync, resultMessage, buttonLabel = "Synchroniser depuis Sage X3" }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(initialSync);

  function handleSync() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLastSync(formatNow());
      addToast(resultMessage || "Synchronisation terminée.", "success");
    }, 800);
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-wrap">
      <Link2 size={13} className="text-gray-400 flex-shrink-0" />
      <span>
        Référentiel synchronisé depuis <span className="font-semibold text-gray-600">{source}</span>
        {lastSync && <><span className="text-gray-300 mx-1.5">·</span>Dernière synchronisation : {lastSync}</>}
      </span>
      <button
        onClick={handleSync}
        disabled={loading}
        className="ml-1 flex items-center gap-1.5 text-[#087F3E] font-medium border border-[#087F3E]/30 px-2.5 py-1 rounded-md hover:bg-[#E8F5EE] disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        {loading ? "Synchronisation…" : buttonLabel}
      </button>
    </div>
  );
}
