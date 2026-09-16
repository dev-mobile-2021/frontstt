import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Save, Loader2, CheckCircle2, XCircle, FileDown, Circle, Clock } from "lucide-react";

import { useDecompte, useSaveDecompte, useValiderDecompte, useRejeterDecompte, usePayerDecompte, useDecompteCircuit } from "../hooks/useDecomptes";
import { useSaveReleve } from "../hooks/useReleves";
import { useParametresPaginated } from "../hooks/useParametres";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";

const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// ─── Circuit stepper enrichi ──────────────────────────────────────
function CircuitStepper({ decompte, circuit, onValider, onRejeter, onPayer, onSoumettre }) {
  const [showRejet, setShowRejet] = useState(false);
  const [motifRejet, setMotifRejet] = useState("");
  const { currentUser } = useUser();

  const statut      = decompte?.statut ?? "brouillon";
  const validations = decompte?.validations ?? [];

  const etapesSorted = [...circuit].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const lastStep     = etapesSorted[etapesSorted.length - 1];

  // Build ordered steps list
  const steps = [
    { statut: "brouillon", label: "Création",  profil: null },
    ...(etapesSorted.length > 0
      ? [{ statut: etapesSorted[0].statut_avant, label: "Soumis", profil: null }]
      : [{ statut: "soumis", label: "Soumis", profil: null }]),
    ...etapesSorted.map(e => ({
      statut: e.statut_apres,
      label:  e.profil_code.toUpperCase(),
      profil: e.profil_code,
      etape:  e,
    })),
    { statut: "paye", label: "Payé", profil: null },
  ];

  const currentIdx     = steps.findIndex(s => s.statut === statut);
  const isAfterLast    = !!(lastStep && statut === lastStep.statut_apres);
  const currentEtape   = etapesSorted.find(e => e.statut_avant === statut);
  const isTerminal     = statut === "paye" || statut === "rejete";

  const userRole    = currentUser?.role?.designation?.toLowerCase() ?? "";
  const isAdmin     = userRole === "admin";
  const canValidate = isAdmin || !currentEtape || userRole === currentEtape.profil_code?.toLowerCase();

  const findVal = (profil) => validations.find(v => v.profil_code === profil && v.action === "valide");
  const soumisVal = validations.find(v => v.action === "soumis");

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Circuit de validation</p>

      {statut === "rejete" ? (
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
          <XCircle size={16} /> Rejeté
          {decompte?.motif_rejet && (
            <span className="ml-2 text-xs font-normal text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
              {decompte.motif_rejet}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-0">
          {steps.map((step, idx) => {
            const done    = idx < currentIdx;
            const current = idx === currentIdx;
            const val     = step.profil ? findVal(step.profil)
                          : step.statut === "soumis" ? soumisVal
                          : null;
            return (
              <div key={step.statut} className="flex-1 flex flex-col items-center">
                <div className="flex items-center w-full">
                  <div className={`flex-1 h-0.5 ${idx === 0 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors
                    ${done    ? "bg-[#087F3E] border-[#087F3E] text-white"
                    : current ? "bg-white border-[#087F3E] text-[#087F3E]"
                    :           "bg-white border-gray-200 text-gray-300"}`}>
                    {done    ? <CheckCircle2 size={16} />
                    : current ? <Clock size={14} />
                    :           <Circle size={14} />}
                  </div>
                  <div className={`flex-1 h-0.5 ${idx === steps.length - 1 ? "opacity-0" : done ? "bg-[#087F3E]" : "bg-gray-200"}`} />
                </div>
                <div className="mt-2 text-center px-1 w-full">
                  <p className={`text-xs font-semibold ${done ? "text-[#087F3E]" : current ? "text-gray-900" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  {val ? (
                    <>
                      <p className="text-[10px] text-[#087F3E] mt-0.5">{fmtDate(val.validated_at)}</p>
                      {val.user && (
                        <p className="text-[10px] text-gray-500 truncate">{val.user.prenom} {val.user.nom}</p>
                      )}
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

      {/* Action zone */}
      {!isTerminal && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {statut === "brouillon" && (
            <button onClick={onSoumettre}
              className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors">
              Soumettre au circuit
            </button>
          )}

          {statut !== "brouillon" && !isAfterLast && (
            <>
              <p className="text-xs text-gray-500">
                En attente de validation par{" "}
                <strong className="text-gray-700">
                  {currentEtape?.profil_code?.toUpperCase() ?? "un validateur"}
                </strong>
              </p>
              {!canValidate && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Vous n'avez pas le profil requis pour valider cette étape.
                </p>
              )}
              {canValidate && !showRejet && (
                <div className="flex gap-3">
                  <button onClick={onValider}
                    className="px-4 py-2 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium transition-colors">
                    Valider — {currentEtape?.profil_code?.toUpperCase() ?? ""}
                  </button>
                  <button onClick={() => setShowRejet(true)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Rejeter
                  </button>
                </div>
              )}
              {canValidate && showRejet && (
                <div className="flex gap-2 flex-wrap">
                  <input autoFocus placeholder="Motif du rejet (obligatoire)…" value={motifRejet}
                    onChange={e => setMotifRejet(e.target.value)}
                    className="flex-1 min-w-[240px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none" />
                  <button onClick={() => { onRejeter(motifRejet); setShowRejet(false); setMotifRejet(""); }}
                    disabled={!motifRejet.trim()}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                    Confirmer le rejet
                  </button>
                  <button onClick={() => { setShowRejet(false); setMotifRejet(""); }}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 rounded-lg">
                    Annuler
                  </button>
                </div>
              )}
            </>
          )}

          {isAfterLast && (
            <div className="flex items-center gap-3">
              <button onClick={onPayer}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors">
                Marquer comme payé
              </button>
            </div>
          )}
        </div>
      )}

      {statut === "paye" && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-[#087F3E] font-medium">✓ Décompte payé</p>
        </div>
      )}
    </div>
  );
}

// ─── Finance row ─────────────────────────────────────────────────
function FinRow({ label, amount, accent, muted, bold }) {
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

// ─── Field ───────────────────────────────────────────────────────
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

function Input({ value, onChange, type = "number", placeholder, disabled, min, step }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      step={step}
      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none disabled:bg-gray-50 disabled:text-gray-500 transition-all"
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────
export default function DecompteFormPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const isNew      = !id || id === "nouveau";
  const { addToast } = useToast();

  const [form, setForm] = useState({
    etat_cession_id:         params.get("etat_cession_id") ?? "",
    taux_retenue_garantie:   5,
    montant_avances_deduites: 0,
    montant_penalites:        0,
    taux_tva:                18,
    date_echeance:            "",
    observations:             "",
  });

  // Remote
  const { data: decompte, isLoading, isError } = useDecompte(!isNew ? id : null);
  const { data: circuit = [] }       = useDecompteCircuit();
  const { data: parametresData }     = useParametresPaginated({ count: 100 });
  const { data: eCessionsData }      = useEtatsCessionPaginated({ statut: "valide", count: 200 });
  const saveMut    = useSaveDecompte();
  const validerMut = useValiderDecompte();
  const rejeterMut = useRejeterDecompte();
  const payerMut   = usePayerDecompte();
  const releveMut  = useSaveReleve();

  // Populate form (edit brouillon)
  useEffect(() => {
    if (decompte) {
      const findParam = (cle, fallback) => {
        const p = parametresData?.data?.find(p => p.cle === cle);
        return p ? parseFloat(p.valeur) : fallback;
      };
      setForm({
        etat_cession_id:          decompte.etat_cession_id ?? "",
        taux_retenue_garantie:    decompte.taux_retenue_garantie ?? findParam('taux_retenue_garantie', 5),
        montant_avances_deduites: decompte.montant_avances_deduites ?? 0,
        montant_penalites:        decompte.montant_penalites ?? 0,
        taux_tva:                 decompte.taux_tva ?? findParam('taux_tva', 18),
        date_echeance:            decompte.date_echeance?.slice(0, 10) ?? "",
        observations:             decompte.observations ?? "",
      });
    }
  }, [decompte, parametresData]);

  // Initialise les taux depuis parametres pour un nouveau décompte
  useEffect(() => {
    if (!isNew || !parametresData?.data) return;
    const findParam = (cle, fallback) => {
      const p = parametresData.data.find(p => p.cle === cle);
      return p ? parseFloat(p.valeur) : fallback;
    };
    setForm(f => ({
      ...f,
      taux_retenue_garantie: findParam('taux_retenue_garantie', f.taux_retenue_garantie),
      taux_tva:              findParam('taux_tva',              f.taux_tva),
    }));
  }, [parametresData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live computation (create mode only) ────────────────────────
  const brut      = parseFloat(decompte?.etat_cession?.montant_total ?? 0);
  const tauxRg    = parseFloat(form.taux_retenue_garantie) || 0;
  const avances   = parseFloat(form.montant_avances_deduites) || 0;
  const penalites = parseFloat(form.montant_penalites) || 0;
  const tauxTva   = parseFloat(form.taux_tva) || 0;
  const rg  = Math.round(brut * tauxRg / 100 * 100) / 100;
  const ht  = Math.round((brut - rg - avances - penalites) * 100) / 100;
  const tva = Math.round(ht * tauxTva / 100 * 100) / 100;
  const ttc = Math.round((ht + tva) * 100) / 100;

  // ── Actions ────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.etat_cession_id) {
      addToast("L'état de cession est requis.", "error");
      return;
    }

    const tauxRgVal    = parseFloat(form.taux_retenue_garantie) || 0;
    const tauxTvaVal   = parseFloat(form.taux_tva) || 0;
    const avancesVal   = parseFloat(form.montant_avances_deduites) || 0;
    const penalitesVal = parseFloat(form.montant_penalites) || 0;
    const selectedEC   = eCessionsData?.data?.find(e => String(e.id) === String(form.etat_cession_id));
    const brutVal      = isNew ? (parseFloat(selectedEC?.montant_total) || 0) : (parseFloat(decompte?.montant_brut) || 0);

    // Avances + pénalités ≥ montant brut → net HT négatif → bloquant
    if (brutVal > 0 && (avancesVal + penalitesVal) >= brutVal) {
      addToast(
        `Les avances déduites (${new Intl.NumberFormat("fr-FR").format(avancesVal)} FCFA) et pénalités (${new Intl.NumberFormat("fr-FR").format(penalitesVal)} FCFA) dépassent le montant brut — le net HT serait négatif.`,
        "error"
      );
      return;
    }

    // Retenue de garantie hors norme (5%–10%) → avertissement non bloquant
    if (tauxRgVal < 5 || tauxRgVal > 10) {
      addToast(
        `Retenue de garantie à ${tauxRgVal}% : la norme est entre 5% et 10%. Vérifiez avant de valider.`,
        "warning"
      );
    }

    // TVA différente de 18% → avertissement non bloquant
    if (tauxTvaVal !== 18) {
      addToast(
        `TVA à ${tauxTvaVal}% : le taux standard au Sénégal est 18%. Vérifiez si ce taux est intentionnel.`,
        "warning"
      );
    }

    const payload = {
      etat_cession_id:          parseInt(form.etat_cession_id, 10),
      taux_retenue_garantie:    parseFloat(form.taux_retenue_garantie),
      montant_avances_deduites: parseFloat(form.montant_avances_deduites) || 0,
      montant_penalites:        parseFloat(form.montant_penalites) || 0,
      taux_tva:                 parseFloat(form.taux_tva),
      date_echeance:            form.date_echeance || null,
      observations:             form.observations  || null,
    };
    if (!isNew) payload.id = parseInt(id, 10);
    try {
      const res = await saveMut.mutateAsync(payload);
      addToast(isNew ? "Décompte créé." : "Décompte mis à jour.", "success");
      if (isNew && res?.data?.id) navigate(`/decomptes/${res.data.id}`, { replace: true });
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleValider() {
    try {
      await validerMut.mutateAsync(parseInt(id, 10));
      addToast("Décompte avancé dans le circuit.", "success");
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  async function handleRejeter(motif) {
    try {
      await rejeterMut.mutateAsync({ id: parseInt(id, 10), motif });
      addToast("Décompte rejeté.", "success");
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  async function handlePayer() {
    try {
      await payerMut.mutateAsync(parseInt(id, 10));
      addToast("Décompte marqué comme payé.", "success");
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  // ── Loading / error ────────────────────────────────────────────
  if (!isNew && isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  }
  if (!isNew && (isError || !decompte)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Décompte introuvable</p>
        <button onClick={() => navigate("/decomptes")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const canEdit = isNew || decompte?.statut === "brouillon";
  const d = decompte;

  // Contrôle date d'échéance : alerte si dans le passé
  const echeancePastWarning = form.date_echeance && form.date_echeance < new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/decomptes")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Décomptes
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{isNew ? "Nouveau décompte" : d.code}</span>
      </div>

      <PageHeader
        title={isNew ? "Nouveau décompte" : d.code}
        subtitle={isNew ? "Remplir les paramètres du décompte" :
          [d.contrat?.code, d.contrat?.soustraitant?.raison_sociale].filter(Boolean).join(" · ")}
        action={!isNew && (
          <div className="flex items-center gap-2">
            <StatusBadge statut={d.statut} />
            <button
              onClick={() => {
                const token = localStorage.getItem("stt_token");
                window.open(`${import.meta.env.VITE_API_BASE}/api/pdf/decompte/${id}?token=${token}`, "_blank");
              }}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <FileDown size={14} /> PDF
            </button>
          </div>
        )}
      />

      {/* Circuit stepper intégré */}
      {!isNew && (
        <>
          <CircuitStepper
            decompte={d}
            circuit={circuit}
            onValider={handleValider}
            onRejeter={handleRejeter}
            onPayer={handlePayer}
            onSoumettre={handleValider}
          />
          {d.statut === "paye" && (
            <div className="flex">
              <button onClick={async () => {
                try {
                  const res = await releveMut.mutateAsync({
                    contrat_id:  parseInt(d.contrat_id, 10),
                    decompte_id: parseInt(id, 10),
                  });
                  addToast("Relevé de compte généré.", "success");
                  if (res?.data?.id) navigate(`/releves/${res.data.id}`);
                } catch (err) {
                  addToast(err.response?.data?.errors?.[0] ?? "Erreur génération relevé.", "error");
                }
              }} disabled={releveMut.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {releveMut.isPending ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                Générer un relevé
              </button>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Paramètres */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paramètres du décompte</h3>

          {isNew && (
            <Field label="État de cession" required>
              {(() => {
                const eCessions = eCessionsData?.data ?? [];
                const selected  = eCessions.find(e => String(e.id) === String(form.etat_cession_id));
                const fmt = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));
                return (
                  <>
                    <select
                      value={form.etat_cession_id}
                      onChange={e => setForm(f => ({ ...f, etat_cession_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none bg-white"
                    >
                      <option value="">— Sélectionner un état de cession validé —</option>
                      {eCessions.map(ec => (
                        <option key={ec.id} value={ec.id}>
                          {ec.code} · {ec.contrat?.soustraitant?.raison_sociale ?? "?"} · {fmt(ec.montant_total)} FCFA
                        </option>
                      ))}
                    </select>
                    {selected && (
                      <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600 space-y-1">
                        <p><span className="font-medium">Contrat :</span> {selected.contrat?.code ?? "—"}</p>
                        <p><span className="font-medium">Sous-traitant :</span> {selected.contrat?.soustraitant?.raison_sociale ?? "—"}</p>
                        <p><span className="font-medium">Montant brut :</span> {fmt(selected.montant_total)} FCFA</p>
                      </div>
                    )}
                    {eCessions.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Aucun état de cession validé disponible. Validez d'abord un état de cession.</p>
                    )}
                  </>
                );
              })()}
            </Field>
          )}

          {!isNew && d.etat_cession && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400">État de cession</p>
              <p className="text-sm font-semibold text-gray-800">{d.etat_cession.code}</p>
              {d.contrat && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Contrat <Link to={`/contrats/${d.contrat_id}`} className="text-[#087F3E] hover:underline">{d.contrat.code}</Link>
                  {" — "}{d.contrat.objet}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <Field label="Taux retenue de garantie (%)">
              <Input value={form.taux_retenue_garantie} onChange={v => setForm(f => ({ ...f, taux_retenue_garantie: v }))}
                placeholder="5" min={0} step={0.5} disabled={!canEdit} />
            </Field>
            <Field label="Taux TVA (%)">
              <Input value={form.taux_tva} onChange={v => setForm(f => ({ ...f, taux_tva: v }))}
                placeholder="18" min={0} step={0.5} disabled={!canEdit} />
            </Field>
            <Field label="Avances déduites (FCFA)">
              <Input value={form.montant_avances_deduites} onChange={v => setForm(f => ({ ...f, montant_avances_deduites: v }))}
                placeholder="0" min={0} disabled={!canEdit} />
            </Field>
            <Field label="Pénalités (FCFA)">
              <Input value={form.montant_penalites} onChange={v => setForm(f => ({ ...f, montant_penalites: v }))}
                placeholder="0" min={0} disabled={!canEdit} />
            </Field>
            <Field label="Date d'échéance">
              {canEdit ? (
                <>
                  <input type="date" value={form.date_echeance}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setForm(f => ({ ...f, date_echeance: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none transition-all" />
                  {echeancePastWarning && (
                    <p className="text-xs text-amber-600 mt-1">⚠ Cette date est dans le passé.</p>
                  )}
                </>
              ) : (
                <div className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-700">
                  {form.date_echeance ? new Date(form.date_echeance).toLocaleDateString("fr-FR") : "—"}
                </div>
              )}
            </Field>
          </div>

          <Field label="Observations">
            <textarea rows={3} value={form.observations}
              onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
              disabled={!canEdit}
              placeholder="Notes ou observations…"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none resize-none disabled:bg-gray-50 transition-all" />
          </Field>

          {canEdit && (
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saveMut.isPending}
                className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60 transition-colors">
                {saveMut.isPending
                  ? <><Loader2 size={15} className="animate-spin" /> Enregistrement…</>
                  : <><Save size={15} /> {isNew ? "Créer le décompte" : "Enregistrer"}</>}
              </button>
            </div>
          )}
        </div>

        {/* Right: Récapitulatif financier */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Récapitulatif financier</h3>
          {!isNew ? (
            <div className="space-y-0.5">
              <FinRow label="Montant brut"              amount={d.montant_brut} />
              <FinRow label={`Retenue garantie (${d.taux_retenue_garantie}%)`} amount={-d.montant_retenue_garantie} muted />
              <FinRow label="Avances déduites"          amount={-d.montant_avances_deduites} muted />
              <FinRow label="Pénalités"                 amount={-d.montant_penalites} muted />
              <FinRow label="Net HT"                    amount={d.montant_ht} accent bold />
              <FinRow label={`TVA (${d.taux_tva}%)`}   amount={d.montant_tva} muted />
              <FinRow label="Montant TTC"               amount={d.montant_ttc} bold />
            </div>
          ) : (
            <div className="space-y-0.5 text-gray-400 text-sm">
              <FinRow label={`Retenue garantie (${tauxRg}%)`} amount={-rg} muted />
              <FinRow label="Avances déduites"          amount={-avances} muted />
              <FinRow label="Pénalités"                 amount={-penalites} muted />
              <FinRow label="Net HT (estimé)"          amount={ht} accent bold />
              <FinRow label={`TVA (${tauxTva}%)`}      amount={tva} muted />
              <FinRow label="TTC (estimé)"              amount={ttc} bold />
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 mt-2">
                Le montant brut est repris de l'état de cession.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
