import { useState } from "react";
import { Upload, Download, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";

/**
 * Paire de boutons "Parcourir" (import simulé, 600ms) + "Télécharger le modèle".
 * onImport(nAjoutes) est appelé avec le nombre de lignes simulées ajoutées.
 */
export default function ImportFileButton({ label = "Parcourir…", onImport, nAjoutes = 3, itemLabel = "ligne" }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  function handleImport() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onImport?.(nAjoutes);
      const plural = nAjoutes > 1 ? "s" : "";
      addToast(`Fichier importé — ${nAjoutes} ${itemLabel}${plural} ajoutée${plural}`, "success");
    }, 600);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleImport}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs border border-[#087F3E] text-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {loading ? "Import en cours…" : label}
      </button>
      <button
        onClick={() => addToast("Modèle téléchargé.", "success")}
        className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Download size={12} /> Télécharger le modèle
      </button>
    </div>
  );
}
