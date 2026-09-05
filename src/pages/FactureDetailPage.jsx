import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, CheckCircle2, Loader2, FileDown } from "lucide-react";
import { useFacture, useFactureStatut } from "../hooks/useFactures";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

const TYPES = {
  fac_ava: { label: "Avance",       cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  fac_stt: { label: "Facture STT",  cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  fac_cse: { label: "Facture CSE",  cls: "bg-teal-50 text-teal-700 border border-teal-200" },
};

function TypeBadge({ type }) {
  const t = TYPES[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${t.cls}`}>
      {t.label}
    </span>
  );
}

function InfoItem({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm font-medium text-gray-800">{children ?? "—"}</div>
    </div>
  );
}

function FinRow({ label, amount, accent, bold, muted }) {
  return (
    <div className={`flex justify-between items-center py-2 ${bold ? "border-t border-gray-200 mt-1 pt-3" : ""}`}>
      <span className={`text-sm ${muted ? "text-gray-400" : "text-gray-600"}`}>{label}</span>
      <MoneyDisplay
        amount={amount ?? 0}
        variant="small"
        className={bold ? "text-gray-900 font-bold text-base" : accent ? "text-[#087F3E] font-semibold" : ""}
      />
    </div>
  );
}

export default function FactureDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { addToast } = useToast();

  const [showPayDialog,   setShowPayDialog]   = useState(false);
  const [refPaiement,     setRefPaiement]     = useState("");
  const [showAnnulDialog, setShowAnnulDialog] = useState(false);
  const [motifAnnul,      setMotifAnnul]      = useState("");

  const { data: facture, isLoading, isError } = useFacture(id);
  const statutMut = useFactureStatut();

  // ── Loading / Error ───────────────────────────────────────────────
  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>;
  }
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
  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  // ── Actions ───────────────────────────────────────────────────────
  async function handlePayer() {
    if (!refPaiement.trim()) return;
    try {
      await statutMut.mutateAsync({ id: parseInt(f.id, 10), statut: "payee" });
      addToast("Facture marquée comme payée.", "success");
      setShowPayDialog(false);
      setRefPaiement("");
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur lors du paiement.", "error");
    }
  }

  async function handleAnnuler() {
    try {
      await statutMut.mutateAsync({ id: parseInt(f.id, 10), statut: "annulee" });
      addToast("Facture annulée.", "success");
      setShowAnnulDialog(false);
      setMotifAnnul("");
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur lors de l'annulation.", "error");
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
      <PageHeader
        title={f.code}
        subtitle={f.numero_facture_externe ? `Réf. externe : ${f.numero_facture_externe}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <TypeBadge type={f.type} />
            <StatusBadge statut={f.statut} />
            <button
              onClick={() => {
                const token = localStorage.getItem("stt_token");
                window.open(`${import.meta.env.VITE_API_BASE}/api/pdf/facture/${id}?token=${token}`, "_blank");
              }}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <FileDown size={14} /> PDF
            </button>
          </div>
        }
      />

      {/* Info band */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
        <InfoItem label="Objet">{f.objet || "—"}</InfoItem>
        <InfoItem label="Date facture">{fmtDate(f.date_facture)}</InfoItem>
        <InfoItem label="Date échéance">{fmtDate(f.date_echeance)}</InfoItem>
        <InfoItem label="N° facture externe">{f.numero_facture_externe || "—"}</InfoItem>
      </div>

      {/* Main grid: financial + relations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial card */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Récapitulatif financier</h3>
          <div className="space-y-0.5">
            <FinRow label="Montant HT"              amount={f.montant_ht}  accent />
            <FinRow label={`TVA (${f.taux_tva ?? 0}%)`} amount={f.montant_tva} muted />
            <FinRow label="Montant TTC"             amount={f.montant_ttc} bold />
          </div>

          {/* Payment info if paid */}
          {f.statut === "payee" && (
            <div className="mt-5 bg-[#E8F5EE] border border-[#b5ddc8] rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-[#087F3E] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#065A2C]">
                <p>Payée le <strong>{fmtDate(f.date_paiement)}</strong></p>
                {f.reference_paiement && (
                  <p className="text-xs mt-0.5 font-mono text-[#087F3E]">Réf. {f.reference_paiement}</p>
                )}
              </div>
            </div>
          )}

          {/* Annulation info */}
          {f.statut === "annulee" && (
            <div className="mt-5 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium">Facture annulée</p>
              {f.motif_annulation && (
                <p className="text-xs text-red-700 mt-1">{f.motif_annulation}</p>
              )}
            </div>
          )}

          {/* Observations */}
          {f.observations && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Observations</p>
              <p className="text-sm text-gray-700 leading-relaxed">{f.observations}</p>
            </div>
          )}
        </div>

        {/* Relations card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Références</h3>

          {f.contrat && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contrat</p>
              <Link to={`/contrats/${f.contrat_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline font-mono">
                {f.contrat.code}
              </Link>
              {f.contrat.objet && (
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.contrat.objet}</p>
              )}
            </div>
          )}

          {f.decompte && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Décompte</p>
              <Link to={`/decomptes/${f.decompte_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline font-mono">
                {f.decompte.code}
              </Link>
            </div>
          )}

          {f.chantier && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chantier</p>
              <Link to={`/chantiers/${f.chantier_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline font-mono">
                {f.chantier.code}
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">{f.chantier.designation}</p>
            </div>
          )}

          {f.soustraitant && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sous-traitant</p>
              <Link to={`/sous-traitants/${f.soustraitant_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline">
                {f.soustraitant.raison_sociale}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Workflow actions — only for "emise" */}
      {f.statut === "emise" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</p>

          {/* Pay dialog */}
          {!showPayDialog && !showAnnulDialog && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowPayDialog(true)}
                className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Marquer payée
              </button>
              <button
                onClick={() => setShowAnnulDialog(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          )}

          {showPayDialog && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-medium text-gray-600 block mb-1">Référence de paiement</label>
                <input
                  autoFocus
                  placeholder="Ex : VIR-2025-0042"
                  value={refPaiement}
                  onChange={e => setRefPaiement(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                />
              </div>
              <button
                onClick={handlePayer}
                disabled={!refPaiement.trim() || statutMut.isPending}
                className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {statutMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmer
              </button>
              <button
                onClick={() => { setShowPayDialog(false); setRefPaiement(""); }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Annuler
              </button>
            </div>
          )}

          {showAnnulDialog && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-medium text-gray-600 block mb-1">Motif d'annulation (optionnel)</label>
                <input
                  autoFocus
                  placeholder="Motif…"
                  value={motifAnnul}
                  onChange={e => setMotifAnnul(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none"
                />
              </div>
              <button
                onClick={handleAnnuler}
                disabled={statutMut.isPending}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {statutMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirmer l'annulation
              </button>
              <button
                onClick={() => { setShowAnnulDialog(false); setMotifAnnul(""); }}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Retour
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
