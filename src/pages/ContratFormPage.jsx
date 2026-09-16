import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Save, Loader2, AlertTriangle,
  Hash, FileText, Info, FilePlus, CheckCircle, Trash2, Plus, X, Paperclip,
} from "lucide-react";
import { useContrat, useSaveContrat, useContratStatut } from "../hooks/useContrats";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useAvenantsByContrat, useSaveAvenant, useValiderAvenant, useDeleteAvenant } from "../hooks/useAvenants";
import { useAttachements } from "../hooks/useAttachements";
import { useBaremesPaginated } from "../hooks/useBaremes";
import { useToast } from "../context/ToastContext";
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
            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Net HT</th>
            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">TTC</th>
            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2 pr-3">Échéance</th>
            <th className="text-left text-xs uppercase tracking-wide font-medium text-gray-500 pb-2">Statut</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {decomptes.map(d => (
            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-2.5 pr-3 font-medium text-gray-900">{d.code}</td>
              <td className="py-2.5 pr-3 text-gray-700">{formatMontantCourt(parseFloat(d.montant_ht ?? 0))}</td>
              <td className="py-2.5 pr-3 text-gray-700">{formatMontantCourt(parseFloat(d.montant_ttc ?? 0))}</td>
              <td className="py-2.5 pr-3 text-gray-500 text-xs">{d.date_echeance ? formatDate(d.date_echeance) : "—"}</td>
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


// ─── Sub-tab: Avenants ───────────────────────────────────────────
const AVENANT_INIT = { objet: "", montant: "", date_signature: "", observations: "" };

function AvenantsTab({ contratId, isNew, montantInitial }) {
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(AVENANT_INIT);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
                          onClick={() => handleValider(a.id)}
                          disabled={validerMut.isPending}
                          title="Valider"
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

  const tabs = [
    { id: "info",          label: "Informations",    icon: Info },
    { id: "avenants",      label: "Avenants",         icon: FilePlus },
    { id: "decomptes",     label: "Décomptes",        icon: FileText },
    { id: "attachements",  label: "Attachements",     icon: Paperclip },
    { id: "factures",      label: "Factures",         icon: Hash },
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

      {/* KPIs — view mode only */}
      {!isNew && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Montant initial</p>
            <MoneyDisplay amount={contrat.montant_initial ?? 0} className="text-base font-bold text-gray-900" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Montant actuel</p>
            <MoneyDisplay
              amount={contrat.montant_actuel ?? contrat.montant_initial ?? 0}
              className={`text-base font-bold ${contrat.montant_actuel !== contrat.montant_initial ? "text-violet-600" : "text-gray-900"}`}
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date début</p>
            <p className="text-base font-bold text-gray-900">{fmtDate(contrat.date_debut)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fin prévue</p>
            <p className="text-base font-bold text-gray-900">{fmtDate(contrat.date_fin_prevue)}</p>
          </div>
        </div>
      )}

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
                    {!isNew && contrat?.soustraitant_id && (
                      <Link to={`/sous-traitants/${contrat.soustraitant_id}`} className="mt-1 inline-block text-xs text-[#087F3E] hover:underline">
                        Voir la fiche STT →
                      </Link>
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

          {/* Tab: Avenants */}
          {activeTab === "avenants" && (
            <AvenantsTab contratId={id} isNew={isNew} montantInitial={contrat?.montant_initial} />
          )}

          {/* Tab: Décomptes */}
          {activeTab === "decomptes" && (
            <DecomptesTab decomptes={decomptesData?.data ?? []} contratId={id} isNew={isNew} />
          )}

          {/* Tab: Attachements */}
          {activeTab === "attachements" && (
            <AttachementsTab contratId={id} chantierId={contrat?.chantier_id} isNew={isNew} />
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
