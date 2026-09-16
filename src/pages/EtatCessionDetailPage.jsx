import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, FileDown, Pencil, Plus, Trash2, Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import {
  useEtatCession, useEtatCessionStatut,
  useSaveLigneEC, useDeleteLigneEC,
} from "../hooks/useEtatsCession";
import { useCircuitEtapes } from "../hooks/useCircuit";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmt = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));

const LIGNE_INIT = { poste: "", designation: "", unite: "", quantite: "", prix_unitaire: "" };

// ─── Formulaire ajout ligne ───────────────────────────────────────
function AddLigneForm({ ecId, onClose }) {
  const { addToast } = useToast();
  const [form, setForm] = useState(LIGNE_INIT);
  const saveMut = useSaveLigneEC();

  const montantPreview = (parseFloat(form.quantite) || 0) * (parseFloat(form.prix_unitaire) || 0);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.designation.trim()) return addToast("La désignation est obligatoire.", "error");
    if (!form.quantite || parseFloat(form.quantite) <= 0) return addToast("La quantité doit être supérieure à 0.", "error");
    if (!form.prix_unitaire || parseFloat(form.prix_unitaire) <= 0) return addToast("Le prix unitaire doit être supérieur à 0.", "error");

    try {
      await saveMut.mutateAsync({
        etat_cession_id: ecId,
        poste:           form.poste.trim()  || null,
        designation:     form.designation.trim(),
        unite:           form.unite.trim()  || "",
        quantite:        parseFloat(form.quantite),
        prix_unitaire:   parseFloat(form.prix_unitaire),
        ordre:           0,
      });
      addToast("Ligne ajoutée.", "success");
      setForm(LIGNE_INIT);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur lors de l'ajout.", "error");
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none";

  return (
    <tr className="bg-[#E8F5EE]/50">
      <td colSpan={7} className="px-4 py-4">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-6 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Poste</label>
              <input value={form.poste} onChange={e => set("poste", e.target.value)}
                placeholder="A1" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Désignation *</label>
              <input value={form.designation} onChange={e => set("designation", e.target.value)}
                placeholder="Travaux de terrassement…" className={inputCls} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Unité</label>
              <input value={form.unite} onChange={e => set("unite", e.target.value)}
                placeholder="m³" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Quantité *</label>
              <input type="number" min="0" step="any" value={form.quantite}
                onChange={e => set("quantite", e.target.value)}
                placeholder="100" className={inputCls} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prix unitaire *</label>
              <input type="number" min="0" step="any" value={form.prix_unitaire}
                onChange={e => set("prix_unitaire", e.target.value)}
                placeholder="5000" className={inputCls} required />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Montant calculé : <strong className="text-gray-800">{fmt(montantPreview)} FCFA</strong>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={saveMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#087F3E] text-white rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
                {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Ajouter la ligne
              </button>
            </div>
          </div>
        </form>
      </td>
    </tr>
  );
}

// ─── Circuit Stepper ──────────────────────────────────────────────
function CircuitStepper({ etat, circuit, onStatut, lignes }) {
  const [showRejet, setShowRejet] = useState(false);
  const [motif, setMotif]         = useState("");
  const statut = etat.statut;

  // Build steps list: [Création, ...circuit etapes, Validé final]
  const etapesSorted = [...circuit].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  // Determine order of statuses from circuit
  const statutOrder = ["brouillon", ...etapesSorted.map(e => e.statut_avant), "valide"];
  // deduplicate while preserving order
  const seen = new Set();
  const orderedStatuts = statutOrder.filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });
  if (!orderedStatuts.includes("valide")) orderedStatuts.push("valide");

  const currentIdx = orderedStatuts.indexOf(statut);

  const steps = orderedStatuts.map((s, idx) => {
    const etape = etapesSorted.find(e => e.statut_avant === s);
    return {
      statut: s,
      label: s === "brouillon" ? "Création"
           : s === "valide"   ? "Validé"
           : s === "soumis"   ? "Soumis"
           : s === "rejete"   ? "Rejeté"
           : etape?.libelle ?? s,
      role:  etape?.role?.designation ?? etape?.profil_code ?? null,
      isDone: statut === "rejete"
        ? idx < currentIdx
        : idx < orderedStatuts.indexOf(statut === "valide" ? "valide" : statut),
      isCurrent: idx === currentIdx,
      isPending: idx > currentIdx,
      etape,
    };
  });

  // Current etape (the transition FROM current statut)
  const currentEtape = etapesSorted.find(e => e.statut_avant === statut);

  async function handleSoumettre() {
    if (lignes.length === 0) {
      return;
    }
    await onStatut({ id: etat.id, statut: "soumis" });
  }

  async function handleValider() {
    await onStatut({ id: etat.id, statut: currentEtape?.statut_apres ?? "valide" });
  }

  async function handleRejeter() {
    if (!motif.trim()) return;
    await onStatut({ id: etat.id, statut: "rejete", motif: motif.trim() });
    setShowRejet(false);
    setMotif("");
  }

  const isTerminal = statut === "valide" || statut === "rejete";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Circuit de validation</p>

      {/* Step bar */}
      <div className="flex items-start gap-0">
        {steps.map((step, idx) => (
          <div key={step.statut} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              {/* Left connector */}
              <div className={`flex-1 h-0.5 ${idx === 0 ? "opacity-0" : step.isDone ? "bg-[#087F3E]" : "bg-gray-200"}`} />
              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors
                ${step.isDone    ? "bg-[#087F3E] border-[#087F3E] text-white"
                : step.isCurrent && statut === "rejete" ? "bg-red-500 border-red-500 text-white"
                : step.isCurrent ? "bg-white border-[#087F3E] text-[#087F3E]"
                : "bg-white border-gray-200 text-gray-300"}`}>
                {step.isDone
                  ? <CheckCircle2 size={16} />
                  : step.isCurrent && statut === "rejete"
                  ? <span className="text-xs font-bold">✕</span>
                  : step.isCurrent
                  ? <Clock size={14} />
                  : <Circle size={14} />}
              </div>
              {/* Right connector */}
              <div className={`flex-1 h-0.5 ${idx === steps.length - 1 ? "opacity-0" : step.isDone ? "bg-[#087F3E]" : "bg-gray-200"}`} />
            </div>
            {/* Label + role */}
            <div className="mt-2 text-center px-1">
              <p className={`text-xs font-semibold ${step.isDone ? "text-[#087F3E]" : step.isCurrent ? "text-gray-900" : "text-gray-400"}`}>
                {step.label}
              </p>
              {step.role && (
                <p className="text-[10px] text-gray-400 mt-0.5">{step.role}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action zone */}
      {!isTerminal && (
        <div className="border-t border-gray-100 pt-4">
          {statut === "brouillon" && (
            <div className="flex items-center gap-3">
              <button onClick={handleSoumettre} disabled={lignes.length === 0}
                className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Soumettre pour validation
              </button>
              {lignes.length === 0 && (
                <p className="text-xs text-amber-600">Ajoutez au moins une ligne avant de soumettre.</p>
              )}
            </div>
          )}

          {statut !== "brouillon" && currentEtape && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                En attente de validation par <strong className="text-gray-700">
                  {currentEtape.role?.designation ?? currentEtape.profil_code?.toUpperCase() ?? "—"}
                </strong>
              </p>
              {!showRejet ? (
                <div className="flex gap-3">
                  <button onClick={handleValider}
                    className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors">
                    Valider
                  </button>
                  <button onClick={() => setShowRejet(true)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Rejeter
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <input autoFocus placeholder="Motif du rejet (obligatoire)…" value={motif}
                    onChange={e => setMotif(e.target.value)}
                    className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none" />
                  <button onClick={handleRejeter} disabled={!motif.trim()}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    Confirmer le rejet
                  </button>
                  <button onClick={() => { setShowRejet(false); setMotif(""); }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 rounded-lg">
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {statut === "valide" && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-[#087F3E] font-medium">✓ État de cession validé</p>
        </div>
      )}

      {statut === "rejete" && etat.motif_rejet && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-1">Motif de rejet</p>
          <p className="text-sm text-red-600">{etat.motif_rejet}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function EtatCessionDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const [showAddLigne, setShowAddLigne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: etat, isLoading, isError } = useEtatCession(id);
  const { data: circuitData = [] }         = useCircuitEtapes({ module: "etat_cession", count: 50 });
  const circuit = circuitData?.data ?? (Array.isArray(circuitData) ? circuitData : []);

  const statutMut    = useEtatCessionStatut();
  const deleteLigneMut = useDeleteLigneEC();

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>;
  }
  if (isError || !etat) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">État de cession introuvable</p>
        <button onClick={() => navigate("/etats-cession")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const contrat  = etat.contrat;
  const lignes   = etat.lignes ?? [];
  const canEdit  = etat.statut === "brouillon";

  async function handleStatut({ id: ecId, statut, motif }) {
    try {
      await statutMut.mutateAsync({ id: ecId, statut, motif });
      addToast("Statut mis à jour.", "success");
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur lors du changement de statut.", "error");
    }
  }

  async function handleDeleteLigne(ligneId) {
    try {
      await deleteLigneMut.mutateAsync(ligneId);
      addToast("Ligne supprimée.", "success");
      setConfirmDelete(null);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur lors de la suppression.", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> États de cession
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{etat.code}</span>
      </div>

      {/* Header */}
      <PageHeader
        title={etat.code}
        subtitle={[contrat?.code, contrat?.soustraitant?.raison_sociale].filter(Boolean).join(" · ")}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge statut={etat.statut} />
            {canEdit && (
              <button onClick={() => navigate(`/etats-cession/${id}/modifier`)}
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                <Pencil size={14} /> Modifier
              </button>
            )}
            <button
              onClick={() => {
                const token = localStorage.getItem("stt_token");
                window.open(`${import.meta.env.VITE_API_BASE}/api/pdf/etatcession/${id}?token=${token}`, "_blank");
              }}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <FileDown size={14} /> PDF
            </button>
          </div>
        }
      />

      {/* KPI band */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Période</p>
          <p className="text-sm font-medium text-gray-800">
            {fmtDate(etat.periode_debut)}
            {etat.periode_fin ? ` → ${fmtDate(etat.periode_fin)}` : ""}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Montant total</p>
          <MoneyDisplay amount={etat.montant_total ?? 0} variant="small" />
        </div>
        {contrat?.chantier && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chantier</p>
            <p className="text-sm font-medium text-gray-800 truncate">{contrat.chantier.designation}</p>
            <p className="text-xs text-gray-400">{contrat.chantier.code}</p>
          </div>
        )}
      </div>

      {/* Circuit stepper */}
      <CircuitStepper etat={etat} circuit={circuit} onStatut={handleStatut} lignes={lignes} />

      {/* Contrat link */}
      {contrat && (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Contrat associé</p>
          <Link to={`/contrats/${etat.contrat_id}`}
            className="inline-flex items-center gap-2 text-sm text-[#087F3E] hover:underline font-medium">
            {contrat.code} — {contrat.objet}
          </Link>
          {contrat.soustraitant && (
            <p className="text-xs text-gray-500 mt-1">{contrat.soustraitant.raison_sociale}</p>
          )}
        </div>
      )}

      {/* Lignes table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Lignes de cession</h3>
            <p className="text-xs text-gray-400 mt-0.5">{lignes.length} ligne{lignes.length !== 1 ? "s" : ""}</p>
          </div>
          {canEdit && !showAddLigne && (
            <button onClick={() => setShowAddLigne(true)}
              className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
              <Plus size={14} /> Ajouter une ligne
            </button>
          )}
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Poste", "Désignation", "Unité", "Quantité", "Prix unit.", "Montant", canEdit ? "" : null]
                .filter(Boolean)
                .map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {showAddLigne && (
              <AddLigneForm ecId={parseInt(id, 10)} onClose={() => setShowAddLigne(false)} />
            )}
            {lignes.length === 0 && !showAddLigne ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="py-12 text-center text-sm text-gray-400">
                  {canEdit
                    ? "Aucune ligne — cliquez \"Ajouter une ligne\" pour commencer."
                    : "Aucune ligne dans cet état de cession."}
                </td>
              </tr>
            ) : (
              [...lignes].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)).map(ligne => (
                <tr key={ligne.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{ligne.poste ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{ligne.designation}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{ligne.unite ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                    {ligne.quantite != null ? new Intl.NumberFormat("fr-FR").format(ligne.quantite) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <MoneyDisplay amount={ligne.prix_unitaire ?? 0} variant="small" />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyDisplay amount={ligne.montant ?? 0} variant="small" className="font-semibold" />
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      {confirmDelete === ligne.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600">Confirmer ?</span>
                          <button onClick={() => handleDeleteLigne(ligne.id)}
                            disabled={deleteLigneMut.isPending}
                            className="text-xs text-red-600 hover:text-red-800 font-medium">Oui</button>
                          <button onClick={() => setConfirmDelete(null)}
                            className="text-xs text-gray-500 hover:text-gray-700">Non</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(ligne.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {lignes.length > 0 && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={canEdit ? 6 : 5} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">Total</td>
                <td className="px-4 py-3">
                  <MoneyDisplay amount={etat.montant_total ?? 0} variant="small" className="font-bold" />
                </td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Observations */}
      {etat.observations && (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Observations</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{etat.observations}</p>
        </div>
      )}
    </div>
  );
}
