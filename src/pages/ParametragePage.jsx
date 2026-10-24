import { useState, useEffect, useRef, Fragment, useMemo } from "react";
import {
  Plus, Trash2, Edit2, Save, X, GripVertical,
  CheckCircle, ChevronUp, ChevronDown, Loader2, Users, Settings, GitBranch, Tags, Shield, Search,
  FileText, Upload, Download, FolderOpen,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import { useCircuitEtapes, useSaveCircuitEtape, useDeleteCircuitEtape, useReorderCircuit } from "../hooks/useCircuit";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useParametresPaginated, useUpdateParametre, usePermissions, useUpdatePermission } from "../hooks/useParametres";
import { useUsersPaginated, useSaveUser, useDeleteUser } from "../hooks/useUsers";
import { useRolesPaginated, useSaveRole, useDeleteRole } from "../hooks/useRoles";
import { useBaremeGeneral, useAddBaremeGeneral, useSetPrixGeneral, useRemoveBaremeGeneral, useHistoriqueBaremeGeneral, useRefreshBareme } from "../hooks/useBaremeHierarchie";
import { baremeHierarchieService } from "../services/baremeHierarchieService";
import ImportBaremeDialog from "../components/ImportBaremeDialog";
import { telechargerModeleBareme } from "../utils/baremeModele";
import SyncBadge from "../components/SyncBadge";
import ArticleX3Select from "../components/ArticleX3Select";
import { useArticlesX3 } from "../hooks/useArticlesX3";
import SearchSelect from "../components/SearchSelect";

// ─── helpers ────────────────────────────────────────────────────────────────
function Spinner() {
  return <Loader2 size={16} className="animate-spin text-[#087F3E]" />;
}

function ConfirmDelete({ onConfirm, onCancel, loading }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-600">Confirmer ?</span>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : "Oui"}
      </button>
      <button onClick={onCancel} className="text-xs border border-gray-300 px-2 py-1 rounded hover:bg-gray-50">
        Non
      </button>
    </div>
  );
}

// ─── Modules applicatifs (fixe — correspond aux fonctionnalités de l'app) ────
const APP_MODULES = [
  { value: "attachement",  label: "Attachement",       statuts: ["Ouvert","En cours","Soumis à l'Asst DACC","Soumis au DT","En rapprochement","Soumis au DACC","Validé","Rejeté"] },
  { value: "decompte",     label: "Décompte",           statuts: ["brouillon","soumis","valide_dacc","valide_dex","valide_dga","valide_dg","paye","rejete"] },
  { value: "etat_cession", label: "État de cession",    statuts: ["brouillon","soumis","valide","rejete","pret"] },
  { value: "avenant",      label: "Avenant",            statuts: ["brouillon","soumis","valide_dacc","valide","rejete"] },
  { value: "contrat",      label: "Contrat",            statuts: ["brouillon","actif","suspendu","resilie","termine","cloture"] },
  { value: "bon_commande", label: "Bon de commande",    statuts: ["brouillon","valide","envoye","receptionne","cloture","annule"] },
  { value: "facture",      label: "Facture",            statuts: ["brouillon","emise","payee","annulee"] },
  { value: "releve",       label: "Relevé",             statuts: ["genere","envoye","accepte","conteste"] },
];

