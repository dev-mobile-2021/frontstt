import { useState } from "react";
import { X, Loader2, Link2 } from "lucide-react";

/**
 * Ajout d'un élément existant dans Sage X3 par son code (remplace la création libre).
 * onSubmit(code) doit retourner une promesse ; en cas d'erreur, le message est affiché ici.
 */
export default function AjouterX3Modal({ title, label, placeholder, help, onClose, onSubmit, pending }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const value = code.trim();
    if (!value) { setError("Le code Sage X3 est obligatoire."); return; }
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? err?.message ?? "Erreur lors de l'appel à Sage X3.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><Link2 size={16} className="text-[#087F3E]" />{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 block">{label}<span className="text-red-500 ml-0.5">*</span></label>
            <input
              autoFocus
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              placeholder={placeholder}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] ${error ? "border-red-400" : "border-gray-200"}`}
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
          <p className="text-xs text-gray-400">{help}</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {pending && <Loader2 size={14} className="animate-spin" />}
              Rechercher et ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
