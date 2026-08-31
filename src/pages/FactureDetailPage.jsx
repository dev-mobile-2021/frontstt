import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Building2, Hash, FileText, Download,
  CheckCircle2, AlertTriangle, ShieldCheck, Landmark, Clock,
} from "lucide-react";
import { useFactures } from "../context/FacturesContext";
import { useContrats } from "../context/ContratsContext";
import { useDecomptes } from "../context/DecomptesContext";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import { getMontantActualise } from "../utils/contratMetrics";
import { formatDate } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

function fmt(n) { return new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)); }

const TYPE_LABELS = {
  avance: "Facture d'avance de démarrage",
  cse: "Facture CSE",
  sous_traitant: "Facture sous-traitant",
};
const TYPE_COLORS = {
  avance: "bg-purple-50 text-purple-700 border-purple-200",
  cse: "bg-[#E8F5EE] text-[#065A2C] border-[#b5ddc8]",
  sous_traitant: "bg-blue-50 text-blue-700 border-blue-200",
};

const CSE_ENTITY = "la Compagnie Sahélienne d'Entreprises";

const CHECKLIST_DACC = [
  "Montants conformes au décompte validé",
  "Taux de TVA correct",
  "NINEA du sous-traitant présent et valide",
  "Coordonnées bancaires renseignées",
];

