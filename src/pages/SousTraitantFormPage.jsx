import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Star, Phone, Mail, MapPin, Building2, Calendar, Hash, AlertTriangle, Download, FileCheck } from "lucide-react";
import { sousTraitants } from "../data/sous_traitants";
import { contrats } from "../data/contrats";
import { useDecomptes } from "../context/DecomptesContext";
import { chantiers } from "../data/chantiers";
import { getMontantActualise } from "../utils/contratMetrics";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import MoneyDisplay from "../components/MoneyDisplay";
import { useState } from "react";

const chanMap  = Object.fromEntries(chantiers.map(c => [c.id, c]));
const contratMap = Object.fromEntries(contrats.map(c => [c.id, c]));

function Stars({ n }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={16} className={i <= n ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
      ))}
      <span className="text-sm text-gray-500 ml-1">{n}/5</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

function docBadgeProps(doc) {
  const days = Math.round((new Date(doc.dateExpiration) - new Date()) / 86400000);
  if (doc.statutValidite === "Expiré") {
    return { label: "Expiré", color: "bg-red-50 text-red-700 border-red-200", days: null };
  }
  if (doc.statutValidite === "Expire bientôt") {
    return { label: "Expire bientôt", color: "bg-amber-50 text-amber-700 border-amber-200", days: Math.max(0, days) };
  }
  return { label: "Valide", color: "bg-[#E8F5EE] text-[#065A2C] border-[#b5ddc8]", days: null };
}

function DocumentCard({ doc }) {
  const badge = docBadgeProps(doc);
  return (
    <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${badge.color}`}>
        <FileCheck size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{doc.type}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span>Émis le {new Date(doc.dateEmission).toLocaleDateString("fr-FR")}</span>
          <span className="text-gray-300">·</span>
          <span>Expire le {new Date(doc.dateExpiration).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${badge.color}`}>
          {badge.label}{badge.days !== null ? ` — ${badge.days}j` : ""}
        </span>
        <button className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 hover:text-[#087F3E] hover:border-[#087F3E] px-2.5 py-1.5 rounded-lg transition-colors">
          <Download size={12} /> Télécharger
        </button>
      </div>
    </div>
  );
}

export default function SousTraitantFormPage() {
  const { decomptes } = useDecomptes();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");

  const stt = useMemo(() => sousTraitants.find(s => s.id === id), [id]);
  const sttContrats = useMemo(() => contrats.filter(c => c.sousTraitantId === id), [id]);
  const sttDecomptes = useMemo(() =>
    decomptes.filter(d => sttContrats.some(c => c.id === d.contratId)), [sttContrats]);

  if (!stt) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Sous-traitant introuvable</p>
        <button onClick={() => navigate("/sous-traitants")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour</button>
      </div>
    );
  }

  const montantTotal = sttContrats.reduce((s, c) => s + getMontantActualise(c), 0);
  const montantPaye  = sttDecomptes.filter(d => d.statut === "Payé").reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0);
  const contratsActifs = sttContrats.filter(c => c.statut === "En cours d'exécution").length;

  const hasDocExpire = stt.documentsQualifiants?.some(d => d.statutValidite === "Expiré");

  const tabs = [
    { id: "info",      label: "Informations générales", icon: Building2 },
    { id: "contrats",  label: "Contrats",              icon: Hash,     count: sttContrats.length },
    { id: "decomptes", label: "Décomptes",             icon: Calendar, count: sttDecomptes.length },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/sous-traitants")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Sous-traitants
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{stt.raisonSociale}</span>
      </div>

      <PageHeader
        title={stt.raisonSociale}
        subtitle={`${stt.secteurActivite} · ${stt.sigle} · NINEA ${stt.ninea}`}
        action={
          <div className="flex items-center gap-2">
            {hasDocExpire && (
              <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1 font-semibold">
                <AlertTriangle size={11} /> Doc. expiré
              </span>
            )}
            <StatusBadge statut={stt.statut} />
          </div>
        }
      />

      {/* KPI band */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Contrats actifs",      value: contratsActifs },
          { label: "Total engagé",         value: <MoneyDisplay amount={montantTotal} variant="small" className="text-gray-900 font-bold text-base" /> },
          { label: "Total payé (net HT)",  value: <MoneyDisplay amount={montantPaye} variant="small" className="text-[#087F3E] font-bold text-base" /> },
          { label: "Notation",             value: <Stars n={stt.notation || 0} /> },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <div className="text-base font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-6">

          {/* Tab: Info */}
          {activeTab === "info" && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identité légale</h3>
                <InfoRow icon={Hash}     label="NINEA"           value={stt.ninea} />
                <InfoRow icon={Hash}     label="RCCM"            value={stt.rccm} />
                <InfoRow icon={Calendar} label="Date d'agrément" value={stt.dateAgrement ? new Date(stt.dateAgrement).toLocaleDateString("fr-FR") : "—"} />
                <InfoRow icon={Building2} label="Secteur"        value={stt.secteurActivite} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h3>
                <InfoRow icon={Building2} label="Nom"      value={stt.contact?.nom} />
                <InfoRow icon={Building2} label="Fonction" value={stt.contact?.fonction} />
                <InfoRow icon={Phone}     label="Tél."     value={stt.contact?.telephone} />
                <InfoRow icon={Mail}      label="Email"    value={stt.contact?.email} />
                <InfoRow icon={MapPin}    label="Adresse"  value={`${stt.adresse}, ${stt.ville}`} />
              </div>
              <div className="col-span-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Coordonnées bancaires</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Banque</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{stt.coordonneesBancaires?.banque || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">IBAN</p>
                    <p className="text-sm font-mono font-medium text-gray-800 mt-0.5">{stt.coordonneesBancaires?.iban || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Documents qualifiants */}
              {stt.documentsQualifiants?.length > 0 && (
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents qualifiants</h3>
                    {hasDocExpire && (
                      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle size={12} /> Un document a expiré — renouvellement requis
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {stt.documentsQualifiants.map((doc, i) => (
                      <DocumentCard key={i} doc={doc} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Contrats */}
          {activeTab === "contrats" && (
            <div>
              {sttContrats.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Aucun contrat pour ce sous-traitant.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Code", "Chantier", "Objet", "Montant HT", "Statut"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sttContrats.map(c => (
                      <tr key={c.id} onClick={() => navigate(`/contrats/${c.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.code}</td>
                        <td className="px-4 py-3 text-xs">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/chantiers/${c.chantierId}`); }}
                            className="text-[#087F3E] underline hover:text-[#065A2C] transition-colors"
                          >
                            {chanMap[c.chantierId]?.nom || c.chantierId}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">{c.objet}</td>
                        <td className="px-4 py-3"><MoneyDisplay amount={getMontantActualise(c)} variant="small" /></td>
                        <td className="px-4 py-3"><StatusBadge statut={c.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab: Décomptes */}
          {activeTab === "decomptes" && (
            <div>
              {sttDecomptes.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Aucun décompte.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Code décompte", "Contrat", "Période", "Net HT", "Statut"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sttDecomptes.map(d => (
                      <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{d.code}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                          {contratMap[d.contratId]?.code || d.contratId}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(d.dateDebut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3"><MoneyDisplay amount={d.montantsCalcules?.net_ht || 0} variant="small" /></td>
                        <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
