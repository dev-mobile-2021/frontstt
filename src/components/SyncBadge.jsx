import { Link2, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useX3Sync, useX3SyncStatus } from "../hooks/useX3Sync";

function formatDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function bilanMessage(label, b) {
  if (!b) return `${label} : synchronisation terminée.`;
  const parts = [`${b.crees ?? 0} créé(s)`, `${b.mis_a_jour ?? 0} mis à jour`, `${b.inchanges ?? 0} inchangé(s)`];
  if (b.liens != null) parts.push(`${b.liens} lien(s) chantier`);
  if (b.ignores) parts.push(`${b.ignores} ignoré(s)`);
  return `${label} : ${b.recus ?? 0} reçu(s) de Sage X3 — ${parts.join(", ")}.`;
}

/**
 * Bandeau "Référentiel synchronisé depuis Sage X3" avec bouton de synchronisation réelle.
 * module : chantiers | soustraitants | articles
 */
export default function SyncBadge({ module, label, invalidate = [], buttonLabel = "Synchroniser depuis Sage X3", canSync = true }) {
  const { addToast } = useToast();
  const { data: status } = useX3SyncStatus();
  const syncMut = useX3Sync(module, invalidate);
  const lastSync = formatDate(status?.[module]?.derniere_synchro);
  const bilan    = status?.[module]?.bilan;
  const dernierStatut  = status?.[module]?.dernier_statut;
  const dernierMessage = status?.[module]?.dernier_message;

  async function handleSync() {
    try {
      const bilan = await syncMut.mutateAsync({});
      addToast(bilanMessage(label || module, bilan), "success");
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || err.message || "Synchronisation impossible.";
      addToast(`Sage X3 : ${msg}`, "error");
    }
  }

  const loading = syncMut.isPending;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-wrap">
      <Link2 size={13} className="text-gray-400 flex-shrink-0" />
      <span className="flex-1">
        Référentiel synchronisé depuis <span className="font-semibold text-gray-600">Sage X3</span>
        <span className="text-gray-300 mx-1.5">·</span>
        {lastSync ? <>Dernière synchronisation : {lastSync}</> : "Jamais synchronisé"}
        {bilan && (
          <span className="block mt-0.5 text-gray-500">
            Bilan : {bilan.recus ?? 0} reçu(s) · {bilan.crees ?? 0} créé(s) · {bilan.mis_a_jour ?? 0} mis à jour · {bilan.inchanges ?? 0} inchangé(s)
            {bilan.ignores ? ` · ${bilan.ignores} ignoré(s)` : ""}
            {bilan.liens != null ? ` · ${bilan.liens} lien(s) chantier` : ""}
          </span>
        )}
        {dernierStatut === "erreur" && (
          <span className="block mt-0.5 text-red-600">Dernière tentative en erreur : {dernierMessage}</span>
        )}
      </span>
      {canSync && (
        <button
          onClick={handleSync}
          disabled={loading}
          className="ml-1 flex items-center gap-1.5 text-[#087F3E] font-medium border border-[#087F3E]/30 px-2.5 py-1 rounded-md hover:bg-[#E8F5EE] disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {loading ? "Synchronisation…" : buttonLabel}
        </button>
      )}
    </div>
  );
}
