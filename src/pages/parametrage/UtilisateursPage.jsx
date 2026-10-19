import { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Save, X, Loader2, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import SearchSelect from "../../components/SearchSelect";
import { useToast } from "../../context/ToastContext";
import { useUsersPaginated, useSaveUser, useDeleteUser } from "../../hooks/useUsers";
import { useRolesPaginated } from "../../hooks/useRoles";
import { Spinner, ConfirmDelete } from "./shared";

const EMPTY_USER = { login: "", nom: "", prenom: "", email: "", password: "", role_id: "" };

export default function UtilisateursPage() {
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
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatut, setFilterStatut] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      const matchSearch = !q ||
        (u.login ?? "").toLowerCase().includes(q) ||
        (u.nom ?? "").toLowerCase().includes(q) ||
        (u.prenom ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q);
      const matchRole = !filterRole || String(u.role_id) === filterRole;
      const matchStatut = filterStatut === "" || String(u.etat) === filterStatut;
      return matchSearch && matchRole && matchStatut;
    });
  }, [users, search, filterRole, filterStatut]);

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
    <div className="space-y-6">
      <PageHeader title="Utilisateurs" subtitle="Gestion des comptes utilisateurs de la plateforme" />

      <div className="bg-white rounded-xl border border-gray-200 px-6 pb-8">
        <div className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Recherche */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher nom, login, email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
              />
            </div>
            {/* Filtre rôle */}
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] text-gray-600"
            >
              <option value="">Tous les rôles</option>
              {roles.map(r => <option key={r.id} value={String(r.id)}>{r.designation}</option>)}
            </select>
            {/* Filtre statut */}
            <select
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] text-gray-600"
            >
              <option value="">Tous les statuts</option>
              <option value="1">Actif</option>
              <option value="0">Inactif</option>
            </select>
            <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length} / {users.length}</span>
            <button onClick={openNew} className="ml-auto flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors whitespace-nowrap">
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
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun utilisateur trouvé</td></tr>
                )}
                {filtered.map(u => (
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
      </div>
    </div>
  );
}
