import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Info, FileText, Settings, Calculator, Paperclip, GitBranch,
  Plus, Trash2, Eye, Download, GripVertical, AlertTriangle, Send,
  CheckCircle, MessageSquare, FilePlus, Save, UploadCloud, GitMerge,
  Clock, ChevronDown, ChevronUp, AlertCircle, ShieldCheck, XCircle,
  Tags, ShoppingCart, Wallet, Clipboard, ArrowRight,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import Tabs from "../components/Tabs";
import WorkflowSteps from "../components/WorkflowSteps";
import FileUploadZone from "../components/FileUploadZone";
import EmptyState from "../components/EmptyState";
import ProgressBar from "../components/ProgressBar";
import ImportFileButton from "../components/ImportFileButton";
import BaremeCessionsEditor from "../components/BaremeCessionsEditor";
import { useContrats } from "../context/ContratsContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import { useDecomptes } from "../context/DecomptesContext";
import { useBonsCommande } from "../context/BonsCommandeContext";
import { useFactures } from "../context/FacturesContext";
import { useEtatsCession } from "../context/EtatsCessionContext";
import { useAttachements } from "../context/AttachementsContext";
import { getDQELignes } from "../data/attachements";
import { buildModeleContrat } from "../data/modeleDecompteCatalogue";
import { CIRCUIT_CONTRAT, CIBLE_LABELS } from "../data/circuits";
import { BAREME_MTX, BAREME_MTL, BAREME_RH } from "../data/baremesCessions";
import { getMontantActualise, computeMontantRealise, computeMontantEnValidation, computeNombreDecomptes, computeDecompteBreakdown, isBaremeEditable } from "../utils/contratMetrics";
import { getMontantBC, getTotalReceptions, getSoldeDisponible, getTauxConsommation, getBCDuContrat } from "../utils/bcMetrics";
import { buildLignesFactureAvance, computeMontantHTFacture } from "../utils/factureCalcul";
import { formatMontant, formatMontantCourt, formatDate } from "../utils/formatters";

const sttMap  = Object.fromEntries(sousTraitants.map((s) => [s.id, s]));
const chanMap = Object.fromEntries(chantiers.map((c) => [c.id, c]));

const PJ_CATEGORIES = ["Toutes", "Offre initiale", "Comparatif offres", "Rapport de rapprochement", "Contrat signé", "Attestations", "Devis", "Autre"];
const FILE_ICON_COLOR = { pdf: "text-red-500", xlsx: "text-green-600", docx: "text-blue-500" };

const CODES_RA = ["6A10","6A20","6A30","6A31","6A40","6A50","6A51","6A60","6A61","6A62","6A63","6A83","6A84","6B28"];

const STATUTS_AVENANT = ["En attente", "Validé", "Rejeté"];

// ─── Utility ────────────────────────────────────────────────────
function generateContratId(allContrats) {
  const year = new Date().getFullYear();
  const nums = allContrats
    .map(c => c.code?.match(/CTR-\d{4}-(\d+)/))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `CTR-${year}-${String(next).padStart(3, "0")}`;
}

function calcDuree(d1, d2) {
  if (!d1 || !d2) return "—";
  const diff = Math.round((new Date(d2) - new Date(d1)) / 86400000);
  return diff > 0 ? `${diff} jours` : "—";
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{children}</h3>
      {action}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wide font-medium text-gray-500 block">{label}</label>
      {children}
    </div>
  );
}

