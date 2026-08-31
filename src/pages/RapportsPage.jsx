import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Shield, PieChart, TrendingDown, AlertCircle,
  Wallet, Award, FileSpreadsheet, ArrowLeft,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import PageHeader from "../components/PageHeader";
import ReportCard from "../components/ReportCard";
import MoneyDisplay from "../components/MoneyDisplay";
import { contrats } from "../data/contrats";
import { useDecomptes } from "../context/DecomptesContext";
import { useEtatsCession } from "../context/EtatsCessionContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";

const chanMap = Object.fromEntries(chantiers.map(c => [c.id, c]));
const sttMap  = Object.fromEntries(sousTraitants.map(s => [s.id, s]));

const REPORTS = [
  { id: "decomptes-chantier", icon: BarChart3,       title: "État des décomptes par chantier",     description: "Montants validés et payés par chantier", status: "disponible" },
  { id: "retenue-garantie",   icon: Shield,           title: "Suivi de la retenue de garantie",     description: "RG cumulée, restituée et solde restant par contrat", status: "disponible" },
  { id: "cessions-stt",       icon: PieChart,         title: "Cessions consolidées par sous-traitant", description: "Répartition MTX / MTL / RH sur toutes les cessions", status: "disponible" },
  { id: "avances",            icon: TrendingDown,     title: "Avances et remboursements en cours",  description: "Suivi des avances de démarrage non encore remboursées", status: "bientot" },
  { id: "rejets",             icon: AlertCircle,      title: "Historique des rejets de décompte",   description: "Liste et causes des décomptes rejetés", status: "bientot" },
  { id: "budget-ram",         icon: Wallet,           title: "Suivi budgétaire par famille RAM",    description: "Comparatif budget / engagé par famille sur tous les chantiers", status: "bientot" },
  { id: "performance-stt",    icon: Award,            title: "Performance des sous-traitants",      description: "Délais de soumission, taux de rejet, conformité", status: "bientot" },
  { id: "export-compta",      icon: FileSpreadsheet,  title: "Export comptable mensuel",            description: "Export CSV/Excel pour interface Sage X3", status: "bientot" },
];

