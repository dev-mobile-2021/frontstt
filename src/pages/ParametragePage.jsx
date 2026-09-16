import { useState, useEffect } from "react";
import {
  Plus, Trash2, Edit2, Save, X, GripVertical,
  CheckCircle, ChevronUp, ChevronDown, Loader2, Users, Settings, GitBranch, Tags, Shield,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import { useCircuitEtapes, useSaveCircuitEtape, useDeleteCircuitEtape, useReorderCircuit } from "../hooks/useCircuit";
import { useParametresPaginated, useUpdateParametre } from "../hooks/useParametres";
import { useUsersPaginated, useSaveUser, useDeleteUser } from "../hooks/useUsers";
import { useRolesPaginated, useSaveRole, useDeleteRole } from "../hooks/useRoles";
import { useBaremesPaginated, useSaveBareme, useDeleteBareme } from "../hooks/useBaremes";

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

// ─── Tab Circuit ─────────────────────────────────────────────────────────────
const MODULES = [
  { value: "decompte",     label: "Décompte" },
  { value: "avenant",      label: "Avenant" },
  { value: "contrat",      label: "Contrat" },
  { value: "bon_commande", label: "Bon de commande" },
  { value: "etat_cession", label: "État de cession" },
  { value: "facture",      label: "Facture" },
  { value: "releve",       label: "Relevé" },
];

const MODULE_STATUTS = {
  decompte:     ["brouillon", "soumis", "valide_dacc", "valide_dex", "valide_dga", "valide_dg", "paye", "rejete"],
  avenant:      ["brouillon", "soumis", "valide_dacc", "valide", "rejete"],
  contrat:      ["brouillon", "actif", "suspendu", "resilie", "termine", "cloture"],
  bon_commande: ["brouillon", "valide", "envoye", "receptionne", "cloture", "annule"],
  etat_cession: ["brouillon", "soumis", "valide", "rejete"],
  facture:      ["brouillon", "emise", "payee", "annulee"],
  releve:       ["genere", "envoye", "accepte", "conteste"],
};

function TabCircuit() {
  const { addToast } = useToast();
  const [selectedModule, setSelectedModule] = useState("decompte");
  const { data, isLoading } = useCircuitEtapes({ module: selectedModule, count: 50 });
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
          value={selectedModule}
          onChange={e => { setSelectedModule(e.target.value); setShowForm(false); setEditId(null); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
        >
          {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 px-5 py-3 rounded-r-xl">
        <p className="text-sm text-blue-700">
          Circuit du module <strong>{MODULES.find(m => m.value === selectedModule)?.label}</strong>. Toute modification prend effet immédiatement.
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
              <tr><td colSpan={8} className="px-4 py-6 text-center"><Spinner /></td></tr>
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
                Module : {MODULES.find(m => m.value === selectedModule)?.label}
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
                  <select
                    value={form.statut_avant}
                    onChange={e => setForm(f => ({ ...f, statut_avant: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  >
                    <option value="">— Choisir —</option>
                    {(MODULE_STATUTS[selectedModule] ?? []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Statut après</label>
                  <select
                    value={form.statut_apres}
                    onChange={e => setForm(f => ({ ...f, statut_apres: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  >
                    <option value="">— Choisir —</option>
                    {(MODULE_STATUTS[selectedModule] ?? []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rôle lié</label>
                  <select
                    value={form.role_id}
                    onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  >
                    <option value="">— Aucun —</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.designation}</option>
                    ))}
                  </select>
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
                  <select
                    value={form.role_id}
                    onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  >
                    <option value="">— Choisir un rôle —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.designation}</option>)}
                  </select>
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
const TYPE_BADGE = {
  rh:  { label: "RH",  cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  mtx: { label: "MTX", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  mtl: { label: "MTL", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
};

function TypeBadge({ type }) {
  const t = TYPE_BADGE[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${t.cls}`}>{t.label}</span>
  );
}

const EMPTY_BAREME = { type: "rh", categorie: "", designation: "", unite: "", prix_unitaire: "" };

function TabBaremes() {
  const { addToast } = useToast();
  const [filters, setFilters] = useState({ count: 100 });
  const [search, setSearch] = useState("");
  const { data, isLoading } = useBaremesPaginated(filters);
  const saveMut = useSaveBareme();
  const deleteMut = useDeleteBareme();

  const baremes = (data?.data ?? []).filter(b =>
    !search || b.designation?.toLowerCase().includes(search.toLowerCase()) || b.code?.toLowerCase().includes(search.toLowerCase())
  );

  const [showForm, setShowForm] = useState(false);
  const [editBareme, setEditBareme] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_BAREME);

  function openNew() { setEditBareme(null); setForm(EMPTY_BAREME); setShowForm(true); }
  function openEdit(b) {
    setEditBareme(b);
    setForm({ type: b.type ?? "rh", categorie: b.categorie ?? "", designation: b.designation ?? "", unite: b.unite ?? "", prix_unitaire: b.prix_unitaire ?? "" });
    setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditBareme(null); }

  async function handleSave() {
    try {
      const payload = { ...form, prix_unitaire: parseFloat(form.prix_unitaire) || 0 };
      if (editBareme) payload.id = editBareme.id;
      await saveMut.mutateAsync(payload);
      addToast(editBareme ? "Barème mis à jour." : "Barème créé.", "success");
      cancelForm();
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la sauvegarde.", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      addToast("Barème supprimé.", "success");
      setConfirmDeleteId(null);
    } catch (err) {
      addToast(err?.response?.data?.errors?.[0] ?? err?.response?.data?.error ?? "Erreur lors de la suppression.", "error");
    }
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] w-52"
        />
        <select
          value={filters.type ?? ""}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value || undefined }))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
        >
          <option value="">Tous les types</option>
          <option value="rh">RH</option>
          <option value="mtx">MTX</option>
          <option value="mtl">MTL</option>
        </select>
        <select
          value={filters.statut ?? ""}
          onChange={e => setFilters(f => ({ ...f, statut: e.target.value || undefined }))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>
        <div className="ml-auto">
          <button onClick={openNew} className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors">
            <Plus size={12} /> Nouveau barème
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code", "Type", "Catégorie", "Désignation", "Unité", "Prix unitaire", "Statut", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center"><Spinner /></td></tr>
            )}
            {!isLoading && baremes.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun barème trouvé</td></tr>
            )}
            {baremes.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.code}</td>
                <td className="px-4 py-2.5"><TypeBadge type={b.type} /></td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{b.categorie ?? "—"}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{b.designation}</td>
                <td className="px-4 py-2.5 text-gray-500">{b.unite ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-sm text-gray-800">{b.prix_unitaire != null ? Number(b.prix_unitaire).toLocaleString("fr-FR") : "—"}</td>
                <td className="px-4 py-2.5">
                  {b.statut === "actif"
                    ? <span className="text-xs bg-[#E8F5EE] text-[#065A2C] px-2 py-0.5 rounded-full font-medium">Actif</span>
                    : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">{b.statut ?? "—"}</span>
                  }
                </td>
                <td className="px-4 py-2.5">
                  {confirmDeleteId === b.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(b.id)}
                      onCancel={() => setConfirmDeleteId(null)}
                      loading={deleteMut.isPending}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-[#087F3E]"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirmDeleteId(b.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal barème */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">{editBareme ? "Modifier le barème" : "Nouveau barème"}</h2>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                  >
                    <option value="rh">RH</option>
                    <option value="mtx">MTX</option>
                    <option value="mtl">MTL</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Catégorie</label>
                  <input
                    value={form.categorie}
                    onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="Ex. Sable et agrégats"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Désignation *</label>
                  <input
                    value={form.designation}
                    onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="Ex. Gravier 15/25"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Unité</label>
                  <input
                    value={form.unite}
                    onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="Ex. m³"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Prix unitaire (FCFA)</label>
                  <input
                    type="number"
                    value={form.prix_unitaire}
                    onChange={e => setForm(f => ({ ...f, prix_unitaire: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                    placeholder="0"
                    min={0}
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

// ─── Main Page ───────────────────────────────────────────────────────────────
const TAB_ITEMS = [
  { id: "circuit",      label: "Circuit",       icon: GitBranch },
  { id: "parametres",   label: "Paramètres",    icon: Settings },
  { id: "utilisateurs", label: "Utilisateurs",  icon: Users },
  { id: "roles",        label: "Rôles",         icon: Shield },
  { id: "baremes",      label: "Barèmes",       icon: Tags },
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
          {activeTab === "baremes"      && <TabBaremes />}
        </div>
      </div>
    </div>
  );
}