function ReadonlyInput({ value, highlight }) {
  return (
    <div className={`border rounded-lg px-4 py-2.5 text-sm ${highlight ? "bg-[#E8F5EE] border-[#087F3E]/30 text-[#087F3E] font-medium" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
      {value || "—"}
    </div>
  );
}

function EditableInput({ value, onChange, type = "text", placeholder, suffix, readonly }) {
  if (readonly) return <ReadonlyInput value={suffix ? `${value} ${suffix}` : value} />;
  return (
    <div className="relative flex items-center">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200"
      />
      {suffix && (
        <span className="absolute right-3 text-xs text-gray-400 font-medium">{suffix}</span>
      )}
    </div>
  );
}

// ─── Tab: Informations générales ────────────────────────────────
function TabInfo({ contrat, isEditable, form, setForm, onArticleChange }) {
  const { decomptes } = useDecomptes();
  const contratDecomptes = contrat ? decomptes.filter(d => d.contratId === contrat.id && d.statut !== "Rejeté") : [];
  const stt = sttMap[isEditable ? form.sousTraitantId : contrat?.sousTraitantId];
  const totalArticles = form.articles?.reduce((s, a) => s + (parseFloat(a.montantHT) || 0), 0) || 0;
  const montantHT = contrat ? getMontantActualise(contrat) : (parseFloat(form.montantHT) || 0);
  const ecartDQE = montantHT > 0 ? Math.abs(totalArticles - montantHT) / montantHT : 0;
  const showEcartAlert = montantHT > 0 && ecartDQE > 0.001;

  function updateArticles(updated) {
    setForm({ ...form, articles: updated });
    onArticleChange?.(updated);
  }

  return (
    <div className="space-y-8 pt-6">
      {/* Identification */}
      <div>
        <SectionTitle>Identification du contrat</SectionTitle>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Code contrat">
            <ReadonlyInput value={contrat?.code || "Généré automatiquement"} highlight={!!contrat?.code} />
          </Field>
          <Field label="Statut">
            {contrat ? <div className="py-2"><StatusBadge statut={contrat.statut} /></div> : <ReadonlyInput value="Brouillon" />}
          </Field>
          {!contrat && (
            <Field label="Montant HT (FCFA) *">
              <EditableInput value={form.montantHT} onChange={(v) => setForm({ ...form, montantHT: v })} placeholder="Ex. 150000000" />
            </Field>
          )}
          <Field label="Objet du contrat">
            <EditableInput value={form.objet} onChange={(v) => setForm({ ...form, objet: v })} placeholder="Objet court du contrat" readonly={!isEditable} />
          </Field>
          <Field label="Chantier">
            {isEditable ? (
              <select
                value={form.chantierId}
                onChange={(e) => setForm({ ...form, chantierId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200"
              >
                <option value="">Sélectionner un chantier...</option>
                {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <ReadonlyInput value={chanMap[contrat?.chantierId]?.nom} />
                {contrat?.chantierId && (
                  <Link to={`/chantiers/${contrat.chantierId}`} className="text-xs text-[#087F3E] underline hover:text-[#065A2C] whitespace-nowrap">
                    Voir →
                  </Link>
                )}
              </div>
            )}
          </Field>
          <div className="col-span-2">
            <Field label="Objet détaillé">
              {isEditable ? (
                <textarea
                  rows={3}
                  value={form.objetDetaille}
                  onChange={(e) => setForm({ ...form, objetDetaille: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200 resize-none leading-relaxed"
                />
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {form.objetDetaille || "—"}
                </div>
              )}
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Sous-traitant">
              {isEditable ? (
                <select
                  value={form.sousTraitantId}
                  onChange={(e) => setForm({ ...form, sousTraitantId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200"
                >
                  <option value="">Sélectionner un sous-traitant...</option>
                  {sousTraitants.map((s) => <option key={s.id} value={s.id}>{s.raisonSociale}</option>)}
                </select>
              ) : (
                <ReadonlyInput value={stt?.raisonSociale} />
              )}
              {stt && (
                <div className="mt-2 bg-[#E8F5EE] border border-[#087F3E]/20 rounded-lg px-4 py-2.5 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">NINEA</p>
                    <p className="text-xs font-medium text-gray-800">{stt.ninea}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="text-xs font-medium text-gray-800">{stt.telephone || stt.contact?.telephone}</p>
                  </div>
                  <div className="flex items-end justify-end">
                    <Link to={`/sous-traitants/${stt.id}`} className="text-xs text-[#087F3E] underline hover:text-[#065A2C] transition-colors">
                      Voir la fiche →
                    </Link>
                  </div>
                </div>
              )}
              {isEditable && stt?.statut === "Blacklisté" && (
                <div className="mt-2 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-800">Ce sous-traitant est blacklisté — aucun nouveau contrat ne peut lui être rattaché.</p>
                </div>
              )}
              {isEditable && stt?.statut === "Suspendu" && (
                <div className="mt-2 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-800">Ce sous-traitant est actuellement suspendu — vérifier la situation avant de poursuivre.</p>
                </div>
              )}
            </Field>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div>
        <SectionTitle>Dates et durée</SectionTitle>
        <div className="grid grid-cols-3 gap-5">
          <Field label="Date de début">
            <EditableInput type="date" value={form.dateDebut} onChange={(v) => setForm({ ...form, dateDebut: v })} readonly={!isEditable} />
          </Field>
          <Field label="Date de fin prévue">
            <EditableInput type="date" value={form.dateFin} onChange={(v) => setForm({ ...form, dateFin: v })} readonly={!isEditable} />
          </Field>
          <Field label="Durée du contrat">
            <ReadonlyInput value={calcDuree(form.dateDebut, form.dateFin)} />
          </Field>
        </div>
      </div>

      {/* DQE */}
      <div>
        <SectionTitle
          action={isEditable && (
            <button
              onClick={() => updateArticles([...(form.articles || []), { id: `new-${Date.now()}`, codeRA: "6A83", designation: "", unite: "m²", quantitePrevue: 0, prixUnitaireHT: 0, montantHT: 0 }])}
              className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium hover:text-[#065A2C] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter un article
            </button>
          )}
        >
          DQE — Détail Quantitatif Estimatif
        </SectionTitle>

        {showEcartAlert && (
          <div className="mb-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Écart détecté entre le total du DQE ({totalArticles.toLocaleString("fr-FR")} FCFA) et le montant du contrat ({montantHT.toLocaleString("fr-FR")} FCFA) : <span className="font-semibold">{Math.abs(totalArticles - montantHT).toLocaleString("fr-FR")} FCFA</span>.
            </p>
          </div>
        )}

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-3 py-3 w-16">RA</th>
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-4 py-3">Désignation</th>
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-3 py-3 w-20">Unité</th>
                <th className="text-right text-xs uppercase text-gray-500 font-medium px-3 py-3 w-28">Qté prévue</th>
                <th className="text-right text-xs uppercase text-gray-500 font-medium px-3 py-3 w-32">PU HT (FCFA)</th>
                <th className="text-right text-xs uppercase text-gray-500 font-medium px-4 py-3 w-36">Montant HT</th>
                {isEditable && <th className="w-10 px-3 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(form.articles || []).map((art, i) => (
                <tr key={art.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-3">
                    {isEditable ? (
                      <select
                        value={art.codeRA || ""}
                        onChange={(e) => {
                          const updated = [...form.articles];
                          updated[i] = { ...art, codeRA: e.target.value };
                          updateArticles(updated);
                        }}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#087F3E] w-full"
                      >
                        <option value="">—</option>
                        {CODES_RA.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {art.codeRA || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditable ? (
                      <input
                        type="text"
                        value={art.designation}
                        onChange={(e) => {
                          const updated = [...form.articles];
                          updated[i] = { ...art, designation: e.target.value };
                          updateArticles(updated);
                        }}
                        className="w-full text-sm border-0 outline-none bg-transparent text-gray-800 placeholder-gray-400"
                        placeholder="Désignation..."
                      />
                    ) : (
                      <span className="text-sm text-gray-800">{art.designation}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-600">{art.unite}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-gray-700">{art.quantitePrevue?.toLocaleString("fr-FR")}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-gray-700">{art.prixUnitaireHT?.toLocaleString("fr-FR")}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">{art.montantHT?.toLocaleString("fr-FR")}</span>
                  </td>
                  {isEditable && (
                    <td className="px-3 py-3">
                      <button
                        onClick={() => {
                          const refMsg = contratDecomptes.length > 0
                            ? `Ce contrat a ${contratDecomptes.length} décompte(s) existant(s) : ${contratDecomptes.map(d => d.code).join(", ")}. Leurs montants déjà saisis seront conservés tels quels.`
                            : "Aucun décompte n'est actuellement rattaché à ce contrat.";
                          if (window.confirm(`Supprimer l'article DQE "${art.designation || 'Sans désignation'}" ?\n\n${refMsg}`)) {
                            updateArticles(form.articles.filter((_, j) => j !== i));
                          }
                        }}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={isEditable ? 5 : 4} className="px-4 py-3">
                  <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Total HT</span>
                </td>
                <td colSpan={2} className="px-4 py-3 text-right">
                  <span className={`text-sm font-bold ${showEcartAlert ? "text-amber-700" : "text-gray-900"}`}>
                    {totalArticles.toLocaleString("fr-FR")} FCFA
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Paramétrage financier ──────────────────────────────────
function TabFinancier({ contrat, isEditable, form, setForm, montantActualise, montantRealise, montantEnValidation = 0 }) {
  const montantInitial = contrat?.montantInitialHT || contrat?.montantHT || 0;
  const avenants = contrat?.avenants || [];
  const avenantsDelta = avenants
    .filter((a) => a.statutValidationDFC === "Validé")
    .reduce((s, a) => s + (a.montant || 0), 0);
  const hasAvenants = avenants.length > 0;
  const montantTTC = Math.round(montantActualise * (1 + (parseFloat(form.tauxTVA) || 18) / 100));
  const soldeRestant = montantActualise - montantRealise;
  const avancement = montantActualise > 0 ? Math.round((montantRealise / montantActualise) * 100) : 0;

  return (
    <div className="space-y-8 pt-6">
      {/* Montants */}
      <div>
        <SectionTitle>Montants et TVA</SectionTitle>
        <div className="grid grid-cols-3 gap-5">
          <Field label={hasAvenants ? "Montant initial HT" : "Montant HT"}>
            <ReadonlyInput value={formatMontant(montantInitial)} />
          </Field>
          {hasAvenants && (
            <Field label="Avenants validés">
              <div className={`border rounded-lg px-4 py-2.5 text-sm font-medium ${avenantsDelta >= 0 ? "bg-[#E8F5EE] border-[#087F3E]/30 text-[#087F3E]" : "bg-red-50 border-red-200 text-red-700"}`}>
                {avenantsDelta >= 0 ? "+" : ""}{formatMontant(avenantsDelta)}
              </div>
            </Field>
          )}
          <Field label={hasAvenants ? "Montant HT actualisé" : "Taux TVA"}>
            {hasAvenants ? (
              <div className="border rounded-lg px-4 py-2.5 text-sm font-bold bg-[#E8F5EE] border-[#087F3E]/30 text-[#065A2C]">
                {formatMontant(montantActualise)}
              </div>
            ) : (
              <EditableInput value={form.tauxTVA || 18} suffix="%" readonly={!isEditable} onChange={(v) => setForm({ ...form, tauxTVA: v })} />
            )}
          </Field>
          {hasAvenants && (
            <Field label="Taux TVA">
              <EditableInput value={form.tauxTVA || 18} suffix="%" readonly={!isEditable} onChange={(v) => setForm({ ...form, tauxTVA: v })} />
            </Field>
          )}
          <Field label="Montant TTC (actualisé)">
            <ReadonlyInput value={formatMontant(montantTTC)} />
          </Field>
        </div>
      </div>

      {/* RG */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <SectionTitle>Retenue de garantie (RG)</SectionTitle>
        <div className="flex items-center gap-6">
          {["En taux", "En valeur absolue"].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="rgMode" value={opt} defaultChecked={opt === "En taux"} className="text-[#087F3E] focus:ring-[#087F3E]" disabled={!isEditable} />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Taux de retenue de garantie">
            <EditableInput value={form.tauxRG || 5} suffix="%" readonly={!isEditable} onChange={(v) => setForm({ ...form, tauxRG: v })} />
          </Field>
          <Field label="Déclencheur de libération">
            {isEditable ? (
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200">
                <option>Réception provisoire</option>
                <option>Réception définitive</option>
                <option>Délai post-fin de chantier (J+30)</option>
                <option>Délai post-fin de chantier (J+90)</option>
                <option>Événement personnalisé</option>
              </select>
            ) : (
              <ReadonlyInput value="Réception définitive" />
            )}
          </Field>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          La libération de la retenue sera appliquée au décompte suivant l'événement déclencheur. Le poste <strong>Restitution RG</strong> du modèle de décompte sera automatiquement activé.
        </p>
      </div>

      {/* AD */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <SectionTitle>Avance de démarrage (AD)</SectionTitle>
        <div className="flex items-center gap-6">
          {["En taux", "En valeur absolue"].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="adMode" value={opt} defaultChecked={opt === "En taux"} className="text-[#087F3E] focus:ring-[#087F3E]" disabled={!isEditable} />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Taux d'avance de démarrage">
            <EditableInput value={form.tauxAD || 15} suffix="%" readonly={!isEditable} onChange={(v) => setForm({ ...form, tauxAD: v })} />
          </Field>
          <Field label="Modalité de remboursement">
            {isEditable ? (
              <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all duration-200">
                <option>Prorata à chaque décompte</option>
                <option>À partir d'un seuil d'avancement</option>
                <option>Sur le solde final</option>
              </select>
            ) : (
              <ReadonlyInput value="Prorata à chaque décompte" />
            )}
          </Field>
        </div>
      </div>

      {/* Récap financier */}
      {contrat && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Récapitulatif financier</h3>
          </div>
          <div className={`p-5 grid ${montantEnValidation > 0 ? "grid-cols-5" : "grid-cols-4"} gap-4`}>
            {[
              { label: "Montant actualisé",  value: formatMontantCourt(montantActualise) },
              { label: "Avance versée",      value: formatMontantCourt(montantActualise * ((form.tauxAD || 15) / 100)) },
              { label: "Réalisé (calculé)",  value: formatMontantCourt(montantRealise) },
              ...(montantEnValidation > 0 ? [{ label: "En cours de validation", value: formatMontantCourt(montantEnValidation), amber: true }] : []),
              { label: "Solde restant",      value: formatMontantCourt(soldeRestant) },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className={`text-lg font-bold mt-1 ${item.amber ? "text-amber-600" : "text-gray-900"}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">Taux d'avancement financier</span>
              <span className="text-xs font-semibold text-[#087F3E]">{avancement}%</span>
            </div>
            <ProgressBar value={avancement} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Modèle de décompte ─────────────────────────────────────
function TabModele({ isEditable, form, setForm }) {
  const [saisieMode, setSaisieMode] = useState("manuelle");
  const modele = form.modeleDecompte || [];

  function togglePoste(id, value) {
    const updated = modele.map((p) =>
      p.id === id && !p.verrouille ? { ...p, actif: value } : p
    );
    setForm({ ...form, modeleDecompte: updated });
  }

  const signeUI = (signe) => {
    if (signe === "info") return (
      <span className="inline-flex items-center justify-center w-12 h-6 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">info</span>
    );
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${signe === "+" ? "bg-[#E8F5EE] text-[#087F3E]" : "bg-red-50 text-red-600"}`}>
        {signe}
      </span>
    );
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="bg-[#E8F5EE] border-l-4 border-[#087F3E] px-5 py-4 rounded-r-xl">
        <p className="text-sm text-[#065A2C] leading-relaxed">
          Le modèle ci-dessous est propre à ce contrat. Activez ou désactivez les postes selon les besoins spécifiques du chantier.
          Les postes <strong>verrouillés</strong> (Travaux exécutés, Retenue de garantie) ne peuvent pas être désactivés.
          Les postes de type <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-semibold">info</span> sont informatifs et ne participent <strong>jamais</strong> au calcul du net HT.
        </p>
      </div>

      <div>
        <SectionTitle
          action={
            <button className="flex items-center gap-1.5 text-xs border border-[#087F3E] text-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors">
              <UploadCloud className="w-3.5 h-3.5" /> Importer un modèle type
            </button>
          }
        >
          Structure du modèle de décompte ({modele.filter((p) => p.actif).length} / {modele.length} postes actifs)
        </SectionTitle>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-center text-xs uppercase text-gray-500 font-medium px-3 py-3 w-20">Actif</th>
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-3 py-3 w-12">Code</th>
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-3 py-3">Poste</th>
                <th className="text-center text-xs uppercase text-gray-500 font-medium px-3 py-3 w-20">Signe</th>
                <th className="text-center text-xs uppercase text-gray-500 font-medium px-3 py-3 w-28">Type</th>
                <th className="text-left text-xs uppercase text-gray-500 font-medium px-3 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modele.map((ligne) => (
                <tr
                  key={ligne.id}
                  className={`group transition-colors ${ligne.actif ? "hover:bg-gray-50/50" : "bg-gray-50/40 opacity-60"}`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={ligne.actif}
                      disabled={!isEditable || ligne.verrouille}
                      onChange={(e) => togglePoste(ligne.id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#087F3E] focus:ring-[#087F3E] disabled:opacity-40"
                    />
                    {ligne.verrouille && (
                      <span className="block text-xs text-gray-400 mt-0.5">verrouillé</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono font-bold text-gray-600">{ligne.code}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{ligne.poste}</span>
                      {ligne.enAttente && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                          <Clock className="w-3 h-3" /> En attente de clarification client
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {signeUI(ligne.signe)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md capitalize">{ligne.type}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-gray-500 leading-relaxed">{ligne.description}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionTitle>Modes de saisie autorisés</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: "manuelle", label: "Saisie manuelle", desc: "Les décomptes seront saisis directement dans l'interface, poste par poste.", icon: FileText },
            { id: "excel", label: "Import Excel", desc: "Les décomptes seront importés depuis un modèle Excel prédéfini basé sur la structure ci-dessus.", icon: UploadCloud },
          ].map((mode) => {
            const Icon = mode.icon;
            const active = saisieMode === mode.id;
            return (
              <button key={mode.id} onClick={() => setSaisieMode(mode.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${active ? "border-[#087F3E] bg-[#E8F5EE]" : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${active ? "text-[#087F3E]" : "text-gray-400"}`} />
                  <span className={`text-sm font-semibold ${active ? "text-[#087F3E]" : "text-gray-700"}`}>{mode.label}</span>
                </div>
                <p className={`text-xs leading-relaxed ${active ? "text-[#065A2C]" : "text-gray-500"}`}>{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Barème de cessions ─────────────────────────────────────
function TabBaremeCessions({ contrat, baremeEditable, updateContrat, currentUser }) {
  const { etats } = useEtatsCession();
  if (!contrat) {
    return (
      <div className="pt-6">
        <EmptyState icon={Tags} title="Enregistrez d'abord le contrat" description="Le barème de cessions se configure une fois le contrat créé (en Brouillon)." />
      </div>
    );
  }
  const bareme = contrat.baremeCessions || { mtx: [], mtl: [], rh: [] };
  const verrouille = ["Clôturé", "Résilié"].includes(contrat.statut);
  const etatsDuContrat = etats.filter(e => e.contratId === contrat.id);

  function handleChange(newBareme) {
    updateContrat(contrat.id, { baremeCessions: newBareme });
  }

  const emptyMessage = baremeEditable
    ? null
    : verrouille
      ? `Le barème ne peut plus être modifié — le contrat est ${contrat.statut.toLowerCase()}. Un nouveau contrat est nécessaire pour de nouveaux articles.`
      : `Le barème sera modifiable dès que le contrat repassera en Brouillon ou atteindra "Approuvé final" (statut actuel : ${contrat.statut}).`;

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">États de cession du contrat</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {etatsDuContrat.length === 0
              ? "Aucun état de cession pour ce contrat."
              : `${etatsDuContrat.length} état(s) — ${etatsDuContrat.filter(e => e.statutGlobal === "Arrêté").length} arrêté(s).`}
            {" "}
            <Link to={`/etats-cession?contratId=${contrat.id}`} className="text-[#087F3E] font-medium underline hover:text-[#065A2C]">Voir la liste →</Link>
          </p>
        </div>
        <Link to={`/etats-cession/nouveau?contratId=${contrat.id}`} className="flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors whitespace-nowrap">
          <Plus size={12} /> Créer un état de cession
        </Link>
      </div>
      <div className="bg-[#E8F5EE] border-l-4 border-[#087F3E] px-5 py-4 rounded-r-xl">
        <p className="text-sm text-[#065A2C] leading-relaxed">
          Ce barème définit les articles MTX, MTL et RH que ce contrat peut céder au sous-traitant, avec leur prix contractuel.
          Seuls les articles sélectionnés ici seront proposés lors de l'ajout d'une cession sur un décompte rattaché à ce contrat.
          Le prix contrat peut être négocié par rapport au prix de référence du barème général — un prix négocié passe alors en attente de validation par le DACC.
          {baremeEditable && contrat.statut !== "Brouillon" && (
            <> Contrairement au DQE, ce référentiel de prix reste modifiable tant que le contrat est actif : y ajouter un article ne modifie pas le montant du marché.</>
          )}
        </p>
      </div>
      {!baremeEditable && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${verrouille ? "bg-gray-50 border-gray-200" : "bg-amber-50 border-amber-200"}`}>
          <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${verrouille ? "text-gray-400" : "text-amber-500"}`} />
          <p className={`text-sm ${verrouille ? "text-gray-600" : "text-amber-800"}`}>{emptyMessage}</p>
        </div>
      )}
      <BaremeCessionsEditor bareme={bareme} onChange={handleChange} isEditable={baremeEditable} allowImport emptyMessage={emptyMessage} currentUser={currentUser} />
    </div>
  );
}

// ─── Tab: Bon de commande ─────────────────────────────────────────
function BCProgressBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct));
  const color = pct > 100 ? "bg-red-600" : pct > 80 ? "bg-amber-400" : "bg-[#087F3E]";
  const textColor = pct > 100 ? "text-red-600" : pct > 80 ? "text-amber-600" : "text-[#087F3E]";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Taux de consommation</span>
        <span className={`text-xs font-semibold ${textColor}`}>{pct}%{pct > 100 ? " — dépassé" : ""}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function TabFactureAvance({ contrat, factures, addFacture, currentUser, updateContrat }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isDACC = currentUser?.roleId === "DACC";
  const eligible = contrat && ["Approuvé final", "En cours d'exécution"].includes(contrat.statut) && (contrat.tauxAD || 0) > 0;
  if (!eligible) return null;

  const factureExistante = factures.find(f => f.type === "avance" && f.contratId === contrat.id);

  function handleGenerer() {
    const lignes = buildLignesFactureAvance(contrat);
    const montantHT = computeMontantHTFacture(lignes);
    const tauxTVA = contrat.tauxTVA ?? 18;
    const montantTVA = Math.round(montantHT * (tauxTVA / 100));
    const newId = `fac-ava-${contrat.id}`;
    const code = `FAC-AVA-${new Date().getFullYear()}-${String(factures.filter(f => f.type === "avance").length + 1).padStart(3, "0")}`;
    addFacture({
      id: newId, code, type: "avance",
      contratId: contrat.id, decompteId: null, releveId: null, factureLieeId: null,
      dateEmission: new Date().toISOString().slice(0, 10),
      lignes, montantHT, tauxTVA, montantTVA, montantTTC: montantHT + montantTVA,
      statut: "Émise",
      ecartRapprochement: null, motifRejet: null,
      dateControleDACC: null, dateValidationDFC: null, datePaiement: null, referenceReglement: null,
    });
    updateContrat(contrat.id, {
      historique: [...(contrat.historique || []), {
        action: "Facturation",
        utilisateur: currentUser?.nom || "Utilisateur",
        date: new Date().toISOString(),
        details: `Facture d'avance de démarrage ${code} générée — ${formatMontant(montantHT)}.`,
      }],
    });
    addToast(`Facture d'avance ${code} générée — ${formatMontant(montantHT)}.`, "success");
    navigate(`/factures/${newId}`);
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Wallet className="w-5 h-5 text-purple-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-purple-900">Facture d'avance de démarrage</p>
          <p className="text-xs text-purple-600 mt-0.5">
            {factureExistante
              ? "Émise une seule fois à la signature du contrat."
              : `${contrat.tauxAD}% × montant initial (${formatMontant(contrat.montantInitialHT ?? contrat.montantHT)}) = ${formatMontant(Math.round((contrat.montantInitialHT ?? contrat.montantHT) * (contrat.tauxAD / 100)))}`}
          </p>
        </div>
      </div>
      {factureExistante ? (
        <Link to={`/factures/${factureExistante.id}`} className="flex items-center gap-2 text-sm font-medium text-purple-700 hover:underline whitespace-nowrap">
          Voir la facture ({factureExistante.statut})
        </Link>
      ) : isDACC ? (
        <button onClick={handleGenerer} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap">
          <Wallet className="w-4 h-4" /> Générer la facture d'avance de démarrage
        </button>
      ) : (
        <p className="text-xs text-purple-500 whitespace-nowrap">Seul le DACC peut générer cette facture.</p>
      )}
    </div>
  );
}

function TabBonCommande({ contrat, bonsCommande, factures, addFacture, currentUser, updateContrat }) {
  const bc = contrat ? getBCDuContrat(contrat.id, bonsCommande) : null;

  if (!contrat || !bc) {
    return (
      <div className="pt-6 space-y-6">
        <TabFactureAvance contrat={contrat} factures={factures} addFacture={addFacture} currentUser={currentUser} updateContrat={updateContrat} />
        <EmptyState
          icon={ShoppingCart}
          title="Aucun bon de commande émis"
          description={
            contrat?.statut === "Brouillon" || contrat?.statut === "En validation"
              ? "Le bon de commande sera émis automatiquement à la signature du contrat (validation de la dernière étape du circuit par le DACC)."
              : "Aucun bon de commande n'est rattaché à ce contrat."
          }
        />
      </div>
    );
  }

  const montantBC = getMontantBC(bc);
  const totalReceptions = getTotalReceptions(bc);
  const solde = getSoldeDisponible(bc);
  const taux = getTauxConsommation(bc);

  return (
    <div className="space-y-6 pt-6">
      <TabFactureAvance contrat={contrat} factures={factures} addFacture={addFacture} currentUser={currentUser} updateContrat={updateContrat} />
      {/* En-tête BC */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Code</p>
          <p className="text-sm font-bold text-gray-900 font-mono">{bc.code}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Date d'émission</p>
          <p className="text-sm font-medium text-gray-800">{formatDate(bc.dateEmission)}</p>
        </div>
        <StatusBadge statut={bc.statut} />
      </div>

      {/* Synthèse */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Montant du BC", value: formatMontant(montantBC) },
            { label: "Total des réceptions", value: formatMontant(totalReceptions) },
            { label: "Solde disponible", value: formatMontant(solde), danger: solde < 0 },
          ].map(k => (
            <div key={k.label} className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-lg font-bold mt-1 ${k.danger ? "text-red-600" : "text-gray-900"}`}>{k.value}</p>
            </div>
          ))}
        </div>
        <BCProgressBar pct={taux} />
      </div>

      {/* Avenants intégrés */}
      <div>
        <SectionTitle>Avenants intégrés au bon de commande</SectionTitle>
        {bc.avenantsIntegres.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun avenant intégré pour l'instant.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["N°", "Montant", "Date d'intégration", "Montant du BC après intégration"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  let running = bc.montantInitial;
                  return bc.avenantsIntegres.map(a => {
                    running += a.montant || 0;
                    return (
                      <tr key={a.avenantId}>
                        <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{a.numero}</td>
                        <td className={`px-4 py-2.5 font-medium ${a.montant >= 0 ? "text-[#087F3E]" : "text-red-600"}`}>{a.montant >= 0 ? "+" : ""}{formatMontant(a.montant)}</td>
                        <td className="px-4 py-2.5 text-gray-600">{formatDate(a.dateIntegration)}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{formatMontant(running)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Réceptions */}
      <div>
        <SectionTitle>Réceptions partielles</SectionTitle>
        {bc.receptions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune réception enregistrée pour l'instant.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Décompte", "Montant net HT", "Date de réception"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bc.receptions.map(r => (
                  <tr key={r.decompteId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <Link to={`/decomptes/${r.decompteId}`} className="font-mono font-semibold text-[#087F3E] hover:underline">{r.codeDecompte}</Link>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{formatMontant(r.montantNetHT)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{formatDate(r.dateReception)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Avenants ───────────────────────────────────────────────
const EMPTY_AVENANT_FORM = { dateSignature: "", montant: "", motif: "", articlesAvenant: [], baremeAvenant: { mtx: [], mtl: [], rh: [] } };

function TabAvenants({ contrat, montantInitial, montantActualise, updateContrat, currentUser, bonsCommande = [], updateBonCommande }) {
  const [showForm, setShowForm] = useState(false);
  const [avForm, setAvForm] = useState(EMPTY_AVENANT_FORM);
  const { addToast } = useToast();
  const avenants = contrat?.avenants || [];
  const avenantsDelta = avenants
    .filter((a) => a.statutValidationDFC === "Validé")
    .reduce((s, a) => s + (a.montant || 0), 0);
  const enAttente = avenants.filter((a) => a.statutValidationDFC === "En attente");
  const isDACC = currentUser?.roleId === "DACC";

  const statutColor = (s) => ({
    "Validé": "bg-[#E8F5EE] text-[#065A2C] border-[#b5ddc8]",
    "En attente": "bg-amber-50 text-amber-700 border-amber-200",
    "Rejeté": "bg-red-50 text-red-600 border-red-200",
  }[s] || "bg-gray-100 text-gray-600 border-gray-200");

  function nextNumero() {
    const nums = avenants.map(a => parseInt(a.numero?.replace(/[^0-9]/g, ""), 10)).filter(n => !isNaN(n));
    return `AVN-${String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(2, "0")}`;
  }

  function handleSaveAvenant() {
    if (!avForm.montant || isNaN(parseFloat(avForm.montant))) {
      addToast("Le montant de l'avenant est requis.", "error"); return;
    }
    if (!avForm.motif.trim()) {
      addToast("Le motif de l'avenant est requis.", "error"); return;
    }
    const newAv = {
      id: `avn-${Date.now()}`,
      numero: nextNumero(),
      dateSignature: avForm.dateSignature || new Date().toISOString().slice(0, 10),
      montant: parseFloat(avForm.montant),
      motif: avForm.motif.trim(),
      statutValidationDFC: "En attente",
      montantContratApresValidation: null,
      articlesAvenant: avForm.articlesAvenant || [],
      baremeAvenant: avForm.baremeAvenant || { mtx: [], mtl: [], rh: [] },
    };
    updateContrat(contrat.id, { avenants: [...avenants, newAv] });
    setAvForm(EMPTY_AVENANT_FORM);
    setShowForm(false);
    addToast(`Avenant ${newAv.numero} enregistré — en attente de validation DACC.`, "success");
  }

  function handleValiderAvenant(avnId) {
    if (!isDACC) return;
    const updatedAvenants = avenants.map(a => {
      if (a.id !== avnId) return a;
      const validatedAvenants = [...avenants.filter(x => x.id !== avnId && x.statutValidationDFC === "Validé"), { ...a, statutValidationDFC: "Validé" }];
      const impact = getMontantActualise({ ...contrat, avenants: validatedAvenants });
      return { ...a, statutValidationDFC: "Validé", montantContratApresValidation: impact };
    });
    const thisAvn = avenants.find(a => a.id === avnId);
    const mergedArticles = [
      ...(contrat.articles || []),
      ...(thisAvn?.articlesAvenant || []).map(art => ({ ...art, id: `art-avn-${Date.now()}-${art.id}` })),
    ];
    const existingBareme = contrat.baremeCessions || { mtx: [], mtl: [], rh: [] };
    const avnBareme = thisAvn?.baremeAvenant || { mtx: [], mtl: [], rh: [] };
    // Les prix négociés de l'avenant sont validés en bloc à la validation de l'avenant lui-même
    // (pas de bouton Valider/Rejeter ligne par ligne côté avenant, cf. BaremeCessionsEditor).
    const validerPrixAvenant = (l) => l.statutPrix === "Négocié - en attente de validation"
      ? { ...l, statutPrix: "Négocié - validé", dateValidationPrix: new Date().toISOString().slice(0, 10) }
      : l;
    const mergeCat = (cat) => {
      const existingIds = new Set((existingBareme[cat] || []).map(l => l.baremeRefId));
      const newLines = (avnBareme[cat] || []).filter(l => !existingIds.has(l.baremeRefId)).map(validerPrixAvenant);
      return [...(existingBareme[cat] || []), ...newLines];
    };
    const mergedBareme = { mtx: mergeCat("mtx"), mtl: mergeCat("mtl"), rh: mergeCat("rh") };
    const nBaremeAjoute = mergedBareme.mtx.length + mergedBareme.mtl.length + mergedBareme.rh.length
      - (existingBareme.mtx?.length || 0) - (existingBareme.mtl?.length || 0) - (existingBareme.rh?.length || 0);
    updateContrat(contrat.id, { avenants: updatedAvenants, articles: mergedArticles, baremeCessions: mergedBareme });

    // Mise à jour du bon de commande existant — jamais de second BC créé
    const bc = getBCDuContrat(contrat.id, bonsCommande);
    let bcMsg = "";
    if (bc && updateBonCommande) {
      const ancienMontant = getMontantBC(bc);
      const newAvenantsIntegres = [
        ...bc.avenantsIntegres,
        { avenantId: thisAvn.id, numero: thisAvn.numero, montant: thisAvn.montant, dateIntegration: new Date().toISOString().slice(0, 10) },
      ];
      const nouveauMontant = getMontantBC({ ...bc, avenantsIntegres: newAvenantsIntegres });
      updateBonCommande(bc.id, { avenantsIntegres: newAvenantsIntegres });
      bcMsg = ` Bon de commande ${bc.code} : ${formatMontant(ancienMontant)} → ${formatMontant(nouveauMontant)}.`;
    }

    addToast(
      (nBaremeAjoute > 0
        ? `Avenant validé — montant actualisé, articles fusionnés dans le DQE et ${nBaremeAjoute} article(s) de barème ajouté(s) au contrat.`
        : "Avenant validé — montant actualisé et articles fusionnés dans le DQE.") + bcMsg,
      "success"
    );
  }

  function addArticleAvenant() {
    setAvForm(f => ({ ...f, articlesAvenant: [...f.articlesAvenant, { id: `aa-${Date.now()}`, codeRA: "6A83", designation: "", unite: "m²", quantitePrevue: 0, prixUnitaireHT: 0, montantHT: 0 }] }));
  }

  function updateArticleAvenant(idx, field, value) {
    setAvForm(f => {
      const arts = [...f.articlesAvenant];
      const art = { ...arts[idx], [field]: value };
      if (field === "quantitePrevue" || field === "prixUnitaireHT") {
        art.montantHT = (parseFloat(field === "quantitePrevue" ? value : art.quantitePrevue) || 0) * (parseFloat(field === "prixUnitaireHT" ? value : art.prixUnitaireHT) || 0);
      }
      arts[idx] = art;
      return { ...f, articlesAvenant: arts };
    });
  }

  return (
    <div className="space-y-6 pt-6">
      {/* Encart synthèse */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Montant initial HT",   value: formatMontant(montantInitial), sub: null },
          { label: "Avenants validés",     value: `${avenantsDelta >= 0 ? "+" : ""}${formatMontantCourt(avenantsDelta)}`, sub: `${avenants.filter(a => a.statutValidationDFC === "Validé").length} avenant(s)` },
          { label: "Montant HT actualisé", value: formatMontant(montantActualise), sub: "Valeur contractuelle courante" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.label.includes("actualisé") ? "border-[#087F3E]/30 bg-[#E8F5EE]" : "border-gray-200 bg-white"}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{k.label}</p>
            <p className={`text-base font-bold ${k.label.includes("actualisé") ? "text-[#065A2C]" : avenantsDelta < 0 && k.label.includes("Avenants") ? "text-red-700" : "text-gray-900"}`}>{k.value}</p>
            {k.sub && <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {enAttente.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{enAttente.length} avenant(s) en attente</span> de validation DACC — le montant actualisé n'inclut pas ces avenants.
            {!isDACC && <span className="ml-1 text-amber-700">(Seul le DACC peut valider.)</span>}
          </p>
        </div>
      )}

      {/* Blocage avenant sur contrat clôturé ou résilié */}
      {(contrat?.statut === "Clôturé" || contrat?.statut === "Résilié") && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600">
            Aucun avenant ne peut être ajouté à un contrat <strong>{contrat.statut.toLowerCase()}</strong>.
          </p>
        </div>
      )}

      {/* Liste des avenants */}
      <div>
        <SectionTitle
          action={
            !(contrat?.statut === "Clôturé" || contrat?.statut === "Résilié") && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter un avenant
              </button>
            )
          }
        >
          Historique des avenants
        </SectionTitle>

        {showForm && (
          <div className="mb-4 border border-dashed border-[#087F3E]/40 rounded-xl bg-[#E8F5EE]/40 p-5 space-y-4">
            <p className="text-xs font-semibold text-[#065A2C] uppercase tracking-wide">Nouvel avenant</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date de signature">
                <input type="date" value={avForm.dateSignature} onChange={e => setAvForm(f => ({ ...f, dateSignature: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
              </Field>
              <Field label="Montant (+ ou −) FCFA *">
                <input type="text" inputMode="numeric" value={avForm.montant} onChange={e => setAvForm(f => ({ ...f, montant: e.target.value }))}
                  placeholder="Ex. 15000000 ou -8000000"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
              </Field>
              <div className="col-span-2">
                <Field label="Motif *">
                  <textarea rows={2} value={avForm.motif} onChange={e => setAvForm(f => ({ ...f, motif: e.target.value }))}
                    placeholder="Description des modifications apportées par cet avenant…"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none" />
                </Field>
              </div>
            </div>

            {/* Articles avenant */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Articles DQE de l'avenant</p>
                <button onClick={addArticleAvenant} className="text-xs text-[#087F3E] font-medium flex items-center gap-1 hover:text-[#065A2C]">
                  <Plus className="w-3 h-3" /> Ajouter une ligne
                </button>
              </div>
              {avForm.articlesAvenant.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun article — optionnel pour un avenant de montant global.</p>
              ) : (
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["RA", "Désignation", "Qté", "PU HT", "Montant HT", ""].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {avForm.articlesAvenant.map((art, idx) => (
                      <tr key={art.id}>
                        <td className="px-2 py-1.5">
                          <select value={art.codeRA} onChange={e => updateArticleAvenant(idx, "codeRA", e.target.value)}
                            className="border border-gray-200 rounded px-1 py-0.5 text-xs w-20">
                            {CODES_RA.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={art.designation} onChange={e => updateArticleAvenant(idx, "designation", e.target.value)}
                            placeholder="Désignation..." className="w-full border-0 outline-none bg-transparent text-gray-800" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="numeric" value={art.quantitePrevue} onChange={e => updateArticleAvenant(idx, "quantitePrevue", e.target.value)}
                            className="w-16 border border-gray-200 rounded px-1 py-0.5 text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="numeric" value={art.prixUnitaireHT} onChange={e => updateArticleAvenant(idx, "prixUnitaireHT", e.target.value)}
                            className="w-24 border border-gray-200 rounded px-1 py-0.5 text-right" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-gray-800">
                          {(art.montantHT || 0).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => {
                            if (window.confirm(`Supprimer la ligne "${art.designation || 'Sans désignation'}" de cet avenant ?`)) {
                              setAvForm(f => ({ ...f, articlesAvenant: f.articlesAvenant.filter((_, j) => j !== idx) }));
                            }
                          }}
                            className="p-0.5 text-gray-300 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Barème de cessions de l'avenant */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Barème de cessions de l'avenant</p>
              <p className="text-xs text-gray-400 mb-2">Articles MTX/MTL/RH additionnels ou révisés — fusionnés dans le barème du contrat à la validation DACC. Un prix négocié ici est validé en bloc avec l'avenant, pas ligne par ligne.</p>
              <BaremeCessionsEditor
                bareme={avForm.baremeAvenant}
                onChange={(b) => setAvForm(f => ({ ...f, baremeAvenant: b }))}
                isEditable
                showPriceValidationActions={false}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setAvForm(EMPTY_AVENANT_FORM); }}
                className="text-sm text-gray-500 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleSaveAvenant}
                className="text-sm bg-[#087F3E] text-white px-4 py-2 rounded-lg hover:bg-[#065A2C]">
                <Save className="w-3.5 h-3.5 inline mr-1" />Enregistrer l'avenant
              </button>
            </div>
          </div>
        )}

        {avenants.length === 0 ? (
          <EmptyState icon={GitMerge} title="Aucun avenant" description="Ce contrat n'a pas encore d'avenant. Un avenant modifie le montant ou les conditions du contrat existant — il n'ouvre pas de nouveau BC." />
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["N°", "Date signature", "Montant", "Motif", "Articles", "Statut DACC", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {avenants.map((avn) => (
                  <tr key={avn.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{avn.numero}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(avn.dateSignature)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${avn.montant >= 0 ? "text-[#087F3E]" : "text-red-600"}`}>
                        {avn.montant >= 0 ? "+" : ""}{avn.montant?.toLocaleString("fr-FR")} FCFA
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px]">
                      <p className="truncate text-xs leading-relaxed" title={avn.motif}>{avn.motif}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {(avn.articlesAvenant?.length || 0)} ligne{(avn.articlesAvenant?.length || 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statutColor(avn.statutValidationDFC)}`}>
                        {avn.statutValidationDFC}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {avn.statutValidationDFC === "En attente" && isDACC && (
                        <button
                          onClick={() => handleValiderAvenant(avn.id)}
                          className="flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors"
                          title="Valider cet avenant (DACC)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Valider
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Pièces jointes ─────────────────────────────────────────
function TabPJ({ pieceJointes }) {
  const [activeCategorie, setActiveCategorie] = useState("Toutes");
  const filtered = pieceJointes.filter((pj) => activeCategorie === "Toutes" || pj.categorie === activeCategorie);
  const countByCategorie = (cat) => cat === "Toutes" ? pieceJointes.length : pieceJointes.filter((p) => p.categorie === cat).length;
  const availableCategories = PJ_CATEGORIES.filter((c) => c === "Toutes" || pieceJointes.some((p) => p.categorie === c));

  return (
    <div className="space-y-5 pt-6">
      <FileUploadZone />
      <div className="flex flex-wrap gap-2">
        {availableCategories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategorie(cat)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${activeCategorie === cat ? "bg-[#087F3E] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {cat}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeCategorie === cat ? "bg-white/20" : "bg-gray-200 text-gray-600"}`}>
              {countByCategorie(cat)}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Paperclip} title="Aucune pièce jointe dans cette catégorie" description="Utilisez la zone d'upload ci-dessus pour ajouter des fichiers." />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((pj) => (
            <div key={pj.id} className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <FileText className={`w-8 h-8 ${FILE_ICON_COLOR[pj.type] || "text-gray-400"}`} />
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{pj.categorie}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate" title={pj.nom}>{pj.nom}</p>
                <p className="text-xs text-gray-400 mt-1">{pj.taille} · Ajouté le {formatDate(pj.dateAjout)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-[#087F3E] hover:bg-[#E8F5EE] transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Circuit de validation ──────────────────────────────────
function nextBCCode(contrat, allBC) {
  const annee = contrat.code.match(/CTR-(\d{4})-/)?.[1] || String(new Date().getFullYear());
  const countThisYear = allBC.filter(bc => bc.code.startsWith(`BC-${annee}-`)).length;
  return `BC-${annee}-${String(countThisYear + 1).padStart(3, "0")}`;
}

function TabCircuit({ contrat, isEditable, updateContrat, currentUser, setActiveTab, addBonCommande, bonsCommande = [] }) {
  const [showConfig, setShowConfig] = useState(false);
  const [checklistStates, setChecklistStates] = useState({});
  const { addToast } = useToast();
  const steps = contrat?.circuitValidation || [];
  const historique = contrat?.historique || [];

  const etapeEnAttente = steps.find(s => s.statut === "en attente");
  const canAct = contrat?.statut === "En validation" &&
                 !!etapeEnAttente &&
                 currentUser?.roleId === etapeEnAttente.profil;

  // Find circuit definition for current waiting step
  const activeStepDef = etapeEnAttente
    ? CIRCUIT_CONTRAT.find(s => s.profil === etapeEnAttente.profil) || null
    : null;

  // Delay computation
  const delaiInfo = useMemo(() => {
    if (!etapeEnAttente?.dateDebutEtape || !activeStepDef?.delaiJours) return null;
    const debut = new Date(etapeEnAttente.dateDebutEtape);
    const echeance = new Date(debut);
    echeance.setDate(echeance.getDate() + activeStepDef.delaiJours);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((echeance - today) / (1000 * 60 * 60 * 24));
    return { enRetard: diffDays < 0, jours: Math.abs(diffDays) };
  }, [etapeEnAttente, activeStepDef]);

  function handleValider() {
    const today = new Date().toISOString().split("T")[0];
    const maxOrdre = Math.max(...steps.map(s => s.ordre));
    const isLastStep = etapeEnAttente.ordre === maxOrdre;
    const newSteps = steps.map(s => {
      if (s.ordre === etapeEnAttente.ordre) return { ...s, statut: "validé", date: today };
      if (!isLastStep && s.ordre === etapeEnAttente.ordre + 1) return { ...s, statut: "en attente", dateDebutEtape: today };
      return s;
    });
    const nextProfil = !isLastStep ? steps.find(s => s.ordre === etapeEnAttente.ordre + 1)?.profil : null;
    const newStatut = isLastStep ? "Approuvé final" : "En validation";
    const newHistorique = [...(contrat.historique || []), {
      action: isLastStep ? "Approbation finale" : `Validation étape ${etapeEnAttente.ordre}`,
      utilisateur: currentUser?.nom || "Utilisateur",
      date: new Date().toISOString(),
      details: isLastStep
        ? "Circuit complet — contrat approuvé final."
        : `Étape ${etapeEnAttente.ordre} (${etapeEnAttente.profil}) validée. Prochaine étape : ${nextProfil}.`,
    }];

    // Émission automatique du bon de commande à la signature DACC (dernière étape)
    if (isLastStep && addBonCommande && !getBCDuContrat(contrat.id, bonsCommande)) {
      const montantInitial = contrat.montantInitialHT ?? contrat.montantHT;
      const newBC = {
        id: `bc-${contrat.id}`,
        code: nextBCCode(contrat, bonsCommande),
        contratId: contrat.id,
        dateEmission: today,
        montantInitial,
        avenantsIntegres: [],
        receptions: [],
        statut: "Actif",
      };
      addBonCommande(newBC);
      newHistorique.push({
        action: "Émission du bon de commande",
        utilisateur: "Système",
        date: new Date().toISOString(),
        details: `Bon de commande ${newBC.code} émis — montant initial ${formatMontant(montantInitial)}.`,
      });
      addToast(`Bon de commande ${newBC.code} émis — ${formatMontant(montantInitial)}.`, "success");
    }

    updateContrat(contrat.id, { statut: newStatut, circuitValidation: newSteps, historique: newHistorique });
  }

  function handleRejeter() {
    const motif = window.prompt("Motif du rejet (obligatoire) :");
    if (!motif?.trim()) return;
    const newSteps = steps.map(s => ({ ...s, statut: "à venir", date: null, commentaire: null }));
    const newHistorique = [...(contrat.historique || []), {
      action: "Rejet en validation",
      utilisateur: currentUser?.nom || "Utilisateur",
      date: new Date().toISOString(),
      details: `Rejeté à l'étape ${etapeEnAttente.ordre} (${etapeEnAttente.profil}). Motif : ${motif.trim()}`,
    }];
    updateContrat(contrat.id, { statut: "Brouillon", circuitValidation: newSteps, historique: newHistorique });
  }

  const histIconColor = (action) => {
    if (action.includes("Approbation") || action.includes("Validation")) return "text-[#087F3E]";
    if (action.includes("Rejet")) return "text-red-600";
    if (action.includes("Envoi")) return "text-blue-600";
    if (action.includes("Avenant")) return "text-purple-600";
    if (action.includes("Suspension")) return "text-amber-600";
    return "text-gray-500";
  };

  const histBgColor = (action) => {
    if (action.includes("Approbation") || action.includes("Validation")) return "bg-[#E8F5EE] border-[#087F3E]/20";
    if (action.includes("Rejet")) return "bg-red-50 border-red-100";
    if (action.includes("Envoi")) return "bg-blue-50 border-blue-100";
    if (action.includes("Avenant")) return "bg-purple-50 border-purple-100";
    if (action.includes("Suspension")) return "bg-amber-50 border-amber-100";
    return "bg-gray-50 border-gray-200";
  };

  return (
    <div className="space-y-8 pt-6">
      {contrat?.typeCircuit && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <GitBranch className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            Circuit de type <span className="font-semibold text-gray-800">{contrat.typeCircuit === "réduit" ? "Réduit" : "Standard (6 étapes — ASSISTANTE_DEX → DEX → DEXA → DGA → DG → DACC)"}</span>.
          </p>
        </div>
      )}

      {canAct && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Action requise — Étape {etapeEnAttente.ordre} : {etapeEnAttente.profil}</p>
                <p className="text-xs text-amber-600 mt-0.5">{activeStepDef?.libelle || `En attente de votre validation en tant que ${etapeEnAttente.profil}.`}</p>
              </div>
            </div>
            {delaiInfo && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                delaiInfo.enRetard ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              }`}>
                {delaiInfo.enRetard ? `Retard ${delaiInfo.jours}j` : `${delaiInfo.jours}j restants`}
              </span>
            )}
          </div>
          {/* Checklist */}
          {activeStepDef?.pointsControle?.length > 0 && (
            <div className="bg-white border border-amber-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Points de contrôle</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  Object.values(checklistStates).filter(Boolean).length === activeStepDef.pointsControle.length
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {Object.values(checklistStates).filter(Boolean).length}/{activeStepDef.pointsControle.length} vérifiés
                </span>
              </div>
              <div className="space-y-2">
                {activeStepDef.pointsControle.map((pc, i) => (
                  <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklistStates[i] || false}
                      onChange={() => setChecklistStates(prev => ({ ...prev, [i]: !prev[i] }))}
                      className="mt-0.5 accent-[#087F3E] flex-shrink-0"
                    />
                    <span className={`text-xs flex-1 ${checklistStates[i] ? "text-gray-400 line-through" : "text-gray-700"}`}>{pc.libelle}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab?.(pc.cible)}
                      className="text-[10px] text-[#087F3E] hover:underline whitespace-nowrap font-medium"
                    >
                      → {CIBLE_LABELS[pc.cible] || pc.cible}
                    </button>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleRejeter}
              className="flex items-center gap-1.5 bg-white border border-red-300 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-4 h-4" /> Rejeter
            </button>
            <button
              onClick={handleValider}
              className="flex items-center gap-1.5 bg-[#087F3E] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Valider
            </button>
          </div>
        </div>
      )}

      {contrat?.statut === "En validation" && !canAct && etapeEnAttente && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
          <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            En attente de validation par <strong>{etapeEnAttente.profil}</strong> (étape {etapeEnAttente.ordre}/{steps.length}).
            Votre profil actuel ({currentUser?.roleId || "—"}) n'est pas habilité pour cette étape.
          </p>
        </div>
      )}

      <div>
        <SectionTitle>Circuit de validation configuré</SectionTitle>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <WorkflowSteps steps={steps} orientation="horizontal" />
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <span className="text-sm font-semibold text-gray-700">Configuration du circuit</span>
          <span className="text-xs text-[#087F3E] font-medium flex items-center gap-1">
            {showConfig ? <><ChevronUp className="w-3.5 h-3.5" /> Masquer</> : <><ChevronDown className="w-3.5 h-3.5" /> Afficher</>}
          </span>
        </button>
        {showConfig && (
          <div className="px-5 py-4 space-y-4">
            <div className="bg-[#E8F5EE] border-l-4 border-[#087F3E] px-4 py-3 rounded-r-lg">
              <p className="text-xs text-[#065A2C] leading-relaxed">Configuration héritée du modèle par défaut Sage X3. Adaptable selon les spécificités du contrat.</p>
            </div>
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.ordre} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="w-6 h-6 rounded-full bg-[#087F3E] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{step.ordre}</span>
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <ReadonlyInput value={step.profil} />
                    <ReadonlyInput value={step.nom} />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-[#087F3E]" disabled={!isEditable} />
                      <span className="text-xs text-gray-600">Peut rejeter</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Historique et commentaires</SectionTitle>
        <div className="space-y-0">
          {historique.map((evt, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${histBgColor(evt.action)}`}>
                  <div className={`w-2 h-2 rounded-full ${histIconColor(evt.action).replace("text-", "bg-")}`} />
                </div>
                {i < historique.length - 1 && <div className="w-0.5 flex-1 min-h-[20px] my-1 bg-gray-200" />}
              </div>
              <div className="pb-5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${histIconColor(evt.action)}`}>{evt.action}</span>
                  <span className="text-xs text-gray-400">— {evt.utilisateur}</span>
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                    {new Date(evt.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {evt.details && (
                  <div className={`mt-1.5 text-xs border rounded-lg px-3 py-2 leading-relaxed ${histBgColor(evt.action)}`}>
                    {evt.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Décomptes du contrat ───────────────────────────────────
const STATUTS_DECOMPTE_AUTORISES = ["Approuvé final", "En cours d'exécution"];

function TabDecomptes({ contrat, decomptes: decList }) {
  const navigate = useNavigate();
  const statusColor = {
    "Payé": "bg-[#E8F5EE] text-[#065A2C]",
    "Approuvé": "bg-blue-50 text-blue-700",
    "En validation": "bg-yellow-50 text-yellow-700",
    "Brouillon": "bg-gray-100 text-gray-600",
    "Rejeté": "bg-red-50 text-red-600",
  };

  const canCreate = contrat && STATUTS_DECOMPTE_AUTORISES.includes(contrat.statut);

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{decList.length} décompte{decList.length > 1 ? "s" : ""} pour ce contrat</p>
        {canCreate ? (
          <Link
            to={`/decomptes/nouveau?contratId=${contrat?.id}`}
            className="flex items-center gap-2 bg-[#087F3E] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#065A2C] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nouveau décompte
          </Link>
        ) : (
          <span
            title={`Le contrat est "${contrat?.statut}" — seuls les contrats "Approuvé final" ou "En cours d'exécution" acceptent un décompte.`}
            className="flex items-center gap-2 bg-gray-200 text-gray-400 px-3 py-2 rounded-lg text-xs font-semibold opacity-60 cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Nouveau décompte
          </span>
        )}
      </div>
      {decList.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun décompte" description="Créez le premier décompte pour ce contrat." />
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Code", "Période", "Type", "Net HT", "Statut"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Net HT" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {decList.map((dec) => (
                <tr key={dec.id} onClick={() => navigate(`/decomptes/${dec.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{dec.code}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(dec.dateDebut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{dec.type}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {new Intl.NumberFormat("fr-FR").format(dec.montantsCalcules?.net_ht || 0)} FCFA
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[dec.statut] || "bg-gray-100 text-gray-600"}`}>
                      {dec.statut}
                    </span>
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

// ─── Tab: Cessions ───────────────────────────────────────────────
function TabCessions({ contrat }) {
  const { etats, creerEtat } = useEtatsCession();
  const { decomptes } = useDecomptes();
  const navigate = useNavigate();

  if (!contrat) {
    return (
      <div className="pt-6">
        <EmptyState icon={Wallet} title="Enregistrez d'abord le contrat" description="Les états de cession sont disponibles une fois le contrat créé." />
      </div>
    );
  }

  const etatsDuContrat = etats
    .filter(e => e.contratId === contrat.id)
    .sort((a, b) => b.periodeDebut.localeCompare(a.periodeDebut));

  const totalCede = etatsDuContrat.reduce(
    (s, e) => s + ["MTX", "MTL", "RH"].reduce((s2, cat) => s2 + (e.sections[cat]?.totalValorise || 0), 0), 0
  );
  const totalRembourse = decomptes
    .filter(d => d.contratId === contrat.id && ["Approuvé", "Approuvé final", "Payé"].includes(d.statut))
    .reduce((s, d) => s + ["H", "J", "L"].reduce((s2, p) => s2 + (d.lignes?.find(l => l.codePoste === p)?.mensuel || 0), 0), 0);
  const resteARembourser = Math.max(0, totalCede - totalRembourse);

  const today2 = new Date();
  const currentMonthStr = `${today2.getFullYear()}-${String(today2.getMonth() + 1).padStart(2, "0")}`;
  const etatOuvert = etatsDuContrat.find(e =>
    ["Ouvert", "En contrôle"].includes(e.statutGlobal) &&
    e.periodeDebut.startsWith(currentMonthStr)
  );

  function handleInitier() {
    const today = new Date();
    const periodeDebut = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const periodeFin = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const nouvel = creerEtat({ contratId: contrat.id, chantierId: contrat.chantierId, periodeDebut, periodeFin });
    navigate(`/etats-cession/${nouvel.id}`);
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total cédé", value: formatMontant(totalCede), highlight: false },
          { label: "Total remboursé", value: formatMontant(totalRembourse), highlight: false },
          { label: "Reste à rembourser", value: formatMontant(resteARembourser), highlight: resteARembourser > 0 },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.highlight ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.highlight ? "text-amber-700" : "text-gray-900"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {etatsDuContrat.length === 0 ? "Aucun état de cession pour ce contrat." : `${etatsDuContrat.length} état(s) de cession`}
        </p>
        {etatOuvert ? (
          <button
            onClick={() => navigate(`/etats-cession/${etatOuvert.id}`)}
            className="flex items-center gap-1.5 text-sm text-[#087F3E] border border-[#087F3E] px-4 py-2 rounded-lg hover:bg-[#E8F5EE] transition-colors font-medium"
          >
            <Clock size={14} />
            Compléter l'état en cours ({formatDate(etatOuvert.periodeDebut)} → {formatDate(etatOuvert.periodeFin)})
          </button>
        ) : (
          <button
            onClick={handleInitier}
            className="flex items-center gap-1.5 text-sm bg-[#087F3E] text-white px-4 py-2 rounded-lg hover:bg-[#065A2C] transition-colors font-medium"
          >
            <Plus size={14} /> Initier un état de cession
          </button>
        )}
      </div>

      {etatsDuContrat.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Période", "Statut", "MTX", "MTL", "RH", "Total consolidé", "Décompte"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {etatsDuContrat.map(e => {
                const decId = (e.decomptesConsommateurs || [])[0];
                const total = ["MTX", "MTL", "RH"].reduce((s, cat) => s + (e.sections[cat]?.totalValorise || 0), 0);
                return (
                  <tr key={e.id} onClick={() => navigate(`/etats-cession/${e.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">
                      {formatDate(e.periodeDebut)} → {formatDate(e.periodeFin)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge statut={e.statutGlobal} /></td>
                    {["MTX", "MTL", "RH"].map(cat => (
                      <td key={cat} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {e.sections[cat]?.statut === "Non renseignée" ? "—" : formatMontantCourt(e.sections[cat]?.totalValorise || 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-gray-900 font-semibold whitespace-nowrap">{formatMontantCourt(total)}</td>
                    <td className="px-4 py-3">
                      {decId ? (
                        <Link to={`/decomptes/${decId}`} onClick={ev => ev.stopPropagation()} className="text-xs text-[#087F3E] underline hover:text-[#065A2C]">
                          {decId}
                        </Link>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab Attachements ─────────────────────────────────────────────
const ATT_STATUT_COLORS = {
  "Validé":            "bg-green-100 text-green-700",
  "En rapprochement":  "bg-orange-100 text-orange-700",
  "Soumis au DACC":    "bg-purple-100 text-purple-700",
  "Soumis au DT":      "bg-blue-100 text-blue-700",
  "En cours":          "bg-yellow-100 text-yellow-700",
  "Rejeté":            "bg-red-100 text-red-700",
};
const fmtNum = (v) => new Intl.NumberFormat("fr-FR").format(Math.round(v || 0));

function TabAttachements({ contrat }) {
  const { getAttachementsForContrat, addAttachement, getPendingCount } = useAttachements();
  const { currentUser } = useUser();
  const navigate = useNavigate();

  if (!contrat) return null;
  const dossiers = getAttachementsForContrat(contrat.id);
  const role = currentUser?.roleId;

  const hasOpen = dossiers.some(d => !["Validé", "Rejeté"].includes(d.statut));

  function handleInitier() {
    const today = new Date();
    const periodeDebut = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const periodeFin = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
    const lignesCSE = getDQELignes(contrat.id);
    const nouveau = addAttachement({
      contratId: contrat.id,
      chantierId: contrat.chantierId,
      periodeDebut,
      periodeFin,
      initiePar: { nom: currentUser?.nom, roleId: currentUser?.roleId },
      auteurCT: { nom: currentUser?.nom, id: currentUser?.id },
      lignesCSE,
    });
    navigate(`/attachements/${nouveau.id}`);
  }

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Dossiers d'attachement du contrat</h3>
        {(role === "CT" || role === "DT") && (
          <button
            onClick={handleInitier}
            disabled={hasOpen}
            title={hasOpen ? "Un dossier non clôturé existe déjà" : "Initier un nouveau dossier pour la période en cours"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${hasOpen ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500" : "bg-[#087F3E] text-white hover:bg-[#065A2C]"}`}
          >
            <Plus size={14} /> Initier un dossier
          </button>
        )}
      </div>
      {hasOpen && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Un dossier en cours ou en validation existe déjà pour ce contrat — clôturez-le avant d'en créer un nouveau.</p>
      )}

      {/* Liste */}
      {dossiers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clipboard size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun dossier d'attachement</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Période</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total CSE</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">STT</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dossiers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{d.code}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.periodeDebut} → {d.periodeFin}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ATT_STATUT_COLORS[d.statut] || "bg-gray-100 text-gray-500"}`}>{d.statut}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-[#087F3E]">
                    {d.voletCSE?.totalValorise > 0
                      ? `${fmtNum(d.voletCSE.totalValorise)} FCFA`
                      : <span className="text-gray-400 font-normal">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.voletSTT?.statut === "Chargé" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {d.voletSTT?.statut ?? "Vide"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/attachements/${d.id}`)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline ml-auto">
                      Ouvrir <ArrowRight size={11} />
                    </button>
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

// ─── Main component ──────────────────────────────────────────────
export default function ContratFormPage() {
  const { contrats, addContrat, updateContrat } = useContrats();
  const { decomptes } = useDecomptes();
  const { bonsCommande, addBonCommande, updateBonCommande } = useBonsCommande();
  const { factures, addFacture } = useFactures();
  const { etats: allEtats } = useEtatsCession();
  const { getAttachementsForContrat } = useAttachements();
  const { currentUser } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "nouveau";

  const contrat = isNew ? null : contrats.find((c) => c.id === id);
  const isEditable = isNew || contrat?.statut === "Brouillon";
  const baremeEditable = isNew || isBaremeEditable(contrat);

  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState({
    objet:           contrat?.objet          || "",
    objetDetaille:   contrat?.objetDetaille  || "",
    sousTraitantId:  contrat?.sousTraitantId || "",
    chantierId:      contrat?.chantierId     || "",
    montantHT:       contrat?.montantHT      || "",
    dateDebut:       contrat?.dateDebut      || "",
    dateFin:         contrat?.dateFin        || "",
    tauxTVA:         contrat?.tauxTVA        || 18,
    tauxAD:          contrat?.tauxAD         || 15,
    tauxRG:          contrat?.tauxRG         || 5,
    articles:        contrat?.articles       || [],
    modeleDecompte:  contrat?.modeleDecompte || buildModeleContrat([]),
  });

  function handleSaveNew() {
    const errors = [];
    if (!form.objet.trim()) errors.push("L'objet du contrat est requis.");
    if (!form.chantierId) errors.push("Le chantier est requis.");
    if (!form.sousTraitantId) errors.push("Le sous-traitant est requis.");
    if (!form.montantHT || parseFloat(form.montantHT) <= 0) errors.push("Le montant HT est requis et doit être > 0.");
    if (form.dateDebut && form.dateFin && form.dateFin < form.dateDebut) errors.push("La date de fin doit être postérieure à la date de début.");
    if (errors.length > 0) { errors.forEach(e => addToast(e, "error")); return; }

    const newId = generateContratId(contrats);
    const montantHT = parseFloat(form.montantHT) || 0;
    const tauxTVA = parseFloat(form.tauxTVA) || 18;
    addContrat({
      id: newId, code: newId,
      chantierId: form.chantierId,
      sousTraitantId: form.sousTraitantId,
      objet: form.objet.trim(),
      objetDetaille: form.objetDetaille.trim(),
      montantHT,
      montantInitialHT: montantHT,
      tauxTVA,
      tvaApplicable: tauxTVA > 0,
      tauxAD: parseFloat(form.tauxAD) || 15,
      tauxRG: parseFloat(form.tauxRG) || 5,
      dateDebut: form.dateDebut || "",
      dateFin: form.dateFin || "",
      statut: "Brouillon",
      typeCircuit: "standard",
      avenants: [],
      articles: form.articles || [],
      modeleDecompte: form.modeleDecompte || buildModeleContrat([]),
      baremeCessions: { mtx: [], mtl: [], rh: [] },
      pieceJointes: [],
      circuitValidation: [],
      historique: [],
    });
    navigate(`/contrats/${newId}`);
  }

  function handleSaveExisting() {
    const tauxTVA = parseFloat(form.tauxTVA) || 18;
    const tauxAD  = parseFloat(form.tauxAD)  || 15;
    const tauxRG  = parseFloat(form.tauxRG)  || 5;
    const decExistants = decomptes.filter(d => d.contratId === contrat.id);
    const tauxChanged = decExistants.length > 0 && (
      tauxRG  !== (contrat.tauxRG  || 5)  ||
      tauxAD  !== (contrat.tauxAD  || 15) ||
      tauxTVA !== (contrat.tauxTVA || 18)
    );
    if (tauxChanged) {
      addToast(
        `Avertissement : ${decExistants.length} décompte(s) existant(s) conservent les taux en vigueur à leur création. Le nouveau taux s'appliquera uniquement aux décomptes créés à partir de maintenant.`,
        "warning"
      );
    }
    updateContrat(contrat.id, {
      objet: form.objet,
      objetDetaille: form.objetDetaille,
      chantierId: form.chantierId,
      sousTraitantId: form.sousTraitantId,
      dateDebut: form.dateDebut,
      dateFin: form.dateFin,
      tauxTVA,
      tvaApplicable: tauxTVA > 0,
      tauxAD,
      tauxRG,
      modeleDecompte: form.modeleDecompte,
      articles: form.articles,
    });
    addToast("Contrat mis à jour.", "success");
  }

  function handleArticleChange(articles) {
    if (contrat) {
      updateContrat(contrat.id, { articles });
    }
  }

  // Dynamic metrics
  const montantActualise = contrat ? getMontantActualise(contrat) : 0;
  const montantRealise   = contrat ? computeMontantRealise(contrat.id, decomptes) : 0;
  const nombreDecomptes  = contrat ? computeNombreDecomptes(contrat.id, decomptes) : 0;
  const decomptesDuContrat = useMemo(
    () => (contrat ? decomptes.filter((d) => d.contratId === contrat.id) : []),
    [contrat]
  );
  const decomptesPaye = decomptesDuContrat.filter((d) => d.statut === "Payé").length;
  const avancement = montantActualise > 0 ? Math.round((montantRealise / montantActualise) * 100) : 0;

  const sttIsBlacklisted = sttMap[form.sousTraitantId]?.statut === "Blacklisté";
  const consultStt = !isEditable ? sttMap[contrat?.sousTraitantId] : null;
  const consultSttWarning = consultStt?.statut === "Blacklisté" || consultStt?.statut === "Suspendu" ? consultStt : null;

  const hasAvenants = (contrat?.avenants || []).length > 0;
  const avenantCount = (contrat?.avenants || []).length;
  const montantEnValidation = contrat ? computeMontantEnValidation(contrat.id, decomptes) : 0;
  const bc = contrat?.baremeCessions || { mtx: [], mtl: [], rh: [] };
  const baremeCount = (bc.mtx?.length || 0) + (bc.mtl?.length || 0) + (bc.rh?.length || 0);
  const cessionsCount = contrat ? allEtats.filter(e => e.contratId === contrat.id).length : 0;

  const TAB_ITEMS = [
    { id: "info",        label: "Informations générales", icon: Info },
    { id: "financier",   label: "Paramétrage financier",  icon: Settings },
    { id: "modele",      label: "Modèle de décompte",     icon: Calculator },
    { id: "avenants",    label: "Avenants",               icon: GitMerge, count: avenantCount || undefined },
    { id: "boncommande", label: "Bon de commande",         icon: ShoppingCart },
    { id: "bareme",      label: "Barème de cessions",     icon: Tags, count: baremeCount || undefined },
    { id: "cessions",    label: "Cessions",               icon: Wallet, count: cessionsCount || undefined },
    { id: "attachements",label: "Attachements",           icon: Clipboard, count: contrat ? getAttachementsForContrat(contrat.id).length || undefined : undefined },
    { id: "decomptes",   label: "Décomptes",              icon: FileText,  count: nombreDecomptes || undefined },
    { id: "pj",          label: "Pièces jointes",         icon: Paperclip, count: contrat?.pieceJointes?.length ?? 0 },
    { id: "circuit",     label: "Circuit de validation",  icon: GitBranch },
  ];

  function handleEnvoyerEnValidation() {
    if (sttIsBlacklisted) return;
    const today = new Date().toISOString().split("T")[0];
    const newSteps = CIRCUIT_CONTRAT.map((s, i) => ({
      ordre: s.ordre,
      profil: s.profil,
      nom: s.libelle,
      statut: i === 0 ? "en attente" : "à venir",
      date: null,
      ...(i === 0 ? { dateDebutEtape: today } : {}),
      commentaire: null,
    }));
    const newHistorique = [
      ...(contrat?.historique || []),
      {
        action: "Envoi en validation",
        utilisateur: currentUser?.nom || "Utilisateur",
        date: new Date().toISOString(),
        details: `Circuit de ${newSteps.length} étape(s) lancé — en attente de : ${newSteps[0]?.profil}.`,
      },
    ];
    updateContrat(contrat.id, { statut: "En validation", circuitValidation: newSteps, historique: newHistorique });
    addToast("Contrat envoyé en validation.", "success");
  }

  function ActionButtons() {
    if (isNew || contrat?.statut === "Brouillon") {
      return (
        <div className="flex gap-2">
          <button onClick={isNew ? handleSaveNew : handleSaveExisting}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Save className="w-4 h-4" /> Enregistrer
          </button>
          <button
            disabled={sttIsBlacklisted || isNew}
            onClick={handleEnvoyerEnValidation}
            className={`flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sttIsBlacklisted || isNew ? "opacity-50 cursor-not-allowed" : "hover:bg-[#065A2C]"}`}
          >
            <Send className="w-4 h-4" /> Envoyer en validation
          </button>
        </div>
      );
    }
    if (contrat?.statut === "En validation") {
      return (
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <GitBranch className="w-4 h-4" /> Voir circuit
          </button>
          <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <MessageSquare className="w-4 h-4" /> Ajouter commentaire
          </button>
        </div>
      );
    }
    if (contrat?.statut === "Approuvé final" || contrat?.statut === "En cours d'exécution") {
      return (
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <CheckCircle className="w-4 h-4" /> Consulter
          </button>
          <Link
            to={`/decomptes/nouveau${contrat ? `?contratId=${contrat.id}` : ""}`}
            className="flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors"
          >
            <FilePlus className="w-4 h-4" /> Créer un décompte
          </Link>
        </div>
      );
    }
    return null;
  }

  if (!isNew && !contrat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-yellow-500" />
        <p className="text-lg font-semibold text-gray-700">Contrat introuvable</p>
        <Link to="/contrats" className="text-sm text-[#087F3E] hover:underline">Retour à la liste</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/contrats")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux contrats
      </button>

      <PageHeader
        title={isNew ? "Nouveau contrat" : contrat.code}
        subtitle={isNew ? "Création d'un contrat de sous-traitance" : contrat.objet}
        action={contrat && (
          <div className="flex items-center gap-2">
            {hasAvenants && (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-1 font-medium">
                {avenantCount} avenant{avenantCount > 1 ? "s" : ""}
              </span>
            )}
            <StatusBadge statut={contrat.statut} />
          </div>
        )}
      />

      {/* Action bandeau */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-6 divide-x divide-gray-200">
          {[
            { label: "Montant HT",   value: formatMontantCourt(montantActualise), sub: hasAvenants ? "actualisé" : null },
            { label: "Décomptes",    value: (() => { if (!contrat?.id) return "—"; const bd = computeDecompteBreakdown(contrat.id, decomptes); const fin = bd.payés + bd.approuvés; return `${fin} payé${fin !== 1 ? "s" : ""}${bd.enValidation ? ` · ${bd.enValidation} en validation` : ""}${bd.brouillons ? ` · ${bd.brouillons} brouillon${bd.brouillons > 1 ? "s" : ""}` : ""}`; })() },
            { label: "Cumul payé",   value: `${avancement}%` },
            ...(montantEnValidation > 0 ? [{ label: "En validation", value: formatMontantCourt(montantEnValidation), amber: true }] : []),
          ].map((kpi, i) => (
            <div key={kpi.label} className={i > 0 ? "pl-6" : ""}>
              <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">{kpi.label}</p>
              <p className={`text-base font-bold mt-0.5 ${kpi.amber ? "text-amber-600" : "text-gray-900"}`}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-purple-600 font-medium">{kpi.sub}</p>}
            </div>
          ))}
        </div>
        <ActionButtons />
      </div>

      {/* STT status banner */}
      {consultSttWarning && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${consultSttWarning.statut === "Blacklisté" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${consultSttWarning.statut === "Blacklisté" ? "text-red-500" : "text-amber-500"}`} />
          <p className={`text-sm ${consultSttWarning.statut === "Blacklisté" ? "text-red-800" : "text-amber-800"}`}>
            {consultSttWarning.statut === "Blacklisté"
              ? `Le sous-traitant ${consultSttWarning.raisonSociale} est blacklisté — aucun nouveau contrat ne peut lui être rattaché.`
              : `Le sous-traitant ${consultSttWarning.raisonSociale} est actuellement suspendu — vérifier la situation avant toute nouvelle opération.`}
          </p>
        </div>
      )}

      {/* Tabs + content */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6">
          <Tabs items={TAB_ITEMS} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="px-6 pb-8">
          {activeTab === "info" && (
            <TabInfo contrat={contrat} isEditable={isEditable} form={form} setForm={setForm} onArticleChange={handleArticleChange} />
          )}
          {activeTab === "financier" && (
            <TabFinancier contrat={contrat} isEditable={isEditable} form={form} setForm={setForm}
              montantActualise={montantActualise}
              montantRealise={montantRealise}
              montantEnValidation={montantEnValidation}
            />
          )}
          {activeTab === "modele" && (
            <TabModele isEditable={isEditable} form={form} setForm={setForm} />
          )}
          {activeTab === "avenants" && (
            <TabAvenants
              contrat={contrat}
              montantInitial={contrat?.montantInitialHT ?? montantActualise}
              montantActualise={montantActualise}
              updateContrat={updateContrat}
              currentUser={currentUser}
              bonsCommande={bonsCommande}
              updateBonCommande={updateBonCommande}
            />
          )}
          {activeTab === "boncommande" && (
            <TabBonCommande contrat={contrat} bonsCommande={bonsCommande} factures={factures} addFacture={addFacture} currentUser={currentUser} updateContrat={updateContrat} />
          )}
          {activeTab === "bareme" && (
            <TabBaremeCessions contrat={contrat} baremeEditable={baremeEditable} updateContrat={updateContrat} currentUser={currentUser} />
          )}
          {activeTab === "cessions" && (
            <TabCessions contrat={contrat} />
          )}
          {activeTab === "pj" && (
            <TabPJ pieceJointes={contrat?.pieceJointes || []} />
          )}
          {activeTab === "circuit" && (
            <TabCircuit contrat={contrat} isEditable={isEditable} updateContrat={updateContrat} currentUser={currentUser} setActiveTab={setActiveTab} addBonCommande={addBonCommande} bonsCommande={bonsCommande} />
          )}
          {activeTab === "attachements" && (
            <TabAttachements contrat={contrat} />
          )}
          {activeTab === "decomptes" && (
            <TabDecomptes contrat={contrat} decomptes={decomptesDuContrat} />
          )}
        </div>
      </div>
    </div>
  );
}
