import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, CheckCircle2, Loader2, FileDown, Building2, MapPin, FileText } from "lucide-react";
import { useFacture, useFactureStatut } from "../hooks/useFactures";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

const TYPE_INFO = {
  fac_ava: { label: "Avance de démarrage",       cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  fac_stt: { label: "Facture Sous-traitant",      cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  fac_cse: { label: "Facture CSE",               cls: "bg-teal-50 text-teal-700 border border-teal-200" },
};

function TypeBadge({ type }) {
  const t = TYPE_INFO[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${t.cls}`}>
      {t.label}
    </span>
  );
}

function InfoBlock({ icon: Icon, title, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {Icon && <Icon size={12} />}
        {title}
      </div>
      <div className="text-sm text-gray-800 leading-relaxed">{children}</div>
    </div>
  );
}

const fmt = n => n == null ? "—" : new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function buildLignes(f) {
  if (f.type === "fac_ava") {
    return [{ code: "A", libelle: "Avance de démarrage", montant: f.montant_ht, signe: "+" }];
  }
  // For CSE/STT: single summary line from stored montant_ht
  const label = f.type === "fac_cse" ? "Travaux — période facturée (net CSE)" : "Travaux — période facturée (net STT)";
  return [{ code: "B", libelle: label, montant: f.montant_ht, signe: "+" }];
}

export default function FactureDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const [showPayDialog,   setShowPayDialog]   = useState(false);
  const [refPaiement,     setRefPaiement]     = useState("");
  const [datePaiement,    setDatePaiement]    = useState(new Date().toISOString().slice(0, 10));
  const [showAnnulDialog, setShowAnnulDialog] = useState(false);
  const [motifAnnul,      setMotifAnnul]      = useState("");

  const { data: facture, isLoading, isError } = useFacture(id);
  const statutMut = useFactureStatut();

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  if (isError || !facture) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Facture introuvable</p>
        <button onClick={() => navigate("/factures")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const f = facture;
  const lignes = buildLignes(f);
  const typeInfo = TYPE_INFO[f.type] ?? { label: f.type };

  // Période depuis le décompte lié
  const periode = (() => {
    const ec = f.decompte?.etat_cession;
    if (!ec?.periode_debut) return null;
    const fmt2 = s => new Date(s).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (ec.periode_fin && ec.periode_fin !== ec.periode_debut) return `${fmt2(ec.periode_debut)} – ${fmt2(ec.periode_fin)}`;
    return fmt2(ec.periode_debut);
  })();

  async function handlePayer() {
    if (!refPaiement.trim() || !datePaiement) return;
    try {
      await statutMut.mutateAsync({ id: parseInt(f.id, 10), statut: "payee", reference_paiement: refPaiement.trim(), date_paiement: datePaiement });
      addToast("Facture marquée comme payée.", "success");
      setShowPayDialog(false); setRefPaiement(""); setDatePaiement(new Date().toISOString().slice(0, 10));
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? err.response?.data?.message ?? "Erreur.", "error");
    }
  }

  async function handleAnnuler() {
    try {
      await statutMut.mutateAsync({ id: parseInt(f.id, 10), statut: "annulee", motif_annulation: motifAnnul || null });
      addToast("Facture annulée.", "success");
      setShowAnnulDialog(false); setMotifAnnul("");
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur.", "error");
    }
  }

  async function downloadPDF() {
    try {
      const token = localStorage.getItem("stt_token");
      const resp = await fetch(`${import.meta.env.VITE_API_BASE}/api/pdf/facture/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) { addToast("Erreur lors du téléchargement.", "error"); return; }
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      addToast("Erreur lors du téléchargement.", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/factures")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Factures
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{f.code}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Émise par la Compagnie Sahélienne d'Entreprises</p>
          <h1 className="text-2xl font-bold text-gray-900">{f.code}</h1>
          <p className="text-base text-gray-500 mt-0.5">{typeInfo.label}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <TypeBadge type={f.type} />
          <StatusBadge statut={f.statut} />
          <button onClick={downloadPDF}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <FileDown size={14} /> Télécharger PDF
          </button>
        </div>
      </div>

      {/* Info blocks */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        {f.soustraitant && (
          <InfoBlock icon={Building2} title="Sous-traitant">
            <p className="font-semibold">{f.soustraitant.raison_sociale}</p>
            {f.soustraitant.ninea && <p className="text-xs text-gray-400 mt-0.5">NINEA {f.soustraitant.ninea}</p>}
          </InfoBlock>
        )}
        {f.chantier && (
          <InfoBlock icon={MapPin} title="Chantier">
            <p>{f.chantier.designation}</p>
          </InfoBlock>
        )}
        {f.contrat && (
          <InfoBlock icon={FileText} title="Contrat">
            <Link to={`/contrats/${f.contrat_id}`} className="font-mono font-semibold text-[#087F3E] hover:underline">
              {f.contrat.code}
            </Link>
            {f.contrat.montant_actuel != null && (
              <p className="text-xs text-gray-400 mt-0.5">Marché actualisé : {fmt(f.contrat.montant_actuel)}</p>
            )}
          </InfoBlock>
        )}
        <InfoBlock title="Décompte concerné">
          {f.decompte ? (
            <>
              <Link to={`/decomptes/${f.decompte_id}`} className="font-mono font-semibold text-[#087F3E] hover:underline">
                {f.decompte.code}
              </Link>
              {periode && <p className="text-xs text-gray-400 mt-0.5">{periode}</p>}
            </>
          ) : (
            <span className="text-gray-400">— (facture d'avance)</span>
          )}
        </InfoBlock>
      </div>

      {/* Document lignes + totaux */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">Réf.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Désignation</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lignes.map(l => (
              <tr key={l.code} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-mono text-sm font-bold text-gray-500">{l.code}</td>
                <td className="px-4 py-4 text-sm text-gray-700">{l.libelle}</td>
                <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-gray-800">
                  {fmt(l.montant)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial summary */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Net à régler HTVA</span>
            <span className="font-semibold text-gray-700 font-mono">{fmt(f.montant_ht)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">TVA ({f.taux_tva ?? 18}%)</span>
            <span className="text-gray-500 font-mono">{fmt(f.montant_tva)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-300">
            <span className="text-base font-bold text-gray-900">Net à régler TTC</span>
            <span className="text-lg font-bold text-gray-900 font-mono">{fmt(f.montant_ttc)}</span>
          </div>
        </div>

        {/* Payment / Annulation info */}
        {f.statut === "payee" && (
          <div className="border-t border-[#b5ddc8] bg-[#E8F5EE] px-6 py-4 flex items-start gap-3">
            <CheckCircle2 size={16} className="text-[#087F3E] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#065A2C]">
              <p>Facture payée le <strong>{fmtDate(f.date_paiement)}</strong></p>
              {f.reference_paiement && (
                <p className="text-xs mt-0.5 font-mono text-[#087F3E]">référence {f.reference_paiement}</p>
              )}
            </div>
          </div>
        )}

        {f.statut === "annulee" && (
          <div className="border-t border-red-200 bg-red-50 px-6 py-4">
            <p className="text-sm text-red-800 font-medium">Facture annulée</p>
            {f.motif_annulation && <p className="text-xs text-red-700 mt-1">{f.motif_annulation}</p>}
          </div>
        )}
      </div>

      {/* Observations */}
      {f.observations && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observations</p>
          <p className="text-sm text-gray-700 leading-relaxed">{f.observations}</p>
        </div>
      )}

      {/* Actions */}
      {(f.statut === "brouillon" || f.statut === "emise") && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</p>

          {f.statut === "brouillon" && (
            <button
              onClick={async () => {
                try {
                  await statutMut.mutateAsync({ id: parseInt(f.id, 10), statut: "emise" });
                  addToast("Facture émise.", "success");
                } catch (err) {
                  addToast(err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? "Erreur.", "error");
                }
              }}
              disabled={statutMut.isPending}
              className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {statutMut.isPending && <Loader2 size={14} className="animate-spin" />}
              Émettre la facture
            </button>
          )}

          {f.statut === "emise" && !showPayDialog && !showAnnulDialog && (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowPayDialog(true)}
                className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors">
                Marquer payée
              </button>
              <button onClick={() => setShowAnnulDialog(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                Annuler
              </button>
            </div>
          )}

          {showPayDialog && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[180px]">
                <label className="text-xs font-medium text-gray-600 block mb-1">Date de paiement *</label>
                <input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-gray-600 block mb-1">Référence de paiement *</label>
                <input autoFocus placeholder="Ex : VIR-2025-0042" value={refPaiement} onChange={e => setRefPaiement(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
              </div>
              <button onClick={handlePayer} disabled={!refPaiement.trim() || !datePaiement || statutMut.isPending}
                className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
                {statutMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmer
              </button>
              <button onClick={() => { setShowPayDialog(false); setRefPaiement(""); }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">Annuler</button>
            </div>
          )}

          {showAnnulDialog && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-medium text-gray-600 block mb-1">Motif d'annulation (optionnel)</label>
                <input autoFocus placeholder="Motif…" value={motifAnnul} onChange={e => setMotifAnnul(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none" />
              </div>
              <button onClick={handleAnnuler} disabled={statutMut.isPending}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
                {statutMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmer l'annulation
              </button>
              <button onClick={() => { setShowAnnulDialog(false); setMotifAnnul(""); }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">Retour</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
