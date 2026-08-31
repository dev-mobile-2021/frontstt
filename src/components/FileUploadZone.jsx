import { useState } from "react";
import { UploadCloud } from "lucide-react";

const CATEGORIES = [
  "Offre initiale", "Comparatif offres", "Rapport de rapprochement",
  "Contrat signé", "Attestations", "Devis", "Autre",
];

export default function FileUploadZone({ onUpload }) {
  const [dragOver, setDragOver] = useState(false);
  const [categorie, setCategorie] = useState("");

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    // Illustrative only — no real file processing
  }

  return (
    <div className="space-y-3">
      {/* Category selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs uppercase tracking-wide font-medium text-gray-500 whitespace-nowrap">
          Catégorie
        </label>
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200"
        >
          <option value="">Sélectionner une catégorie...</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200
          ${dragOver
            ? "border-[#087F3E] bg-[#E8F5EE]"
            : "border-gray-300 bg-gray-50 hover:border-[#087F3E] hover:bg-[#E8F5EE]/50"
          }
        `}
        onClick={() => {/* illustrative */}}
      >
        <div className={`p-3 rounded-full ${dragOver ? "bg-[#E8F5EE]" : "bg-white"} shadow-sm`}>
          <UploadCloud className={`w-7 h-7 ${dragOver ? "text-[#087F3E]" : "text-gray-400"}`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            Glissez-déposez vos fichiers ici{" "}
            <span className="text-[#087F3E] underline cursor-pointer">ou cliquez pour parcourir</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Formats acceptés : PDF, DOCX, XLSX, JPG, PNG (max 10 MB par fichier)
          </p>
        </div>
      </div>
    </div>
  );
}
