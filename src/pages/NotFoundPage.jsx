import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
      <div className="w-16 h-16 bg-[green-50] rounded-2xl flex items-center justify-center">
        <Compass size={32} className="text-[green-600]" />
      </div>
      <div>
        <p className="text-5xl font-black text-[green-600] mb-2">404</p>
        <h1 className="text-xl font-bold text-ink-900">Page introuvable</h1>
        <p className="text-sm text-ink-500 mt-1">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      </div>
      <Link
        to="/dashboard"
        className="flex items-center gap-2 bg-[green-600] hover:bg-[green-700] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        <ArrowLeft size={15} />
        Retour au tableau de bord
      </Link>
    </div>
  );
}
