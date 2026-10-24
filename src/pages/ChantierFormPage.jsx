import { useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, ChevronDown, Calendar, MapPin, FileText, Hash,
  ExternalLink, RefreshCw, Info, Users, Wrench, Package, Truck, Layers, Building2, Loader2, Upload, Download,
  UserCheck, History, Save, X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import http from "../services/http";
import { useSynchroniserChantier } from "../hooks/useX3Sync";
import BaremePrixTable from "../components/BaremePrixTable";
import { useBaremeChantier, useBaremeChantierActions, useRefreshBareme } from "../hooks/useBaremeHierarchie";
import { baremeHierarchieService } from "../services/baremeHierarchieService";
import ImportBaremeDialog from "../components/ImportBaremeDialog";
import { telechargerModeleBareme } from "../utils/baremeModele";
import { useChantier } from "../hooks/useChantiers";
import { useContratsPaginated } from "../hooks/useContrats";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useUsersPaginated } from "../hooks/useUsers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import { usePeutFaire } from "../hooks/useParametres";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Tabs from "../components/Tabs";
import MoneyDisplay from "../components/MoneyDisplay";
import { SkeletonCard } from "../components/Skeleton";
import SearchSelect from "../components/SearchSelect";
import { fmtNum } from "../utils/formatters";

