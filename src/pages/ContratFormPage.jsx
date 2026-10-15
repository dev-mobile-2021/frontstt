import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmModal from "../components/ConfirmModal";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Save, Loader2, AlertTriangle, RefreshCw,
  Hash, FileText, Info, FilePlus, CheckCircle, Trash2, Plus, X, Paperclip,
  Upload, Download, File, Circle, Clock, CheckCircle2, XCircle, Archive,
  Pencil, ChevronDown,
} from "lucide-react";
import { useContrat, useSaveContrat, useContratStatut, useContratCircuit, useSoumettreContrat, useValiderContrat, useRejeterContrat, useDeleteContrat } from "../hooks/useContrats";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useAvenantsByContrat, useSaveAvenant, useValiderAvenant, useDeleteAvenant } from "../hooks/useAvenants";
import { useAttachements } from "../hooks/useAttachements";
import { useBonCommandesByContrat, useRechercheBonsCommandeX3, useLierBonsCommande, useDelierBonCommande } from "../hooks/useBonCommandes";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { usePiecesJointes, useUploadPieceJointe, useDeletePieceJointe } from "../hooks/usePiecesJointes";
import {
  useDqe,
  useSaveRubrique as useSaveRubriqueDqe,
  useDeleteRubrique as useDeleteRubriqueDqe,
  useSavePoste as useSavePosteDqe,
  useDeletePoste as useDeletePosteDqe,
  useSaveLigneDqe,
  useDeleteLigneDqe,
} from "../hooks/useDqe";
import { pieceJointeService } from "../services/pieceJointeService";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import { usePeutFaire } from "../hooks/useParametres";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";
import { formatMontant, formatMontantCourt, formatDate, fmtNum } from "../utils/formatters";
import SearchSelect from "../components/SearchSelect";
import SousTraitantSelect from "../components/SousTraitantSelect";
import ArchiveContratDialog from "../components/ArchiveContratDialog";
import BaremePrixTable from "../components/BaremePrixTable";
import ImportBaremeDialog from "../components/ImportBaremeDialog";
import ImportDqeModal from "../components/ImportDqeModal";
import { telechargerModeleBareme } from "../utils/baremeModele";
import { baremeHierarchieService } from "../services/baremeHierarchieService";
import { useBaremeContrat, useBaremeContratActions, useRefreshBareme, useAddBaremeContrat } from "../hooks/useBaremeHierarchie";
import ArticleX3Select from "../components/ArticleX3Select";

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
      <Link to={`/decomptes/nouveau?contrat_id=${contratId}`} className="mt-3 inline-block text-xs text-[#087F3E] hover:underline">
        Créer un décompte →
      </Link>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link to={`/decomptes/nouveau?contrat_id=${contratId}`} className="inline-flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors">
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
  const fmt = n => fmtNum(Math.round(n ?? 0));

  const montantInitial = parseFloat(contrat?.montant_initial ?? 0);
  const montantActuel  = parseFloat(contrat?.montant_actuel ?? montantInitial);
  const avenatsValides = avenants.filter(a => a.statut === "valide");
  const totalAvenants  = avenatsValides.reduce((s, a) => s + parseFloat(a.montant ?? 0), 0);

  const buildFin = (c) => ({
    taux_rg:                   c?.taux_rg ?? 5,
    taux_revision_prix:        c?.taux_revision_prix ?? 0,
    taux_avance:               c?.taux_avance ?? 5,
    taux_remboursement_avance: c?.taux_remboursement_avance ?? 6.25,
    delai_paiement:            c?.delai_paiement ?? 30,
    taux_penalite:             c?.taux_penalite ?? 0.1,
    plafond_penalite:          c?.plafond_penalite ?? 10,
    taux_tva:                  c?.taux_tva ?? 18,
    delai_execution:           c?.delai_execution ?? "",
    date_signature:            c?.date_signature ? c.date_signature.substring(0, 10) : "",
    financement:               c?.financement ?? "",
  });

  const [fin, setFin] = useState(() => buildFin(contrat));
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (contrat?.id) setFin(buildFin(contrat)); }, [contrat?.id, contrat?.updated_at]);

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
            <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">Révision de prix (%)</label>
            <input type="number" step="0.01" min="0" value={fin.taux_revision_prix} onChange={e => set("taux_revision_prix", e.target.value)} className={inputCls} placeholder="0" />
            <p className="text-[10px] text-gray-400">Poste B décompte — calculé automatiquement sur A</p>
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

