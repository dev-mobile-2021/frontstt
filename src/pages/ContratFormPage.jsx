import { useState, useEffect } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Save, Loader2, AlertTriangle,
  Hash, FileText, Info, FilePlus, CheckCircle, Trash2, Plus, X, Paperclip,
  Upload, Download, File, Circle, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { useContrat, useSaveContrat, useContratStatut, useContratCircuit, useSoumettreContrat, useValiderContrat, useRejeterContrat } from "../hooks/useContrats";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useAvenantsByContrat, useSaveAvenant, useValiderAvenant, useDeleteAvenant } from "../hooks/useAvenants";
import { useAttachements } from "../hooks/useAttachements";
import { useBonCommandesByContrat, useSaveBonCommande, useSaveBonCommandeLigne, useDeleteBonCommandeLigne, useBonCommandeStatut, useDeleteBonCommande } from "../hooks/useBonCommandes";
import { useBaremesPaginated } from "../hooks/useBaremes";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { usePiecesJointes, useUploadPieceJointe, useDeletePieceJointe } from "../hooks/usePiecesJointes";
import { pieceJointeService } from "../services/pieceJointeService";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";
import { formatMontantCourt, formatDate } from "../utils/formatters";

// ─── Workflow transitions ────────────────────────────────────────
const TRANSITIONS = {
  brouillon: [{ statut: "actif",    label: "Activer",  color: "green" }],
  actif:     [
    { statut: "suspendu", label: "Suspendre", color: "amber" },
    { statut: "resilie",  label: "Résilier",  color: "red" },
    { statut: "termine",  label: "Terminer",  color: "gray" },
  ],
  suspendu: [
    { statut: "actif",   label: "Réactiver", color: "green" },
    { statut: "resilie", label: "Résilier",  color: "red" },
  ],
  termine: [{ statut: "cloture", label: "Clôturer", color: "gray" }],
  resilie: [],
  cloture: [],
};

const BTN_COLORS = {
  green: "bg-[#087F3E] hover:bg-[#065A2C] text-white",
  amber: "bg-amber-500 hover:bg-amber-600 text-white",
  red:   "bg-red-500 hover:bg-red-600 text-white",
  gray:  "bg-gray-500 hover:bg-gray-600 text-white",
};

function Field({ label, children, required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, disabled }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
    />
  );
}

