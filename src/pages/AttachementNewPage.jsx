import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAttachements } from "../hooks/useAttachements";
import { useChantiersList } from "../hooks/useChantiers";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDqe } from "../hooks/useDqe";
import { useToast } from "../context/ToastContext";
import SearchSelect from "../components/SearchSelect";

const today = () => new Date().toISOString().slice(0, 10);

export default function AttachementNewPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { attachements, addAttachement } = useAttachements();

  const [chantierId, setChantierId] = useState("");
  const [contratId, setContratId] = useState("");
  const [periodeDebut, setPeriodeDebut] = useState("");
  const [periodeFin, setPeriodeFin] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: chantiers = [] } = useChantiersList();
  const { data: contratsData } = useContratsPaginated(
    chantierId ? { chantier_id: Number(chantierId), count: 200 } : {}
  );
  const contrats = contratsData?.data ?? [];

  const contratIdInt = contratId ? parseInt(contratId, 10) : null;
  const { data: dqeData } = useDqe(contratIdInt);

  // Suggestion de période quand on choisit un contrat
  useEffect(() => {
    if (!contratId) { setPeriodeDebut(""); setPeriodeFin(""); return; }
    const contratAtts = attachements.filter(a => a.contratId === String(contratId));
    const sorted = [...contratAtts].sort((a, b) => (a.periodeFin ?? "").localeCompare(b.periodeFin ?? ""));
    const last = sorted[sorted.length - 1];
    const contrat = contrats.find(c => String(c.id) === String(contratId));

    let debut;
    if (!last) {
      debut = contrat?.date_debut ? contrat.date_debut.slice(0, 10) : today();
    } else {
      if (!last.periodeFin) {
        debut = contrat?.date_debut ? contrat.date_debut.slice(0, 10) : today();
      } else {
        const d = new Date(last.periodeFin + "T00:00");
        d.setDate(d.getDate() + 1);
        debut = d.toISOString().slice(0, 10);
      }
    }
    const d = new Date(debut + "T00:00");
    const finDate = new Date(d.getFullYear(), d.getMonth(), 25);
    if (finDate <= d) finDate.setMonth(finDate.getMonth() + 1);
    setPeriodeDebut(debut);
    setPeriodeFin(finDate.toISOString().slice(0, 10));
  }, [contratId, contrats, attachements]);

  // Reset contrat quand chantier change
  useEffect(() => { setContratId(""); }, [chantierId]);

  async function handleCreer() {
    if (!contratId || !periodeDebut || !periodeFin) {
      addToast("Renseignez le contrat et la période.", "error"); return;
    }
    if (periodeFin < periodeDebut) {
      addToast("La date de fin doit être après le début.", "error"); return;
    }
    const overlap = attachements.find(a =>
      a.contratId === String(contratId) &&
      (a.periodeDebut ?? "") <= periodeFin && (a.periodeFin ?? "") >= periodeDebut
    );
    if (overlap) {
      addToast(`Un attachement (${overlap.code}) couvre déjà cette période.`, "error"); return;
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
      const contrat = contrats.find(c => String(c.id) === String(contratId));
      const nouveau = await addAttachement({
        contratId: String(contratId),
        chantierId: contrat?.chantier_id ? String(contrat.chantier_id) : chantierId ? String(chantierId) : null,
        periodeDebut,
        periodeFin,
        lignesCSE,
        initiePar: { nom: "CT", roleId: "CT" },
      });
      addToast("Dossier d'attachement créé.", "success");
      navigate(`/attachements/${nouveau.code}`);
    } catch {
      addToast("Erreur lors de la création.", "error");
    } finally {
      setLoading(false);
    }
  }

  const dqeEmpty = contratId && (!dqeData?.data?.length || dqeData.data.every(r => !r.postes?.length || r.postes.every(p => !p.lignes?.length)));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* En-tête — même style que la fiche détail */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate("/attachements")} className="mt-0.5 p-2 rounded-xl hover:bg-gray-100 text-gray-400 flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Nouvel attachement</h1>
            <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-gray-100 text-gray-600 border-gray-200">Brouillon</span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Renseignez les informations pour initier le dossier</p>
        </div>
      </div>

      {/* Formulaire de création */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Chantier */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Chantier</label>
            <SearchSelect
              value={chantierId}
              onChange={e => setChantierId(e.target.value)}
              placeholder="— Sélectionner un chantier —"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-300 outline-none bg-white"
            >
              <option value="">— Sélectionner un chantier —</option>
              {chantiers.map(c => (
                <option key={c.id} value={c.id}>{c.code} — {c.designation}</option>
              ))}
            </SearchSelect>
          </div>

          {/* Contrat */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Contrat</label>
            <SearchSelect
              value={contratId}
              onChange={e => setContratId(e.target.value)}
              disabled={!chantierId}
              placeholder="— Sélectionner un contrat —"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-300 outline-none bg-white"
            >
              <option value="">— Sélectionner un contrat —</option>
              {contrats.map(c => (
                <option key={c.id} value={c.id}>{c.code}{c.soustraitant?.raison_sociale ? ` — ${c.soustraitant.raison_sociale}` : ""}</option>
              ))}
            </SearchSelect>
          </div>

          {/* Période début */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Début de période</label>
            <input
              type="date"
              value={periodeDebut}
              onChange={e => { setPeriodeDebut(e.target.value); setPeriodeFin(""); }}
              disabled={!contratId}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-300 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Période fin */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Fin de période</label>
            <input
              type="date"
              value={periodeFin}
              min={periodeDebut || undefined}
              onChange={e => setPeriodeFin(e.target.value)}
              disabled={!periodeDebut}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-300 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        {dqeEmpty && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <span className="font-semibold">Attention :</span> Le DQE de ce contrat est vide. Les lignes CSE seront vides.
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleCreer}
            disabled={!contratId || !periodeDebut || !periodeFin || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F3E] text-white text-sm font-semibold rounded-xl hover:bg-[#065A2C] disabled:opacity-40 transition-colors"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Création…</> : "Créer le dossier"}
          </button>
        </div>
      </div>
    </div>
  );
}