const GREEN = "#087F3E";
const CHART_COLORS = [GREEN, "#10A651", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899"];

// ── Rapport 1: Décomptes par chantier ────────────────────────────
function RapportDeccompteChantier() {
  const { decomptes } = useDecomptes();
  const data = useMemo(() => chantiers.map(ch => {
    const chContrats = contrats.filter(c => c.chantierId === ch.id);
    const chDecomptes = decomptes.filter(d => chContrats.some(c => c.id === d.contratId));
    const totalValide = chDecomptes.filter(d => ["Approuvé","Payé"].includes(d.statut)).reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);
    const totalPaye   = chDecomptes.filter(d => d.statut === "Payé").reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);
    return {
      name: ch.code,
      libelle: ch.nom,
      nbDecomptes: chDecomptes.length,
      valide: Math.round(totalValide / 1000000),
      paye: Math.round(totalPaye / 1000000),
    };
  }).filter(d => d.nbDecomptes > 0), [decomptes]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Montants par chantier (en M FCFA)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="M" />
            <Tooltip formatter={(v) => `${v} M FCFA`} />
            <Bar dataKey="paye"   fill={GREEN}     name="Payé"    radius={[4,4,0,0]} />
            <Bar dataKey="valide" fill="#10A651AA" name="Approuvé" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Chantier", "Nb décomptes", "Total validé (net HT)", "Total payé"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(d => (
              <tr key={d.name} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 text-sm">{d.libelle}</p>
                  <p className="text-xs text-gray-400 font-mono">{d.name}</p>
                </td>
                <td className="px-4 py-3 text-center font-semibold">{d.nbDecomptes}</td>
                <td className="px-4 py-3"><MoneyDisplay amount={d.valide * 1000000} variant="small" /></td>
                <td className="px-4 py-3"><MoneyDisplay amount={d.paye * 1000000} variant="small" className="text-[#087F3E] font-semibold" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Rapport 2: Retenue de garantie ──────────────────────────────
function RapportRetenueGarantie() {
  const { decomptes } = useDecomptes();
  const rows = useMemo(() => contrats.map(c => {
    const cDecomptes = decomptes.filter(d => d.contratId === c.id);
    const rgCumulee = cDecomptes.reduce((s, d) => s + (d.montantsCalcules?.c_retenueGarantie || 0), 0);
    const rgRestituee = c.statut === "Clôturé" ? rgCumulee : 0;
    return { ...c, rgCumulee, rgRestituee, rgSolde: rgCumulee - rgRestituee };
  }).filter(c => c.rgCumulee > 0), [decomptes]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Contrat", "Taux RG", "RG cumulée", "RG restituée", "Solde RG", "Progression"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => {
            const pct = r.rgCumulee > 0 ? Math.round((r.rgRestituee / r.rgCumulee) * 100) : 0;
            return (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-mono font-semibold text-gray-900">{r.code}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[140px]">{r.objet}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.tauxRG}%</td>
                <td className="px-4 py-3"><MoneyDisplay amount={r.rgCumulee} variant="small" /></td>
                <td className="px-4 py-3"><MoneyDisplay amount={r.rgRestituee} variant="small" className="text-[#087F3E]" /></td>
                <td className="px-4 py-3"><MoneyDisplay amount={r.rgSolde} variant="small" className={r.rgSolde > 0 ? "text-amber-600" : "text-gray-400"} /></td>
                <td className="px-4 py-3 w-32">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Rapport 3: Cessions par sous-traitant ───────────────────────
function RapportCessionsStt() {
  const { etats } = useEtatsCession();
  const { decomptes } = useDecomptes();
  const { pieData, tableData } = useMemo(() => {
    let totalMTX = 0, totalMTL = 0, totalRH = 0;
    const bySTT = {};

    etats.forEach(e => {
      const sttId = contrats.find(ct => ct.id === e.contratId)?.sousTraitantId;
      if (!sttId) return;
      if (!bySTT[sttId]) bySTT[sttId] = { sttId, mtx: 0, mtl: 0, rh: 0, remboursement: 0 };
      bySTT[sttId].mtx += e.sections.MTX?.totalValorise || 0;
      bySTT[sttId].mtl += e.sections.MTL?.totalValorise || 0;
      bySTT[sttId].rh  += e.sections.RH?.totalValorise || 0;
      totalMTX += e.sections.MTX?.totalValorise || 0;
      totalMTL += e.sections.MTL?.totalValorise || 0;
      totalRH  += e.sections.RH?.totalValorise || 0;
    });

    // Cumul remboursé = postes H (MTX) + J (MTL) + L (RH) des décomptes du contrat.
    decomptes.forEach(d => {
      const sttId = contrats.find(ct => ct.id === d.contratId)?.sousTraitantId;
      if (!sttId || !bySTT[sttId]) return;
      const poste = (code) => d.lignes?.find(l => l.codePoste === code)?.mensuel || 0;
      bySTT[sttId].remboursement += poste("H") + poste("J") + poste("L");
    });

    const pieData = [
      { name: "Matériaux (MTX)", value: totalMTX, color: "#F59E0B" },
      { name: "Matériel (MTL)",  value: totalMTL, color: "#3B82F6" },
      { name: "Ressources humaines (RH)", value: totalRH, color: "#8B5CF6" },
    ].filter(d => d.value > 0);

    const tableData = Object.values(bySTT).map(row => ({
      ...row,
      total: row.mtx + row.mtl + row.rh,
      stt: sttMap[row.sttId]?.raisonSociale || row.sttId,
    })).sort((a, b) => b.total - a.total);

    return { pieData, tableData };
  }, [etats, decomptes]);

  const totalGlobal = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-8">
        <div className="flex-shrink-0">
          <ResponsiveContainer width={220} height={200}>
            <RePieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-gray-600">{d.name}</span>
              </div>
              <div className="text-right">
                <MoneyDisplay amount={d.value} variant="small" className="font-semibold text-gray-800" />
                <p className="text-xs text-gray-400">{totalGlobal > 0 ? Math.round(d.value / totalGlobal * 100) : 0}%</p>
              </div>
            </div>
          ))}
          {totalGlobal === 0 && <p className="text-sm text-gray-400">Aucune cession enregistrée.</p>}
        </div>
      </div>

      {tableData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Sous-traitant", "Total cessions", "dont MTX", "dont MTL", "dont RH", "Remboursé", "Écart"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.map(row => (
                <tr key={row.sttId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{row.stt}</td>
                  <td className="px-4 py-3"><MoneyDisplay amount={row.total} variant="small" className="font-semibold" /></td>
                  <td className="px-4 py-3 text-amber-600 text-xs">{row.mtx > 0 ? new Intl.NumberFormat("fr-FR").format(row.mtx) : "—"}</td>
                  <td className="px-4 py-3 text-blue-600 text-xs">{row.mtl > 0 ? new Intl.NumberFormat("fr-FR").format(row.mtl) : "—"}</td>
                  <td className="px-4 py-3 text-purple-600 text-xs">{row.rh > 0 ? new Intl.NumberFormat("fr-FR").format(row.rh) : "—"}</td>
                  <td className="px-4 py-3 text-[#087F3E] text-xs">{row.remboursement > 0 ? new Intl.NumberFormat("fr-FR").format(row.remboursement) : "—"}</td>
                  <td className="px-4 py-3 text-xs"><MoneyDisplay amount={row.total - row.remboursement} variant="small" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function RapportsPage() {
  const [activeReport, setActiveReport] = useState(null);

  function handleView(id) { setActiveReport(id); }

  const activeRep = REPORTS.find(r => r.id === activeReport);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        subtitle="Rapports standards — remplacent le suivi Excel"
        action={activeReport && (
          <button
            onClick={() => setActiveReport(null)}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={14} /> Retour aux rapports
          </button>
        )}
      />

      {!activeReport ? (
        <div className="grid grid-cols-4 gap-4">
          {REPORTS.map(r => (
            <ReportCard
              key={r.id}
              icon={r.icon}
              title={r.title}
              description={r.description}
              status={r.status}
              onView={() => handleView(r.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E8F5EE] rounded-lg flex items-center justify-center">
              {activeRep && <activeRep.icon size={18} className="text-[#087F3E]" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{activeRep?.title}</h2>
              <p className="text-sm text-gray-500">{activeRep?.description}</p>
            </div>
          </div>

          {activeReport === "decomptes-chantier"  && <RapportDeccompteChantier />}
          {activeReport === "retenue-garantie"    && <RapportRetenueGarantie />}
          {activeReport === "cessions-stt"        && <RapportCessionsStt />}
        </div>
      )}
    </div>
  );
}