function ReadonlyVal({ value, highlight }) {
  return (
    <div className={`border rounded-lg px-4 py-2.5 text-sm ${highlight ? "bg-[#E8F5EE] border-[#087F3E]/30 text-[#087F3E] font-medium" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
      {value || "—"}
    </div>
  );
}

function calcDuree(d1, d2) {
  if (!d1 || !d2) return null;
  const diff = Math.round((new Date(d2) - new Date(d1)) / 86400000);
  return diff > 0 ? `${diff} jours` : null;
}


// ─── Sub-tab: Décomptes ──────────────────────────────────────────
function DecomptesTab({ decomptes, contratId, isNew }) {
  if (isNew) return (
    <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour voir les décomptes.</p>
  );
  if (decomptes.length === 0) return (
    <div className="text-center py-12 text-gray-400 text-sm">
      <p className="font-medium text-gray-500">Aucun décompte</p>
      <Link to={`/decomptes/nouveau`} className="mt-3 inline-block text-xs text-[#087F3E] hover:underline">
        Créer un décompte →
      </Link>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link to="/decomptes/nouveau" className="inline-flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors">
          + Nouveau décompte
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Code</th>
            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Période</th>
            <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Net HT</th>
            <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">TTC</th>
            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2">Statut</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {decomptes.map(d => (
            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-2.5 pr-3 font-mono text-xs font-medium text-gray-900">{d.code}</td>
              <td className="py-2.5 pr-3 text-gray-500 text-xs">
                {d.periode_debut
                  ? new Date(d.periode_debut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
                  : d.date_echeance ? formatDate(d.date_echeance) : "—"}
              </td>
              <td className="py-2.5 pr-3 text-right font-semibold text-gray-800">{formatMontantCourt(parseFloat(d.montant_ht ?? 0))}</td>
              <td className="py-2.5 pr-3 text-right text-gray-600">{formatMontantCourt(parseFloat(d.montant_ttc ?? 0))}</td>
              <td className="py-2.5"><StatusBadge statut={d.statut} /></td>
              <td className="py-2.5 text-right">
                <Link to={`/decomptes/${d.id}`} className="text-xs text-[#087F3E] hover:underline">Voir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ─── Sub-tab: Paramétrage financier ─────────────────────────────
function ParametrageFinancierTab({ contrat, avenants }) {
  const { addToast } = useToast();
  const saveContrat = useSaveContrat();
  const fmt = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));

  const montantInitial = parseFloat(contrat?.montant_initial ?? 0);
  const montantActuel  = parseFloat(contrat?.montant_actuel ?? montantInitial);
  const avenatsValides = avenants.filter(a => a.statut === "valide");
  const totalAvenants  = avenatsValides.reduce((s, a) => s + parseFloat(a.montant ?? 0), 0);

  const [fin, setFin] = useState({
    taux_rg:                   contrat?.taux_rg ?? 5,
    taux_avance:               contrat?.taux_avance ?? 5,
    taux_remboursement_avance: contrat?.taux_remboursement_avance ?? 6.25,
    delai_paiement:            contrat?.delai_paiement ?? 30,
    taux_penalite:             contrat?.taux_penalite ?? 0.1,
    plafond_penalite:          contrat?.plafond_penalite ?? 10,
    taux_tva:                  contrat?.taux_tva ?? 18,
    delai_execution:           contrat?.delai_execution ?? "",
    date_signature:            contrat?.date_signature ? contrat.date_signature.substring(0, 10) : "",
    financement:               contrat?.financement ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setFin(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveContrat.mutateAsync({ id: contrat.id, ...fin });
      addToast("Conditions financières enregistrées", "success");
    } catch {
      addToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all";

  return (
    <div className="space-y-6">
      {/* Montants */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Valeur contractuelle</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Montant initial HT</p>
            <p className="text-lg font-bold text-gray-900">{fmt(montantInitial)} FCFA</p>
          </div>
          <div className={`border rounded-xl p-4 ${totalAvenants !== 0 ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Avenants validés
              {avenatsValides.length > 0 && <span className="ml-1 text-violet-600">({avenatsValides.length})</span>}
            </p>
            <p className={`text-lg font-bold ${totalAvenants > 0 ? "text-violet-700" : totalAvenants < 0 ? "text-red-600" : "text-gray-400"}`}>
              {totalAvenants >= 0 ? "+" : ""}{fmt(totalAvenants)} FCFA
            </p>
          </div>
          <div className="bg-[#E8F5EE] border border-[#087F3E]/30 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Montant HT actualisé</p>
            <p className="text-lg font-bold text-[#087F3E]">{fmt(montantActuel)} FCFA</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Valeur contractuelle courante</p>
          </div>
        </div>
      </div>

      {/* Conditions financières éditables */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Conditions financières</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Retenue de garantie (%)</label>
            <input type="number" step="0.01" value={fin.taux_rg} onChange={e => set("taux_rg", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">TVA (%)</label>
            <input type="number" step="0.01" value={fin.taux_tva} onChange={e => set("taux_tva", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Taux avance (%)</label>
            <input type="number" step="0.01" value={fin.taux_avance} onChange={e => set("taux_avance", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Remboursement avance / décompte (%)</label>
            <input type="number" step="0.01" value={fin.taux_remboursement_avance} onChange={e => set("taux_remboursement_avance", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Délai de paiement (jours)</label>
            <input type="number" step="1" value={fin.delai_paiement} onChange={e => set("delai_paiement", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Délai d'exécution (jours)</label>
            <input type="number" step="1" value={fin.delai_execution} onChange={e => set("delai_execution", e.target.value)} className={inputCls} placeholder="—" />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Pénalité de retard (%/jour)</label>
            <input type="number" step="0.001" value={fin.taux_penalite} onChange={e => set("taux_penalite", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Plafond pénalités (%)</label>
            <input type="number" step="0.01" value={fin.plafond_penalite} onChange={e => set("plafond_penalite", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Date de signature</label>
            <input type="date" value={fin.date_signature} onChange={e => set("date_signature", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Financement</label>
            <input type="text" value={fin.financement} onChange={e => set("financement", e.target.value)} className={inputCls} placeholder="ex: BCI, FCP…" />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </button>
        </div>
      </div>

      {/* Historique avenants */}
      {avenatsValides.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Historique des avenants validés</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Code</th>
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Objet</th>
                <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Date signature</th>
                <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-500 pb-2">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {avenatsValides.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-3 font-mono text-xs font-medium text-gray-900">{a.code}</td>
                  <td className="py-2.5 pr-3 text-gray-700 max-w-[260px] truncate">{a.objet}</td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs">{a.date_signature ? new Date(a.date_signature).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className={`py-2.5 text-right font-semibold ${parseFloat(a.montant) >= 0 ? "text-violet-700" : "text-red-600"}`}>
                    {parseFloat(a.montant) >= 0 ? "+" : ""}{fmt(parseFloat(a.montant))} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Cessions ───────────────────────────────────────────
function CessionsTab({ contratId, isNew }) {
  const { data, isLoading } = useEtatsCessionPaginated(
    { contrat_id: contratId ? parseInt(contratId, 10) : null, count: 50 },
    { enabled: !isNew && !!contratId }
  );
  const cessions = data?.data ?? [];

  const fmtMontant = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));
  const fmtDate    = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  if (isNew) return <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour voir les états de cession.</p>;
  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{cessions.length} état(s) de cession pour ce contrat</p>
        <Link
          to={`/etats-cession/nouveau?contrat_id=${contratId}`}
          className="inline-flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors"
        >
          <Plus size={13} /> Créer un état de cession
        </Link>
      </div>

      {cessions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Aucun état de cession pour ce contrat.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Code</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Période</th>
              <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Montant</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2">Statut</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cessions.map(ec => (
              <tr key={ec.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-3 font-mono text-xs font-medium text-gray-900">{ec.code}</td>
                <td className="py-2.5 pr-3 text-gray-600 text-xs">
                  {fmtDate(ec.periode_debut)} → {fmtDate(ec.periode_fin)}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-gray-800">
                  {fmtMontant(ec.montant_total)} FCFA
                </td>
                <td className="py-2.5"><StatusBadge statut={ec.statut} /></td>
                <td className="py-2.5 text-right">
                  <Link to={`/etats-cession/${ec.id}`} className="text-xs text-[#087F3E] hover:underline">Voir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Sub-tab: Circuit de validation ─────────────────────────────
function CircuitContratTab({ contrat, contratId, isNew }) {
  const { addToast }    = useToast();
  const [showRejet, setShowRejet]     = useState(false);
  const [motifRejet, setMotifRejet]   = useState("");
  const { currentUser } = useUser();

  const { data: circuit = [] } = useContratCircuit();
  const soumettreM = useSoumettreContrat();
  const validerM   = useValiderContrat();
  const rejeterM   = useRejeterContrat();

  if (isNew) return <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour accéder au circuit.</p>;

  const statut      = contrat?.statut ?? "brouillon";
  const validations = contrat?.validations ?? [];
  const etapes      = [...circuit].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const lastEtape   = etapes[etapes.length - 1];

  const steps = [
    { statut: "brouillon", label: "Création",  profil: null },
    ...(etapes.length > 0
      ? [{ statut: etapes[0].statut_avant, label: "Soumis", profil: null }]
      : [{ statut: "soumis", label: "Soumis", profil: null }]),
    ...etapes.map(e => ({ statut: e.statut_apres, label: e.profil_code.toUpperCase(), profil: e.profil_code, etape: e })),
    { statut: "actif", label: "Actif", profil: null },
  ];

  const currentIdx   = steps.findIndex(s => s.statut === statut);
  const currentEtape = etapes.find(e => e.statut_avant === statut);
  const isAfterLast  = !!(lastEtape && statut === lastEtape.statut_apres);
  const isTerminal   = statut === "actif" || statut === "rejete";

  const userRole    = currentUser?.role?.designation?.toLowerCase() ?? "";
  const isAdmin     = userRole === "admin";
  const canValidate = isAdmin || !currentEtape || userRole === currentEtape.profil_code?.toLowerCase();

  const findVal    = (profil) => validations.find(v => v.profil_code === profil && v.action === "valide");
  const soumisVal  = validations.find(v => v.action === "soumis");
  const fmtD       = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  async function handleSoumettre() {
    try {
      await soumettreM.mutateAsync(parseInt(contratId));
      addToast("Contrat soumis au circuit.", "success");
    } catch (err) { addToast(err?.response?.data?.errors?.[0] ?? "Erreur.", "error"); }
  }

  async function handleValider() {
    try {
      await validerM.mutateAsync(parseInt(contratId));
      addToast("Étape validée.", "success");
    } catch (err) { addToast(err?.response?.data?.errors?.[0] ?? "Erreur.", "error"); }
  }

  async function handleRejeter(motif) {
    try {
      await rejeterM.mutateAsync({ id: parseInt(contratId), motif });
      addToast("Contrat rejeté.", "success");
    } catch (err) { addToast(err?.response?.data?.errors?.[0] ?? "Erreur.", "error"); }
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Circuit de validation</p>

        {circuit.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            <p>Aucun circuit configuré pour les contrats.</p>
            <a href="/parametrage" className="text-xs text-[#087F3E] hover:underline mt-1 inline-block">Configurer dans Paramétrage → Circuit →</a>
          </div>
        ) : statut === "rejete" ? (
          <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
            <XCircle size={16} /> Rejeté
            {contrat?.motif_rejet && (
              <span className="ml-2 text-xs font-normal text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                {contrat.motif_rejet}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-0">
            {steps.map((step, idx) => {
              const done    = idx < currentIdx;
              const current = idx === currentIdx;
              const val     = step.profil ? findVal(step.profil) : step.statut === "soumis" ? soumisVal : null;
              return (
                <div key={step.statut} className="flex-1 flex flex-col items-center">
                  <div className="flex items-center w-full">
                    <div className={`flex-1 h-0.5 ${idx === 0 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors
                      ${done ? "bg-[#087F3E] border-[#087F3E] text-white" : current ? "bg-white border-[#087F3E] text-[#087F3E]" : "bg-white border-gray-200 text-gray-300"}`}>
                      {done ? <CheckCircle2 size={16} /> : current ? <Clock size={14} /> : <Circle size={14} />}
                    </div>
                    <div className={`flex-1 h-0.5 ${idx === steps.length - 1 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                  </div>
                  <div className="mt-2 text-center px-1 w-full">
                    <p className={`text-xs font-semibold ${done ? "text-[#087F3E]" : current ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
                    {val ? (
                      <>
                        <p className="text-[10px] text-[#087F3E] mt-0.5">{fmtD(val.validated_at)}</p>
                        {val.user && <p className="text-[10px] text-gray-500 truncate">{val.user.prenom} {val.user.nom}</p>}
                      </>
                    ) : current && step.profil ? (
                      <p className="text-[10px] text-amber-500 mt-0.5">En attente</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {!isTerminal && circuit.length > 0 && (
          <div className="border-t border-gray-200 mt-5 pt-4 space-y-3">
            {statut === "brouillon" && (
              <button onClick={handleSoumettre} disabled={soumettreM.isPending}
                className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                Soumettre au circuit
              </button>
            )}
            {statut !== "brouillon" && !isAfterLast && canValidate && !showRejet && (
              <div className="flex gap-3">
                <button onClick={handleValider} disabled={validerM.isPending}
                  className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                  Valider — {currentEtape?.profil_code?.toUpperCase() ?? ""}
                </button>
                <button onClick={() => setShowRejet(true)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Rejeter
                </button>
              </div>
            )}
            {statut !== "brouillon" && !isAfterLast && !canValidate && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                En attente de validation par <strong>{currentEtape?.profil_code?.toUpperCase()}</strong>. Vous n'avez pas le profil requis.
              </p>
            )}
            {showRejet && (
              <div className="flex gap-2 flex-wrap">
                <input autoFocus placeholder="Motif du rejet (obligatoire)…" value={motifRejet}
                  onChange={e => setMotifRejet(e.target.value)}
                  className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none" />
                <button onClick={() => { handleRejeter(motifRejet); setShowRejet(false); setMotifRejet(""); }}
                  disabled={!motifRejet.trim()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  Confirmer
                </button>
                <button onClick={() => { setShowRejet(false); setMotifRejet(""); }}
                  className="px-3 py-2 text-gray-500 border border-gray-200 rounded-lg text-sm">
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historique */}
      {validations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historique</h3>
          <div className="space-y-2">
            {validations.map((v, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${v.action === "valide" ? "bg-[#087F3E]" : v.action === "soumis" ? "bg-blue-400" : "bg-red-400"}`} />
                <div>
                  <span className="font-medium text-gray-800">{v.libelle}</span>
                  {v.user && <span className="text-gray-500"> — {v.user.prenom} {v.user.nom}</span>}
                  <span className="text-gray-400 text-xs ml-2">{fmtD(v.validated_at)}</span>
                  {v.motif && <p className="text-xs text-red-600 mt-0.5">{v.motif}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Pièces jointes ────────────────────────────────────
const CATEGORIES_PJ = [
  { value: "offre_initiale",    label: "Offre initiale" },
  { value: "comparatif_offres", label: "Comparatif offres" },
  { value: "contrat_signe",     label: "Contrat signé" },
  { value: "avenant",           label: "Avenant" },
  { value: "autre",             label: "Autre" },
];

function PiecesJointesTab({ contratId, isNew }) {
  const { addToast }  = useToast();
  const [categorie, setCategorie]     = useState("offre_initiale");
  const [filterCat, setFilterCat]     = useState("all");
  const [dragging, setDragging]       = useState(false);
  const [confirmDel, setConfirmDel]   = useState(null);

  const { data: pieces = [], isLoading } = usePiecesJointes(!isNew ? parseInt(contratId) : null);
  const uploadMut = useUploadPieceJointe();
  const deleteMut = useDeletePieceJointe();

  if (isNew) return <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour gérer les pièces jointes.</p>;

  const filtered = filterCat === "all" ? pieces : pieces.filter(p => p.categorie === filterCat);

  const counts = CATEGORIES_PJ.reduce((acc, c) => {
    acc[c.value] = pieces.filter(p => p.categorie === c.value).length;
    return acc;
  }, {});

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        addToast(`${file.name} dépasse 10 MB.`, "error");
        continue;
      }
      try {
        await uploadMut.mutateAsync({ contrat_id: parseInt(contratId), categorie, fichier: file });
        addToast(`${file.name} ajouté.`, "success");
      } catch (err) {
        addToast(err?.response?.data?.errors?.[0] ?? `Erreur upload ${file.name}.`, "error");
      }
    }
  }

  async function handleDelete(pj) {
    try {
      await deleteMut.mutateAsync({ id: pj.id, contrat_id: parseInt(contratId) });
      addToast("Fichier supprimé.", "success");
      setConfirmDel(null);
    } catch {
      addToast("Erreur lors de la suppression.", "error");
    }
  }

  async function handleDownload(pj) {
    const token = localStorage.getItem("stt_token");
    const url   = pieceJointeService.downloadUrl(pj.id);
    const resp  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob  = await resp.blob();
    const a     = document.createElement("a");
    a.href      = URL.createObjectURL(blob);
    a.download  = pj.nom_original;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div className="grid grid-cols-[200px_1fr] gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Catégorie</label>
          <select
            value={categorie}
            onChange={e => setCategorie(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
          >
            {CATEGORIES_PJ.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors
            ${dragging ? "border-[#087F3E] bg-[#E8F5EE]/60" : "border-gray-200 hover:border-[#087F3E]/50 hover:bg-gray-50"}`}
          onClick={() => document.getElementById("pj-file-input").click()}
        >
          <Upload size={20} className="text-gray-400" />
          <p className="text-sm text-gray-500">Glissez-déposez vos fichiers ici ou <span className="text-[#087F3E] font-medium">cliquez pour parcourir</span></p>
          <p className="text-xs text-gray-400">PDF, DOCX, XLSX, JPG, PNG — max 10 MB par fichier</p>
          <input
            id="pj-file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100 pb-0">
        {[{ value: "all", label: "Toutes", count: pieces.length }, ...CATEGORIES_PJ.map(c => ({ ...c, count: counts[c.value] }))].map(t => (
          <button
            key={t.value}
            onClick={() => setFilterCat(t.value)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px
              ${filterCat === t.value
                ? "border-[#087F3E] text-[#087F3E]"
                : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* File list */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucun fichier dans cette catégorie.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(pj => (
            <div key={pj.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
              <File size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{pj.nom_original}</p>
                <p className="text-xs text-gray-400">
                  {pj.taille_fmt} · Ajouté le {pj.created_at}
                  {pj.uploaded_by && <span> par {pj.uploaded_by}</span>}
                </p>
              </div>
              <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                {CATEGORIES_PJ.find(c => c.value === pj.categorie)?.label ?? pj.categorie}
              </span>
              <button
                onClick={() => handleDownload(pj)}
                title="Télécharger"
                className="p-1.5 text-gray-400 hover:text-[#087F3E] transition-colors"
              >
                <Download size={15} />
              </button>
              {confirmDel === pj.id ? (
                <span className="inline-flex items-center gap-2 text-xs">
                  <span className="text-red-600">Supprimer ?</span>
                  <button onClick={() => handleDelete(pj)} className="text-red-600 hover:text-red-800 font-medium">Oui</button>
                  <button onClick={() => setConfirmDel(null)} className="text-gray-400 hover:text-gray-600">Non</button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDel(pj.id)}
                  title="Supprimer"
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Avenants ───────────────────────────────────────────
const AVENANT_INIT = { objet: "", montant: "", date_signature: "", observations: "" };

function AvenantsTab({ contratId, isNew, montantInitial }) {
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(AVENANT_INIT);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmValider, setConfirmValider] = useState(null);

  const { data: avenants = [], isLoading } = useAvenantsByContrat(!isNew ? contratId : null);
  const saveMut    = useSaveAvenant();
  const validerMut = useValiderAvenant();
  const deleteMut  = useDeleteAvenant();

  const totalValide = avenants
    .filter(a => a.statut === "valide")
    .reduce((sum, a) => sum + parseFloat(a.montant ?? 0), 0);

  const plafond30    = (montantInitial ?? 0) * 0.30;
  const depasse30    = montantInitial > 0 && totalValide > plafond30;
  const fmt          = n => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  if (isNew) return (
    <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour gérer les avenants.</p>
  );

  async function handleSave(e) {
    e.preventDefault();
    if (!form.objet.trim() || !form.montant) {
      addToast("Objet et montant sont requis.", "error");
      return;
    }
    // Warning 30% marchés publics
    if (montantInitial > 0) {
      const prospectif = totalValide + parseFloat(form.montant || 0);
      if (prospectif > plafond30) {
        addToast(
          `Avenants cumulés après ajout : ${fmt(prospectif)} FCFA — dépasse 30% du montant initial (plafond : ${fmt(plafond30)} FCFA). Une procédure marchés publics peut être requise.`,
          "warning"
        );
      }
    }
    try {
      await saveMut.mutateAsync({
        contrat_id:     parseInt(contratId, 10),
        objet:          form.objet.trim(),
        montant:        parseFloat(form.montant),
        date_signature: form.date_signature || null,
        observations:   form.observations || null,
      });
      addToast("Avenant créé.", "success");
      setForm(AVENANT_INIT);
      setShowForm(false);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  async function handleValider(id) {
    try {
      await validerMut.mutateAsync(id);
      addToast("Avenant validé — montant actuel du contrat mis à jour.", "success");
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      addToast("Avenant supprimé.", "success");
      setConfirmDelete(null);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Warning 30% marchés publics */}
      {depasse30 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>
            Les avenants validés ({fmt(totalValide)} FCFA) dépassent <strong>30%</strong> du montant initial ({fmt(plafond30)} FCFA).
            Une procédure de passation de marché peut être requise.
          </span>
        </div>
      )}

      {/* Summary bar */}
      {avenants.length > 0 && (
        <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 text-sm">
          <span className="text-violet-700 font-medium">
            {avenants.filter(a => a.statut === "valide").length} avenant(s) validé(s)
          </span>
          <span className="text-violet-900 font-bold">
            Impact sur montant actuel : {formatMontantCourt(totalValide)}
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>
      ) : avenants.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucun avenant pour ce contrat.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Code</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Objet</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Montant</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Signature</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2">Statut</th>
              <th className="pb-2 text-right text-xs uppercase tracking-wide font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {avenants.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-3 font-mono text-xs font-medium text-gray-900">{a.code}</td>
                <td className="py-2.5 pr-3 text-gray-700 max-w-[200px] truncate">{a.objet}</td>
                <td className={`py-2.5 pr-3 font-semibold ${a.statut === "valide" ? "text-violet-700" : "text-gray-700"}`}>
                  {formatMontantCourt(parseFloat(a.montant ?? 0))}
                </td>
                <td className="py-2.5 pr-3 text-gray-500 text-xs">
                  {a.date_signature ? formatDate(a.date_signature) : "—"}
                </td>
                <td className="py-2.5">
                  <StatusBadge statut={a.statut} />
                </td>
                <td className="py-2.5 text-right">
                  {confirmDelete === a.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-red-600">Confirmer ?</span>
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deleteMut.isPending}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >Oui</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:text-gray-600">Non</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-3">
                      {a.statut === "brouillon" && (
                        <button
                          onClick={() => setConfirmValider(a.id)}
                          disabled={validerMut.isPending}
                          title="Valider l'avenant"
                          className="text-[#087F3E] hover:text-[#065A2C] transition-colors disabled:opacity-40"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(a.id)}
                        title="Supprimer"
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors"
        >
          <Plus size={13} /> Nouvel avenant
        </button>
      </div>

      <ConfirmModal
        open={!!confirmValider}
        title="Valider l'avenant"
        message="Cette action est irréversible. Le montant du contrat sera mis à jour définitivement. Confirmer la validation ?"
        confirmLabel="Valider l'avenant"
        onConfirm={() => { handleValider(confirmValider); setConfirmValider(null); }}
        onCancel={() => setConfirmValider(null)}
      />

      {/* Modal overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setForm(AVENANT_INIT); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Nouvel avenant</h3>
              <button onClick={() => { setShowForm(false); setForm(AVENANT_INIT); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Objet *</label>
                <input
                  type="text"
                  value={form.objet}
                  onChange={e => setForm(f => ({ ...f, objet: e.target.value }))}
                  placeholder="Objet de l'avenant…"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Montant (FCFA) *</label>
                <input
                  type="number"
                  value={form.montant}
                  onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  placeholder="Ex: 5000000 ou -2000000"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                  required
                />
                <p className="text-xs text-gray-400">Négatif pour une diminution de montant.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Date de signature</label>
                <input
                  type="date"
                  value={form.date_signature}
                  onChange={e => setForm(f => ({ ...f, date_signature: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Observations</label>
                <textarea
                  value={form.observations}
                  onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                  rows={2}
                  placeholder="Observations éventuelles…"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none resize-none"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(AVENANT_INIT); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saveMut.isPending}
                  className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60"
                >
                  {saveMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Création…</> : <><Plus size={14} /> Créer l'avenant</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Bons de commande ──────────────────────────────────
const BC_STATUT_COLORS = {
  brouillon:   "bg-gray-100 text-gray-600",
  valide:      "bg-blue-100 text-blue-700",
  envoye:      "bg-violet-100 text-violet-700",
  receptionne: "bg-green-100 text-green-700",
  cloture:     "bg-gray-200 text-gray-500",
  annule:      "bg-red-100 text-red-600",
};
const BC_STATUT_LABELS = {
  brouillon:   "Brouillon",
  valide:      "Validé",
  envoye:      "Envoyé",
  receptionne: "Réceptionné",
  cloture:     "Clôturé",
  annule:      "Annulé",
};
const BC_TRANSITIONS = {
  brouillon:   [{ statut: "valide", label: "Valider" }, { statut: "annule", label: "Annuler" }],
  valide:      [{ statut: "envoye", label: "Envoyer" }, { statut: "annule", label: "Annuler" }],
  envoye:      [{ statut: "receptionne", label: "Réceptionner" }, { statut: "annule", label: "Annuler" }],
  receptionne: [{ statut: "cloture", label: "Clôturer" }],
  cloture:     [],
  annule:      [],
};

const BC_INIT = { objet: "", date_emission: "", date_livraison_prevue: "", observations: "" };
const LIGNE_INIT = { designation: "", unite: "", quantite: "", prix_unitaire: "" };

function BonCommandeTab({ contratId, isNew }) {
  const { addToast } = useToast();
  const [showCreate, setShowCreate]     = useState(false);
  const [showLigne, setShowLigne]       = useState(null); // bc id
  const [bcForm, setBcForm]             = useState(BC_INIT);
  const [ligneForm, setLigneForm]       = useState(LIGNE_INIT);
  const [confirmDel, setConfirmDel]     = useState(null);
  const [confirmDelBC, setConfirmDelBC] = useState(null);
  const [motifAnnul, setMotifAnnul]     = useState("");
  const [pendingTransit, setPendingTransit] = useState(null); // { bc, statut }

  const { data: bcs = [], isLoading } = useBonCommandesByContrat(!isNew ? contratId : null);
  const saveMut        = useSaveBonCommande();
  const saveLigneMut   = useSaveBonCommandeLigne();
  const delLigneMut    = useDeleteBonCommandeLigne();
  const statutMut      = useBonCommandeStatut();
  const deleteMut      = useDeleteBonCommande();

  const fmt = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));

  async function handleCreateBC(e) {
    e.preventDefault();
    try {
      await saveMut.mutateAsync({ contrat_id: parseInt(contratId, 10), ...bcForm });
      addToast("Bon de commande créé.", "success");
      setShowCreate(false);
      setBcForm(BC_INIT);
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur.", "error");
    }
  }

  async function handleAddLigne(bcId, e) {
    e.preventDefault();
    try {
      await saveLigneMut.mutateAsync({
        bon_commande_id: bcId,
        designation:   ligneForm.designation,
        unite:         ligneForm.unite,
        quantite:      parseFloat(ligneForm.quantite),
        prix_unitaire: parseFloat(ligneForm.prix_unitaire),
      });
      addToast("Ligne ajoutée.", "success");
      setShowLigne(null);
      setLigneForm(LIGNE_INIT);
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur.", "error");
    }
  }

  async function handleDelLigne(ligneId) {
    try {
      await delLigneMut.mutateAsync(ligneId);
      setConfirmDel(null);
      addToast("Ligne supprimée.", "success");
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur.", "error");
    }
  }

  async function handleStatut() {
    if (!pendingTransit) return;
    try {
      await statutMut.mutateAsync({ id: pendingTransit.bc.id, statut: pendingTransit.statut, motif: motifAnnul || undefined });
      addToast("Statut mis à jour.", "success");
      setPendingTransit(null);
      setMotifAnnul("");
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur.", "error");
    }
  }

  async function handleDeleteBC(bcId) {
    try {
      await deleteMut.mutateAsync(bcId);
      setConfirmDelBC(null);
      addToast("Bon de commande supprimé.", "success");
    } catch (err) {
      addToast(err.response?.data?.message ?? "Erreur.", "error");
    }
  }

  if (isNew) return <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour gérer les bons de commande.</p>;
  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors"
        >
          <Plus size={13} /> Nouveau bon de commande
        </button>
      </div>

      {bcs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Aucun bon de commande pour ce contrat.</p>
      ) : (
        <div className="space-y-6">
          {bcs.map(bc => {
            const lignes      = bc.lignes ?? [];
            const totalLignes = lignes.reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);
            const transitions = BC_TRANSITIONS[bc.statut] ?? [];

            return (
              <div key={bc.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                {/* Header BC */}
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-gray-900">{bc.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BC_STATUT_COLORS[bc.statut]}`}>
                      {BC_STATUT_LABELS[bc.statut]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {transitions.map(t => (
                      <button
                        key={t.statut}
                        onClick={() => { setPendingTransit({ bc, statut: t.statut }); setMotifAnnul(""); }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border
                          ${t.statut === "annule" ? "border-red-300 text-red-600 hover:bg-red-50" : "border-[#087F3E]/40 text-[#087F3E] hover:bg-[#E8F5EE]"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                    {bc.statut === "brouillon" && (
                      confirmDelBC === bc.id ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className="text-red-600">Supprimer ?</span>
                          <button onClick={() => handleDeleteBC(bc.id)} className="text-red-600 font-medium hover:text-red-800">Oui</button>
                          <button onClick={() => setConfirmDelBC(null)} className="text-gray-400 hover:text-gray-600">Non</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelBC(bc.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      )
                    )}
                  </div>
                </div>

                {/* BC details */}
                <div className="px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Objet</p>
                      <p className="text-sm text-gray-800 font-medium">{bc.objet || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Date d'émission</p>
                      <p className="text-sm text-gray-700">{bc.date_emission ? new Date(bc.date_emission).toLocaleDateString("fr-FR") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Livraison prévue</p>
                      <p className="text-sm text-gray-700">{bc.date_livraison_prevue ? new Date(bc.date_livraison_prevue).toLocaleDateString("fr-FR") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Montant total</p>
                      <p className="text-sm font-bold text-[#087F3E]">{fmt(bc.montant_total)} FCFA</p>
                    </div>
                  </div>

                  {/* Lignes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lignes du BC ({lignes.length})</p>
                      {bc.statut === "brouillon" && (
                        <button
                          onClick={() => { setShowLigne(bc.id); setLigneForm(LIGNE_INIT); }}
                          className="text-xs text-[#087F3E] hover:underline"
                        >
                          + Ajouter une ligne
                        </button>
                      )}
                    </div>

                    {lignes.length === 0 ? (
                      <p className="text-xs text-gray-400 py-3 text-center">Aucune ligne. Ajoutez des lignes pour définir le montant.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-400 pb-2 pr-3">Désignation</th>
                            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-400 pb-2 pr-2">Unité</th>
                            <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-400 pb-2 pr-2">Qté</th>
                            <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-400 pb-2 pr-2">P.U.</th>
                            <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-400 pb-2">Montant</th>
                            {bc.statut === "brouillon" && <th className="pb-2"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {lignes.map(l => (
                            <tr key={l.id} className="hover:bg-gray-50">
                              <td className="py-2 pr-3 text-gray-800">{l.designation}</td>
                              <td className="py-2 pr-2 text-gray-500 text-xs">{l.unite || "—"}</td>
                              <td className="py-2 pr-2 text-right text-gray-700">{l.quantite}</td>
                              <td className="py-2 pr-2 text-right text-gray-600 text-xs">{fmt(l.prix_unitaire)}</td>
                              <td className="py-2 text-right font-semibold text-gray-800">{fmt(l.montant)} FCFA</td>
                              {bc.statut === "brouillon" && (
                                <td className="py-2 pl-2 text-right">
                                  {confirmDel === l.id ? (
                                    <span className="inline-flex items-center gap-1 text-xs">
                                      <button onClick={() => handleDelLigne(l.id)} className="text-red-600 font-medium">Oui</button>
                                      <button onClick={() => setConfirmDel(null)} className="text-gray-400">Non</button>
                                    </span>
                                  ) : (
                                    <button onClick={() => setConfirmDel(l.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td colSpan={bc.statut === "brouillon" ? 4 : 4} className="pt-2 text-xs text-gray-400 font-medium uppercase tracking-wide">Total</td>
                            <td className="pt-2 text-right font-bold text-[#087F3E]">{fmt(totalLignes)} FCFA</td>
                            {bc.statut === "brouillon" && <td></td>}
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>

                  {bc.observations && (
                    <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-3">{bc.observations}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create BC */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowCreate(false); setBcForm(BC_INIT); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Nouveau bon de commande</h3>
              <button onClick={() => { setShowCreate(false); setBcForm(BC_INIT); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateBC} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Objet *</label>
                <input
                  type="text"
                  value={bcForm.objet}
                  onChange={e => setBcForm(f => ({ ...f, objet: e.target.value }))}
                  placeholder="Objet du bon de commande…"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                  required autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Date d'émission</label>
                  <input type="date" value={bcForm.date_emission} onChange={e => setBcForm(f => ({ ...f, date_emission: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Livraison prévue</label>
                  <input type="date" value={bcForm.date_livraison_prevue} onChange={e => setBcForm(f => ({ ...f, date_livraison_prevue: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Observations</label>
                <textarea value={bcForm.observations} onChange={e => setBcForm(f => ({ ...f, observations: e.target.value }))}
                  rows={2} placeholder="Observations éventuelles…"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setBcForm(BC_INIT); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
                <button type="submit" disabled={saveMut.isPending}
                  className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60">
                  {saveMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Création…</> : <><Plus size={14} /> Créer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add ligne */}
      {showLigne !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowLigne(null); setLigneForm(LIGNE_INIT); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Ajouter une ligne</h3>
              <button onClick={() => { setShowLigne(null); setLigneForm(LIGNE_INIT); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={e => handleAddLigne(showLigne, e)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Désignation *</label>
                <input type="text" value={ligneForm.designation} onChange={e => setLigneForm(f => ({ ...f, designation: e.target.value }))}
                  placeholder="Description de la prestation…" autoFocus required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Unité</label>
                  <input type="text" value={ligneForm.unite} onChange={e => setLigneForm(f => ({ ...f, unite: e.target.value }))}
                    placeholder="m², ml, u…"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Quantité *</label>
                  <input type="number" value={ligneForm.quantite} onChange={e => setLigneForm(f => ({ ...f, quantite: e.target.value }))}
                    placeholder="0" required min="0" step="any"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Prix unitaire *</label>
                  <input type="number" value={ligneForm.prix_unitaire} onChange={e => setLigneForm(f => ({ ...f, prix_unitaire: e.target.value }))}
                    placeholder="0" required min="0" step="any"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
                </div>
              </div>
              {ligneForm.quantite && ligneForm.prix_unitaire && (
                <p className="text-xs text-[#087F3E] font-medium">
                  Montant : {fmt(parseFloat(ligneForm.quantite) * parseFloat(ligneForm.prix_unitaire))} FCFA
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowLigne(null); setLigneForm(LIGNE_INIT); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
                <button type="submit" disabled={saveLigneMut.isPending}
                  className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60">
                  {saveLigneMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Ajout…</> : <><Plus size={14} /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transition statut */}
      {pendingTransit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPendingTransit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {BC_STATUT_LABELS[pendingTransit.statut]} le BC {pendingTransit.bc.code} ?
            </h3>
            {pendingTransit.statut === "annule" && (
              <div className="mb-4 space-y-1.5">
                <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Motif d'annulation *</label>
                <textarea value={motifAnnul} onChange={e => setMotifAnnul(e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none resize-none" />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setPendingTransit(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={handleStatut} disabled={statutMut.isPending || (pendingTransit.statut === "annule" && !motifAnnul)}
                className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
                {statutMut.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-tab: Attachements ───────────────────────────────────────
const STATUT_COLORS_ATT = {
  "Validé":           "bg-green-100 text-green-700",
  "Soumis au DACC":   "bg-purple-100 text-purple-700",
  "Soumis au DT":     "bg-blue-100 text-blue-700",
  "En rapprochement": "bg-orange-100 text-orange-700",
  "En cours":         "bg-yellow-100 text-yellow-700",
  "Ouvert":           "bg-gray-100 text-gray-500",
  "Rejeté":           "bg-red-100 text-red-700",
};

function AttachementsTab({ contratId, chantierId, isNew }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { attachements, addAttachement } = useAttachements();
  const { data: baremeData } = useBaremesPaginated({ statut: "actif", count: 500 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periode_debut: "", periode_fin: "" });
  const [loading, setLoading] = useState(false);

  const numFmt = v => new Intl.NumberFormat("fr-FR").format(Math.round(v || 0));
  const contratAtts = attachements
    .filter(a => a.contratId === String(contratId))
    .sort((a, b) => (b.periodeDebut ?? "").localeCompare(a.periodeDebut ?? ""));

  if (isNew) return (
    <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour gérer les attachements.</p>
  );

  async function handleInitier() {
    if (!form.periode_debut || !form.periode_fin) {
      addToast("Renseignez la période de début et de fin.", "error");
      return;
    }
    if (form.periode_fin < form.periode_debut) {
      addToast("La date de fin doit être après le début.", "error");
      return;
    }
    const overlap = contratAtts.find(a =>
      (a.periodeDebut ?? "") <= form.periode_fin && (a.periodeFin ?? "") >= form.periode_debut
    );
    if (overlap) {
      addToast(`Un attachement (${overlap.code}) couvre déjà cette période.`, "error");
      return;
    }
    setLoading(true);
    try {
      const baremes = baremeData?.data ?? [];
      const lignesCSE = baremes.map(b => ({
        id: `dqe-${b.id}`,
        source: "DQE",
        refDQE: b.code,
        designation: b.designation,
        unite: b.unite ?? "",
        quantitePrevueDQE: 0,
        prixUnitaireHT: parseFloat(b.prix_unitaire ?? 0),
        quantiteRealisee: 0,
        montant: 0,
      }));
      const nouveau = await addAttachement({
        contratId: String(contratId),
        chantierId: chantierId ? String(chantierId) : null,
        periodeDebut: form.periode_debut,
        periodeFin: form.periode_fin,
        lignesCSE,
        initiePar: { nom: "CT", roleId: "CT" },
      });
      addToast("Dossier d'attachement initié.", "success");
      navigate(`/attachements/${nouveau.code}`);
    } catch (err) {
      addToast("Erreur lors de la création du dossier.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{contratAtts.length} dossier{contratAtts.length !== 1 ? "s" : ""}</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors">
            <Plus size={12} /> Initier un attachement
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#E8F5EE]/60 border border-[#087F3E]/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Nouvel attachement</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Début de période</label>
              <input
                type="date"
                value={form.periode_debut}
                onChange={e => setForm(f => ({ ...f, periode_debut: e.target.value, periode_fin: "" }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Fin de période</label>
              <input
                type="date"
                value={form.periode_fin}
                min={form.periode_debut || undefined}
                disabled={!form.periode_debut}
                onChange={e => setForm(f => ({ ...f, periode_fin: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button onClick={handleInitier} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#087F3E] text-white rounded-lg hover:bg-[#065A2C] disabled:opacity-40">
              {loading ? "Création…" : "Initier"}
            </button>
          </div>
        </div>
      )}

      {contratAtts.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Aucun dossier d'attachement pour ce contrat.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Code</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Période</th>
              <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Statut</th>
              <th className="text-right text-xs uppercase tracking-wide font-medium text-gray-500 pb-2">Montant</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contratAtts.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-3 font-medium text-gray-900">{a.code}</td>
                <td className="py-2.5 pr-3 text-gray-500 text-xs">{a.periodeDebut} → {a.periodeFin}</td>
                <td className="py-2.5 pr-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_COLORS_ATT[a.statut] ?? "bg-gray-100 text-gray-500"}`}>{a.statut}</span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-gray-700 text-xs">
                  {a.montantFinal != null ? `${numFmt(a.montantFinal)} FCFA` : "—"}
                </td>
                <td className="py-2.5 text-right">
                  <button onClick={() => navigate(`/attachements/${a.id}`)} className="text-xs text-[#087F3E] hover:underline">Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────
export default function ContratFormPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const isNew     = !id || id === "nouveau";
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("info");
  const [motif, setMotif]         = useState("");
  const [pendingStatut, setPendingStatut] = useState(null);

  // ── Formulaire ──────────────────────────────────────────────
  const [form, setForm] = useState({
    objet:           "",
    type_contrat:    "",
    montant_initial: "",
    date_debut:      "",
    date_fin_prevue: "",
    chantier_id:     "",
    soustraitant_id: "",
  });

  // ── Remote data ─────────────────────────────────────────────
  const { data: contrat, isLoading, isError } = useContrat(!isNew ? id : null);
  const { data: chantiersData }   = useChantiersPaginated({ count: 100 });
  const { data: sttData }         = useSousTraitantsPaginated({ count: 100 });
  const contratIdInt = !isNew && id ? parseInt(id, 10) : null;
  const { data: decomptesData }   = useDecomptesPaginated({ contrat_id: contratIdInt, count: 100 });
  const { data: avenantsList = [] } = useAvenantsByContrat(contratIdInt);
  const { data: bcsList = [] }      = useBonCommandesByContrat(contratIdInt);

  const chantiersList = chantiersData?.data ?? [];
  const sttList       = sttData?.data?.filter(s => s.statut !== "blackliste") ?? [];

  const saveMut   = useSaveContrat();
  const statutMut = useContratStatut();

  // Populate form when contrat loads (edit mode)
  useEffect(() => {
    if (contrat) {
      setForm({
        objet:           contrat.objet           ?? "",
        type_contrat:    contrat.type_contrat     ?? "",
        montant_initial: contrat.montant_initial  ?? "",
        date_debut:      contrat.date_debut      ? contrat.date_debut.substring(0, 10)      : "",
        date_fin_prevue: contrat.date_fin_prevue ? contrat.date_fin_prevue.substring(0, 10) : "",
        chantier_id:     contrat.chantier_id      ?? "",
        soustraitant_id: contrat.soustraitant_id  ?? "",
      });
    }
  }, [contrat]);

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.objet.trim() || !form.chantier_id || !form.soustraitant_id || !form.montant_initial) {
      addToast("Veuillez remplir les champs obligatoires.", "error");
      return;
    }
    const payload = {
      ...form,
      montant_initial: parseFloat(form.montant_initial),
      chantier_id:     parseInt(form.chantier_id, 10),
      soustraitant_id: parseInt(form.soustraitant_id, 10),
    };
    if (!isNew) payload.id = parseInt(id, 10);

    try {
      const res = await saveMut.mutateAsync(payload);
      addToast(isNew ? "Contrat créé." : "Contrat mis à jour.", "success");
      if (isNew && res?.data?.id) navigate(`/contrats/${res.data.id}`, { replace: true });
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  // ── Statut change ────────────────────────────────────────────
  async function handleStatut(newStatut) {
    // Activation : date de début obligatoire
    if (newStatut === "actif" && !contrat?.date_debut) {
      addToast("Renseignez la date de début du contrat avant de l'activer.", "error");
      return;
    }

    const needMotif = ["suspendu", "resilie"].includes(newStatut);
    if (needMotif && !motif.trim()) {
      setPendingStatut(newStatut);
      return;
    }
    try {
      await statutMut.mutateAsync({ id: parseInt(id, 10), statut: newStatut, motif: motif || undefined });
      addToast("Statut mis à jour.", "success");
      setMotif("");
      setPendingStatut(null);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  // ── Loading / error ─────────────────────────────────────────
  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!isNew && (isError || !contrat)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Contrat introuvable</p>
        <button onClick={() => navigate("/contrats")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const transitions = TRANSITIONS[contrat?.statut] ?? [];
  const sttSelected = sttList.find(s => s.id === parseInt(form.soustraitant_id, 10));
  const duree       = calcDuree(form.date_debut, form.date_fin_prevue);

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  const decomptesList  = decomptesData?.data ?? [];
  const nbAv           = avenantsList.length;
  const nbDec          = decomptesList.length;

  const tabs = [
    { id: "info",          label: "Informations",          icon: Info },
    { id: "parametrage",   label: "Paramétrage financier", icon: Hash },
    { id: "avenants",      label: nbAv > 0 ? `Avenants (${nbAv})` : "Avenants", icon: FilePlus },
    { id: "cessions",      label: "Cessions",              icon: FileText },
    { id: "attachements",  label: "Attachements",          icon: Paperclip },
    { id: "decomptes",     label: nbDec > 0 ? `Décomptes (${nbDec})` : "Décomptes", icon: FileText },
    { id: "pieces",        label: "Pièces jointes",        icon: Upload },
    { id: "circuit",       label: "Circuit de validation", icon: CheckCircle },
    { id: "bonscommande",  label: bcsList.length > 0 ? `Bons de commande (${bcsList.length})` : "Bons de commande", icon: FileText },
    { id: "factures",      label: "Factures",              icon: Hash },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/contrats")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Contrats
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">
          {isNew ? "Nouveau contrat" : contrat.code}
        </span>
      </div>

      <PageHeader
        title={isNew ? "Nouveau contrat" : `${contrat.code} — ${contrat.objet}`}
        subtitle={isNew ? "Remplir les informations du contrat" : [contrat.chantier?.designation, contrat.soustraitant?.raison_sociale].filter(Boolean).join(" · ")}
        action={
          !isNew && <StatusBadge statut={contrat.statut} />
        }
      />

      {/* KPI Bandeau — view mode only */}
      {!isNew && (() => {
        const decomptes      = decomptesData?.data ?? [];
        const VALIDATION_ST  = ["soumis", "valide_ct", "valide_cp", "valide_daf", "valide_dg"];
        const nbPaye         = decomptes.filter(d => d.statut === "paye").length;
        const nbValidation   = decomptes.filter(d => VALIDATION_ST.includes(d.statut)).length;
        const nbBrouillon    = decomptes.filter(d => d.statut === "brouillon").length;
        const montantActuel  = parseFloat(contrat.montant_actuel ?? contrat.montant_initial ?? 0);
        const cumulPaye      = decomptes.filter(d => d.statut === "paye").reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
        const enValidation   = decomptes.filter(d => VALIDATION_ST.includes(d.statut)).reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
        const pct            = montantActuel > 0 ? Math.round((cumulPaye / montantActuel) * 100) : 0;
        const actualisé      = avenantsList.some(a => a.statut === "valide");
        const nbAvenants     = avenantsList.length;

        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            {/* Row 1 : badges + boutons */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {nbAvenants > 0 && (
                  <span className="inline-flex items-center text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
                    {nbAvenants} avenant{nbAvenants > 1 ? "s" : ""}
                  </span>
                )}
                <StatusBadge statut={contrat.statut} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const token = localStorage.getItem("stt_token");
                    const resp = await fetch(`${import.meta.env.VITE_API_BASE}/api/pdf/contrat/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                    const blob = await resp.blob();
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download size={13} /> PDF
                </button>
                <button
                  onClick={() => setActiveTab("decomptes")}
                  className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Consulter
                </button>
                <button
                  onClick={() => navigate(`/decomptes/nouveau?contrat_id=${id}`)}
                  className="px-4 py-1.5 text-sm bg-[#087F3E] text-white rounded-lg hover:bg-[#065A2C] transition-colors"
                >
                  Créer un décompte
                </button>
              </div>
            </div>

            {/* Row 2 : KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 border-t border-gray-100">
              {/* Montant HT */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Montant HT</p>
                <p className="text-lg font-bold text-gray-900">{formatMontantCourt(montantActuel)}</p>
                {actualisé && (
                  <span className="text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded font-medium">actualisé</span>
                )}
              </div>

              {/* Décomptes */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Décomptes</p>
                <p className="text-sm font-medium text-gray-700 leading-snug">
                  {nbPaye > 0 && <span className="text-[#087F3E]">{nbPaye} payé{nbPaye > 1 ? "s" : ""}</span>}
                  {nbPaye > 0 && nbValidation > 0 && <span className="text-gray-300"> · </span>}
                  {nbValidation > 0 && <span className="text-amber-600">{nbValidation} en validation</span>}
                  {(nbPaye > 0 || nbValidation > 0) && nbBrouillon > 0 && <span className="text-gray-300"> · </span>}
                  {nbBrouillon > 0 && <span className="text-gray-500">{nbBrouillon} brouillon{nbBrouillon > 1 ? "s" : ""}</span>}
                  {decomptes.length === 0 && <span className="text-gray-400">Aucun décompte</span>}
                </p>
              </div>

              {/* Cumul payé */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cumul payé</p>
                <p className="text-lg font-bold text-[#087F3E]">{pct}%</p>
                <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                  <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>

              {/* En validation */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">En validation</p>
                <p className="text-lg font-bold text-amber-600">{formatMontantCourt(enValidation)}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Workflow — view mode only */}
      {!isNew && transitions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</p>
          <div className="flex flex-wrap gap-3 items-end">
            {transitions.map(t => (
              <button
                key={t.statut}
                onClick={() => handleStatut(t.statut)}
                disabled={statutMut.isPending}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${BTN_COLORS[t.color]} disabled:opacity-50`}
              >
                {t.label}
              </button>
            ))}
            {/* Motif input if needed */}
            {pendingStatut && (
              <div className="flex-1 min-w-[280px] flex gap-2">
                <input
                  autoFocus
                  placeholder={`Motif de ${pendingStatut === "resilie" ? "résiliation" : "suspension"}…`}
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                />
                <button
                  onClick={() => handleStatut(pendingStatut)}
                  disabled={!motif.trim() || statutMut.isPending}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  Confirmer
                </button>
                <button onClick={() => { setPendingStatut(null); setMotif(""); }}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">
                  Annuler
                </button>
              </div>
            )}
          </div>
          {contrat.motif_suspension && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <strong>Motif de suspension :</strong> {contrat.motif_suspension}
            </p>
          )}
          {contrat.motif_resiliation && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <strong>Motif de résiliation :</strong> {contrat.motif_resiliation}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-6">

          {/* Tab: Info */}
          {activeTab === "info" && (
            <div className="space-y-8">
              {/* Identification */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Identification</h3>
                <div className="grid grid-cols-2 gap-5">
                  {!isNew && (
                    <Field label="Code contrat">
                      <ReadonlyVal value={contrat.code} highlight />
                    </Field>
                  )}
                  <Field label="Objet" required>
                    <Input
                      value={form.objet}
                      onChange={v => setForm(f => ({ ...f, objet: v }))}
                      placeholder="Objet du contrat"
                    />
                  </Field>
                  <Field label="Type de contrat">
                    <Input
                      value={form.type_contrat}
                      onChange={v => setForm(f => ({ ...f, type_contrat: v }))}
                      placeholder="Ex: Forfait, BPU, dépenses contrôlées…"
                    />
                  </Field>
                  <Field label="Montant initial HT (FCFA)" required>
                    <Input
                      type="number"
                      value={form.montant_initial}
                      onChange={v => setForm(f => ({ ...f, montant_initial: v }))}
                      placeholder="Ex: 150000000"
                    />
                  </Field>
                </div>
              </div>

              {/* Parties */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Parties</h3>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Chantier" required>
                    <select
                      value={form.chantier_id}
                      onChange={e => setForm(f => ({ ...f, chantier_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                    >
                      <option value="">Sélectionner un chantier…</option>
                      {chantiersList.map(c => (
                        <option key={c.id} value={c.id}>{c.code} — {c.designation}</option>
                      ))}
                    </select>
                    {!isNew && contrat?.chantier_id && (
                      <Link to={`/chantiers/${contrat.chantier_id}`} className="mt-1 inline-block text-xs text-[#087F3E] hover:underline">
                        Voir le chantier →
                      </Link>
                    )}
                  </Field>
                  <Field label="Sous-traitant" required>
                    <select
                      value={form.soustraitant_id}
                      onChange={e => setForm(f => ({ ...f, soustraitant_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                    >
                      <option value="">Sélectionner un sous-traitant…</option>
                      {sttList.map(s => (
                        <option key={s.id} value={s.id}>{s.raison_sociale}</option>
                      ))}
                    </select>
                    {sttSelected?.statut === "suspendu" && (
                      <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        <AlertTriangle size={12} /> Ce sous-traitant est actuellement suspendu.
                      </div>
                    )}
                    {!isNew && contrat?.soustraitant && (
                      <div className="mt-2 space-y-0.5">
                        {contrat.soustraitant.ninea && (
                          <p className="text-xs text-gray-500">NINEA : <span className="font-mono font-medium text-gray-700">{contrat.soustraitant.ninea}</span></p>
                        )}
                        {contrat.soustraitant.telephone && (
                          <p className="text-xs text-gray-500">Tél : <span className="font-medium text-gray-700">{contrat.soustraitant.telephone}</span></p>
                        )}
                        <Link to={`/sous-traitants/${contrat.soustraitant_id}`} className="inline-block text-xs text-[#087F3E] hover:underline mt-0.5">
                          Voir la fiche →
                        </Link>
                      </div>
                    )}
                  </Field>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Dates</h3>
                <div className="grid grid-cols-3 gap-5">
                  <Field label="Date de début">
                    <Input type="date" value={form.date_debut} onChange={v => setForm(f => ({ ...f, date_debut: v }))} />
                  </Field>
                  <Field label="Date de fin prévue">
                    <Input type="date" value={form.date_fin_prevue} onChange={v => setForm(f => ({ ...f, date_fin_prevue: v }))} />
                  </Field>
                  <Field label="Durée">
                    <ReadonlyVal value={duree ?? "—"} />
                  </Field>
                  {!isNew && contrat?.date_fin_reelle && (
                    <Field label="Date de fin réelle">
                      <ReadonlyVal value={fmtDate(contrat.date_fin_reelle)} highlight />
                    </Field>
                  )}
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={saveMut.isPending}
                  className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60"
                >
                  {saveMut.isPending
                    ? <><Loader2 size={15} className="animate-spin" /> Enregistrement…</>
                    : <><Save size={15} /> {isNew ? "Créer le contrat" : "Enregistrer"}</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Tab: Paramétrage financier */}
          {activeTab === "parametrage" && (
            <ParametrageFinancierTab contrat={contrat} avenants={avenantsList} />
          )}

          {/* Tab: Avenants */}
          {activeTab === "avenants" && (
            <AvenantsTab contratId={id} isNew={isNew} montantInitial={contrat?.montant_initial} />
          )}

          {/* Tab: Cessions */}
          {activeTab === "cessions" && (
            <CessionsTab contratId={id} isNew={isNew} />
          )}

          {/* Tab: Décomptes */}
          {activeTab === "decomptes" && (
            <DecomptesTab decomptes={decomptesList} contratId={id} isNew={isNew} />
          )}

          {/* Tab: Attachements */}
          {activeTab === "attachements" && (
            <AttachementsTab contratId={id} chantierId={contrat?.chantier_id} isNew={isNew} />
          )}

          {/* Tab: Pièces jointes */}
          {activeTab === "pieces" && (
            <PiecesJointesTab contratId={id} isNew={isNew} />
          )}

          {/* Tab: Bons de commande */}
          {activeTab === "bonscommande" && (
            <BonCommandeTab contratId={id} isNew={isNew} />
          )}

          {/* Tab: Circuit de validation */}
          {activeTab === "circuit" && (
            <CircuitContratTab contrat={contrat} contratId={id} isNew={isNew} />
          )}

          {/* Tab: Factures — placeholder (no contrat_id filter in factureService list) */}
          {activeTab === "factures" && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="text-3xl mb-3">🧮</p>
              <p className="font-medium text-gray-500">Factures</p>
              <p className="text-xs mt-1 text-gray-400">Consultez la liste des factures pour ce contrat.</p>
              <Link to="/factures" className="mt-3 inline-block text-xs text-[#087F3E] hover:underline">
                Voir toutes les factures →
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
