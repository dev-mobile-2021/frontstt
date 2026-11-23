import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, TrendingUp, DollarSign, CheckCircle2, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import KpiStrip from "../components/KpiStrip";
import MoneyDisplay from "../components/MoneyDisplay";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDecomptesPaginated, useDecompteCircuit } from "../hooks/useDecomptes";
import { formatMontantCourt } from "../utils/formatters";

const STATUTS_INSTANCE = ["soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg"];

export default function DashboardPage() {
  const { data: contratsData }  = useContratsPaginated({ count: 200 });
  const { data: decomptesData } = useDecomptesPaginated({ count: 200 });
  const { data: circuit = [] }  = useDecompteCircuit();

  const contrats  = contratsData?.data  ?? [];
  const decomptes = decomptesData?.data ?? [];

  const totalContrats   = contratsData?.metadata?.total ?? contrats.length;
  const montantContrats = contrats.reduce((s, c) => s + parseFloat(c.montant_actuel ?? c.montant_initial ?? 0), 0);
  const montantEngage   = decomptes.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
  const cumulPaye       = decomptes
    .filter(d => d.statut === "paye")
    .reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);

  const kpis = [
    { label: "Contrats",         value: String(totalContrats),              caption: "Tous statuts confondus",  icon: FileText },
    { label: "Montant contrats", value: formatMontantCourt(montantContrats), caption: "Montant actualisé total", icon: TrendingUp },
    { label: "Engagés",          value: formatMontantCourt(montantEngage),   caption: "Total décomptes soumis",  icon: CheckCircle2 },
    { label: "Cumul payé",       value: formatMontantCourt(cumulPaye),       caption: "Décomptes payés",         icon: DollarSign },
  ];

  const validationsEnCours = useMemo(() => {
    if (!circuit.length) return [];
    return circuit.map(etape => ({
      profil_code: etape.profil_code,
      libelle:     etape.libelle,
      count:       decomptes.filter(d => d.statut === etape.statut_avant).length,
    }));
  }, [circuit, decomptes]);

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
    <div className="space-y-5">
      <PageHeader
        title="Tableau de bord"
        description="Vue synthétique de l'activité sous-traitance"
      />

      <KpiStrip items={kpis} columns={4} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Validations en cours */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Validations en cours</CardTitle>
              <CardDescription>Décomptes en attente par profil</CardDescription>
            </div>
            <Link
              to="/decomptes"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-green-600 hover:text-green-700"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {validationsEnCours.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-400">Aucune validation en attente.</p>
            ) : (
              <div className="divide-y divide-line-100">
                {validationsEnCours.map(v => (
                  <div key={v.profil_code} className="flex items-center gap-3 py-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                        v.count > 0
                          ? "bg-green-50 border border-green-300 text-green-700"
                          : "bg-surface-50 border border-line-200 text-ink-300"
                      }`}
                    >
                      {v.count}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink-900">{v.profil_code.toUpperCase()}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{v.libelle}</p>
                    </div>
                    {v.count > 0 && (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 whitespace-nowrap">
                        En attente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Règlements en instance */}
        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Règlements en instance</CardTitle>
              <CardDescription>Décomptes en circuit non encore payés</CardDescription>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Total</p>
              <MoneyDisplay amount={totalReglements} className="text-sm font-bold text-green-700" />
            </div>
          </CardHeader>
          <CardContent>
            {reglements.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-400">Aucun règlement en instance.</p>
            ) : (
              <div className="divide-y divide-line-100">
                {reglements.map(r => (
                  <div key={r.designation} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />
                      <p className="truncate text-[13px] text-ink-700">{r.designation}</p>
                    </div>
                    <MoneyDisplay
                      amount={r.montant}
                      variant="small"
                      className="shrink-0 font-semibold text-ink-900"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
