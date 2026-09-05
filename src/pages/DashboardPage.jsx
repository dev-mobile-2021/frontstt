import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, TrendingUp, DollarSign, CheckCircle2, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import KPICard from "../components/KPICard";
import MoneyDisplay from "../components/MoneyDisplay";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDecomptesPaginated, useDecompteCircuit } from "../hooks/useDecomptes";
import { formatMontantCourt } from "../utils/formatters";

export default function DashboardPage() {
  const { data: contratsData }  = useContratsPaginated({ count: 200 });
  const { data: decomptesData } = useDecomptesPaginated({ count: 200 });
  const { data: circuit = [] }  = useDecompteCircuit();

  const contrats  = contratsData?.data  ?? [];
  const decomptes = decomptesData?.data ?? [];

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalContrats   = contratsData?.metadata?.total ?? contrats.length;
  const montantContrats = contrats.reduce((s, c) => s + parseFloat(c.montant_actuel ?? c.montant_initial ?? 0), 0);
  const montantEngage   = decomptes.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
  const cumulPaye       = decomptes
    .filter(d => d.statut === "paye")
    .reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);

  // ── Validations en cours ──────────────────────────────────────────────────
  const validationsEnCours = useMemo(() => {
    if (!circuit.length) return [];
    return circuit.map(etape => ({
      profil_code: etape.profil_code,
      libelle:     etape.libelle,
      count:       decomptes.filter(d => d.statut === etape.statut_avant).length,
    }));
  }, [circuit, decomptes]);

  // ── Règlements en instance ────────────────────────────────────────────────
  const STATUTS_INSTANCE = ["soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg"];

  const reglements = useMemo(() => {
    const map = {};
    decomptes
      .filter(d => STATUTS_INSTANCE.includes(d.statut))
      .forEach(d => {
        const key = d.contrat?.chantier?.designation ?? "—";
        map[key] = (map[key] ?? 0) + parseFloat(d.montant_ht ?? 0);
      });
    return Object.entries(map)
      .map(([designation, montant]) => ({ designation, montant }))
      .sort((a, b) => b.montant - a.montant);
  }, [decomptes]);

  const totalReglements = reglements.reduce((s, r) => s + r.montant, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" subtitle="Vue synthétique de l'activité sous-traitance" />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-5">
        <KPICard
          icon={FileText}
          label="Contrats de sous-traitance"
          value={totalContrats}
          variationLabel="Tous statuts confondus"
        />
        <KPICard
          icon={TrendingUp}
          label="Montants contrats"
          value={formatMontantCourt(montantContrats)}
          variationLabel="Montant actualisé total"
        />
        <KPICard
          icon={CheckCircle2}
          label="Montants engagés"
          value={formatMontantCourt(montantEngage)}
          variationLabel="Total décomptes soumis"
          iconColor="text-blue-600"
        />
        <KPICard
          icon={DollarSign}
          label="Cumul payé"
          value={formatMontantCourt(cumulPaye)}
          variationLabel="Décomptes à statut payé"
          iconColor="text-[#087F3E]"
        />
      </div>

      {/* ── Panels ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Validations en cours */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Validations en cours</h2>
            <Link
              to="/decomptes"
              className="text-xs text-[#087F3E] hover:underline flex items-center gap-1"
            >
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>

          {validationsEnCours.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucune validation en attente.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {validationsEnCours.map(v => (
                <div key={v.profil_code} className="flex items-center gap-4 py-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl
                    ${v.count > 0
                      ? "bg-amber-50 border-2 border-amber-300 text-amber-700"
                      : "bg-gray-50 border border-gray-100 text-gray-300"
                    }`}
                  >
                    {v.count}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{v.profil_code.toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v.libelle}</p>
                  </div>
                  {v.count > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      En attente
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Règlements en instance */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Règlements en instance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Décomptes en circuit non encore payés</p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Total</p>
              <MoneyDisplay amount={totalReglements} className="text-base font-bold text-[#087F3E]" />
            </div>
          </div>

          {reglements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucun règlement en instance.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {reglements.map(r => (
                <div key={r.designation} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#087F3E] flex-shrink-0" />
                    <p className="text-sm text-gray-700 truncate">{r.designation}</p>
                  </div>
                  <MoneyDisplay
                    amount={r.montant}
                    variant="small"
                    className="font-semibold text-gray-800 flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