// ─── Sub-tab: Barème du contrat ─────────────────────────────────
// Hérite du barème du chantier (lui-même hérité du barème général). Seuls les écarts sont saisis.
// Brouillon : prix vivants. Activation : prix figés (photo).
function BaremeCessionsTab({ contratId, isNew, statut }) {
  const { addToast } = useToast();
  const { data, isLoading } = useBaremeContrat(isNew ? null : contratId);
  const { setPrix, reset, valider, validerBulk } = useBaremeContratActions(contratId);
  const addMut = useAddBaremeContrat(contratId);
  const [busyId, setBusyId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const refreshBareme = useRefreshBareme();
  const { data: peutGererBareme = false } = usePeutFaire("gerer_bareme");
  const { data: peutValiderBareme = false } = usePeutFaire("valider_bareme");
  const [selected, setSelected] = useState([]); // contrat_bareme_ids en attente sélectionnés
  const [nouveau, setNouveau] = useState({ code_article: "", designation: "", unite: "", prix: "" });

  if (isNew) return <p className="text-sm text-gray-400 text-center py-8">Enregistrez le contrat pour gérer son barème.</p>;
  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;

  const err = e => e?.response?.data?.error ?? e?.response?.data?.errors?.[0] ?? "Erreur.";
  const lignes = data?.lignes ?? [];
  const fige = !!data?.fige;
  const bloque = ["resilie", "archive", "cloture"].includes(statut);

  async function handleAdd() {
    const prix = parseFloat(nouveau.prix);
    if (!nouveau.code_article) return addToast("Choisissez un article Sage X3.", "error");
    if (isNaN(prix) || prix < 0) return addToast("Saisissez un prix valide.", "error");
    try {
      await addMut.mutateAsync({ code_article: nouveau.code_article, prix_contrat: prix, unite: nouveau.unite || null });
      setNouveau({ code_article: "", designation: "", unite: "", prix: "" });
      addToast("Article ajouté au barème du contrat.", "success");
    } catch (e) {
      const msg = err(e);
      addToast(msg === "DUPLICATE" ? "Cet article est déjà dans le barème du contrat." : msg, "error");
    }
  }

  async function run(id, fn, okMsg) {
    setBusyId(id);
    try { await fn(); if (okMsg) addToast(okMsg, "success"); }
    catch (e) { addToast(err(e), "error"); }
    finally { setBusyId(null); }
  }

  async function handleValiderSelection() {
    if (selected.length === 0) return;
    try {
      await validerBulk.mutateAsync(selected);
      addToast(`${selected.length} prix validé(s).`, "success");
      setSelected([]);
    } catch (e) { addToast(err(e), "error"); }
  }

  return (
    <div className="space-y-3">
      {fige ? (
        <p className="text-xs text-violet-800 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
          <strong>Prix figés à l'activation du contrat.</strong> Les évolutions du barème général ou du chantier ne les modifient plus.
          Toute modification passe par une validation du DACC.
        </p>
      ) : (
        <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <strong>Prix vivants.</strong> Ce contrat suit le barème de son chantier (hérité du barème général) : seuls les écarts sont à saisir.
          Les prix seront figés à l'activation, qui est impossible tant qu'un écart attend la validation DACC.
        </p>
      )}
      {!bloque && peutGererBareme && (
        <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ajouter un article Sage X3</p>
          <div className="grid md:grid-cols-[1fr_110px_140px_auto] gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Article (classes MTX, BAS, PRP)</label>
              <ArticleX3Select
                value={nouveau.code_article}
                classe="MTX,BAS,PRP"
                onSelect={a => {
                  if (!a) return setNouveau(n => ({ ...n, code_article: "", designation: "", unite: "", prix: "" }));
                  const existant = lignes.find(l => l.code_article === a.code_article || l.code === a.code_article);
                  setNouveau(n => ({
                    ...n,
                    code_article: a.code_article,
                    designation: a.designation,
                    unite: a.unite ?? n.unite,
                    prix: existant?.prix_effectif != null ? String(existant.prix_effectif) : existant?.prix != null ? String(existant.prix) : n.prix,
                  }));
                }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Unité</label>
              <input list="unites-bareme-contrat" value={nouveau.unite}
                onChange={e => setNouveau(n => ({ ...n, unite: e.target.value.toUpperCase() }))}
                placeholder="Unité X3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
              <datalist id="unites-bareme-contrat">
                {["T","KG","L","M3","M2","ML","M","SAC","U","PC","BARRE","H","JOUR","MOIS"].map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prix chantier = Prix appliqué (FCFA)</label>
              <input type="number" min="0" step="any" value={nouveau.prix}
                onChange={e => setNouveau(n => ({ ...n, prix: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
            </div>
            <button onClick={handleAdd} disabled={addMut.isPending}
              className="inline-flex items-center gap-1.5 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
              {addMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ajouter
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={() => telechargerModeleBareme(
            lignes.map(l => ({ code: l.code, designation: l.designation, unite: l.unite, prix: l.prix_effectif, prix_chantier: l.prix_herite,
              provenance: l.source === "contrat" ? "Écart du contrat" : "Barème chantier" })),
            "bareme_contrat", [["Prix du chantier", "prix_chantier"], ["Provenance", "provenance"]])}
          title="Fichier Excel (CodeArticle, Désignation, Unité, Prix unitaire) pré-rempli avec les prix appliqués au contrat"
          className="inline-flex items-center gap-1.5 text-sm text-gray-700 font-medium border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          <Download size={14} /> Exporter en Excel
        </button>
        {!bloque && peutGererBareme && (
          <button onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 text-sm text-[#087F3E] font-medium border border-[#087F3E]/40 px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE]">
            <Upload size={14} /> Importer un fichier
          </button>
        )}
      </div>
      {showImport && (
        <ImportBaremeDialog
          titre="Importer le barème du contrat"
          description="Modifiez les prix dans le fichier Excel exporté puis réimportez-le : seules les lignes dont le prix a changé sont prises en compte (écarts). Un prix égal à l'hérité du chantier rétablit l'héritage ; après activation, chaque changement est un écart à valider par le DACC. Sans code article, l'article est retrouvé par sa désignation."
          lignesModele={lignes.map(l => ({ code: l.code, designation: l.designation, unite: l.unite, prix: l.prix_effectif }))}
          nomModele="bareme_contrat"
          onAnalyser={({ lignes: l }) => baremeHierarchieService.importContrat(contratId, { lignes: l, appliquer: false })}
          onAppliquer={async ({ lignes: l }) => {
            const r = await baremeHierarchieService.importContrat(contratId, { lignes: l, appliquer: true });
            refreshBareme();
            return r;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
      {peutValiderBareme && selected.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-amber-800 font-medium">{selected.length} ligne{selected.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}</span>
          <button onClick={handleValiderSelection} disabled={validerBulk.isPending}
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] disabled:opacity-60">
            {validerBulk.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            Valider la sélection
          </button>
          <button onClick={() => setSelected([])} className="text-xs text-amber-600 hover:underline">Tout désélectionner</button>
        </div>
      )}
      <BaremePrixTable
        rows={lignes}
        level="contrat"
        canValidate={peutValiderBareme}
        disabled={bloque}
        busyId={busyId}
        selected={selected}
        onSelectChange={setSelected}
        onSave={(r, prix) => run(r.bareme_id, () => setPrix.mutateAsync({ baremeId: r.bareme_id, prix }), "Prix enregistré.")}
        onReset={(r) => run(r.bareme_id, () => reset.mutateAsync(r.bareme_id), "Prix hérité rétabli.")}
        onValider={(r) => run(r.bareme_id, () => valider.mutateAsync(r.contrat_bareme_id), "Prix validé.")}
      />
      <p className="text-[11px] text-gray-400">Ressources humaines et matériel (GMAO) : en attente, non gérés dans le barème.</p>
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

  const fmtMontant = n => fmtNum(Math.round(n ?? 0));
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
          <SearchSelect
            value={categorie}
            onChange={e => setCategorie(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
          >
            {CATEGORIES_PJ.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </SearchSelect>
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors
            ${dragging ? "border-[#087F3E] bg-[#E8F5EE]/60" : "border-gray-200 hover:border-[#087F3E]/50 hover:bg-gray-50"}`}
          onClick={() => !uploadMut.isPending && document.getElementById("pj-file-input").click()}
        >
          {uploadMut.isPending
            ? <><div className="w-5 h-5 border-2 border-[#087F3E] border-t-transparent rounded-full animate-spin" /><p className="text-sm text-[#087F3E]">Upload en cours…</p></>
            : <><Upload size={20} className="text-gray-400" /><p className="text-sm text-gray-500">Glissez-déposez vos fichiers ici ou <span className="text-[#087F3E] font-medium">cliquez pour parcourir</span></p><p className="text-xs text-gray-400">PDF, DOCX, XLSX, JPG, PNG — max 10 MB par fichier</p></>
          }
          <input
            id="pj-file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
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
  const fmt          = n => fmtNum(Math.round(n));

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
            Impact sur montant actuel : {formatMontant(totalValide)}
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
                <td className={`py-2.5 pr-3 font-semibold whitespace-nowrap ${a.statut === "valide" ? "text-violet-700" : "text-gray-700"}`}>
                  {formatMontant(parseFloat(a.montant ?? 0))}
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

// ─── Sub-tab: Bons de commande (Sage X3) ─────────────────────────
// Les BC ne sont jamais créés dans STT : on interroge X3 avec le chantier et le
// sous-traitant du contrat, puis on sélectionne le(s) BC à lier.
function BonCommandeTab({ contratId, isNew }) {
  const { addToast } = useToast();
  const [resultats, setResultats] = useState(null);   // null = pas de recherche lancée
  const [selection, setSelection] = useState([]);
  const [confirmDelier, setConfirmDelier] = useState(null);

  const { data: bcs = [], isLoading } = useBonCommandesByContrat(!isNew ? contratId : null);
  const rechercheMut = useRechercheBonsCommandeX3();
  const lierMut      = useLierBonsCommande(contratId);
  const delierMut    = useDelierBonCommande();

  const fmt = n => fmtNum(Math.round(n ?? 0));
  const apiError = e => e?.response?.data?.errors?.[0] ?? e?.response?.data?.message ?? "Erreur lors de l'appel à Sage X3.";

  const totalHT  = bcs.reduce((s, b) => s + (b.montant_ht ?? 0), 0);
  const totalTTC = bcs.reduce((s, b) => s + (b.montant_ttc ?? 0), 0);

  async function handleRechercher() {
    try {
      const data = await rechercheMut.mutateAsync(parseInt(contratId, 10));
      setResultats(data);
      setSelection(data.filter(r => r.lie_a_ce_contrat).map(r => r.numero));
      if (data.length === 0) addToast("Aucun bon de commande trouvé dans Sage X3 pour ce chantier et ce sous-traitant.", "info");
    } catch (e) {
      setResultats(null);
      addToast(apiError(e), "error");
    }
  }

  function toggle(numero) {
    setSelection(sel => sel.includes(numero) ? sel.filter(n => n !== numero) : [...sel, numero]);
  }

  async function handleLier() {
    const aLier = selection.filter(n => !bcs.some(b => b.numero === n));
    if (aLier.length === 0) { addToast("Aucun nouveau bon de commande sélectionné.", "info"); return; }
    try {
      await lierMut.mutateAsync(aLier);
      addToast(`${aLier.length} bon(s) de commande lié(s) au contrat.`, "success");
      setResultats(null);
      setSelection([]);
    } catch (e) {
      addToast(apiError(e), "error");
    }
  }

  async function handleDelier(id) {
    try {
      await delierMut.mutateAsync(id);
      addToast("Bon de commande détaché du contrat.", "success");
    } catch (e) {
      addToast(apiError(e), "error");
    }
    setConfirmDelier(null);
  }

  if (isNew) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
        Enregistrez d'abord le contrat : les bons de commande Sage X3 sont ensuite recherchés avec son chantier et son sous-traitant.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Bons de commande Sage X3</h3>
          <p className="text-xs text-gray-400">Récupérés depuis X3 avec le chantier et le sous-traitant du contrat, non modifiables dans STT.</p>
        </div>
        <button
          onClick={handleRechercher}
          disabled={rechercheMut.isPending}
          className="inline-flex items-center gap-2 text-[#087F3E] border border-[#087F3E]/40 px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-[#E8F5EE] disabled:opacity-60 transition-colors"
        >
          {rechercheMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {rechercheMut.isPending ? "Recherche…" : "Récupérer les BC depuis Sage X3"}
        </button>
      </div>

      {/* Résultats de la recherche X3 */}
      {resultats && resultats.length > 0 && (
        <div className="bg-white rounded-xl border border-[#087F3E]/30 overflow-hidden">
          <div className="px-4 py-2.5 bg-[#E8F5EE] text-xs text-[#065A2C] font-medium flex items-center justify-between">
            <span>{resultats.length} bon(s) de commande trouvé(s) dans Sage X3 — cochez ceux à lier au contrat</span>
            <button onClick={() => setResultats(null)} className="text-gray-500 hover:text-gray-700">Fermer</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                <th className="px-3 py-2 w-10"></th>
                <th className="text-left px-3 py-2">N° BC</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Montant HT</th>
                <th className="text-right px-3 py-2">Montant TTC</th>
                <th className="text-left px-3 py-2">Devise</th>
                <th className="text-left px-3 py-2">Statut X3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resultats.map(r => {
                const dejaLie = r.lie_a_ce_contrat;
                const bloque  = r.lie_a_autre_contrat;
                return (
                  <tr key={r.numero} className={bloque ? "opacity-50" : "hover:bg-gray-50"}>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selection.includes(r.numero)}
                        disabled={dejaLie || bloque}
                        onChange={() => toggle(r.numero)}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.numero}
                      {dejaLie && <span className="ml-2 text-[10px] text-[#065A2C] bg-[#E8F5EE] px-1.5 py-0.5 rounded">Déjà lié</span>}
                      {bloque && <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Lié à un autre contrat</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.date_commande ? new Date(r.date_commande).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(r.montant_ht)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(r.montant_ttc)}</td>
                    <td className="px-3 py-2 text-gray-500">{r.devise ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{r.statut_x3 ?? "—"} · clôt. {r.cloture_x3 ?? "—"} · récep. {r.receptionne_x3 ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button onClick={() => setResultats(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button
              onClick={handleLier}
              disabled={lierMut.isPending}
              className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60"
            >
              {lierMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</> : "Lier au contrat"}
            </button>
          </div>
        </div>
      )}

      {/* BC liés au contrat */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-400">Chargement…</div>
        ) : bcs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Aucun bon de commande lié à ce contrat. Utilisez « Récupérer les BC depuis Sage X3 ».
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                <th className="text-left px-4 py-2.5">N° BC</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-right px-4 py-2.5">Montant HT</th>
                <th className="text-right px-4 py-2.5">TVA</th>
                <th className="text-right px-4 py-2.5">Montant TTC</th>
                <th className="text-left px-4 py-2.5">Devise</th>
                <th className="text-left px-4 py-2.5">Statut X3</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bcs.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{b.numero}</td>
                  <td className="px-4 py-2.5 text-gray-600">{b.date_commande ? new Date(b.date_commande).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{fmt(b.montant_ht)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmt(b.montant_tva)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{fmt(b.montant_ttc)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{b.devise ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{b.statut_x3 ?? "—"} · clôt. {b.cloture_x3 ?? "—"} · récep. {b.receptionne_x3 ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {confirmDelier === b.id ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <button onClick={() => handleDelier(b.id)} disabled={delierMut.isPending} className="text-red-600 font-medium">Détacher</button>
                        <button onClick={() => setConfirmDelier(null)} className="text-gray-400">Non</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelier(b.id)} className="text-xs text-gray-400 hover:text-red-500">Détacher</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-sm">
                <td className="px-4 py-2.5" colSpan={2}>Total ({bcs.length} BC)</td>
                <td className="px-4 py-2.5 text-right text-[#065A2C]">{fmt(totalHT)}</td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-right">{fmt(totalTTC)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
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

function nextPeriode(contratAtts, dateDebut) {
  // Tri par periodeFin croissant pour trouver le dernier
  const sorted = [...contratAtts].sort((a, b) => (a.periodeFin ?? "").localeCompare(b.periodeFin ?? ""));
  const last = sorted[sorted.length - 1];

  let debut, fin;
  if (!last) {
    // Premier attachement : commence à la date de démarrage du contrat
    debut = dateDebut ? dateDebut.slice(0, 10) : new Date().toISOString().slice(0, 10);
  } else {
    // Lendemain du dernier periodeFin
    if (!last.periodeFin) {
      debut = dateDebut ? dateDebut.slice(0, 10) : new Date().toISOString().slice(0, 10);
    } else {
      const d = new Date(last.periodeFin + "T00:00");
      d.setDate(d.getDate() + 1);
      debut = d.toISOString().slice(0, 10);
    }
  }

  // Fin = 25 du mois de début (ou mois suivant si on est déjà après le 25)
  const d = new Date(debut + "T00:00");
  const finDate = new Date(d.getFullYear(), d.getMonth(), 25);
  if (finDate <= d) finDate.setMonth(finDate.getMonth() + 1);
  fin = finDate.toISOString().slice(0, 10);

  return { periode_debut: debut, periode_fin: fin };
}

function AttachementsTab({ contratId, chantierId, isNew, contrat }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { attachements, addAttachement } = useAttachements();
  const contratIdInt = contratId ? parseInt(contratId, 10) : null;
  const { data: dqeData } = useDqe(contratIdInt);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periode_debut: "", periode_fin: "" });
  const [loading, setLoading] = useState(false);

  const numFmt = v => fmtNum(Math.round(v || 0));
  const contratAtts = attachements
    .filter(a => a.contratId === String(contratId))
    .sort((a, b) => (b.periodeDebut ?? "").localeCompare(a.periodeDebut ?? ""));

  function handleShowForm() {
    try {
      const suggestion = nextPeriode(contratAtts, contrat?.date_debut);
      setForm(suggestion);
      setShowForm(true);
    } catch (e) {
      console.error("handleShowForm error:", e);
      setForm({ periode_debut: "", periode_fin: "" });
      setShowForm(true);
    }
  }

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
      const rubriques = dqeData?.data ?? [];
      const lignesCSE = [];
      for (const rubrique of rubriques) {
        for (const poste of rubrique.postes ?? []) {
          for (const ligne of poste.lignes ?? []) {
            lignesCSE.push({
              id: `dqe-ligne-${ligne.id}`,
              source: "DQE",
              refDQE: ligne.code || (rubrique.code ? String(rubrique.code) : `R${rubrique.id}`),
              rubriqueDesignation: rubrique.designation,
              posteDesignation: poste.designation,
              designation: ligne.designation,
              unite: ligne.unite ?? "",
              quantitePrevueDQE: parseFloat(ligne.quantite_prevue ?? 0),
              prixUnitaireHT: parseFloat(ligne.prix_unitaire ?? 0),
              quantiteRealisee: 0,
              montant: 0,
            });
          }
        }
      }
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

  const dqeEmpty = !dqeData?.data?.length || dqeData.data.every(r => !r.postes?.length || r.postes.every(p => !p.lignes?.length));

  return (
    <div className="space-y-4">
      {dqeEmpty && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
          <AlertTriangle size={14} className="flex-shrink-0 text-amber-500" />
          <span>Le DQE de ce contrat est vide. Renseignez les rubriques/postes/lignes dans l'onglet DQE avant d'initier un attachement.</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{contratAtts.length} dossier{contratAtts.length !== 1 ? "s" : ""}</p>
        {!showForm && (
          <button onClick={handleShowForm} className="flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors">
            <Plus size={12} /> Initier un attachement
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#E8F5EE]/60 border border-[#087F3E]/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Nouvel attachement</p>
            <span className="text-[10px] text-[#087F3E] bg-[#087F3E]/10 px-2 py-0.5 rounded-full">Période suggérée automatiquement</span>
          </div>
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

// ─── DQE Tab ──────────────────────────────────────────────────────
function fmtMontantDqe(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtQte(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function DqeTab({ contratId, contrat }) {
  const readonly = contrat?.statut === "cloture" || contrat?.statut === "resilie";
  const { data, isLoading } = useDqe(contratId);
  const saveRubrique   = useSaveRubriqueDqe(contratId);
  const deleteRubrique = useDeleteRubriqueDqe(contratId);
  const savePoste      = useSavePosteDqe(contratId);
  const deletePoste    = useDeletePosteDqe(contratId);
  const saveLigne      = useSaveLigneDqe(contratId);
  const deleteLigne    = useDeleteLigneDqe(contratId);

  const rubriques = data?.data || [];
  const total     = data?.total ?? 0;

  // Formulaires inline
  const [addingRubrique, setAddingRubrique] = useState(false);
  const [rubForm, setRubForm] = useState({ designation: "", code: "", bon_commande_id: null });
  const [editRubId, setEditRubId] = useState(null);
  const [editRubForm, setEditRubForm] = useState({ designation: "", code: "" });

  const [addingPosteFor, setAddingPosteFor] = useState(null);  // rubriqueId
  const [posteForm, setPosteForm] = useState({ designation: "" });
  const [editPosteId, setEditPosteId] = useState(null);
  const [editPosteForm, setEditPosteForm] = useState({ designation: "" });

  const [addingLigneFor, setAddingLigneFor] = useState(null);  // posteId
  const [ligneForm, setLigneForm] = useState({ designation: "", unite: "", quantite_prevue: "", prix_unitaire: "" });
  const [editLigneId, setEditLigneId] = useState(null);
  const [editLigneForm, setEditLigneForm] = useState({ designation: "", unite: "", quantite_prevue: "", prix_unitaire: "" });

  // Collapse state
  const [collapsedRub, setCollapsedRub] = useState({});
  const [collapsedPoste, setCollapsedPoste] = useState({});
  const toggleRub   = (id) => setCollapsedRub(s => ({ ...s, [id]: !s[id] }));
  const togglePoste = (id) => setCollapsedPoste(s => ({ ...s, [id]: !s[id] }));

  const [showImportDqe, setShowImportDqe] = useState(false);
  const qc = useQueryClient();

  const { data: bcsData } = useBonCommandesByContrat(contratId);
  const bcs = bcsData ?? [];

  // Confirm delete
  const [confirmDel, setConfirmDel] = useState(null); // { type, id, label }

  const resetAddRub = () => { setAddingRubrique(false); setRubForm({ designation: "", code: "", bon_commande_id: null }); };
  const resetAddPoste = () => { setAddingPosteFor(null); setPosteForm({ designation: "" }); };
  const resetAddLigne = () => { setAddingLigneFor(null); setLigneForm({ designation: "", unite: "", quantite_prevue: "", prix_unitaire: "" }); };

  const submitAddRub = async () => {
    if (!rubForm.designation.trim()) return;
    await saveRubrique.mutateAsync({
      designation:     rubForm.designation.trim(),
      code:            rubForm.code.trim() || null,
      bon_commande_id: rubForm.bon_commande_id ? Number(rubForm.bon_commande_id) : null,
    });
    resetAddRub();
  };
  const submitEditRub = async (id) => {
    if (!editRubForm.designation.trim()) return;
    await saveRubrique.mutateAsync({
      id,
      designation:     editRubForm.designation.trim(),
      code:            editRubForm.code?.trim() || null,
      bon_commande_id: editRubForm.bon_commande_id ? Number(editRubForm.bon_commande_id) : null,
    });
    setEditRubId(null);
  };
  const submitAddPoste = async (rubriqueId) => {
    if (!posteForm.designation.trim()) return;
    await savePoste.mutateAsync({ rubriqueId, data: { designation: posteForm.designation.trim() } });
    resetAddPoste();
  };
  const submitEditPoste = async (id) => {
    if (!editPosteForm.designation.trim()) return;
    await savePoste.mutateAsync({ rubriqueId: 0, data: { id, designation: editPosteForm.designation.trim() } });
    setEditPosteId(null);
  };
  const submitAddLigne = async (posteId) => {
    if (!ligneForm.designation.trim()) return;
    await saveLigne.mutateAsync({
      posteId,
      data: {
        designation: ligneForm.designation.trim(),
        unite: ligneForm.unite.trim() || null,
        quantite_prevue: Number(ligneForm.quantite_prevue) || 0,
        prix_unitaire: Number(ligneForm.prix_unitaire) || 0,
      },
    });
    resetAddLigne();
  };
  const submitEditLigne = async (id) => {
    if (!editLigneForm.designation.trim()) return;
    await saveLigne.mutateAsync({
      posteId: 0,
      data: {
        id,
        designation: editLigneForm.designation.trim(),
        unite: editLigneForm.unite?.trim() || null,
        quantite_prevue: Number(editLigneForm.quantite_prevue) || 0,
        prix_unitaire: Number(editLigneForm.prix_unitaire) || 0,
      },
    });
    setEditLigneId(null);
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    if (confirmDel.type === "rubrique") await deleteRubrique.mutateAsync(confirmDel.id);
    else if (confirmDel.type === "poste") await deletePoste.mutateAsync(confirmDel.id);
    else if (confirmDel.type === "ligne") await deleteLigne.mutateAsync(confirmDel.id);
    setConfirmDel(null);
  };

  const liveLigneMontant = (Number(ligneForm.quantite_prevue) || 0) * (Number(ligneForm.prix_unitaire) || 0);
  const liveEditLigneMontant = (Number(editLigneForm.quantite_prevue) || 0) * (Number(editLigneForm.prix_unitaire) || 0);

  if (isLoading) {
    return <div className="text-sm text-gray-500 py-10 text-center">Chargement du DQE…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header actions + Total */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {!readonly ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddingRubrique(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#076a34] transition-colors"
            >
              <Plus size={14} /> Ajouter une rubrique
            </button>
            <button
              onClick={() => setShowImportDqe(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#087F3E] text-[#087F3E] text-sm font-medium hover:bg-[#087F3E]/5 transition-colors"
            >
              <Upload size={14} /> Importer
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Contrat {contrat?.statut} — lecture seule</div>
        )}

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Total DQE</div>
          <div className="text-xl font-bold text-[#087F3E]">{fmtMontantDqe(total)} FCFA</div>
        </div>
      </div>

      {/* Formulaire ajout rubrique inline */}
      {addingRubrique && (
        <div className="rounded-xl border border-[#087F3E]/30 bg-[#087F3E]/5 p-3 flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] text-gray-600 mb-1">Code (optionnel)</label>
            <input
              value={rubForm.code}
              onChange={e => setRubForm(s => ({ ...s, code: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              placeholder="RA-01"
              maxLength={20}
            />
          </div>
          <div className="flex-[3] min-w-[260px]">
            <label className="block text-[11px] text-gray-600 mb-1">Désignation *</label>
            <input
              autoFocus
              value={rubForm.designation}
              onChange={e => setRubForm(s => ({ ...s, designation: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              placeholder="TERRASSEMENTS"
            />
          </div>
          {bcs.length > 0 && (
            <div className="min-w-[180px]">
              <label className="block text-[11px] text-gray-600 mb-1">BC associé (optionnel)</label>
              <select
                value={rubForm.bon_commande_id || ""}
                onChange={e => setRubForm(s => ({ ...s, bon_commande_id: e.target.value || null }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
              >
                <option value="">— Aucun BC —</option>
                {bcs.map(bc => (
                  <option key={bc.id} value={bc.id}>{bc.numero ?? bc.code_x3}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={submitAddRub}
              disabled={saveRubrique.isPending || !rubForm.designation.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#076a34] disabled:opacity-50 inline-flex items-center gap-1"
            >
              {saveRubrique.isPending && <Loader2 size={13} className="animate-spin" />} OK
            </button>
            <button onClick={resetAddRub} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des rubriques */}
      {rubriques.length === 0 && !addingRubrique && (
        <div className="text-center py-10 text-sm text-gray-400">
          Aucune rubrique DQE. {!readonly && "Cliquez sur « Ajouter une rubrique » pour commencer."}
        </div>
      )}

      {rubriques.map((rub) => {
        const rubMontant = (rub.postes || []).reduce(
          (s, p) => s + (p.lignes || []).reduce((ss, l) => ss + (Number(l.montant) || 0), 0),
          0
        );
        const isRubCollapsed = !!collapsedRub[rub.id];

        return (
          <div key={rub.id} className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Header rubrique */}
            <div className="bg-[#087F3E]/8 border-l-4 border-[#087F3E] px-3 py-2 flex items-center gap-2">
              <button onClick={() => toggleRub(rub.id)} className="text-[#087F3E] hover:bg-[#087F3E]/10 rounded p-0.5">
                {isRubCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>

              {editRubId === rub.id ? (
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <input
                    value={editRubForm.code || ""}
                    onChange={e => setEditRubForm(s => ({ ...s, code: e.target.value }))}
                    className="px-2 py-1 border border-gray-200 rounded text-xs w-24"
                    placeholder="Code"
                    maxLength={20}
                  />
                  <input
                    autoFocus
                    value={editRubForm.designation}
                    onChange={e => setEditRubForm(s => ({ ...s, designation: e.target.value }))}
                    className="flex-1 min-w-[200px] px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                  {bcs.length > 0 && (
                    <select
                      value={editRubForm.bon_commande_id || ""}
                      onChange={e => setEditRubForm(s => ({ ...s, bon_commande_id: e.target.value || null }))}
                      className="border border-gray-200 rounded px-2 py-1 text-xs bg-white max-w-[200px]"
                    >
                      <option value="">— Aucun BC —</option>
                      {bcs.map(bc => (
                        <option key={bc.id} value={bc.id}>{bc.numero ?? bc.code_x3}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => submitEditRub(rub.id)} className="px-2 py-1 rounded bg-[#087F3E] text-white text-xs hover:bg-[#076a34]">OK</button>
                  <button onClick={() => setEditRubId(null)} className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Annuler</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 font-semibold text-[#087F3E] text-sm">
                    {rub.code && <span className="text-xs text-gray-500 font-mono mr-2">{rub.code}</span>}
                    RA : {rub.designation}
                    {rub.bon_commande && (
                      <span className="ml-2 text-[11px] font-normal bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">
                        BC : {rub.bon_commande.numero ?? rub.bon_commande.code_x3}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#087F3E]">{fmtMontantDqe(rubMontant)} FCFA</div>
                  {!readonly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditRubId(rub.id); setEditRubForm({ designation: rub.designation, code: rub.code || "", bon_commande_id: rub.bon_commande_id || "" }); }}
                        className="p-1 rounded hover:bg-white/60 text-gray-600" title="Modifier"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDel({ type: "rubrique", id: rub.id, label: rub.designation })}
                        className="p-1 rounded hover:bg-red-50 text-red-500" title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Postes */}
            {!isRubCollapsed && (
              <div className="divide-y divide-gray-100">
                {(rub.postes || []).map((poste) => {
                  const posteMontant = (poste.lignes || []).reduce((s, l) => s + (Number(l.montant) || 0), 0);
                  const isPosteCollapsed = !!collapsedPoste[poste.id];

                  return (
                    <div key={poste.id}>
                      {/* Header poste */}
                      <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 pl-6">
                        <button onClick={() => togglePoste(poste.id)} className="text-gray-600 hover:bg-gray-200 rounded p-0.5">
                          {isPosteCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {editPosteId === poste.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              autoFocus
                              value={editPosteForm.designation}
                              onChange={e => setEditPosteForm({ designation: e.target.value })}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                            />
                            <button onClick={() => submitEditPoste(poste.id)} className="px-2 py-1 rounded bg-[#087F3E] text-white text-xs hover:bg-[#076a34]">OK</button>
                            <button onClick={() => setEditPosteId(null)} className="px-2 py-1 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Annuler</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 font-medium text-gray-700 text-sm">Poste : {poste.designation}</div>
                            {!readonly && (
                              <button
                                onClick={() => { setAddingLigneFor(poste.id); setCollapsedPoste(s => ({ ...s, [poste.id]: false })); }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#087F3E] text-[#087F3E] text-xs hover:bg-[#087F3E]/10"
                              >
                                <Plus size={11} /> Ligne
                              </button>
                            )}
                            <div className="text-sm font-semibold text-gray-700">{fmtMontantDqe(posteMontant)} FCFA</div>
                            {!readonly && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setEditPosteId(poste.id); setEditPosteForm({ designation: poste.designation }); }}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Modifier"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => setConfirmDel({ type: "poste", id: poste.id, label: poste.designation })}
                                  className="p-1 rounded hover:bg-red-50 text-red-500" title="Supprimer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Lignes */}
                      {!isPosteCollapsed && (
                        <div className="pl-10 pr-3 py-2 bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 border-b border-gray-100">
                                <th className="text-left font-medium py-1 w-10">Réf</th>
                                <th className="text-left font-medium py-1">Désignation</th>
                                <th className="text-left font-medium py-1 w-16">U</th>
                                <th className="text-right font-medium py-1 w-24">Qté prévue</th>
                                <th className="text-right font-medium py-1 w-28">PU</th>
                                <th className="text-right font-medium py-1 w-32">Montant</th>
                                {!readonly && <th className="w-16"></th>}
                              </tr>
                            </thead>
                            <tbody>
                              {(poste.lignes || []).length === 0 && (
                                <tr><td colSpan={readonly ? 6 : 7} className="text-center text-gray-400 italic py-2">Aucune ligne</td></tr>
                              )}
                              {(poste.lignes || []).map((ligne) => (
                                editLigneId === ligne.id ? (
                                  <tr key={ligne.id} className="bg-amber-50/40">
                                    <td className="py-1 pr-2">
                                      <input autoFocus value={editLigneForm.designation}
                                        onChange={e => setEditLigneForm(s => ({ ...s, designation: e.target.value }))}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                                    </td>
                                    <td className="pr-2">
                                      <input value={editLigneForm.unite || ""}
                                        onChange={e => setEditLigneForm(s => ({ ...s, unite: e.target.value }))}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs" maxLength={20} />
                                    </td>
                                    <td className="pr-2">
                                      <input type="number" step="0.001" value={editLigneForm.quantite_prevue}
                                        onChange={e => setEditLigneForm(s => ({ ...s, quantite_prevue: e.target.value }))}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" />
                                    </td>
                                    <td className="pr-2">
                                      <input type="number" step="0.01" value={editLigneForm.prix_unitaire}
                                        onChange={e => setEditLigneForm(s => ({ ...s, prix_unitaire: e.target.value }))}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" />
                                    </td>
                                    <td className="text-right pr-2 font-semibold">{fmtMontantDqe(liveEditLigneMontant)}</td>
                                    <td>
                                      <div className="flex items-center gap-1 justify-end">
                                        <button onClick={() => submitEditLigne(ligne.id)} className="px-1.5 py-0.5 rounded bg-[#087F3E] text-white text-[10px]">OK</button>
                                        <button onClick={() => setEditLigneId(null)} className="px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-600">X</button>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={ligne.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-1 pr-2">
                                      {ligne.code
                                        ? <span className="font-mono text-[10px] font-semibold text-[#087F3E] bg-[#087F3E]/10 px-1.5 py-0.5 rounded">{ligne.code}</span>
                                        : <span className="text-gray-300">—</span>
                                      }
                                    </td>
                                    <td className="py-1 pr-2">{ligne.designation}</td>
                                    <td className="pr-2">{ligne.unite || "—"}</td>
                                    <td className="text-right pr-2">{fmtQte(ligne.quantite_prevue)}</td>
                                    <td className="text-right pr-2">{fmtMontantDqe(ligne.prix_unitaire)}</td>
                                    <td className="text-right pr-2 font-medium">{fmtMontantDqe(ligne.montant)}</td>
                                    {!readonly && (
                                      <td>
                                        <div className="flex items-center gap-1 justify-end">
                                          <button
                                            onClick={() => { setEditLigneId(ligne.id); setEditLigneForm({ designation: ligne.designation, unite: ligne.unite || "", quantite_prevue: ligne.quantite_prevue, prix_unitaire: ligne.prix_unitaire }); }}
                                            className="p-0.5 rounded hover:bg-gray-200 text-gray-600" title="Modifier"
                                          >
                                            <Pencil size={11} />
                                          </button>
                                          <button
                                            onClick={() => setConfirmDel({ type: "ligne", id: ligne.id, label: ligne.designation })}
                                            className="p-0.5 rounded hover:bg-red-50 text-red-500" title="Supprimer"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                )
                              ))}

                              {/* Formulaire ajout ligne inline */}
                              {addingLigneFor === poste.id && !readonly && (
                                <tr className="bg-[#087F3E]/5">
                                  <td className="py-1 pr-2">
                                    <input autoFocus value={ligneForm.designation}
                                      onChange={e => setLigneForm(s => ({ ...s, designation: e.target.value }))}
                                      placeholder="Désignation *"
                                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                                  </td>
                                  <td className="pr-2">
                                    <input value={ligneForm.unite}
                                      onChange={e => setLigneForm(s => ({ ...s, unite: e.target.value }))}
                                      placeholder="U"
                                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs" maxLength={20} />
                                  </td>
                                  <td className="pr-2">
                                    <input type="number" step="0.001" value={ligneForm.quantite_prevue}
                                      onChange={e => setLigneForm(s => ({ ...s, quantite_prevue: e.target.value }))}
                                      placeholder="0"
                                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" />
                                  </td>
                                  <td className="pr-2">
                                    <input type="number" step="0.01" value={ligneForm.prix_unitaire}
                                      onChange={e => setLigneForm(s => ({ ...s, prix_unitaire: e.target.value }))}
                                      placeholder="0"
                                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" />
                                  </td>
                                  <td className="text-right pr-2 font-semibold text-[#087F3E]">{fmtMontantDqe(liveLigneMontant)}</td>
                                  <td>
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        disabled={saveLigne.isPending || !ligneForm.designation.trim()}
                                        onClick={() => submitAddLigne(poste.id)}
                                        className="px-1.5 py-0.5 rounded bg-[#087F3E] text-white text-[10px] disabled:opacity-50"
                                      >OK</button>
                                      <button onClick={resetAddLigne} className="px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-600">X</button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ajouter poste inline */}
                {!readonly && (
                  <div className="bg-white px-3 py-2 pl-6">
                    {addingPosteFor === rub.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={posteForm.designation}
                          onChange={e => setPosteForm({ designation: e.target.value })}
                          placeholder="Désignation du poste"
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm"
                        />
                        <button
                          disabled={savePoste.isPending || !posteForm.designation.trim()}
                          onClick={() => submitAddPoste(rub.id)}
                          className="px-3 py-1.5 rounded bg-[#087F3E] text-white text-xs font-medium hover:bg-[#076a34] disabled:opacity-50"
                        >OK</button>
                        <button onClick={resetAddPoste} className="px-3 py-1.5 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Annuler</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingPosteFor(rub.id)}
                        className="inline-flex items-center gap-1 text-xs text-[#087F3E] hover:underline"
                      >
                        <Plus size={12} /> Ajouter un poste
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Confirm delete modal */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Supprimer {confirmDel.type}</p>
                <p className="text-xs text-gray-500">{confirmDel.label}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {confirmDel.type === "rubrique" && "La rubrique et tous ses postes/lignes seront supprimés."}
              {confirmDel.type === "poste" && "Le poste et toutes ses lignes seront supprimés."}
              {confirmDel.type === "ligne" && "La ligne sera supprimée."}
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={doDelete}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportDqe && (
        <ImportDqeModal
          contratId={contratId}
          onImported={() => {
            qc.invalidateQueries(["dqe", contratId]);
            setShowImportDqe(false);
          }}
          onClose={() => setShowImportDqe(false)}
        />
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
  const [pendingStatut, setPendingStatut]   = useState(null);
  const [confirmDelContrat, setConfirmDelContrat]   = useState(false);
  const [confirmArchContrat, setConfirmArchContrat] = useState(false);

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
  const { data: chantiersData }   = useChantiersPaginated({ count: 500 });
  const { data: sttData }         = useSousTraitantsPaginated({ count: 500 });
  const contratIdInt = !isNew && id ? parseInt(id, 10) : null;
  const { data: decomptesData }   = useDecomptesPaginated({ contrat_id: contratIdInt, count: 100 });
  const { data: avenantsList = [] } = useAvenantsByContrat(contratIdInt);
  const { data: bcsList = [], isSuccess: bcsLoaded } = useBonCommandesByContrat(contratIdInt);

  const chantiersList = chantiersData?.data ?? [];
  const sttList       = sttData?.data?.filter(s => s.statut !== "blackliste") ?? [];

  const saveMut      = useSaveContrat();
  const statutMut    = useContratStatut();
  const deleteMut    = useDeleteContrat();

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

  // ── Delete / Archive contrat ─────────────────────────────────
  async function handleDeleteContrat() {
    try {
      await deleteMut.mutateAsync(parseInt(id, 10));
      addToast("Contrat supprimé", "success");
      navigate("/contrats");
    } catch (e) {
      addToast(e?.response?.data?.message ?? "Erreur lors de la suppression", "error");
    }
    setConfirmDelContrat(false);
  }

  async function handleArchiveContrat() {
    try {
      await statutMut.mutateAsync({ id: parseInt(id, 10), statut: "archive" });
      addToast("Contrat archivé", "success");
      setConfirmArchContrat(false);
    } catch (e) {
      addToast(e?.response?.data?.message ?? "Erreur lors de l'archivage", "error");
      setConfirmArchContrat(false);
    }
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.objet.trim() || !form.chantier_id || !form.soustraitant_id) {
      addToast("Veuillez remplir les champs obligatoires.", "error");
      return;
    }
    const payload = {
      ...form,
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
    // — Contrat —
    { id: "info",         label: "Infos",           icon: Info },
    { id: "parametrage",  label: "Paramétrage",      icon: Hash },
    { id: "avenants",     label: nbAv > 0 ? `Avenants (${nbAv})` : "Avenants", icon: FilePlus },
    { id: "circuit",      label: "Circuit",          icon: CheckCircle },
    // — Exécution —
    { id: "bareme",       label: "Barème", icon: FileText },
    { id: "dqe",          label: "DQE",              icon: FileText },
    { id: "attachements", label: "Attachements",     icon: Paperclip },
    { id: "cessions",     label: "Cessions",         icon: FileText },
    { id: "decomptes",    label: nbDec > 0 ? `Décomptes (${nbDec})` : "Décomptes", icon: FileText },
    // — Financier —
    { id: "bonscommande", label: bcsList.length > 0 ? `BC (${bcsList.length})` : "BC", icon: FileText },
    { id: "factures",     label: "Factures",         icon: Hash },
    { id: "pieces",       label: "PJ",               icon: Upload },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => navigate("/contrats")} className="mb-3 flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={14} /> Retour aux contrats
      </button>

      <PageHeader
        title={isNew ? "Nouveau contrat" : (contrat.objet || contrat.code)}
        subtitle={isNew
          ? "Remplir les informations du contrat"
          : [contrat.chantier?.designation, contrat.soustraitant?.raison_sociale].filter(Boolean).join(" · ")}
        action={!isNew && (
          <div className="flex items-center gap-2 flex-wrap">
            {["brouillon","soumis","resilie","cloture"].includes(contrat.statut) && (
              <button onClick={() => setConfirmArchContrat(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                <Archive size={13} /> Archiver
              </button>
            )}
            {["brouillon","soumis"].includes(contrat.statut) && (
              <button onClick={() => setConfirmDelContrat(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Supprimer
              </button>
            )}
            <button
              onClick={async () => {
                const token = localStorage.getItem("stt_token");
                const resp = await fetch(`${import.meta.env.VITE_API_BASE}/api/pdf/contrat/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
                setTimeout(() => URL.revokeObjectURL(url), 60000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={13} /> PDF
            </button>
            <button onClick={() => navigate(`/decomptes/nouveau?contrat_id=${id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-[#087F3E] text-white rounded-lg hover:bg-[#065A2C] transition-colors font-medium">
              <FilePlus size={14} /> Nouveau décompte
            </button>
          </div>
        )}
      />

      {/* Badge row — view mode only */}
      {!isNew && (
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <StatusBadge statut={contrat.statut} />
          {avenantsList.length > 0 && (
            <span className="inline-flex items-center text-xs bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full font-medium">
              {avenantsList.length} avenant{avenantsList.length > 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => setActiveTab("decomptes")}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#087F3E] border border-gray-200 px-2.5 py-1 rounded-full transition-colors">
            Consulter les décomptes
          </button>
        </div>
      )}

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
        const fmtFull        = n => fmtNum(Math.round(n ?? 0)) + " FCFA";
        const montantInitialHT = parseFloat(contrat.montant_initial ?? 0);
        const avenantsValides  = avenantsList.filter(a => a.statut === "valide");
        const avenantsAttente  = avenantsList.filter(a => a.statut !== "valide");
        const montantAvenants  = avenantsValides.reduce((s, a) => s + parseFloat(a.montant ?? 0), 0);

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Montant initial */}
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Montant HT initial</p>
              <p className="mt-1 text-[22px] font-bold text-gray-900 tabular-nums">{fmtFull(montantInitialHT)}</p>
              {bcsList.length > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{bcsList.length} BC Sage X3 liés</p>}
            </div>
            {/* Card 2: Avenants */}
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Avenants validés</p>
              <p className={`mt-1 text-[22px] font-bold tabular-nums ${montantAvenants > 0 ? "text-violet-700" : "text-gray-400"}`}>
                {montantAvenants > 0 ? "+ " : ""}{fmtFull(montantAvenants)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {avenantsValides.length} validé{avenantsValides.length > 1 ? "s" : ""}
                {avenantsAttente.length > 0 && <> · {avenantsAttente.length} en attente</>}
              </p>
            </div>
            {/* Card 3: Montant actualisé */}
            <div className="col-span-2 rounded-xl border border-[#087F3E]/30 bg-[#E8F5EE] px-4 py-3">
              <p className="text-[11px] text-[#087F3E]/70 uppercase tracking-wide">Montant actualisé</p>
              <p className="mt-1 text-[22px] font-bold text-[#087F3E] tabular-nums">{fmtFull(montantActuel)}</p>
              {actualisé && <span className="text-[10px] text-violet-600">initial + avenants validés</span>}
            </div>
            {/* Card 4: Réalisé */}
            <div className="col-span-1 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Réalisé</p>
              <p className="mt-1 text-[22px] font-bold text-[#087F3E] tabular-nums">{pct}%</p>
              <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${Math.min(pct,100)}%` }} />
              </div>
            </div>
            {/* Card 5: En validation */}
            <div className="col-span-1 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">En validation</p>
              <p className="mt-1 text-[20px] font-bold text-amber-600 tabular-nums">{formatMontantCourt(enValidation)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{nbValidation} décompte{nbValidation > 1 ? "s" : ""}</p>
            </div>
            {/* Card 6: Décomptes */}
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Décomptes</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {nbPaye > 0 && <span className="text-[11px] bg-[#E8F5EE] text-[#087F3E] px-2 py-0.5 rounded-full font-medium">{nbPaye} payé{nbPaye > 1 ? "s" : ""}</span>}
                {nbValidation > 0 && <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{nbValidation} en cours</span>}
                {nbBrouillon > 0 && <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{nbBrouillon} brouillon{nbBrouillon > 1 ? "s" : ""}</span>}
                {decomptes.length === 0 && <span className="text-[11px] text-gray-400">Aucun</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* BC warning banner */}
      {!isNew && bcsLoaded && bcsList.length === 0 && !["resilie","archive"].includes(contrat.statut) && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span><strong>Aucun bon de commande Sage X3 lié.</strong> Le montant reste à 0.</span>
          </p>
          <button onClick={() => setActiveTab("bonscommande")}
            className="px-3 py-1.5 text-sm font-medium text-amber-900 border border-amber-300 rounded-lg bg-white hover:bg-amber-100 transition-colors">
            Récupérer les BC
          </button>
        </div>
      )}

      {/* Workflow — view mode only */}
      {!isNew && transitions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Workflow</p>
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
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-5">

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
                  {!isNew && (
                    <Field label="Montant HT (calculé)">
                      <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-700">
                        {fmtNum(Math.round(parseFloat(contrat?.montant_initial ?? 0)))} FCFA
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">Somme des BC Sage X3 liés. Non modifiable.</p>
                    </Field>
                  )}
                </div>
              </div>

              {/* Parties */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Parties</h3>
                <div className="grid grid-cols-2 gap-5">
                  <Field label="Chantier" required>
                    <SearchSelect
                      value={form.chantier_id}
                      onChange={e => setForm(f => ({ ...f, chantier_id: e.target.value, soustraitant_id: isNew ? "" : f.soustraitant_id }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                    >
                      <option value="">Sélectionner un chantier…</option>
                      {chantiersList.map(c => (
                        <option key={c.id} value={c.id}>{c.code} — {c.designation}</option>
                      ))}
                    </SearchSelect>
                    {!isNew && contrat?.chantier_id && (
                      <Link to={`/chantiers/${contrat.chantier_id}`} className="mt-1 inline-block text-xs text-[#087F3E] hover:underline">
                        Voir le chantier →
                      </Link>
                    )}
                  </Field>
                  <Field label="Sous-traitant" required>
                    <SousTraitantSelect
                      chantierId={form.chantier_id}
                      value={form.soustraitant_id}
                      onChange={e => setForm(f => ({ ...f, soustraitant_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none"
                      placeholderOption="Sélectionner un sous-traitant…"
                    />
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

          {/* Tab: Barème de cessions */}
          {activeTab === "bareme" && (
            <BaremeCessionsTab contratId={id} isNew={isNew} statut={contrat?.statut} />
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
            <AttachementsTab contratId={id} chantierId={contrat?.chantier_id} isNew={isNew} contrat={contrat} />
          )}

          {/* Tab: Pièces jointes */}
          {activeTab === "pieces" && (
            <PiecesJointesTab contratId={id} isNew={isNew} />
          )}

          {/* Tab: DQE */}
          {activeTab === "dqe" && (
            <DqeTab contratId={contrat.id} contrat={contrat} />
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

      {/* ── Modal suppression contrat ── */}
      {confirmDelContrat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Supprimer le contrat</p>
                <p className="text-xs text-gray-500 font-mono">{contrat?.code}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Cette action est irréversible. Le contrat et ses données associées seront supprimés définitivement.</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDelContrat(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDeleteContrat} disabled={deleteMut.isPending}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteMut.isPending && <Loader2 size={13} className="animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal archivage contrat ── */}
      {confirmArchContrat && (
        <ArchiveContratDialog
          contrat={{
            code: contrat?.code,
            statut: contrat?.statut,
            nbBc: bcsList.length,
            nbAvenants: avenantsList.length,
          }}
          pending={statutMut.isPending}
          onCancel={() => setConfirmArchContrat(false)}
          onConfirm={handleArchiveContrat}
        />
      )}
    </div>
  );
}
