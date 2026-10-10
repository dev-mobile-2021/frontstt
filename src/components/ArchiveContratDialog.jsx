import { Archive, Loader2, AlertTriangle, Eye, Lock, Calculator, Link2 } from "lucide-react";

const LABELS = {
  brouillon: "Brouillon", soumis: "Soumis", actif: "Actif", suspendu: "Suspendu",
  resilie: "Résilié", termine: "Terminé", cloture: "Clôturé", rejete: "Rejeté",
};

/**
 * Confirmation d'archivage d'un contrat, avec l'impact détaillé.
 * contrat : { code, statut, nbBc, nbAvenants }
 */
export default function ArchiveContratDialog({ contrat, onConfirm, onCancel, pending }) {
  const ancien = LABELS[contrat.statut] ?? contrat.statut;
  const comptes = ["actif", "termine", "cloture"].includes(contrat.statut);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Archive size={18} className="text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Archiver le contrat</p>
            <p className="text-xs text-gray-500 font-mono">{contrat.code} · actuellement « {ancien} »</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            <strong>L'archivage est définitif.</strong> Le contrat ne pourra plus être réactivé, modifié ni supprimé.
          </p>
        </div>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ce qui va changer</p>
        <ul className="space-y-2.5 text-sm text-gray-700">
          <li className="flex gap-2.5">
            <Eye size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span>
              Il disparaît des listes filtrées sur « {ancien} ». Il reste visible dans « Tous les statuts »
              et avec le filtre <strong>« Archivé »</strong>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Lock size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span>Statut figé : plus aucune transition (suspension, résiliation, clôture…) ni création de décompte.</span>
          </li>
          <li className="flex gap-2.5">
            <Calculator size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span>
              {comptes
                ? <>Il <strong>sort des totaux</strong> : « STT engagé » du chantier, colonnes du tableau des sous-traitants, rapports.</>
                : <>Il n'est pas compté dans les totaux (STT engagé, tableau des sous-traitants, rapports) : aucun changement.</>}
            </span>
          </li>
          <li className="flex gap-2.5">
            <Link2 size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <span>
              {contrat.nbBc > 0
                ? <><strong>{contrat.nbBc} BC Sage X3</strong> restent liés à ce contrat et ne pourront pas être rattachés à un autre. </>
                : <>Aucun BC lié. </>}
              {contrat.nbAvenants > 0 && <>Les {contrat.nbAvenants} avenant(s) et l'historique sont conservés.</>}
            </span>
          </li>
        </ul>

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={pending}
            className="flex-1 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <Loader2 size={13} className="animate-spin" />}
            Archiver définitivement
          </button>
        </div>
      </div>
    </div>
  );
}
