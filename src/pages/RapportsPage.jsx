import { useNavigate } from "react-router-dom";
import { Wallet, FileText, BarChart3, DollarSign, AlertCircle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import ReportCard from "../components/ReportCard";

const REPORTS = [
  { id: "r1", icon: Wallet,      badge: "R1", title: "Budget sous-traitance / RAM",   description: "Budget prévu vs montants engagés par famille RAM et chantier" },
  { id: "r2", icon: FileText,    badge: "R2", title: "Contrats validés par RAM",       description: "État nominatif des contrats validés, regroupé par famille RAM" },
  { id: "r3", icon: FileText,    badge: "R3", title: "Contrats engagés par RAM",       description: "État nominatif des contrats actifs engagés, par famille RAM" },
  { id: "r4", icon: FileText,    badge: "R4", title: "Prestations réalisées / RAM",    description: "État nominatif des prestations réalisées par famille RAM" },
  { id: "r5", icon: BarChart3,   badge: "R5", title: "Cessions mensuelles / période",  description: "Montants cédés regroupés par mois et famille RAM" },
  { id: "r6", icon: BarChart3,   badge: "R6", title: "Cessions mensuelles / STT",      description: "Montants cédés regroupés par sous-traitant et famille RAM" },
  { id: "r7", icon: DollarSign,  badge: "R7", title: "Règlements réalisés",            description: "Décomptes payés — base de référence des règlements effectifs" },
  { id: "r8", icon: AlertCircle, badge: "R8", title: "Règlements en instance",         description: "Décomptes en circuit de validation, en attente de paiement" },
];

export default function RapportsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        subtitle="Rapports réglementaires MBA — analyses interactives et exports Excel"
      />
      <div className="grid grid-cols-4 gap-4">
        {REPORTS.map(r => (
          <ReportCard
            key={r.id}
            icon={r.icon}
            title={r.title}
            description={r.description}
            status="disponible"
            badge={r.badge}
            onView={() => navigate(`/rapports/${r.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
