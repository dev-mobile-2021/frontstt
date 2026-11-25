import { useState } from "react";
import { UploadCloud } from "lucide-react";
import SearchSelect from "./SearchSelect";

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
        <label className="text-xs uppercase tracking-wide font-medium text-ink-500 whitespace-nowrap">
          Catégorie
        </label>
        <SearchSelect
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="border border-line-200 rounded-lg px-3 py-2 text-sm text-ink-700 focus:ring-2 focus:ring-[green-600] focus:border-[green-600] outline-none transition-all duration-200"
        >
          <option value="">Sélectionner une catégorie...</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </SearchSelect>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200
          ${dragOver
            ? "border-[green-600] bg-[green-50]"
            : "border-line-200 bg-surface-50 hover:border-[green-600] hover:bg-[green-50]/50"
          }
        `}
        onClick={() => {/* illustrative */}}
      >
        <div className={`p-3 rounded-full ${dragOver ? "bg-[green-50]" : "bg-white"} shadow-sm`}>
          <UploadCloud className={`w-7 h-7 ${dragOver ? "text-[green-600]" : "text-ink-400"}`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-ink-700">
            Glissez-déposez vos fichiers ici{" "}
            <span className="text-[green-600] underline cursor-pointer">ou cliquez pour parcourir</span>
          </p>
          <p className="text-xs text-ink-400 mt-1">
            Formats acceptés : PDF, DOCX, XLSX, JPG, PNG (max 10 MB par fichier)
          </p>
        </div>
      </div>
    </div>
  );
}
