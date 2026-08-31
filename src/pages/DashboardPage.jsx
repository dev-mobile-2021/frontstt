import { Link } from "react-router-dom";
import {
  FileText, Calculator, TrendingUp, DollarSign, Bell,
  AlertTriangle, Info, AlertCircle, ArrowRight, Eye, Plus,
  ShieldCheck, Landmark, FileStack,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import KPICard from "../components/KPICard";
import StatusBadge from "../components/StatusBadge";
import ProgressBar from "../components/ProgressBar";
import { contrats } from "../data/contrats";
import { useDecomptes } from "../context/DecomptesContext";
import { useFactures } from "../context/FacturesContext";
import { computeAlertesDelai } from "../utils/contratAlertes";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import { formatMontantCourt, formatMontant, formatDate } from "../utils/formatters";
import { getMontantActualise } from "../utils/contratMetrics";

// Lookup helpers
const sttMap = Object.fromEntries(sousTraitants.map((s) => [s.id, s.raisonSociale]));
const chantierMap = Object.fromEntries(chantiers.map((c) => [c.id, c.nom]));

// Static KPI
const contratsActifs = contrats.filter((c) => c.statut === "En cours d'exécution").length;
const montantEngage = contrats.reduce((sum, c) => sum + getMontantActualise(c), 0);

// Alert icon mapping
function AlertIcon({ type }) {
  if (type === "danger") return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />;
  if (type === "info")   return <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />;
  return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />;
}

function alertBg(type) {
  if (type === "danger") return "bg-red-50 border-red-100";
  if (type === "info")   return "bg-blue-50 border-blue-100";
  return "bg-yellow-50 border-yellow-100";
}

export default function DashboardPage() {
  const { decomptes } = useDecomptes();
  const { factures } = useFactures();
  const decomptesEnAttente = decomptes.filter((d) => d.statut === "En validation").length;
  const cumulPaye = decomptes
    .filter((d) => ["Approuvé", "Payé"].includes(d.statut))
    .reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);
  const ratioPayé = montantEngage > 0 ? Math.round((cumulPaye / montantEngage) * 100) : 0;

  // ── Facturation ──────────────────────────────────────────────
  const enAttenteControleDACC = factures.filter(f => f.statut === "Rapprochée").length;
  const enAttenteValidationDFC = factures.filter(f => f.statut === "Contrôlée DACC").length;
  const facturesEnEcart = factures.filter(f => f.statut === "Écart détecté" && f.type === "cse");
  const totalPayeFactures = factures
    .filter(f => f.statut === "Payée" && f.type !== "sous_traitant")
    .reduce((s, f) => s + (f.montantTTC || 0), 0);

  const alertesDelai = computeAlertesDelai(contrats).map(a => ({
    id: `delai-${a.contratId}`, type: a.type, titre: a.titre, message: a.message, pct: a.pct, to: `/contrats/${a.contratId}`,
  }));
  const alertesEcarts = facturesEnEcart.map(f => ({
    id: `ecart-${f.id}`, type: "danger",
    titre: `Écart de facturation — ${f.code}`,
    message: `Écart de ${new Intl.NumberFormat("fr-FR").format(f.ecartRapprochement || 0)} FCFA détecté au rapprochement — décompte repassé en Rejeté.`,
    pct: null, to: `/factures/${f.id}`,
  }));
  const alertes = [...alertesEcarts, ...alertesDelai];

  const contratsEnCours = contrats
    .filter((c) => c.statut === "En cours d'exécution")
    .slice(0, 6);

  const recentDecomptes = [...decomptes]
    .sort((a, b) => new Date(b.dateFin) - new Date(a.dateFin))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue synthétique de l'activité sous-traitance"
        action={
          <Link
            to="/contrats/nouveau"
            className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Nouveau contrat
          </Link>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        <KPICard
          icon={FileText}
          label="Contrats actifs"
          value={contratsActifs}
          variation={2}
          variationLabel="+2 ce mois"
        />
        <KPICard
          icon={Calculator}
          label="Décomptes en attente"
          value={decomptesEnAttente}
          variation={0}
          variationLabel="Nécessitent une action"
          iconColor="text-yellow-600"
        />
        <KPICard
          icon={TrendingUp}
          label="Montant engagé"
          value={formatMontantCourt(montantEngage)}
          variationLabel="Total 12 contrats"
        />
        <KPICard
          icon={DollarSign}
          label="Cumul payé"
          value={formatMontantCourt(cumulPaye)}
          variation={ratioPayé}
          variationLabel={`${ratioPayé}% du montant engagé`}
        />
      </div>

      {/* Facturation */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Facturation</h2>
        <div className="grid grid-cols-4 gap-5">
          <KPICard
            icon={ShieldCheck}
            label="En attente de contrôle DACC"
            value={enAttenteControleDACC}
            variationLabel="Factures rapprochées"
            iconColor="text-violet-600"
          />
          <KPICard
            icon={Landmark}
            label="En attente de validation DFC"
            value={enAttenteValidationDFC}
            variationLabel="Contrôlées par le DACC"
            iconColor="text-indigo-600"
          />
          <KPICard
            icon={AlertTriangle}
            label="Écarts à traiter"
            value={facturesEnEcart.length}
            variationLabel="Rapprochement en écart"
            iconColor="text-red-600"
          />
          <KPICard
            icon={FileStack}
            label="Total payé (factures)"
            value={formatMontantCourt(totalPayeFactures)}
            variationLabel="Factures CSE et avance payées"
          />
        </div>
      </div>

      {/* Main row: contracts table + alerts */}
      <div className="grid grid-cols-3 gap-6">
        {/* Contrats en cours — 2/3 */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Contrats en cours d'exécution</h2>
              <p className="text-sm text-gray-500 mt-0.5">Suivi des contrats actifs et de leur avancement</p>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-3 pr-4">Contrat</th>
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-3 pr-4">Sous-traitant</th>
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-3 pr-4">Chantier</th>
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-3 pr-4 w-32">Avancement</th>
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-3 pr-4">Statut</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contratsEnCours.map((contrat) => {
                const montantActualise = getMontantActualise(contrat);
                const realise = decomptes
                  .filter(d => d.contratId === contrat.id && ["Approuvé", "Payé"].includes(d.statut))
                  .reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);
                const progress = montantActualise > 0
                  ? Math.round((realise / montantActualise) * 100)
                  : 0;
                return (
                  <tr key={contrat.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-3.5 pr-4">
                      <p className="text-sm font-medium text-gray-900">{contrat.code}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">{contrat.objet}</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="text-sm text-gray-700 truncate max-w-[160px]">{sttMap[contrat.sousTraitantId]}</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">{chantierMap[contrat.chantierId]}</p>
                    </td>
                    <td className="py-3.5 pr-4 w-32">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-700">{progress}%</span>
                        <ProgressBar value={progress} />
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge statut={contrat.statut} />
                    </td>
                    <td className="py-3.5">
                      <Link
                        to={`/contrats/${contrat.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[#087F3E] font-medium hover:text-[#065A2C] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              to="/contrats"
              className="inline-flex items-center gap-1.5 text-sm text-[#087F3E] font-medium hover:text-[#065A2C] transition-colors"
            >
              Voir tous les contrats
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Alertes — 1/3 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Alertes</h2>
            <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {alertes.length}
            </span>
          </div>

          <div className="space-y-3">
            {alertes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucune alerte active.</p>
            ) : alertes.map((alerte) => (
              <Link
                key={alerte.id}
                to={alerte.to}
                className={`flex gap-2.5 p-3 rounded-lg border hover:opacity-80 transition-opacity ${alertBg(alerte.type)}`}
              >
                <AlertIcon type={alerte.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 leading-snug">{alerte.titre}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{alerte.message}</p>
                  {alerte.pct != null && <p className="text-xs text-gray-400 mt-1">{alerte.pct}% du délai écoulé</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: recent decomptes + chantier activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Décomptes récents */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Décomptes récents</h2>

          <div className="space-y-1">
            {recentDecomptes.map((dec) => (
              <Link
                key={dec.id}
                to={`/decomptes/${dec.id}`}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{dec.code}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(dec.dateFin)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-700">
                    {formatMontantCourt(dec.montantsCalcules?.net_ht || 0)}
                  </span>
                  <StatusBadge statut={dec.statut} />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <Link
              to="/decomptes"
              className="inline-flex items-center gap-1.5 text-sm text-[#087F3E] font-medium hover:text-[#065A2C] transition-colors"
            >
              Voir tous les décomptes
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Activité par chantier */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Activité par chantier</h2>

          <div className="space-y-5">
            {chantiers.map((chantier) => {
              const nbContrats = contrats.filter((c) => c.chantierId === chantier.id).length;
              const montant = contrats
                .filter((c) => c.chantierId === chantier.id)
                .reduce((sum, c) => sum + getMontantActualise(c), 0);
              return (
                <div key={chantier.id}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{chantier.nom}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{nbContrats} contrat{nbContrats > 1 ? "s" : ""} · {formatMontantCourt(montant)}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#087F3E] ml-3 flex-shrink-0">
                      {chantier.avancement}%
                    </span>
                  </div>
                  <ProgressBar value={chantier.avancement} />
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              to="/chantiers"
              className="inline-flex items-center gap-1.5 text-sm text-[#087F3E] font-medium hover:text-[#065A2C] transition-colors"
            >
              Voir tous les chantiers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
