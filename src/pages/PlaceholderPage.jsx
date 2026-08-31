import { Construction } from "lucide-react";

export default function PlaceholderPage({ title, lot = "2" }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
      <div className="p-5 bg-[#E8F5EE] rounded-2xl">
        <Construction className="w-10 h-10 text-[#087F3E]" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Écran en cours de développement — <span className="font-medium text-[#087F3E]">Lot {lot}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Cet écran sera livré dans la prochaine phase du projet.
        </p>
      </div>
    </div>
  );
}
