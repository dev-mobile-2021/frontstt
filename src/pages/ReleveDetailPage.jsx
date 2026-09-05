import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Send, CheckCircle2, XCircle, Download, AlertTriangle,
  Building2, Hash, FileText, Loader2,
} from "lucide-react";
import { useReleve, useChangerStatutReleve } from "../hooks/useReleves";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const LIGNES = [
  "A — Travaux exécutés",
  "D — Retenue de garantie",
  "G — Cessions matériaux",
  "I — Cessions matériel",
  "K — Cessions RH",
];

export default function ReleveDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: releve, isLoading } = useReleve(id);
  const changerStatut = useChangerStatutReleve();

  const [showContestForm, setShowContestForm]   = useState(false);
  const [motif, setMotif]                       = useState("");
  const [ligneContestee, setLigneContestee]     = useState(LIGNES[0]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  if (!releve) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Relevé introuvable</p>
        <button onClick={() => navigate("/releves")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour à la liste</button>
      </div>
    );
  }

  const contrat = releve.contrat;
  const stt     = contrat?.soustraitant;
  const chantier = contrat?.chantier;
  const decompte = releve.decompte;

  function handleEnvoyer() {
    changerStatut.mutate(
      { id: releve.id, statut: "envoye" },
      { onSuccess: () => addToast("Relevé envoyé au sous-traitant.", "success") }
    );
  }

  function handleAccepter() {
    changerStatut.mutate(
      { id: releve.id, statut: "accepte" },
      { onSuccess: () => addToast("Relevé accepté par le sous-traitant.", "success") }
    );
  }

  function handleContester() {
    if (!motif.trim()) { addToast("Le motif de contestation est requis.", "error"); return; }
    changerStatut.mutate(
      { id: releve.id, statut: "conteste", motif_contestation: motif.trim(), ligne_contestee: ligneContestee },
      {
        onSuccess: () => {
          addToast("Contestation enregistrée.", "error");
          setShowContestForm(false);
          setMotif("");
        },
      }
    );
  }

  const busy = changerStatut.isLoading;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/releves")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Relevés
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{releve.code}</span>
      </div>

      <PageHeader
        title="Relevé de compte sous-traitant"
        subtitle={releve.code}
        action={<StatusBadge statut={releve.statut} />}
      />

      {/* En-tête identifiants */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {[
          { icon: Building2, label: "Chantier",               value: chantier?.designation || "—" },
          { icon: Hash,      label: "Sous-traitant",          value: stt?.raison_sociale || "—" },
          { icon: FileText,  label: "Contrat",                value: contrat?.code || "—" },
          { icon: FileText,  label: "Décompte concerné",      value: decompte?.code || "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Icon size={11} />{label}</p>
            <p className="text-sm font-medium text-gray-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-3 gap-5">
        {[
          { label: "Date de génération", value: formatDate(releve.date_generation) },
          { label: "Date d'envoi",       value: formatDate(releve.date_envoi) },
          { label: "Date de retour",     value: formatDate(releve.date_retour) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-gray-800 mt-1">{value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">

        {releve.statut === "genere" && (
          <button
            onClick={handleEnvoyer}
            disabled={busy}
            className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={15} />}
            Envoyer au sous-traitant
          </button>
        )}

        {releve.statut === "envoye" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">Réponse du sous-traitant</p>
            {!showContestForm ? (
              <div className="flex gap-2">
                <button
                  onClick={handleAccepter}
                  disabled={busy}
                  className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Le sous-traitant accepte
                </button>
                <button
                  onClick={() => setShowContestForm(true)}
                  disabled={busy}
                  className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <XCircle size={15} /> Le sous-traitant conteste
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ligne contestée</label>
                  <select
                    value={ligneContestee}
                    onChange={e => setLigneContestee(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    {LIGNES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motif de contestation *</label>
                  <textarea
                    rows={3}
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder="Décrivez le motif…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleContester}
                    disabled={!motif.trim() || busy}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={15} />}
                    Confirmer la contestation
                  </button>
                  <button
                    onClick={() => { setShowContestForm(false); setMotif(""); }}
                    className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {releve.statut === "accepte" && (
          <div className="bg-[#E8F5EE] border border-[#b5ddc8] rounded-xl p-4">
            <p className="text-sm text-[#065A2C]">
              Relevé accepté le <strong>{formatDate(releve.date_retour)}</strong> — le sous-traitant peut émettre sa facture.
            </p>
          </div>
        )}

        {releve.statut === "conteste" && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Relevé contesté par le sous-traitant</p>
                {releve.ligne_contestee && (
                  <p className="text-xs text-red-600 mt-0.5">Ligne contestée : <strong>{releve.ligne_contestee}</strong></p>
                )}
                {releve.motif_contestation && (
                  <p className="text-sm text-red-700 mt-1.5 leading-relaxed">{releve.motif_contestation}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {releve.observations && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observations</p>
            <p className="text-sm text-gray-700">{releve.observations}</p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => addToast("Fonctionnalité PDF à venir.", "info")}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Download size={14} /> Télécharger en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
