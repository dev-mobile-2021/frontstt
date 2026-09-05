import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Save, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useEtatCession, useSaveEtatCession } from "../hooks/useEtatsCession";
import { useContratsPaginated } from "../hooks/useContrats";
import PageHeader from "../components/PageHeader";
import { SkeletonCard } from "../components/Skeleton";

const INIT = {
  contrat_id:    "",
  periode_debut: "",
  periode_fin:   "",
  observations:  "",
};

export default function EtatCessionFormPage() {
  const { id }       = useParams();
  const isNew        = !id || id === "nouveau";
  const navigate     = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState(INIT);

  const { data: etat, isLoading, isError } = useEtatCession(isNew ? null : id);

  const { data: contratsData } = useContratsPaginated({
    statut: isNew ? "actif" : undefined,
    count: 200,
  });
  const contrats = contratsData?.data ?? [];

  const saveMut = useSaveEtatCession();

  useEffect(() => {
    if (!isNew && etat) {
      setForm({
        contrat_id:    etat.contrat_id ?? "",
        periode_debut: etat.periode_debut?.slice(0, 10) ?? "",
        periode_fin:   etat.periode_fin?.slice(0, 10)   ?? "",
        observations:  etat.observations ?? "",
      });
    }
  }, [isNew, etat]);

  const selectedContrat = contrats.find(c => String(c.id) === String(form.contrat_id));

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleDebutChange(value) {
    // Reset fin if it becomes anterior to the new debut
    setForm(f => ({
      ...f,
      periode_debut: value,
      periode_fin: f.periode_fin && f.periode_fin < value ? "" : f.periode_fin,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.contrat_id)    return addToast("Sélectionnez un contrat.", "error");
    if (!form.periode_debut) return addToast("La date de début est obligatoire.", "error");
    if (!form.periode_fin)   return addToast("La date de fin est obligatoire.", "error");

    const payload = {
      contrat_id:    parseInt(form.contrat_id, 10),
      periode_debut: form.periode_debut,
      periode_fin:   form.periode_fin,
      observations:  form.observations || null,
    };
    if (!isNew) payload.id = parseInt(id, 10);

    try {
      const res = await saveMut.mutateAsync(payload);
      addToast(isNew ? "État de cession créé." : "État de cession mis à jour.", "success");
      const newId = res?.data?.id ?? id;
      navigate(`/etats-cession/${newId}`, { replace: true });
    } catch (err) {
      addToast(
        err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? "Erreur lors de la sauvegarde.",
        "error"
      );
    }
  }

  if (!isNew && isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>;
  }
  if (!isNew && (isError || !etat)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">État de cession introuvable</p>
        <button onClick={() => navigate("/etats-cession")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }
  if (!isNew && etat?.statut !== "brouillon") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Cet état de cession ne peut plus être modifié</p>
        <p className="text-sm mt-1">Statut : <strong>{etat?.statut}</strong></p>
        <button onClick={() => navigate(`/etats-cession/${id}`)} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Voir le détail
        </button>
      </div>
    );
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> États de cession
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">
          {isNew ? "Nouvel état de cession" : etat?.code}
        </span>
      </div>

      <PageHeader
        title={isNew ? "Nouvel état de cession" : `Modifier ${etat?.code}`}
        subtitle="Renseignez le contrat et la période de travaux"
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Contrat */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-700">Contrat</h3>

          <div>
            <label className={labelCls}>Contrat *</label>
            <select
              value={form.contrat_id}
              onChange={e => set("contrat_id", e.target.value)}
              className={inputCls}
              disabled={!isNew}
            >
              <option value="">— Sélectionner un contrat actif —</option>
              {contrats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.soustraitant?.raison_sociale ?? "?"} · {c.objet}
                </option>
              ))}
            </select>
            {!isNew && (
              <p className="text-xs text-gray-400 mt-1">Le contrat ne peut pas être modifié après création.</p>
            )}
          </div>

          {selectedContrat && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Sous-traitant</p>
                <p className="font-medium text-gray-800">{selectedContrat.soustraitant?.raison_sociale ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Chantier</p>
                <p className="font-medium text-gray-800">{selectedContrat.chantier?.designation ?? "—"}</p>
                <p className="text-xs text-gray-400">{selectedContrat.chantier?.code ?? ""}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Objet</p>
                <p className="font-medium text-gray-800">{selectedContrat.objet ?? "—"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Période */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-700">Période de travaux</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Date de début *</label>
              <input
                type="date"
                value={form.periode_debut}
                onChange={e => handleDebutChange(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Date de fin *</label>
              <input
                type="date"
                value={form.periode_fin}
                min={form.periode_debut || undefined}
                onChange={e => set("periode_fin", e.target.value)}
                className={inputCls}
                disabled={!form.periode_debut}
              />
              {!form.periode_debut && (
                <p className="text-xs text-gray-400 mt-1">Choisissez d'abord la date de début.</p>
              )}
            </div>
          </div>

          {/* Warnings période vs contrat */}
          {selectedContrat && form.periode_debut && selectedContrat.date_debut && form.periode_debut < selectedContrat.date_debut && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <span className="mt-0.5">⚠</span>
              <span>
                La date de début est antérieure au début du contrat
                (<strong>{new Date(selectedContrat.date_debut).toLocaleDateString("fr-FR")}</strong>).
                Le backend rejettera cette saisie.
              </span>
            </div>
          )}
          {selectedContrat && form.periode_fin && selectedContrat.date_fin_prevue && form.periode_fin > selectedContrat.date_fin_prevue && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <span className="mt-0.5">⚠</span>
              <span>
                La date de fin dépasse la fin prévue du contrat
                (<strong>{new Date(selectedContrat.date_fin_prevue).toLocaleDateString("fr-FR")}</strong>).
                Le backend rejettera cette saisie.
              </span>
            </div>
          )}
          {selectedContrat && !selectedContrat.date_debut && !selectedContrat.date_fin_prevue && (
            <p className="text-xs text-gray-400 italic">Aucune date de début/fin renseignée sur ce contrat — vérification de période impossible.</p>
          )}
        </div>

        {/* Observations */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <label className={labelCls}>Observations</label>
          <textarea
            value={form.observations}
            onChange={e => set("observations", e.target.value)}
            rows={3}
            placeholder="Remarques éventuelles…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/etats-cession")}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saveMut.isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saveMut.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isNew ? "Créer l'état de cession" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
