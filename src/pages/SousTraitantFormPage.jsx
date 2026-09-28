import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Phone, Mail, MapPin, Building2, Hash,
  AlertTriangle, Globe, FileText, Calendar, ExternalLink,
  Pencil, X, Save, Loader2, Trash2, ShieldOff, ShieldCheck,
} from "lucide-react";
import { useSousTraitant, useSaveSousTraitant, useSousTraitantStatut, useDeleteSousTraitant } from "../hooks/useSousTraitants";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";
import Tabs from "../components/Tabs";
import { SkeletonCard } from "../components/Skeleton";

const FORMES = ["SARL", "SA", "SUARL", "GIE", "Entreprise individuelle", "Autre"];

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]";

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-[#087F3E] hover:underline mt-0.5 block truncate">{value}</a>
        ) : (
          <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function TabContrats({ sttId }) {
  const navigate = useNavigate();
  const { data, isLoading } = useContratsPaginated({ soustraitant_id: Number(sttId), count: 100 });
  const contrats = data?.data ?? [];
  return (
    <div className="border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Code", "Chantier", "Objet", "Montant HT", "Statut", ""].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Montant HT" ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>}
          {!isLoading && contrats.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun contrat pour ce sous-traitant</td></tr>}
          {contrats.map(c => (
            <tr key={c.id} onClick={() => navigate(`/contrats/${c.id}`)} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs text-[#087F3E] font-semibold">{c.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{c.chantier?.designation ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{c.objet ?? "—"}</td>
              <td className="px-4 py-3 text-right"><MoneyDisplay amount={c.montant_actuel ?? 0} variant="small" className="font-semibold" /></td>
              <td className="px-4 py-3"><StatusBadge statut={c.statut} /></td>
              <td className="px-4 py-3"><ExternalLink size={14} className="text-gray-400 hover:text-[#087F3E]" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabDecomptes({ sttId }) {
  const navigate = useNavigate();
  const { data: contratsData } = useContratsPaginated({ soustraitant_id: Number(sttId), count: 100 });
  const firstContratId = (contratsData?.data ?? [])[0]?.id ?? null;
  const { data, isLoading } = useDecomptesPaginated({ contrat_id: firstContratId, count: 50 });
  const decomptes = firstContratId ? (data?.data ?? []) : [];
  const fmtPeriode = d => {
    const ec = d.etat_cession;
    if (!ec?.periode_debut) return "—";
    return new Date(ec.periode_debut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  };
  return (
    <div className="border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Code", "Contrat", "Période", "Net HT", "Statut"].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Net HT" ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>}
          {!isLoading && decomptes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun décompte pour ce sous-traitant</td></tr>}
          {decomptes.map(d => (
            <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3 font-mono text-xs text-[#087F3E] font-semibold">{d.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700 font-mono">{d.contrat?.code ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{fmtPeriode(d)}</td>
              <td className="px-4 py-3 text-right"><MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="font-semibold" /></td>
              <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SousTraitantFormPage() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { addToast }  = useToast();

  const [activeTab,        setActiveTab]        = useState("info");
  const [isEditing,        setIsEditing]        = useState(false);
  const [form,             setForm]             = useState({});
  const [errors,           setErrors]           = useState({});
  const [confirmBlacklist, setConfirmBlacklist] = useState(false);
  const [motifBl,          setMotifBl]          = useState("");
  const [confirmDelete,    setConfirmDelete]    = useState(false);

  const { data: stt, isLoading, isError } = useSousTraitant(id);
  const saveMut   = useSaveSousTraitant();
  const statutMut = useSousTraitantStatut();
  const deleteMut = useDeleteSousTraitant();

  useEffect(() => {
    if (stt && isEditing) {
      setForm({
        raison_sociale:    stt.raison_sociale    ?? "",
        forme_juridique:   stt.forme_juridique   ?? "",
        ninea:             stt.ninea             ?? "",
        registre_commerce: stt.registre_commerce ?? "",
        adresse:           stt.adresse           ?? "",
        ville:             stt.ville             ?? "",
        telephone:         stt.telephone         ?? "",
        email:             stt.email             ?? "",
        site_web:          stt.site_web          ?? "",
        contact_nom:       stt.contact_nom       ?? "",
        contact_telephone: stt.contact_telephone ?? "",
        contact_email:     stt.contact_email     ?? "",
        specialites:       stt.specialites       ?? "",
        code_x3:           stt.code_x3           ?? "",
      });
      setErrors({});
    }
  }, [isEditing, stt]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); }

  async function handleSave() {
    const errs = {};
    if (!form.raison_sociale?.trim()) errs.raison_sociale = "Requis";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      await saveMut.mutateAsync({
        id: parseInt(id, 10),
        raison_sociale:    form.raison_sociale.trim(),
        forme_juridique:   form.forme_juridique   || null,
        ninea:             form.ninea             || null,
        registre_commerce: form.registre_commerce || null,
        adresse:           form.adresse           || null,
        ville:             form.ville             || null,
        telephone:         form.telephone         || null,
        email:             form.email             || null,
        site_web:          form.site_web          || null,
        contact_nom:       form.contact_nom       || null,
        contact_telephone: form.contact_telephone || null,
        contact_email:     form.contact_email     || null,
        specialites:       form.specialites       || null,
        code_x3:           form.code_x3           || null,
      });
      addToast("Sous-traitant mis à jour.", "success");
      setIsEditing(false);
    } catch (err) {
      addToast(err?.response?.data?.error ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleBlacklist() {
    if (!motifBl.trim()) return;
    try {
      await statutMut.mutateAsync({ id: parseInt(id, 10), statut: "blackliste", motif: motifBl.trim() });
      addToast("Sous-traitant blacklisté.", "success");
      setConfirmBlacklist(false);
      setMotifBl("");
    } catch (err) {
      addToast(err?.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleReactiver() {
    try {
      await statutMut.mutateAsync({ id: parseInt(id, 10), statut: "actif" });
      addToast("Sous-traitant réactivé.", "success");
    } catch (err) {
      addToast(err?.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleDelete() {
    try {
      await deleteMut.mutateAsync(parseInt(id, 10));
      addToast("Sous-traitant supprimé.", "success");
      navigate("/sous-traitants");
    } catch (err) {
      addToast(err?.response?.data?.error ?? "Erreur lors de la suppression.", "error");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (isError || !stt) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Sous-traitant introuvable</p>
        <button onClick={() => navigate("/sous-traitants")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const isBlackliste = stt.statut === "blackliste";

  const tabs = [
    { id: "info",      label: "Informations", icon: Building2 },
    { id: "contrats",  label: "Contrats",     icon: Hash },
    { id: "decomptes", label: "Décomptes",    icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/sous-traitants")}
          className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Sous-traitants
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{stt.raison_sociale}</span>
      </div>

      <PageHeader
        title={stt.raison_sociale}
        subtitle={[stt.forme_juridique, stt.specialites].filter(Boolean).join(" · ")}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge statut={stt.statut} />
            {!isEditing && (
              <button onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <Pencil size={13} /> Modifier
              </button>
            )}
            {isBlackliste ? (
              <button onClick={handleReactiver} disabled={statutMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-60">
                <ShieldCheck size={13} /> Réactiver
              </button>
            ) : (
              <button onClick={() => setConfirmBlacklist(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                <ShieldOff size={13} /> Blacklister
              </button>
            )}
            <button onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={13} /> Supprimer
            </button>
          </div>
        }
      />

      {/* Blacklist alert */}
      {isBlackliste && stt.motif_blacklist && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Motif de blacklistage</p>
            <p className="mt-0.5 text-red-600">{stt.motif_blacklist}</p>
          </div>
        </div>
      )}

      {/* Code badge */}
      {stt.code && (
        <div className="inline-flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 font-mono">
          <Hash size={12} /> {stt.code}
          {stt.code_x3 && <><span className="text-gray-300">·</span> X3 : {stt.code_x3}</>}
        </div>
      )}

      {/* Tabs + content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={t => { setActiveTab(t); if (isEditing) setIsEditing(false); }} />
        </div>

        <div className="p-6">

          {/* ── Info tab : read or edit ── */}
          {activeTab === "info" && !isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Section title="Identité légale">
                <InfoRow icon={Hash}      label="NINEA"               value={stt.ninea} />
                <InfoRow icon={FileText}  label="Registre de commerce" value={stt.registre_commerce} />
                <InfoRow icon={Building2} label="Forme juridique"     value={stt.forme_juridique} />
                <InfoRow icon={Hash}      label="Spécialités"         value={stt.specialites} />
                {stt.code_x3 && <InfoRow icon={Hash} label="Code X3"  value={stt.code_x3} />}
              </Section>

              <Section title="Coordonnées">
                <InfoRow icon={MapPin} label="Adresse"  value={stt.adresse} />
                <InfoRow icon={MapPin} label="Ville"    value={stt.ville} />
                <InfoRow icon={Phone}  label="Tél."     value={stt.telephone} href={stt.telephone ? `tel:${stt.telephone}` : null} />
                <InfoRow icon={Mail}   label="Email"    value={stt.email}    href={stt.email ? `mailto:${stt.email}` : null} />
                <InfoRow icon={Globe}  label="Site web" value={stt.site_web} href={stt.site_web} />
              </Section>

              <Section title="Représentant / Contact principal">
                {!stt.contact_nom && !stt.contact_telephone && !stt.contact_email ? (
                  <p className="text-xs text-gray-400 italic">Aucun contact renseigné —
                    <button onClick={() => setIsEditing(true)} className="ml-1 text-[#087F3E] hover:underline">Ajouter</button>
                  </p>
                ) : (
                  <>
                    <InfoRow icon={Building2} label="Nom / Représentant" value={stt.contact_nom} />
                    <InfoRow icon={Phone}     label="Tél. direct"        value={stt.contact_telephone} href={stt.contact_telephone ? `tel:${stt.contact_telephone}` : null} />
                    <InfoRow icon={Mail}      label="Email direct"       value={stt.contact_email}    href={stt.contact_email ? `mailto:${stt.contact_email}` : null} />
                  </>
                )}
              </Section>
            </div>
          )}

          {/* ── Info tab : edit form ── */}
          {activeTab === "info" && isEditing && (
            <div className="space-y-6 max-w-3xl">

              {/* Identité */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identité légale</p>
                <Field label="Raison sociale" required error={errors.raison_sociale}>
                  <input value={form.raison_sociale ?? ""} onChange={e => set("raison_sociale", e.target.value)}
                    className={`${INPUT} ${errors.raison_sociale ? "border-red-400" : ""}`}
                    placeholder="Nom de l'entreprise" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Forme juridique">
                    <select value={form.forme_juridique ?? ""} onChange={e => set("forme_juridique", e.target.value)} className={INPUT}>
                      <option value="">— Sélectionner —</option>
                      {FORMES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                  <Field label="Spécialités">
                    <input value={form.specialites ?? ""} onChange={e => set("specialites", e.target.value)}
                      className={INPUT} placeholder="Génie civil, électricité…" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="NINEA" error={errors.ninea}>
                    <input value={form.ninea ?? ""} onChange={e => set("ninea", e.target.value)}
                      className={`${INPUT} ${errors.ninea ? "border-red-400" : ""}`} placeholder="Numéro NINEA" />
                  </Field>
                  <Field label="Registre de commerce" error={errors.registre_commerce}>
                    <input value={form.registre_commerce ?? ""} onChange={e => set("registre_commerce", e.target.value)}
                      className={`${INPUT} ${errors.registre_commerce ? "border-red-400" : ""}`} placeholder="RC / RCCM" />
                  </Field>
                </div>
                <Field label="Code X3">
                  <input value={form.code_x3 ?? ""} onChange={e => set("code_x3", e.target.value)}
                    className={INPUT} placeholder="Code X3 (optionnel)" />
                </Field>
              </div>

              {/* Coordonnées */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Coordonnées</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ville">
                    <input value={form.ville ?? ""} onChange={e => set("ville", e.target.value)} className={INPUT} placeholder="Dakar…" />
                  </Field>
                  <Field label="Téléphone">
                    <input value={form.telephone ?? ""} onChange={e => set("telephone", e.target.value)} className={INPUT} placeholder="+221…" />
                  </Field>
                </div>
                <Field label="Adresse">
                  <input value={form.adresse ?? ""} onChange={e => set("adresse", e.target.value)} className={INPUT} placeholder="Rue, quartier…" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email société" error={errors.email}>
                    <input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)}
                      className={`${INPUT} ${errors.email ? "border-red-400" : ""}`} placeholder="contact@entreprise.sn" />
                  </Field>
                  <Field label="Site web">
                    <input value={form.site_web ?? ""} onChange={e => set("site_web", e.target.value)}
                      className={INPUT} placeholder="https://…" />
                  </Field>
                </div>
              </div>

              {/* Représentant */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Représentant / Contact principal</p>
                <Field label="Nom du représentant">
                  <input value={form.contact_nom ?? ""} onChange={e => set("contact_nom", e.target.value)}
                    className={INPUT} placeholder="Prénom Nom, titre…" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tél. direct">
                    <input value={form.contact_telephone ?? ""} onChange={e => set("contact_telephone", e.target.value)}
                      className={INPUT} placeholder="+221…" />
                  </Field>
                  <Field label="Email direct" error={errors.contact_email}>
                    <input type="email" value={form.contact_email ?? ""} onChange={e => set("contact_email", e.target.value)}
                      className={`${INPUT} ${errors.contact_email ? "border-red-400" : ""}`} placeholder="rep@entreprise.sn" />
                  </Field>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <X size={14} /> Annuler
                </button>
                <button onClick={handleSave} disabled={saveMut.isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60">
                  {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {activeTab === "contrats"  && <TabContrats  sttId={id} />}
          {activeTab === "decomptes" && <TabDecomptes sttId={id} />}
        </div>
      </div>

      {/* ── Modal blacklist ── */}
      {confirmBlacklist && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <ShieldOff size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Blacklister le sous-traitant</p>
                <p className="text-xs text-gray-500">{stt.raison_sociale}</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Motif <span className="text-red-500">*</span></label>
              <textarea value={motifBl} onChange={e => setMotifBl(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
                placeholder="Raison du blacklistage…" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setConfirmBlacklist(false); setMotifBl(""); }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleBlacklist} disabled={!motifBl.trim() || statutMut.isPending}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {statutMut.isPending && <Loader2 size={13} className="animate-spin" />}
                Blacklister
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Supprimer le sous-traitant</p>
                <p className="text-xs text-gray-500">{stt.raison_sociale}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Cette action est irréversible. Le sous-traitant sera supprimé définitivement (soft-delete).</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteMut.isPending && <Loader2 size={13} className="animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