const fmt = n => n == null ? "—" : fmtNum(Math.round(n)) + " FCFA";
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// ─── Circuit terrain card ────────────────────────────────────────────────────
function RoleCard({ badge, role, level, nom, color }) {
  const colors = {
    amber: { wrap: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800 border-amber-300" },
    green: { wrap: "bg-[#E8F5EE] border-[#b5ddc8]", badge: "bg-[#d4edd9] text-[#065A2C] border-[#b5ddc8]" },
  };
  const c = colors[color] ?? colors.amber;
  if (!nom) return null;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${c.wrap}`}>
      <div className={`flex-shrink-0 px-2 py-1 rounded border text-xs font-bold ${c.badge}`}>{badge}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{role} — {level}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{nom}</p>
      </div>
    </div>
  );
}

// ─── Budget par famille ──────────────────────────────────────────────────────
function BudgetFamille({ icon: Icon, label, depense, budget, color }) {
  const pct = budget > 0 ? Math.round((depense / budget) * 100) : 0;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-700">{label}</span>
          <span className="text-xs font-semibold text-gray-500">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{fmt(depense)} engagé</span>
          <span>{fmt(budget)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Contrats ────────────────────────────────────────────────────────────
const STATUT_OPTIONS = [
  { value: "",          label: "Tous les statuts" },
  { value: "actif",     label: "En cours" },
  { value: "brouillon", label: "Brouillon" },
  { value: "suspendu",  label: "Suspendu" },
  { value: "resilie",   label: "Résilié" },
  { value: "termine",   label: "Terminé" },
  { value: "cloture",   label: "Clôturé" },
];

function TabContrats({ chantierId }) {
  const navigate = useNavigate();
  const [statut, setStatut]     = useState("");
  const [expanded, setExpanded] = useState({});

  const { data, isLoading } = useContratsPaginated({
    chantier_id: Number(chantierId),
    statut:      statut || undefined,
    count:       100,
  });

  const contrats = data?.data ?? [];

  function toggle(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchSelect value={statut} onChange={e => setStatut(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]">
          {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </SearchSelect>
        <span className="text-xs text-gray-400">{contrats.length} contrat(s)</span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-8 px-3 py-3" />
              {["Code", "Sous-traitant", "Objet", "Montant HT", "Statut"].map(h => (
                <th key={h} className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Montant HT" ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>
            )}
            {!isLoading && contrats.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun contrat pour ce chantier</td></tr>
            )}
            {contrats.map(c => {
              const hasAvenant = c.avenants?.length > 0;
              const isOpen     = expanded[c.id];
              return (
                <Fragment key={c.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-center">
                      {hasAvenant && (
                        <button onClick={() => toggle(c.id)} className="text-gray-400 hover:text-gray-700">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[#087F3E] font-semibold whitespace-nowrap">{c.code}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{c.soustraitant?.raison_sociale ?? "—"}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[200px] truncate">{c.objet ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <MoneyDisplay amount={c.montant_actuel ?? c.montant_initial ?? 0} className="text-sm font-semibold text-gray-900" />
                    </td>
                    <td className="px-3 py-3"><StatusBadge statut={c.statut} /></td>
                    <td className="px-3 py-3">
                      <button onClick={() => navigate(`/contrats/${c.id}`)} className="text-gray-400 hover:text-[#087F3E]" title="Ouvrir">
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                  {isOpen && c.avenants?.map(a => (
                    <tr key={a.id} className="bg-violet-50/40 border-t border-violet-100">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2">
                        <span className="text-gray-300 mr-1 text-xs">↳</span>
                        <span className="font-mono text-xs text-violet-600">{a.code}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 italic" colSpan={2}>{a.objet}</td>
                      <td className="px-3 py-2 text-right">
                        <MoneyDisplay amount={a.montant} sign={a.montant >= 0 ? "+" : "-"} variant="small"
                          className={a.montant >= 0 ? "text-[#087F3E]" : "text-red-600"} />
                      </td>
                      <td className="px-3 py-2"><StatusBadge statut={a.statut} /></td>
                      <td className="px-3 py-2" />
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab Décomptes récents ───────────────────────────────────────────────────
function TabDecomptes({ chantierId }) {
  const navigate = useNavigate();
  const { data, isLoading } = useDecomptesPaginated({ chantier_id: Number(chantierId), count: 20 });
  const decomptes = data?.data ?? [];

  const fmtPeriode = dec => {
    const ec = dec.etat_cession;
    if (!ec?.periode_debut) return "—";
    return new Date(ec.periode_debut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Code", "Sous-traitant", "Période", "Net HT", "Statut"].map(h => (
              <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Net HT" ? "text-right" : "text-left"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Chargement…</td></tr>
          )}
          {!isLoading && decomptes.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun décompte pour ce chantier</td></tr>
          )}
          {decomptes.map(d => (
            <tr key={d.id} onClick={() => navigate(`/decomptes/${d.id}`)}
              className="hover:bg-gray-50 cursor-pointer transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-[#087F3E] font-semibold">{d.code}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{d.contrat?.soustraitant?.raison_sociale ?? "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{fmtPeriode(d)}</td>
              <td className="px-4 py-3 text-right">
                <MoneyDisplay amount={d.montant_ht ?? 0} variant="small" className="font-semibold text-gray-800" />
              </td>
              <td className="px-4 py-3"><StatusBadge statut={d.statut} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Onglet Barème du chantier ───────────────────────────────────────────────
function TabBareme({ chantierId }) {
  const { addToast } = useToast();
  const { data, isLoading } = useBaremeChantier(chantierId);
  const { setPrix, reset, valider } = useBaremeChantierActions(chantierId);
  const [busyId, setBusyId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const refreshBareme = useRefreshBareme();
  const err = e => e?.response?.data?.errors?.[0] ?? "Erreur.";

  async function run(id, fn, okMsg) {
    setBusyId(id);
    try { await fn(); if (okMsg) addToast(okMsg, "success"); }
    catch (e) { addToast(err(e), "error"); }
    finally { setBusyId(null); }
  }

  if (isLoading) return <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>;

  const modeleChantier = (data?.lignes ?? []).map(l => ({ code: l.code, designation: l.designation, unite: l.unite, prix: l.prix_effectif, prix_base: l.prix_base, source: l.source }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        Le chantier hérite du barème général. Un prix modifié ici s'applique à tous les contrats de ce chantier qui n'ont pas leur propre écart
        (les contrats déjà actifs gardent leurs prix figés). Un écart proposé par un autre profil que le DACC attend sa validation.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={() => telechargerModeleBareme(modeleChantier, "bareme_chantier", [["Prix de base", "prix_base"], ["Provenance", "source"]])}
          title="Fichier CodeArticle ; Unité ; Prix unitaire, pré-rempli avec les prix appliqués au chantier"
          className="inline-flex items-center gap-1.5 text-sm text-gray-700 font-medium border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          <Download size={14} /> Exporter en Excel
        </button>
        <button onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-1.5 text-sm text-[#087F3E] font-medium border border-[#087F3E]/40 px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE]">
          <Upload size={14} /> Importer un fichier
        </button>
      </div>
      {showImport && (
        <ImportBaremeDialog
          lignesModele={modeleChantier}
          nomModele="modele_import_bareme_chantier"
          titre="Importer le barème du chantier"
          description="Fichier CSV ou Excel avec les colonnes : CodeArticle, Désignation, Unité, Prix unitaire. Sans code article, l'article est retrouvé par sa désignation. Seuls les écarts par rapport au barème général sont enregistrés : un prix égal à la base rétablit l'héritage. Les articles absents du barème général sont refusés."
          onAnalyser={({ lignes: l }) => baremeHierarchieService.importChantier(chantierId, { lignes: l, appliquer: false })}
          onAppliquer={async ({ lignes: l }) => {
            const r = await baremeHierarchieService.importChantier(chantierId, { lignes: l, appliquer: true });
            refreshBareme();
            return r;
          }}
          onClose={() => setShowImport(false)}
        />
      )}
      <BaremePrixTable
        rows={data?.lignes ?? []}
        level="chantier"
        canValidate={!!data?.peut_valider}
        busyId={busyId}
        onSave={(r, prix) => run(r.bareme_id, () => setPrix.mutateAsync({ baremeId: r.bareme_id, prix }), "Prix du chantier enregistré.")}
        onReset={(r) => run(r.bareme_id, () => reset.mutateAsync(r.bareme_id), "Prix de base rétabli.")}
        onValider={(r) => run(r.bareme_id, () => valider.mutateAsync(r.bareme_id), "Prix validé.")}
      />
    </div>
  );
}

// ─── Section affectation DT / CT ────────────────────────────────────────────
function SectionAffectationDTCT({ chantierId, chantier, isDacc }) {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(null); // "DT" | "CT" | null — pour le modal
  const [form, setForm] = useState({ user_id: "", note: "" });
  const [showHistory, setShowHistory] = useState(false);

  const { data: usersData } = useUsersPaginated({ count: 200 });
  const users = usersData?.data ?? [];
  const dtUsers = users.filter(u => u.role?.designation === "DT");
  const ctUsers = users.filter(u => u.role?.designation === "CT");

  const { data: history } = useQuery({
    queryKey: ["chantier_affectations", chantierId],
    queryFn: () => http.get(`/chantiers/${chantierId}/affectations`).then(r => r.data.data),
  });

  const affecterMut = useMutation({
    mutationFn: (payload) => http.post(`/chantiers/${chantierId}/affecter`, payload).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["chantier", String(chantierId)] });
      qc.invalidateQueries({ queryKey: ["chantier_affectations", chantierId] });
      addToast(`${vars.role} affecté avec succès.`, "success");
      setEditing(null);
      setForm({ user_id: "", note: "" });
    },
    onError: (e) => addToast(e?.response?.data?.error ?? "Erreur lors de l'affectation.", "error"),
  });

  const dtUser  = chantier.dt_user;
  const ctUser  = chantier.ct_user;
  const initials = u => u ? `${(u.prenom ?? "")[0] ?? ""}${(u.nom ?? "")[0] ?? ""}`.toUpperCase() : null;
  const fmtUser  = u => u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() : null;
  const fmtDate  = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const ROLES = [
    { badge: "CT", label: "Conducteur de Travaux", user: ctUser, userList: ctUsers, accent: "amber",
      colors: { avatar: "bg-amber-100 text-amber-700", badge: "bg-amber-100 text-amber-700 border-amber-200", ring: "ring-amber-300", btn: "text-amber-600 hover:bg-amber-50 border-amber-200" } },
    { badge: "DT", label: "Directeur de Travaux",  user: dtUser, userList: dtUsers, accent: "green",
      colors: { avatar: "bg-[#E8F5EE] text-[#087F3E]", badge: "bg-[#E8F5EE] text-[#065A2C] border-[#b5ddc8]", ring: "ring-[#087F3E]", btn: "text-[#087F3E] hover:bg-[#E8F5EE] border-[#b5ddc8]" } },
  ];

  const roleEditing = editing ? ROLES.find(r => r.badge === editing) : null;
  const close = () => { setEditing(null); setForm({ user_id: "", note: "" }); };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Responsables du chantier</h3>
          <p className="text-xs text-gray-400 mt-0.5">DT et CT — valident les décomptes avant le circuit administratif</p>
        </div>
        <button onClick={() => setShowHistory(h => !h)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${showHistory ? "bg-gray-100 text-gray-700 border-gray-200" : "text-gray-400 border-transparent hover:text-gray-600"}`}>
          <History size={13} /> Historique
        </button>
      </div>

      {/* Cards CT + DT */}
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {ROLES.map(({ badge, label, user, colors }) => (
          <div key={badge} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-2 ${colors.avatar} ${user ? colors.ring : "ring-gray-200"}`}>
                {initials(user) ?? <span className="text-gray-300 text-lg">?</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors.badge}`}>{badge}</span>
                  <span className="text-[10px] text-gray-400">{label}</span>
                </div>
                {fmtUser(user)
                  ? <p className="text-sm font-semibold text-gray-800 truncate">{fmtUser(user)}</p>
                  : <p className="text-sm text-gray-400 italic">Non affecté</p>}
              </div>
              {isDacc && (
                <button onClick={() => { setEditing(badge); setForm({ user_id: "", note: "" }); }}
                  className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${colors.btn}`}>
                  <UserCheck size={12} /> {user ? "Changer" : "Affecter"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal affectation */}
      {editing && roleEditing && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* En-tête modal */}
            <div className={`px-6 py-5 border-b border-gray-100 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${roleEditing.colors.avatar}`}>
                {roleEditing.badge}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {fmtUser(roleEditing.user) ? `Changer le ${roleEditing.badge}` : `Affecter un ${roleEditing.badge}`}
                </h3>
                <p className="text-xs text-gray-400">{roleEditing.label}</p>
              </div>
              <button onClick={close} className="ml-auto text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Corps */}
            <div className="px-6 py-5 space-y-4">
              {/* Actuel */}
              {fmtUser(roleEditing.user) && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${roleEditing.colors.avatar}`}>
                    {initials(roleEditing.user)}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Actuel</p>
                    <p className="text-sm font-semibold text-gray-700">{fmtUser(roleEditing.user)}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Nouveau {roleEditing.badge}</label>
                <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 bg-white">
                  <option value="">— Sélectionner un utilisateur —</option>
                  {roleEditing.userList.map(u => (
                    <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Motif <span className="font-normal text-gray-400">(optionnel)</span></label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Ex : remplacement, mutation, fin de mission…"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={close} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
                Annuler
              </button>
              <button onClick={() => affecterMut.mutate({ role: editing, user_id: parseInt(form.user_id), note: form.note || null })}
                disabled={!form.user_id || affecterMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#087F3E] text-white text-sm font-medium rounded-xl hover:bg-[#065A2C] disabled:opacity-50 transition-colors">
                {affecterMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                Confirmer l'affectation
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Historique timeline */}
      {showHistory && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Historique des affectations</div>
          {!history || history.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune affectation enregistrée.</p>
          ) : (
            <ul className="px-5 py-3 space-y-3">
              {history.map((h, i) => (
                <li key={h.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${h.role === "DT" ? "bg-[#E8F5EE] text-[#065A2C]" : "bg-amber-100 text-amber-700"}`}>{h.role}</div>
                    {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-sm font-medium text-gray-800">{h.user?.prenom} {h.user?.nom}</p>
                    {h.note && <p className="text-xs text-gray-500 italic mt-0.5">« {h.note} »</p>}
                    <p className="text-xs text-gray-400 mt-0.5">Par {h.assigned_by?.prenom} {h.assigned_by?.nom} · {fmtDate(h.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section portefeuilles CT ────────────────────────────────────────────────
function SectionPortefeuillesCT({ chantierId, isDacc }) {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ct_user_id: "", soustraitant_id: "" });
  const [confirmDel, setConfirmDel] = useState(null); // { id, name }

  const { data: usersData } = useUsersPaginated({ count: 200 });
  const users    = usersData?.data ?? [];
  const ctUsers  = users.filter(u => u.role?.designation === "CT");

  const { data: sttData } = useSousTraitantsPaginated({ count: 500 });
  const soustraitants = sttData?.data ?? [];

  const { data: portefeuilles, isLoading } = useQuery({
    queryKey: ["ct_portefeuilles", chantierId],
    queryFn: () => http.get(`/chantiers/${chantierId}/ct-portefeuilles`).then(r => r.data.data ?? r.data),
  });

  const closeModal = () => { setShowModal(false); setForm({ ct_user_id: "", soustraitant_id: "" }); };

  const addMut = useMutation({
    mutationFn: (p) => http.post(`/chantiers/${chantierId}/ct-portefeuilles`, p).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ct_portefeuilles", chantierId] });
      addToast("STT ajouté au portefeuille.", "success");
      closeModal();
    },
    onError: (e) => addToast(e?.response?.data?.error ?? "Erreur.", "error"),
  });

  const delMut = useMutation({
    mutationFn: (id) => http.delete(`/chantiers/${chantierId}/ct-portefeuilles/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ct_portefeuilles", chantierId] });
      addToast("STT retiré du portefeuille.", "success");
    },
    onError: (e) => addToast(e?.response?.data?.error ?? "Erreur.", "error"),
  });

  const groups = portefeuilles ?? [];
  const fmtUser = u => u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() : "—";

  const assignedSttIds = new Set(
    groups.flatMap(g => g.portefeuille?.map(p => String(p.soustraitant?.id)) ?? [])
  );
  const availableStt = soustraitants.filter(s => !assignedSttIds.has(String(s.id)));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Portefeuilles CT</h3>
          <p className="text-xs text-gray-400 mt-0.5">Chaque CT est responsable des sous-traitants qui lui sont assignés</p>
        </div>
        {isDacc && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#087F3E] text-[#087F3E] hover:bg-[#E8F5EE] transition-colors">
            <UserCheck size={13} /> Assigner un STT
          </button>
        )}
      </div>

      {/* Liste groupée par CT */}
      <div className="p-5">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">Aucun portefeuille configuré.</p>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <div key={g.ct?.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                    {((g.ct?.prenom ?? "")[0] ?? "") + ((g.ct?.nom ?? "")[0] ?? "")}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{fmtUser(g.ct)}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-300 ml-1">CT</span>
                  <span className="text-xs text-gray-400 ml-auto">{g.portefeuille?.length ?? 0} STT assigné{(g.portefeuille?.length ?? 0) > 1 ? "s" : ""}</span>
                </div>
                {!g.portefeuille?.length ? (
                  <p className="px-4 py-3 text-xs text-gray-400 italic">Aucun sous-traitant assigné</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {g.portefeuille.map(p => (
                      <li key={p.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                        <span className="text-sm text-gray-700">{p.soustraitant?.raison_sociale}</span>
                        {isDacc && (
                          <button onClick={() => setConfirmDel({ id: p.id, name: p.soustraitant?.raison_sociale })} disabled={delMut.isPending}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
                            <X size={13} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal assigner STT */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">CT</div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Assigner un STT à un CT</h3>
                <p className="text-xs text-gray-400">Portefeuille conducteur de travaux</p>
              </div>
              <button onClick={closeModal} className="ml-auto text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Conducteur de Travaux (CT)</label>
                <SearchSelect value={form.ct_user_id} onChange={e => setForm(f => ({ ...f, ct_user_id: e.target.value }))}
                  placeholder="— Sélectionner un CT —"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
                  <option value="">— Sélectionner un CT —</option>
                  {ctUsers.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </SearchSelect>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Sous-traitant</label>
                <SearchSelect value={form.soustraitant_id} onChange={e => setForm(f => ({ ...f, soustraitant_id: e.target.value }))}
                  placeholder="— Sélectionner un STT —"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30">
                  <option value="">— Sélectionner un STT —</option>
                  {availableStt.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
                </SearchSelect>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
                Annuler
              </button>
              <button onClick={() => addMut.mutate({ ct_user_id: parseInt(form.ct_user_id), soustraitant_id: parseInt(form.soustraitant_id) })}
                disabled={!form.ct_user_id || !form.soustraitant_id || addMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#087F3E] text-white text-sm font-medium rounded-xl hover:bg-[#065A2C] disabled:opacity-50 transition-colors">
                {addMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Assigner
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal confirmation suppression */}
      {confirmDel && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDel(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Confirmer la suppression</h3>
              <p className="text-xs text-gray-500 mt-1">
                Retirer <strong>{confirmDel.name}</strong> du portefeuille ?
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
                Annuler
              </button>
              <button onClick={() => { delMut.mutate(confirmDel.id); setConfirmDel(null); }}
                disabled={delMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                {delMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function ChantierFormPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const syncMut = useSynchroniserChantier(id);

  async function handleSync() {
    try {
      const { bilan } = await syncMut.mutateAsync();
      addToast(
        bilan?.mis_a_jour
          ? "Chantier mis à jour depuis Sage X3."
          : "Chantier synchronisé avec Sage X3 : aucune modification.",
        "success"
      );
    } catch (err) {
      addToast(`Sage X3 : ${err?.response?.data?.errors?.[0] ?? err?.message ?? "synchronisation impossible."}`, "error");
    }
  }
  const [activeTab, setActiveTab] = useState("contrats");
  const { currentUser } = useUser();
  const { data: peutAffecterResponsable } = usePeutFaire("affecter_responsable");
  const { data: peutSynchro = false }     = usePeutFaire("synchro_x3");
  const isDacc = peutAffecterResponsable === true;

  const { data: chantier, isLoading, isError } = useChantier(id);
  const { data: contratsData } = useContratsPaginated({ chantier_id: Number(id), count: 200 });
  const contrats = contratsData?.data ?? [];

  const { data: decomptesChantierData } = useDecomptesPaginated({ chantier_id: Number(id), count: 500 });
  const decomptesChantier = decomptesChantierData?.data ?? [];
  const STATUTS_VALIDES   = ["valide_dacc","valide_dexa","valide_dcg","valide_dga","valide_dg","paye"];
  const decomptesVal      = decomptesChantier.filter(d => STATUTS_VALIDES.includes(d.statut));
  const realise           = decomptesVal.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
  const nbRealise         = decomptesVal.length;

  if (isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>;
  }
  if (isError || !chantier) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Chantier introuvable</p>
        <button onClick={() => navigate("/chantiers")} className="mt-4 text-sm text-[#087F3E] hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const dureeJours = chantier.date_debut && chantier.date_fin_prevue
    ? Math.round((new Date(chantier.date_fin_prevue) - new Date(chantier.date_debut)) / 86400000)
    : null;

  // STT engagé : contrats actifs (montant HT + avenants validés), calculé côté serveur
  const sttEngage   = chantier.stt_engage ?? 0;
  const budgetTotal = chantier.budget_total ?? 0;
  const sttPct      = budgetTotal > 0 ? Math.round((sttEngage / budgetTotal) * 100) : 0;

  const familles = [
    { icon: Users,     label: "Personnel / Main d'œuvre",  depense: 0,         budget: chantier.budget_personnel ?? 0,      color: "bg-blue-100 text-blue-600" },
    { icon: Wrench,    label: "Matériel",                  depense: 0,         budget: chantier.budget_materiel ?? 0,       color: "bg-amber-100 text-amber-600" },
    { icon: Package,   label: "Matériaux & Fournitures",   depense: 0,         budget: chantier.budget_fournitures ?? 0,    color: "bg-orange-100 text-orange-600" },
    { icon: Truck,     label: "Transports",                depense: 0,         budget: 0,                                   color: "bg-teal-100 text-teal-600" },
    { icon: Layers,    label: "Services extérieurs",       depense: 0,         budget: chantier.budget_divers ?? 0,         color: "bg-violet-100 text-violet-600" },
    { icon: Building2, label: "Sous-traitants",            depense: sttEngage, budget: chantier.budget_sous_traitance ?? 0, color: "bg-[#E8F5EE] text-[#087F3E]" },
  ];
  const totalDepense = familles.reduce((s, f) => s + f.depense, 0);
  const totalBudget  = familles.reduce((s, f) => s + f.budget, 0);

  const tabs = [
    { id: "contrats",  label: `Contrats de sous-traitance${contrats.length > 0 ? ` (${contrats.length})` : ""}`, icon: FileText },
    { id: "decomptes", label: "Décomptes récents", icon: Hash },
    { id: "bareme",    label: "Barème", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/chantiers")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Chantiers
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{chantier.designation}</span>
      </div>

      <PageHeader
        title={`${chantier.code} — ${chantier.designation}`}
        subtitle={chantier.localisation || ""}
        action={<StatusBadge statut={chantier.statut} />}
      />

      {/* Sync banner */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3">
        <Info size={14} className="text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500 flex-1">
          Référentiel synchronisé depuis Sage X3{chantier.code_x3 ? <> · Code X3 : <span className="font-mono font-semibold text-gray-700">{chantier.code_x3}</span></> : null}
          {chantier.synced_at ? (
            <> · Dernière synchronisation : {new Date(chantier.synced_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
          ) : null}
        </p>
        {peutSynchro && (
          <button onClick={handleSync} disabled={syncMut.isPending || !chantier.code_x3}
            title={chantier.code_x3 ? undefined : "Ce chantier n'a pas de code Sage X3"}
            className="inline-flex items-center gap-1.5 text-xs text-[#087F3E] border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors font-medium disabled:opacity-60">
            {syncMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {syncMut.isPending ? "Synchronisation…" : "Synchroniser depuis Sage X3"}
          </button>
        )}
      </div>

      {/* Info band */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {chantier.date_debut && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Début :</span>
              <span className="font-medium text-gray-800">{fmtDate(chantier.date_debut)}</span>
            </div>
          )}
          {chantier.date_fin_prevue && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Fin prévisionnelle :</span>
              <span className="font-medium text-gray-800">{fmtDate(chantier.date_fin_prevue)}</span>
            </div>
          )}
          {dureeJours && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Durée :</span>
              <span className="font-medium text-gray-800">{dureeJours} jours</span>
            </div>
          )}
          {chantier.localisation && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-500">Région :</span>
              <span className="font-medium text-gray-800">{chantier.localisation.split(/[,—\-]/)[0].trim()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Responsables DT / CT */}
      <SectionAffectationDTCT chantierId={id} chantier={chantier} isDacc={isDacc} />

      {/* Portefeuilles CT → STT */}
      <SectionPortefeuillesCT chantierId={id} isDacc={isDacc} />

      {/* KPIs */}
      {(() => {
        const decomptesEnCours = decomptesChantier.filter(d => d.statut === "soumis");
        const kpis = [
          {
            label: "Budget total",
            nombre: null,
            montant: fmt(budgetTotal),
            color: "text-gray-900",
          },
          {
            label: "Total Contrat",
            nombre: `${contrats.length} contrat${contrats.length > 1 ? "s" : ""}`,
            montant: fmt(sttEngage),
            color: "text-[#087F3E]",
          },
          {
            label: "Réalisé",
            nombre: `${nbRealise} décompte${nbRealise > 1 ? "s" : ""} validé${nbRealise > 1 ? "s" : ""}`,
            montant: fmt(realise),
            color: "text-blue-600",
          },
          {
            label: "En cours de validation",
            nombre: `${decomptesEnCours.length} décompte${decomptesEnCours.length > 1 ? "s" : ""}`,
            montant: fmt(decomptesEnCours.reduce((s,d) => s + parseFloat(d.montant_ht ?? 0), 0)),
            color: "text-amber-600",
          },
          {
            label: "Contrats sous-trait.",
            nombre: `${contrats.length} contrat${contrats.length > 1 ? "s" : ""}`,
            montant: fmt(sttEngage),
            color: "text-violet-600",
          },
        ];
        return (
          <div className="grid grid-cols-5 gap-4">
            {kpis.map(({ label, nombre, montant, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <p className={`text-base font-bold ${color}`}>{montant} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
                {nombre && <p className="text-xs text-gray-500 mt-1 font-medium">{nombre}</p>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Budget par famille */}
      {totalBudget > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Budget par famille RAM</h3>
          {familles.filter(f => f.budget > 0 || f.depense > 0).map(f => (
            <BudgetFamille key={f.label} {...f} />
          ))}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 text-sm font-semibold text-gray-700">
            <span>Total</span>
            <span>{fmt(totalDepense)} engagé sur {fmt(totalBudget)}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="p-5">
          {activeTab === "contrats"  && <TabContrats chantierId={id} />}
          {activeTab === "decomptes" && <TabDecomptes chantierId={id} />}
          {activeTab === "bareme"    && <TabBareme chantierId={id} />}
        </div>
      </div>
    </div>
  );
}
