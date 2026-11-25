import { Construction } from "lucide-react";

export default function PlaceholderPage({ title, lot = "2" }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
      <div className="p-5 bg-[green-50] rounded-2xl">
        <Construction className="w-10 h-10 text-[green-600]" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ink-900">{title}</h2>
        <p className="text-ink-500 mt-2 text-sm">
          Écran en cours de développement — <span className="font-medium text-[green-600]">Lot {lot}</span>
        </p>
        <p className="text-xs text-ink-400 mt-1">
          Cet écran sera livré dans la prochaine phase du projet.
        </p>
      </div>
    </div>
  );
}
