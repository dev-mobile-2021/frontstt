import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Phone, Mail, MapPin, Building2, Hash, AlertTriangle, Globe, FileText, Calendar, ExternalLink } from "lucide-react";
import { useSousTraitant } from "../hooks/useSousTraitants";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import Tabs from "../components/Tabs";
import { SkeletonCard } from "../components/Skeleton";

function TabContrats({ sttId }) {
  const navigate = useNavigate();
  const { data, isLoading } = useContratsPaginated({ soustraitant_id: Number(sttId), count: 100 });
  const contrats = data?.data ?? [];
  return (
    <div className="border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Code", "Chantier", "Objet", "Montant HT", "Statut", ""].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Montant HT" ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>}
          {!isLoading && contrats.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun contrat pour ce sous-traitant</td></tr>}
          {contrats.map(c => (
            <tr key={c.id} onClick={() => navigate(`/contrats/${c.id}`)} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs text-[#087F3E] font-semibold">{c.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{c.chantier?.designation ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{c.objet ?? "—"}</td>
              <td className="px-4 py-3 text-right"><MoneyDisplay amount={c.montant_actuel ?? 0} variant="small" className="font-semibold" /></td>
              <td className="px-4 py-3"><StatusBadge statut={c.statut} /></td>
              <td className="px-4 py-3"><ExternalLink size={14} className="text-gray-400 hover:text-[#087F3E]" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabDecomptes({ sttId }) {
  const navigate = useNavigate();
  // On récupère d'abord les contrats du STT pour filtrer les décomptes
  const { data: contratsData } = useContratsPaginated({ soustraitant_id: Number(sttId), count: 100 });
  const contratIds = (contratsData?.data ?? []).map(c => c.id);
  // On prend le premier contrat_id s'il y en a un — pour un vrai multi-contrat il faudrait un filtre backend
  const firstContratId = contratIds[0] ?? null;
  const { data, isLoading } = useDecomptesPaginated({ contrat_id: firstContratId, count: 50 });
  const decomptes = firstContratId ? (data?.data ?? []) : [];
  const fmtPeriode = d => {
    const ec = d.etat_cession;
    if (!ec?.periode_debut) return "—";
    return new Date(ec.periode_debut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  };
  return (
    <div className="border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Code", "Contrat", "Période", "Net HT", "Statut"].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Net HT" ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>}
          {!isLoading && decomptes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun décompte pour ce sous-traitant</td></tr>}
          {decomptes.map(d => (
            <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs text-[#087F3E] font-semibold">{d.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700 font-mono">{d.contrat?.code ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{fmtPeriode(d)}</td>
              <td className="px-4 py-3 text-right"><MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="font-semibold" /></td>
              <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function SousTraitantFormPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");

  const { data: stt, isLoading, isError } = useSousTraitant(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (isError || !stt) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Sous-traitant introuvable</p>
        <button onClick={() => navigate("/sous-traitants")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const isBlackliste = stt.statut === "blackliste";

  const tabs = [
    { id: "info",      label: "Informations", icon: Building2 },
    { id: "contrats",  label: "Contrats",     icon: Hash },
    { id: "decomptes", label: "Décomptes",    icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate("/sous-traitants")}
          className="hover:text-[#087F3E] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={14} /> Sous-traitants
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{stt.raison_sociale}</span>
      </div>

      <PageHeader
        title={stt.raison_sociale}
        subtitle={[stt.forme_juridique, stt.specialites].filter(Boolean).join(" · ")}
        action={
          <div className="flex items-center gap-2">
            {isBlackliste && (
              <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1 font-semibold">
                <AlertTriangle size={11} /> Blacklisté
              </span>
            )}
            <StatusBadge statut={stt.statut} />
          </div>
        }
      />

      {/* Blacklist alert */}
      {isBlackliste && stt.motif_blacklist && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Motif de blacklistage</p>
            <p className="mt-0.5 text-red-600">{stt.motif_blacklist}</p>
          </div>
        </div>
      )}

      {/* Code badge */}
      {stt.code && (
        <div className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 font-mono">
          <Hash size={12} /> {stt.code}
          {stt.code_x3 && <><span className="text-gray-300">·</span> X3 : {stt.code_x3}</>}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-6">

          {activeTab === "info" && (
            <div className="grid grid-cols-2 gap-8">
              <Section title="Identité légale">
                <InfoRow icon={Hash}      label="NINEA"              value={stt.ninea} />
                <InfoRow icon={FileText}  label="Registre de commerce" value={stt.registre_commerce} />
                <InfoRow icon={Building2} label="Forme juridique"    value={stt.forme_juridique} />
                <InfoRow icon={Hash}      label="Spécialités"        value={stt.specialites} />
                {stt.code_x3 && <InfoRow icon={Hash} label="Code X3" value={stt.code_x3} />}
              </Section>

              <Section title="Coordonnées">
                <InfoRow icon={MapPin} label="Adresse" value={stt.adresse} />
                <InfoRow icon={MapPin} label="Ville"   value={stt.ville} />
                <InfoRow icon={Phone}  label="Tél."    value={stt.telephone} />
                <InfoRow icon={Mail}   label="Email"   value={stt.email} />
                <InfoRow icon={Globe}  label="Site web" value={stt.site_web} />
              </Section>

              {(stt.contact_nom || stt.contact_telephone || stt.contact_email) && (
                <Section title="Contact principal">
                  <InfoRow icon={Building2} label="Nom"   value={stt.contact_nom} />
                  <InfoRow icon={Phone}     label="Tél."  value={stt.contact_telephone} />
                  <InfoRow icon={Mail}      label="Email" value={stt.contact_email} />
                </Section>
              )}
            </div>
          )}

          {activeTab === "contrats" && <TabContrats sttId={id} />}
          {activeTab === "decomptes" && <TabDecomptes sttId={id} />}
        </div>
      </div>
    </div>
  );
}