export default function FactureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { factures, updateFacture } = useFactures();
  const { contrats } = useContrats();
  const { decomptes } = useDecomptes();
  const { currentUser } = useUser();
  const { addToast } = useToast();

  const [checklistStates, setChecklistStates] = useState({});

  const facture = factures.find(f => f.id === id);
  const contrat = facture ? contrats.find(c => c.id === facture.contratId) : null;
  const decompte = facture?.decompteId ? decomptes.find(d => d.id === facture.decompteId) : null;
  const chantier = contrat ? chantiers.find(c => c.id === contrat.chantierId) : null;
  const stt = contrat ? sousTraitants.find(s => s.id === contrat.sousTraitantId) : null;
  const factureLiee = facture?.factureLieeId ? factures.find(f => f.id === facture.factureLieeId) : null;

  if (!facture || !contrat) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Facture introuvable</p>
        <button onClick={() => navigate("/factures")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour à la liste</button>
      </div>
    );
  }

  const isDACC = currentUser?.roleId === "DACC";
  const isDFC = currentUser?.roleId === "DFC";

  const lignesPayer = facture.lignes.filter(l => l.signe === "+");
  const lignesDeduire = facture.lignes.filter(l => l.signe === "-");

  function handleControleDACC() {
    const today = new Date().toISOString().slice(0, 10);
    updateFacture(facture.id, { statut: "Contrôlée DACC", dateControleDACC: today });
    if (factureLiee) updateFacture(factureLiee.id, { statut: "Contrôlée DACC", dateControleDACC: today });
    addToast("Conformité contrôlée — factures passées au statut Contrôlée DACC.", "success");
  }

  function handleValidationDFC() {
    const today = new Date().toISOString().slice(0, 10);
    updateFacture(facture.id, { statut: "Validée DFC", dateValidationDFC: today });
    if (factureLiee) updateFacture(factureLiee.id, { statut: "Validée DFC", dateValidationDFC: today });
    addToast("Facture validée financièrement — le paiement peut être déclenché depuis le décompte.", "success");
  }

  const checklistOk = CHECKLIST_DACC.every((_, i) => checklistStates[i]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/factures")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Factures
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{facture.code}</span>
      </div>

      <PageHeader
        title={facture.code}
        subtitle={facture.type === "sous_traitant" ? `Émise par ${stt?.raisonSociale || "le sous-traitant"}` : `Émise par ${CSE_ENTITY}`}
        action={
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TYPE_COLORS[facture.type]}`}>{TYPE_LABELS[facture.type]}</span>
            <StatusBadge statut={facture.statut} />
          </div>
        }
      />

      {/* Bloc identification */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-4 gap-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Hash size={11} />Sous-traitant</p>
          <p className="text-sm font-medium text-gray-800 mt-1">{stt?.raisonSociale || "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">NINEA {stt?.ninea || "—"}</p>
          <p className="text-xs text-gray-500">{stt?.coordonneesBancaires?.banque} · {stt?.coordonneesBancaires?.iban}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Building2 size={11} />Chantier</p>
          <p className="text-sm font-medium text-gray-800 mt-1">{chantier?.nom || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><FileText size={11} />Contrat</p>
          <Link to={`/contrats/${contrat.id}`} className="text-sm font-medium text-[#087F3E] hover:underline mt-1 inline-block">{contrat.code}</Link>
          <p className="text-xs text-gray-500 mt-0.5">Marché actualisé : {fmt(getMontantActualise(contrat))} FCFA</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><FileText size={11} />Décompte concerné</p>
          {decompte ? (
            <>
              <Link to={`/decomptes/${decompte.id}`} className="text-sm font-medium text-[#087F3E] hover:underline mt-1 inline-block">{decompte.code}</Link>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(decompte.dateDebut)} → {formatDate(decompte.dateFin)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-1">— (facture d'avance)</p>
          )}
        </div>
      </div>

      {/* Tableau des lignes */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-[#E8F5EE] px-4 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-[#065A2C]">À payer</h3>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {lignesPayer.map(l => (
              <tr key={l.code}>
                <td className="px-4 py-2 w-12 font-mono text-xs text-gray-500">{l.code}</td>
                <td className="px-4 py-2 text-gray-800">{l.libelle}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900 w-40">{fmt(l.montant)} FCFA</td>
              </tr>
            ))}
            {lignesPayer.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-3 text-xs text-gray-400 italic">Aucune ligne</td></tr>
            )}
          </tbody>
        </table>

        {lignesDeduire.length > 0 && (
          <>
            <div className="bg-red-50 px-4 py-2.5 border-y border-gray-200">
              <h3 className="text-sm font-semibold text-red-700">À déduire</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {lignesDeduire.map(l => (
                  <tr key={l.code}>
                    <td className="px-4 py-2 w-12 font-mono text-xs text-gray-500">{l.code}</td>
                    <td className="px-4 py-2 text-gray-800">{l.libelle}</td>
                    <td className="px-4 py-2 text-right font-medium text-red-600 w-40">-{fmt(l.montant)} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Pied de tableau */}
        <div className="bg-gray-900 px-5 py-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Net à régler HTVA</span>
            <span className="text-sm font-semibold text-white">{fmt(facture.montantHT)} FCFA</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">TVA ({facture.tauxTVA}%)</span>
            <span className="text-sm font-semibold text-white">{fmt(facture.montantTVA)} FCFA</span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-700">
            <span className="text-base font-bold text-white">Net à régler TTC</span>
            <span className="text-xl font-bold text-white tabular-nums">{fmt(facture.montantTTC)} FCFA</span>
          </div>
        </div>
      </div>

      {/* Bloc rapprochement */}
      {factureLiee && (
        <div className={`border-2 rounded-xl p-5 ${facture.statut === "Écart détecté" ? "bg-red-50 border-red-300" : "bg-[#E8F5EE] border-[#087F3E]/30"}`}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            {facture.statut === "Écart détecté" ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-[#087F3E]" />}
            Rapprochement des factures
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{facture.type === "cse" ? "Facture CSE" : "Facture sous-traitant"}</p>
              <p className="text-base font-bold text-gray-900 mt-1">{fmt(facture.montantTTC)} FCFA</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{factureLiee.type === "cse" ? "Facture CSE" : "Facture sous-traitant"}</p>
              <p className="text-base font-bold text-gray-900 mt-1">{fmt(factureLiee.montantTTC)} FCFA</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Écart</p>
              <p className={`text-base font-bold mt-1 ${(facture.ecartRapprochement || 0) > 0 ? "text-red-600" : "text-[#087F3E]"}`}>
                {fmt(facture.ecartRapprochement || 0)} FCFA
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(facture.ecartRapprochement || 0) > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              {(facture.ecartRapprochement || 0) > 0 ? "⚠ Écart détecté" : "✓ Conforme"}
            </span>
            <Link to={`/factures/${factureLiee.id}`} className="text-xs text-[#087F3E] font-semibold underline hover:text-[#065A2C]">
              → Voir la facture liée {factureLiee.code}
            </Link>
          </div>
          {facture.motifRejet && (
            <p className="text-sm text-red-700 mt-3 leading-relaxed">{facture.motifRejet}</p>
          )}
        </div>
      )}

      {/* Barre d'actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {facture.statut === "Rapprochée" && (
          isDACC ? (
            <div className="space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Points de contrôle</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${checklistOk ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {Object.values(checklistStates).filter(Boolean).length}/{CHECKLIST_DACC.length} vérifiés
                  </span>
                </div>
                <div className="space-y-2">
                  {CHECKLIST_DACC.map((label, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={checklistStates[i] || false}
                        onChange={() => setChecklistStates(prev => ({ ...prev, [i]: !prev[i] }))}
                        className="mt-0.5 accent-[#087F3E] flex-shrink-0" />
                      <span className={`text-xs flex-1 ${checklistStates[i] ? "text-gray-400 line-through" : "text-gray-700"}`}>{label}</span>
                      {i === 2 && <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">NINEA {stt?.ninea || "—"}</span>}
                      {i === 3 && <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">{stt?.coordonneesBancaires?.iban || "—"}</span>}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleControleDACC} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <ShieldCheck size={15} /> Contrôler la conformité
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Seul le DACC peut contrôler la conformité de cette facture.</p>
          )
        )}

        {facture.statut === "Contrôlée DACC" && (
          isDFC ? (
            <button onClick={handleValidationDFC} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <Landmark size={15} /> Valider financièrement
            </button>
          ) : (
            <p className="text-sm text-gray-400">Seule la DFC peut valider financièrement cette facture (contrôlée par le DACC le {formatDate(facture.dateControleDACC)}).</p>
          )
        )}

        {facture.statut === "Validée DFC" && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <Clock size={16} className="text-indigo-500 flex-shrink-0" />
            <p className="text-sm text-indigo-800">
              Facture validée financièrement le <strong>{formatDate(facture.dateValidationDFC)}</strong> — le paiement se déclenche
              {decompte ? <> depuis la <Link to={`/decomptes/${decompte.id}`} className="underline font-semibold">fiche décompte {decompte.code}</Link></> : " depuis le décompte associé"}.
            </p>
          </div>
        )}

        {facture.statut === "Payée" && (
          <div className="flex items-center gap-3 bg-[#E8F5EE] border border-[#b5ddc8] rounded-xl p-4">
            <CheckCircle2 size={16} className="text-[#087F3E] flex-shrink-0" />
            <p className="text-sm text-[#065A2C]">
              Facture payée le <strong>{formatDate(facture.datePaiement)}</strong> — référence <strong className="font-mono">{facture.referenceReglement}</strong>.
            </p>
          </div>
        )}

        {facture.statut === "Écart détecté" && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-800">
              Écart de rapprochement constaté — {decompte ? <>le décompte <Link to={`/decomptes/${decompte.id}`} className="underline font-semibold">{decompte.code}</Link> a été repassé en Rejeté.</> : "traitement requis."}
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <button onClick={() => addToast("PDF téléchargé.", "success")} className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition-colors">
            <Download size={14} /> Télécharger en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