// ─── Tab Circuit ─────────────────────────────────────────────────────────────
function TabCircuit() {
  const { addToast } = useToast();
  const [selectedModule, setSelectedModule] = useState(APP_MODULES[0].value);
  const { data, isLoading } = useCircuitEtapes({ module: selectedModule, count: 50 });

  const moduleConfig = APP_MODULES.find(m => m.value === selectedModule);
  const statutsDisponibles = moduleConfig?.statuts ?? [];
  const { data: rolesData } = useRolesPaginated({ count: 100 });
  const saveMut = useSaveCircuitEtape();
  const deleteMut = useDeleteCircuitEtape();
  const reorderMut = useReorderCircuit();

  const etapes = data?.data ?? [];
  const roles = rolesData?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({
    profil_code: "", libelle: "", statut_avant: "", statut_apres: "", role_id: "", actif: true,
  });

  function openNew() {
    setEditId(null);
    setForm({ profil_code: "", libelle: "", statut_avant: "", statut_apres: "", role_id: "", actif: true });
    setShowForm(true);
  }

  function openEdit(etape) {
    setEditId(etape.id);
    setForm({
      profil_code: etape.profil_code ?? "",
      libelle: etape.libelle ?? "",
      statut_avant: etape.statut_avant ?? "",
      statut_apres: etape.statut_apres ?? "",
      role_id: etape.role_id ?? "",
      actif: etape.actif ?? true,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function handleSave() {
    try {
      const payload = {
        ...(editId ? { id: editId } : {}),
        module: selectedModule,
        profil_code: form.profil_code,
        libelle: form.libelle,
        statut_avant: form.statut_avant,
        statut_apres: form.statut_apres,
        role_id: form.role_id ? Number(form.role_id) : null,
        actif: form.actif,
        ordre: editId ? (etapes.find(e => e.id === editId)?.ordre ?? 999) : etapes.length + 1,
      };
      await saveMut.mutateAsync(payload);
      addToast(editId ? "Étape mise à jour." : "Étape ajoutée.", "success");
      cancelForm();
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      addToast("Étape supprimée.", "success");
      setConfirmDeleteId(null);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la suppression.", "error");
    }
  }

  async function handleMove(index, direction) {
    const sorted = [...etapes].sort((a, b) => a.ordre - b.ordre);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const newOrder = sorted.map(e => e.id);
    const tmp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = tmp;
    try {
      await reorderMut.mutateAsync(newOrder);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors du réordonnancement.", "error");
    }
  }

  const sortedEtapes = [...etapes].sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="space-y-5 pt-4">
      {/* Module selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Module :</label>
        <select
          value={selectedModule ?? ""}
          onChange={e => { setSelectedModule(e.target.value); setShowForm(false); setEditId(null); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
        >
          {APP_MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 px-5 py-3 rounded-r-xl">
        <p className="text-sm text-blue-700">
          Circuit du module <strong>{moduleConfig?.label ?? selectedModule}</strong>. Toute modification prend effet immédiatement.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{sortedEtapes.length} étape(s) configurée(s)</p>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors"
        >
          <Plus size={12} /> Ajouter une étape
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Ordre", "Libellé", "Profil code", "Statut avant", "Statut après", "Rôle lié", "Actif", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-6 text-center"><Spinner /></td></tr>
            )}
            {!isLoading && sortedEtapes.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400 text-sm">Aucune étape configurée</td></tr>
            )}
            {sortedEtapes.map((etape, index) => (
              <tr key={etape.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-6 h-6 rounded-full bg-[#087F3E] text-white text-xs flex items-center justify-center font-bold">
                      {etape.ordre}
                    </span>
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0 || reorderMut.isPending}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(index, "down")}
                        disabled={index === sortedEtapes.length - 1 || reorderMut.isPending}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{etape.libelle}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{etape.profil_code}</td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{etape.statut_avant}</td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{etape.statut_apres}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{etape.role?.designation ?? "—"}</td>
                <td className="px-4 py-3">
                  {etape.actif
                    ? <span className="flex items-center gap-1 text-xs bg-[#E8F5EE] text-[#065A2C] px-2 py-0.5 rounded-full font-medium w-fit"><CheckCircle size={10} /> Actif</span>
                    : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">Inactif</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {confirmDeleteId === etape.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(etape.id)}
                      onCancel={() => setConfirmDeleteId(null)}
                      loading={deleteMut.isPending}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(etape)} className="text-gray-400 hover:text-[#087F3E]">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(etape.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal étape */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">{editId ? "Modifier l'étape" : "Nouvelle étape"}</h2>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <span className="inline-block text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                Module : {moduleConfig?.label ?? selectedModule}
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Libellé</label>
                  <input
                    value={form.libelle}
                    onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="Ex. Validation CT"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Profil code</label>
                  <input
                    value={form.profil_code}
                    onChange={e => setForm(f => ({ ...f, profil_code: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="Ex. ct"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Statut avant</label>
                  <input
                    list={`statuts-${selectedModule}-avant`}
                    value={form.statut_avant}
                    onChange={e => setForm(f => ({ ...f, statut_avant: e.target.value }))}
                    placeholder="Ex. brouillon"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  />
                  <datalist id={`statuts-${selectedModule}-avant`}>
                    {statutsDisponibles.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Statut après</label>
                  <input
                    list={`statuts-${selectedModule}-apres`}
                    value={form.statut_apres}
                    onChange={e => setForm(f => ({ ...f, statut_apres: e.target.value }))}
                    placeholder="Ex. soumis"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  />
                  <datalist id={`statuts-${selectedModule}-apres`}>
                    {statutsDisponibles.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rôle lié</label>
                  <SearchSelect
                    value={form.role_id}
                    onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  >
                    <option value="">— Aucun —</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.designation}</option>
                    ))}
                  </SearchSelect>
                </div>
                <div className="flex items-center gap-2 self-end pb-2">
                  <input
                    type="checkbox"
                    id="circuit-actif"
                    checked={form.actif}
                    onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                    className="w-4 h-4 accent-[#087F3E]"
                  />
                  <label htmlFor="circuit-actif" className="text-sm text-gray-700">Actif</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saveMut.isPending || !form.libelle || !form.profil_code}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Enregistrer
                </button>
                <button
                  onClick={cancelForm}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Parametres ──────────────────────────────────────────────────────────
function TabParametres() {
  const { addToast } = useToast();
  const { data, isLoading } = useParametresPaginated();
  const updateMut = useUpdateParametre();

  const parametres = data?.data ?? [];

  const [edited, setEdited] = useState({});

  useEffect(() => {
    const init = {};
    parametres.forEach(p => { init[p.cle] = p.valeur ?? ""; });
    setEdited(init);
  }, [data]);

  const groupes = {};
  parametres.forEach(p => {
    const g = p.groupe ?? "Général";
    if (!groupes[g]) groupes[g] = [];
    groupes[g].push(p);
  });

  async function handleSave(p) {
    try {
      await updateMut.mutateAsync({ cle: p.cle, valeur: edited[p.cle] });
      addToast(`Paramètre « ${p.label || p.cle} » mis à jour.`, "success");
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la mise à jour.", "error");
    }
  }

  async function handleSaveAll() {
    const modified = parametres.filter(p => String(edited[p.cle]) !== String(p.valeur ?? ""));
    if (modified.length === 0) { addToast("Aucune modification détectée.", "info"); return; }
    try {
      await Promise.all(modified.map(p => updateMut.mutateAsync({ cle: p.cle, valeur: edited[p.cle] })));
      addToast(`${modified.length} paramètre(s) enregistré(s).`, "success");
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de l'enregistrement.", "error");
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex justify-end">
        <button
          onClick={handleSaveAll}
          disabled={updateMut.isPending}
          className="flex items-center gap-1.5 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {updateMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer tout
        </button>
      </div>

      {Object.entries(groupes).map(([groupe, params]) => (
        <div key={groupe} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{groupe}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {params.map(p => (
              <div key={p.cle} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{p.label || p.cle}</p>
                  {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                  <p className="text-xs text-gray-300 font-mono mt-1">{p.cle}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.type === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={edited[p.cle] === "1" || edited[p.cle] === true || edited[p.cle] === "true"}
                      onChange={e => setEdited(prev => ({ ...prev, [p.cle]: e.target.checked ? "1" : "0" }))}
                      className="w-4 h-4 accent-[#087F3E]"
                    />
                  ) : (
                    <input
                      type={p.type === "decimal" || p.type === "integer" ? "number" : "text"}
                      value={edited[p.cle] ?? ""}
                      onChange={e => setEdited(prev => ({ ...prev, [p.cle]: e.target.value }))}
                      className="w-40 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    />
                  )}
                  <button
                    onClick={() => handleSave(p)}
                    disabled={updateMut.isPending}
                    className="flex items-center gap-1 border border-[#087F3E] text-[#087F3E] px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#E8F5EE] disabled:opacity-50"
                  >
                    <Save size={12} /> Sauvegarder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {parametres.length === 0 && (
        <p className="text-center text-gray-400 py-12 text-sm">Aucun paramètre configuré</p>
      )}
    </div>
  );
}

// ─── Tab Utilisateurs ────────────────────────────────────────────────────────
const EMPTY_USER = { login: "", nom: "", prenom: "", email: "", password: "", role_id: "" };

function TabUtilisateurs() {
  const { addToast } = useToast();
  const { data, isLoading } = useUsersPaginated({ count: 100 });
  const { data: rolesData } = useRolesPaginated({ count: 100 });
  const saveMut = useSaveUser();
  const deleteMut = useDeleteUser();

  const users = data?.data ?? [];
  const roles = rolesData?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_USER);

  function openNew() {
    setEditUser(null);
    setForm(EMPTY_USER);
    setShowForm(true);
  }

  function openEdit(u) {
    setEditUser(u);
    setForm({ login: u.login ?? "", nom: u.nom ?? "", prenom: u.prenom ?? "", email: u.email ?? "", password: "", role_id: u.role_id ?? "" });
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditUser(null); }

  async function handleSave() {
    if (!editUser && !form.password) {
      addToast("Le mot de passe est requis pour un nouvel utilisateur.", "error");
      return;
    }
    try {
      const payload = { ...form, role_id: form.role_id ? Number(form.role_id) : null };
      if (editUser) payload.id = editUser.id;
      if (!payload.password) delete payload.password;
      await saveMut.mutateAsync(payload);
      addToast(editUser ? "Utilisateur mis à jour." : "Utilisateur créé.", "success");
      cancelForm();
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      addToast("Utilisateur supprimé.", "success");
      setConfirmDeleteId(null);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la suppression.", "error");
    }
  }

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} utilisateur(s)</p>
        <button onClick={openNew} className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors">
          <Plus size={12} /> Nouvel utilisateur
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Login", "Nom", "Email", "Rôle", "Statut", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center"><Spinner /></td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun utilisateur</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{u.login}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{[u.prenom, u.nom].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.role?.designation ?? "—"}</td>
                <td className="px-4 py-3">
                  {u.etat == 1
                    ? <span className="text-xs bg-[#E8F5EE] text-[#065A2C] px-2 py-0.5 rounded-full font-medium">Actif</span>
                    : <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactif</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {confirmDeleteId === u.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(u.id)}
                      onCancel={() => setConfirmDeleteId(null)}
                      loading={deleteMut.isPending}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-[#087F3E]"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirmDeleteId(u.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal utilisateur */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">{editUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "login", label: "Login *" },
                  { key: "nom", label: "Nom *" },
                  { key: "prenom", label: "Prénom" },
                  { key: "email", label: "Email", type: "email" },
                  { key: "password", label: editUser ? "Nouveau mot de passe (laisser vide)" : "Mot de passe *", type: "password" },
                ].map(({ key, label, type = "text" }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rôle</label>
                  <SearchSelect
                    value={form.role_id}
                    onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  >
                    <option value="">— Choisir un rôle —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.designation}</option>)}
                  </SearchSelect>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saveMut.isPending || !form.login || !form.nom}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Enregistrer
                </button>
                <button onClick={cancelForm} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Rôles ───────────────────────────────────────────────────────────────
function TabRoles() {
  const { addToast } = useToast();
  const { data, isLoading } = useRolesPaginated({ count: 100 });
  const saveMut = useSaveRole();
  const deleteMut = useDeleteRole();

  const roles = data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({ designation: "", description: "" });

  function openNew() { setEditRole(null); setForm({ designation: "", description: "" }); setShowForm(true); }
  function openEdit(r) { setEditRole(r); setForm({ designation: r.designation ?? "", description: r.description ?? "" }); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditRole(null); }

  async function handleSave() {
    try {
      const payload = { ...form };
      if (editRole) payload.id = editRole.id;
      await saveMut.mutateAsync(payload);
      addToast(editRole ? "Rôle mis à jour." : "Rôle créé.", "success");
      cancelForm();
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      addToast("Rôle supprimé.", "success");
      setConfirmDeleteId(null);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la suppression.", "error");
    }
  }

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{roles.length} rôle(s)</p>
        <button onClick={openNew} className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors">
          <Plus size={12} /> Nouveau rôle
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Désignation", "Description", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={3} className="px-4 py-6 text-center"><Spinner /></td></tr>
            )}
            {!isLoading && roles.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun rôle configuré</td></tr>
            )}
            {roles.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.designation}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.description ?? "—"}</td>
                <td className="px-4 py-3">
                  {confirmDeleteId === r.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(r.id)}
                      onCancel={() => setConfirmDeleteId(null)}
                      loading={deleteMut.isPending}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-[#087F3E]"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirmDeleteId(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal rôle */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">{editRole ? "Modifier le rôle" : "Nouveau rôle"}</h2>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Désignation *</label>
                  <input
                    value={form.designation}
                    onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="Ex. Directeur Général"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="Description du rôle"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saveMut.isPending || !form.designation}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Enregistrer
                </button>
                <button onClick={cancelForm} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Barèmes ─────────────────────────────────────────────────────────────
// ─── Tab Barème général ──────────────────────────────────────────────────────
// Prix de base de la CSE (articles Sage X3 : matériaux, gasoil). Hérité par les chantiers puis les contrats.
const fmtPrix = n => n == null ? "—" : new Intl.NumberFormat("fr-FR").format(Math.round(n));

function HistoriqueBareme({ id }) {
  const { data, isLoading } = useHistoriqueBaremeGeneral(id);
  if (isLoading) return <p className="text-xs text-gray-400 py-3">Chargement…</p>;
  const prix = data?.prix ?? [];
  const journal = data?.journal ?? [];
  const ACTIONS = { prix_base: "Prix de base", ecart: "Écart", validation: "Validation", retablissement: "Rétablissement", photo: "Photo à l'activation" };
  const NIVEAUX = { base: "Base", chantier: "Chantier", contrat: "Contrat" };
  return (
    <div className="grid md:grid-cols-2 gap-6 py-3 text-xs">
      <div>
        <p className="font-semibold text-gray-500 uppercase tracking-wide mb-2">Prix de base datés</p>
        {prix.length === 0 ? <p className="text-gray-400">Aucun prix enregistré.</p> : (
          <table className="w-full"><tbody>
            {prix.map(p => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="py-1 text-gray-500">{new Date(p.date_effet).toLocaleDateString("fr-FR")}</td>
                <td className="py-1 text-right font-mono font-semibold text-gray-800">{fmtPrix(p.prix)} FCFA</td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
      <div>
        <p className="font-semibold text-gray-500 uppercase tracking-wide mb-2">Journal des modifications</p>
        {journal.length === 0 ? <p className="text-gray-400">Aucune modification.</p> : (
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {journal.map((j, i) => (
              <li key={i} className="text-gray-600">
                <span className="text-gray-400">{new Date(j.created_at).toLocaleDateString("fr-FR")}</span>{" "}
                <span className="font-medium">{NIVEAUX[j.niveau] ?? j.niveau}</span> · {ACTIONS[j.action] ?? j.action}
                {j.nouveau_prix != null && <> → <span className="font-mono">{fmtPrix(j.nouveau_prix)}</span></>}
                {j.nom && <span className="text-gray-400"> — {j.prenom} {j.nom}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabBaremeGeneral() {
  const { addToast } = useToast();
  const { data, isLoading } = useBaremeGeneral();
  const addMut = useAddBaremeGeneral();
  const prixMut = useSetPrixGeneral();
  const removeMut = useRemoveBaremeGeneral();

  const lignes = data?.lignes ?? [];
  const peutModifier = !!data?.peut_modifier;

  const [search, setSearch] = useState("");
  const [nouveau, setNouveau] = useState({ code_article: "", designation: "", unite: "", prix: "", date_effet: "" });
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({ prix: "", unite: "", date_effet: "", motif: "" });
  const [ouvert, setOuvert] = useState(null);
  const [confirmRetrait, setConfirmRetrait] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const refreshBareme = useRefreshBareme();

  const err = e => e?.response?.data?.errors?.[0] ?? e?.response?.data?.message ?? "Erreur.";
  const modeleGeneral = lignes.map(l => ({ code: l.code, designation: l.designation, unite: l.unite, prix: l.prix }));
  const visibles = lignes.filter(l => !search.trim() || l.designation?.toLowerCase().includes(search.toLowerCase()) || l.code?.toLowerCase().includes(search.toLowerCase()));

  async function handleAdd() {
    const prix = parseFloat(nouveau.prix);
    if (!nouveau.code_article) return addToast("Choisissez un article Sage X3.", "error");
    if (isNaN(prix) || prix < 0) return addToast("Saisissez un prix de base valide.", "error");
    try {
      await addMut.mutateAsync({ code_article: nouveau.code_article, prix, unite: nouveau.unite || null, date_effet: nouveau.date_effet || null });
      setNouveau({ code_article: "", designation: "", unite: "", prix: "", date_effet: "" });
      addToast("Article ajouté au barème général.", "success");
    } catch (e) { addToast(err(e), "error"); }
  }

  async function handleSavePrix(l) {
    const prix = parseFloat(edit.prix);
    if (isNaN(prix) || prix < 0) return addToast("Prix invalide.", "error");
    try {
      await prixMut.mutateAsync({ id: l.id, prix, unite: edit.unite || null, date_effet: edit.date_effet || null, motif: edit.motif || null });
      setEditing(null);
      addToast(edit.date_effet && edit.date_effet > new Date().toISOString().slice(0, 10)
        ? "Prix enregistré, il s'appliquera à sa date d'effet." : "Prix de base mis à jour.", "success");
    } catch (e) { addToast(err(e), "error"); }
  }

  async function handleRetrait(id) {
    try {
      await removeMut.mutateAsync(id);
      setConfirmRetrait(null);
      addToast("Article retiré du barème général.", "success");
    } catch (e) { addToast(err(e), "error"); }
  }

  return (
    <div className="space-y-5 pt-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 space-y-1">
        <p><strong>Barème général</strong> : prix de base de la CSE. Chaque chantier en hérite et peut le modifier ; chaque contrat hérite de son chantier et peut le modifier.</p>
        <p>Un contrat en brouillon suit ces prix ; à son activation, ils sont <strong>figés</strong>. Les prix sont datés : une date d'effet future ne s'applique pas avant son échéance.</p>
        <p className="text-blue-600">Ressources humaines et matériel (GMAO) : en attente, non gérés ici.</p>
      </div>

      {!peutModifier && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Lecture seule : seul le DACC peut modifier le barème général.</p>
      )}

      {peutModifier && (
        <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ajouter un article Sage X3</p>
          <div className="grid md:grid-cols-[1fr_110px_140px_160px_auto] gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Article (classes MTX, BAS, PRP)</label>
              <ArticleX3Select
                value={nouveau.code_article}
                classe="MTX,BAS,PRP"
                onSelect={a => setNouveau(n => a ? { ...n, code_article: a.code_article, designation: a.designation, unite: a.unite ?? n.unite } : { ...n, code_article: "", designation: "", unite: "" })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Unité</label>
              <input list="unites-bareme" value={nouveau.unite} onChange={e => setNouveau(n => ({ ...n, unite: e.target.value.toUpperCase() }))}
                placeholder="Unité X3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prix de base (FCFA)</label>
              <input type="number" min="0" step="any" value={nouveau.prix} onChange={e => setNouveau(n => ({ ...n, prix: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Date d'effet (option)</label>
              <input type="date" value={nouveau.date_effet} onChange={e => setNouveau(n => ({ ...n, date_effet: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] outline-none" />
            </div>
            <button onClick={handleAdd} disabled={addMut.isPending}
              className="inline-flex items-center gap-1.5 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
              {addMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ajouter
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
        </div>
        <span className="text-xs text-gray-400">{lignes.length} article{lignes.length > 1 ? "s" : ""}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => telechargerModeleBareme(modeleGeneral, "bareme_general")}
            title="Fichier CodeArticle ; Unité ; Prix unitaire, pré-rempli avec les prix actuels"
            className="inline-flex items-center gap-1.5 text-sm text-gray-700 font-medium border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            <Download size={14} /> Exporter en Excel
          </button>
          {peutModifier && (
            <button onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 text-sm text-[#087F3E] font-medium border border-[#087F3E]/40 px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE]">
              <Upload size={14} /> Importer un fichier
            </button>
          )}
        </div>
      </div>

      {showImport && (
        <ImportBaremeDialog
          titre="Importer le barème général"
          description="Fichier CSV ou Excel avec les colonnes : CodeArticle, Désignation, Unité, Prix unitaire. Sans code article, l'article est retrouvé par sa désignation. Le code doit exister dans Sage X3 (classes MTX, BAS, PRP). L'unité du fichier est conservée (signalée si elle diffère de Sage X3). Une date d'effet peut être indiquée."
          avecDate
          lignesModele={modeleGeneral}
          nomModele="modele_import_bareme_general"
          onAnalyser={({ lignes: l, date_effet }) => baremeHierarchieService.importGeneral({ lignes: l, date_effet, appliquer: false })}
          onAppliquer={async ({ lignes: l, date_effet }) => {
            const r = await baremeHierarchieService.importGeneral({ lignes: l, date_effet, appliquer: true });
            refreshBareme();
            return r;
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      <datalist id="unites-bareme">
        {["T", "KG", "L", "M3", "M2", "ML", "M", "SAC", "U", "PC", "BARRE", "H", "JOUR", "MOIS"].map(u => <option key={u} value={u} />)}
      </datalist>

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="text-left px-4 py-3">Article</th>
              <th className="text-left px-3 py-3">Type</th>
              <th className="text-left px-3 py-3">Unité</th>
              <th className="text-right px-3 py-3">Prix de base (FCFA)</th>
              <th className="text-left px-3 py-3">À venir</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center"><Spinner /></td></tr>}
            {!isLoading && visibles.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                {lignes.length === 0 ? "Barème général vide : ajoutez les articles Sage X3 avec leur prix de base." : "Aucun article ne correspond."}
              </td></tr>
            )}
            {visibles.map(l => (
              <Fragment key={l.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{l.designation}</p>
                    <p className="text-xs font-mono text-gray-400">{l.code}</p>
                  </td>
                  <td className="px-3 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium uppercase">{l.type}</span></td>
                  <td className="px-3 py-3 text-gray-600">
                    {editing === l.id ? (
                      <input list="unites-bareme" value={edit.unite} onChange={e => setEdit(v => ({ ...v, unite: e.target.value.toUpperCase() }))}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm uppercase focus:ring-2 focus:ring-[#087F3E] outline-none" />
                    ) : (
                      <>
                        {l.unite}
                        {l.unite_x3 && l.unite_x3 !== String(l.unite).toUpperCase() && (
                          <span title={`Unité Sage X3 : ${l.unite_x3}`}
                            className="ml-1.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">≠ X3 ({l.unite_x3})</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {editing === l.id ? (
                      <input type="number" min="0" step="any" value={edit.prix} autoFocus onChange={e => setEdit(v => ({ ...v, prix: e.target.value }))}
                        className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-[#087F3E] outline-none" />
                    ) : (
                      <span className="font-mono font-semibold text-gray-900">{fmtPrix(l.prix)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">
                    {editing === l.id ? (
                      <div className="flex gap-1.5">
                        <input type="date" value={edit.date_effet} onChange={e => setEdit(v => ({ ...v, date_effet: e.target.value }))}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none" />
                        <input value={edit.motif} placeholder="Motif" onChange={e => setEdit(v => ({ ...v, motif: e.target.value }))}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none w-32" />
                      </div>
                    ) : l.prix_a_venir != null ? (
                      <span className="text-amber-700">{fmtPrix(l.prix_a_venir)} le {new Date(l.date_a_venir).toLocaleDateString("fr-FR")}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {editing === l.id ? (
                        <>
                          <button onClick={() => handleSavePrix(l)} disabled={prixMut.isPending} className="p-1.5 rounded bg-[#087F3E] text-white hover:bg-[#065A2C]"><Save size={13} /></button>
                          <button onClick={() => setEditing(null)} className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setOuvert(ouvert === l.id ? null : l.id)} title="Historique"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                            {ouvert === l.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          {peutModifier && (
                            <>
                              <button onClick={() => { setEditing(l.id); setEdit({ prix: String(l.prix ?? ""), unite: l.unite ?? "", date_effet: "", motif: "" }); }} title="Modifier le prix"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-[#087F3E] hover:bg-gray-50"><Edit2 size={13} /></button>
                              {confirmRetrait === l.id ? (
                                <ConfirmDelete onConfirm={() => handleRetrait(l.id)} onCancel={() => setConfirmRetrait(null)} loading={removeMut.isPending} />
                              ) : (
                                <button onClick={() => setConfirmRetrait(l.id)} title="Retirer du barème"
                                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {ouvert === l.id && (
                  <tr className="bg-gray-50/60"><td colSpan={6} className="px-4"><HistoriqueBareme id={l.id} /></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab Articles Sage X3 ────────────────────────────────────────────────────
const CLASSES_X3 = ["TCE", "EHA", "MTX", "PVC", "BAS", "PRP"];

function TabArticlesX3() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [classe, setClasse] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: peutSynchro = false } = usePeutFaire("synchro_x3");
  const { data: articles = [], isLoading } = useArticlesX3({ search: debounced, classe, limit: 200 });

  return (
    <div className="space-y-5 pt-4">
      <SyncBadge module="articles" label="Articles" invalidate={["articles-x3"]} canSync={peutSynchro} />

      <div className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Code ou désignation…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] w-64"
        />
        <SearchSelect
          value={classe}
          onChange={e => setClasse(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
        >
          <option value="">Toutes les classes</option>
          {CLASSES_X3.map(c => <option key={c} value={c}>{c}</option>)}
        </SearchSelect>
        <span className="text-xs text-gray-400 ml-auto">
          {isLoading ? "Chargement…" : `${articles.length} article${articles.length > 1 ? "s" : ""} affiché${articles.length > 1 ? "s" : ""} (200 max — affinez la recherche)`}
        </span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code article", "Désignation", "Classe", "Unité"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center"><Spinner /></td></tr>}
            {!isLoading && articles.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun article. Lancez une synchronisation depuis Sage X3.</td></tr>
            )}
            {articles.map(a => (
              <tr key={a.code_article} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{a.code_article}</td>
                <td className="px-4 py-2.5 text-gray-900">{a.designation}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{a.classe ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{a.unite ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab Fichiers MTX ────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE + "/api";
function getToken() { return localStorage.getItem("stt_token"); }

function ChantierSearchSelect({ value, onChange, chantiers, placeholder = "Tous les chantiers" }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);
  const selected = chantiers.find(c => (c.code_x3 ?? c.code) === value);
  const filtered = chantiers.filter(c =>
    !search || `${c.code_x3 ?? c.code} ${c.designation}`.toLowerCase().includes(search.toLowerCase())
  );
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div ref={ref} className="relative w-72">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-[#087F3E] focus:outline-none focus:ring-2 focus:ring-[#087F3E] transition-colors">
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? `${selected.code_x3 ?? selected.code} — ${selected.designation}` : `— ${placeholder} —`}
        </span>
        <ChevronDown size={14} className={`ml-2 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-[999] mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input autoFocus type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
              {search && <button onClick={() => setSearch("")}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>}
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-3 text-sm text-gray-400 text-center">Aucun résultat</li>}
            {filtered.map(c => {
              const code = c.code_x3 ?? c.code;
              return (
                <li key={c.id} onClick={() => { onChange(code); setOpen(false); setSearch(""); }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-green-50 hover:text-[#087F3E] transition-colors ${value === code ? "bg-green-50 text-[#087F3E] font-medium" : "text-gray-700"}`}>
                  <span className="font-mono text-xs text-gray-400 mr-2">{code}</span>{c.designation}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const MOIS_FR = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function TabMtxUpload() {
  const { addToast } = useToast();
  const qc           = useQueryClient();
  const inputRef     = useRef(null);
  const [uploading, setUploading]         = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const [chantierCode, setChantierCode]   = useState("");

  const { data: chantiersResp } = useChantiersPaginated({ count: 200 });
  const chantiers = chantiersResp?.data ?? [];

  const { data: periodes = [], isLoading } = useQuery({
    queryKey: ["mtx_upload"],
    queryFn: () => axios.get(`${API_BASE}/mtx-upload`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.data.data ?? []),
  });

  async function handleUpload(files) {
    const xlsxFiles = Array.from(files).filter(f => f.name.match(/\.(xlsx|xls)$/i));
    if (!xlsxFiles.length) return addToast("Seuls les fichiers Excel (.xlsx) sont acceptés.", "error");
    if (!chantierCode) return addToast("Sélectionnez un chantier avant d'uploader.", "error");
    setUploading(true);
    for (const file of xlsxFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("chantier_code_x3", chantierCode);
      try {
        const res = await axios.post(`${API_BASE}/mtx-upload`, fd, {
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "multipart/form-data" },
        });
        addToast(res.data.message ?? "Importé avec succès.", "success");
      } catch (e) {
        const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? "Erreur";
        addToast(`${file.name} : ${msg}`, "error");
      }
    }
    setUploading(false);
    qc.invalidateQueries(["mtx_upload"]);
  }

  async function handleDelete(chantier, annee, mois) {
    try {
      await axios.delete(`${API_BASE}/mtx-upload/${encodeURIComponent(chantier)}/${annee}/${mois}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      qc.invalidateQueries(["mtx_upload"]);
      addToast("Données supprimées.", "success");
    } catch { addToast("Erreur suppression.", "error"); }
  }

  const grouped = periodes.reduce((acc, p) => {
    if (!acc[p.chantier_code_x3]) acc[p.chantier_code_x3] = [];
    acc[p.chantier_code_x3].push(p);
    return acc;
  }, {});

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-gray-800">Fichiers MTX (Bons de Sortie)</h3>
          <p className="text-xs text-gray-400 mt-0.5">Uploadez les fichiers Excel ND pour alimenter le "Charger X3" dans les états de cession.</p>
        </div>
        <div className="flex items-center gap-2">
          <ChantierSearchSelect value={chantierCode} onChange={setChantierCode} chantiers={chantiers} placeholder="Sélectionner un chantier" />
          <button onClick={() => inputRef.current?.click()} disabled={uploading || !chantierCode}
            className="inline-flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Uploader
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple className="hidden"
            onChange={e => { handleUpload(e.target.files); e.target.value = ""; }} />
        </div>
      </div>

      {/* Zone drag & drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver && chantierCode ? "border-[#087F3E] bg-green-50" : "border-gray-200 bg-gray-50"}`}>
        <FolderOpen size={28} className={`mx-auto mb-2 ${dragOver && chantierCode ? "text-[#087F3E]" : "text-gray-300"}`} />
        <p className="text-sm text-gray-400">{chantierCode ? "Glissez-déposez le fichier Excel ici" : "Sélectionnez d'abord un chantier"}</p>
      </div>

      {isLoading && <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>}

      {!isLoading && periodes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">Aucun fichier MTX importé.</p>
      )}

      {Object.entries(grouped).map(([code, items]) => (
        <div key={code}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{code}</p>
          <div className="space-y-2">
            {items.map(p => (
              <div key={`${p.chantier_code_x3}-${p.annee}-${p.mois}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{p.chantier_designation} — {MOIS_FR[p.mois]} {p.annee}</p>
                    <p className="text-xs text-gray-400">{p.nb_lignes} lignes · {p.chantier_code_x3}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(p.chantier_code_x3, p.annee, p.mois)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab Bons de Transfert ───────────────────────────────────────────────────

function TabBtDocuments() {
  const { addToast }  = useToast();
  const qc            = useQueryClient();
  const inputRef      = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["bt_documents"],
    queryFn: () => axios.get(`${API_BASE}/bt-documents`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => axios.delete(`${API_BASE}/bt-documents/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),
    onSuccess: () => { qc.invalidateQueries(["bt_documents"]); addToast("Fichier supprimé.", "success"); },
    onError:   () => addToast("Erreur lors de la suppression.", "error"),
  });

  async function handleUpload(files) {
    const pdfs = Array.from(files).filter(f => f.type === "application/pdf");
    if (!pdfs.length) return addToast("Seuls les fichiers PDF sont acceptés.", "error");
    setUploading(true);
    let ok = 0, err = 0;
    for (const file of pdfs) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        await axios.post(`${API_BASE}/bt-documents`, fd, {
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "multipart/form-data" },
        });
        ok++;
      } catch (e) {
        const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? "Erreur";
        addToast(`${file.name} : ${msg}`, "error");
        err++;
      }
    }
    setUploading(false);
    if (ok) { qc.invalidateQueries(["bt_documents"]); addToast(`${ok} fichier(s) uploadé(s).`, "success"); }
  }

  async function handleDownload(doc) {
    const resp = await fetch(`${API_BASE}/bt-documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const blob = await resp.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = doc.filename; a.click();
  }

  const grouped = (data ?? []).reduce((acc, d) => {
    const key = `${d.chantier_code} · ${d.soustraitant_code}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Bons de Transfert</h3>
          <p className="text-xs text-gray-400 mt-0.5">Format attendu : <span className="font-mono bg-gray-100 px-1 rounded">CODE_CHANTIER_CODE_SOUSTRAITANT_YYYY-MM.pdf</span></p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Uploader des BT
        </button>
        <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden"
          onChange={e => { handleUpload(e.target.files); e.target.value = ""; }} />
      </div>

      {/* Zone drag & drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? "border-[#087F3E] bg-green-50" : "border-gray-200 bg-gray-50"}`}>
        <FolderOpen size={28} className={`mx-auto mb-2 ${dragOver ? "text-[#087F3E]" : "text-gray-300"}`} />
        <p className="text-sm text-gray-400">Glissez-déposez vos fichiers PDF ici</p>
      </div>

      {isLoading && <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>}

      {!isLoading && (data ?? []).length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">Aucun bon de transfert uploadé.</p>
      )}

      {Object.entries(grouped).map(([key, docs]) => (
        <div key={key}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{key}</p>
          <div className="space-y-2">
            {docs.sort((a,b) => a.periode.localeCompare(b.periode)).map(doc => (
              <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-red-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{doc.filename}</p>
                    <p className="text-xs text-gray-400">{doc.periode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownload(doc)}
                    className="p-1.5 text-gray-400 hover:text-[#087F3E] hover:bg-green-50 rounded-lg transition-colors">
                    <Download size={14} />
                  </button>
                  <button onClick={() => deleteMut.mutate(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab Permissions ─────────────────────────────────────────────────────────
function TabPermissions() {
  const { data: permissions = [], isLoading } = usePermissions();
  const updateMut = useUpdatePermission();
  const { addToast } = useToast();

  async function toggleRole(cle, designation, actif) {
    const perm = permissions.find(p => p.cle === cle);
    if (!perm) return;
    const currentRoles = perm.roles.filter(r => r.actif).map(r => r.designation);
    const newRoles = actif
      ? [...currentRoles, designation]
      : currentRoles.filter(d => d !== designation);
    try {
      await updateMut.mutateAsync({ cle, roles: newRoles });
      addToast("Permission mise à jour.", "success");
    } catch {
      addToast("Erreur lors de la mise à jour.", "error");
    }
  }

  if (isLoading) return <div className="py-10 text-center text-sm text-gray-400">Chargement…</div>;

  return (
    <div className="space-y-6 pt-6">
      <p className="text-sm text-gray-500">
        Définissez quels rôles peuvent effectuer chaque action. Par défaut : <strong>Assistant DEX</strong> et <strong>Assistant DACC</strong>.
        L'Admin a toujours accès.
      </p>
      {permissions.map(perm => (
        <div key={perm.cle} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{perm.label}</p>
            {perm.description && <p className="text-xs text-gray-400 mt-0.5">{perm.description}</p>}
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-3">
            {perm.roles.map(role => (
              <label key={role.designation} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={role.actif}
                  disabled={role.designation === "Admin" || updateMut.isPending}
                  onChange={e => toggleRole(perm.cle, role.designation, e.target.checked)}
                  className="w-4 h-4 accent-[#087F3E] cursor-pointer"
                />
                <span className={`text-sm ${role.actif ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                  {role.designation}
                  {role.designation === "Admin" && <span className="ml-1 text-[11px] text-gray-400">(toujours)</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
const TAB_ITEMS = [
  { id: "circuit",      label: "Circuit",       icon: GitBranch },
  { id: "parametres",   label: "Paramètres",    icon: Settings },
  { id: "utilisateurs", label: "Utilisateurs",  icon: Users },
  { id: "roles",        label: "Rôles",         icon: Shield },
  { id: "permissions",  label: "Permissions",   icon: Shield },
  { id: "baremes",      label: "Barème général", icon: Tags },
  { id: "articles",     label: "Articles X3",   icon: FolderOpen },
  { id: "mtx",          label: "Fichiers MTX",      icon: Upload },
  { id: "bt",           label: "Bons de Transfert", icon: FileText },
];

export default function ParametragePage() {
  const [activeTab, setActiveTab] = useState("circuit");

  return (
    <div className="space-y-6">
      <PageHeader title="Paramétrage" subtitle="Configuration globale de la plateforme" />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={TAB_ITEMS} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="px-6 pb-8">
          {activeTab === "circuit"      && <TabCircuit />}
          {activeTab === "parametres"   && <TabParametres />}
          {activeTab === "utilisateurs" && <TabUtilisateurs />}
          {activeTab === "roles"        && <TabRoles />}
          {activeTab === "permissions"  && <TabPermissions />}
          {activeTab === "baremes"      && <TabBaremeGeneral />}
          {activeTab === "articles"     && <TabArticlesX3 />}
          {activeTab === "mtx"          && <TabMtxUpload />}
          {activeTab === "bt"           && <TabBtDocuments />}
        </div>
      </div>
    </div>
  );
}
