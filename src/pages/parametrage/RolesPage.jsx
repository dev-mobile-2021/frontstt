import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Loader2 } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { useRolesPaginated, useSaveRole, useDeleteRole } from "../../hooks/useRoles";
import { Spinner, ConfirmDelete } from "./shared";

export default function RolesPage() {
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
    <div className="space-y-6">
      <PageHeader title="Rôles" subtitle="Gestion des rôles utilisateurs" />

      <div className="bg-white rounded-xl border border-line-200 px-6 pb-8">
        <div className="space-y-5 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">{roles.length} rôle(s)</p>
            <button onClick={openNew} className="flex items-center gap-1.5 text-xs text-[green-600] font-medium border border-[green-600] px-3 py-1.5 rounded-lg hover:bg-[green-50] transition-colors">
              <Plus size={12} /> Nouveau rôle
            </button>
          </div>

          <div className="border border-line-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-line-200">
                  {["Désignation", "Description", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-100">
                {isLoading && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center"><Spinner /></td></tr>
                )}
                {!isLoading && roles.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-400 text-sm">Aucun rôle configuré</td></tr>
                )}
                {roles.map(r => (
                  <tr key={r.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-ink-900">{r.designation}</td>
                    <td className="px-4 py-3 text-sm text-ink-500">{r.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      {confirmDeleteId === r.id ? (
                        <ConfirmDelete
                          onConfirm={() => handleDelete(r.id)}
                          onCancel={() => setConfirmDeleteId(null)}
                          loading={deleteMut.isPending}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(r)} className="text-ink-400 hover:text-[green-600]"><Edit2 size={14} /></button>
                          <button onClick={() => setConfirmDeleteId(r.id)} className="text-ink-400 hover:text-red-500"><Trash2 size={14} /></button>
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-line-100 sticky top-0 bg-white rounded-t-2xl">
                  <h2 className="text-base font-bold text-ink-900">{editRole ? "Modifier le rôle" : "Nouveau rôle"}</h2>
                  <button onClick={cancelForm} className="text-ink-400 hover:text-ink-500"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-ink-500 block mb-1">Désignation *</label>
                      <input
                        value={form.designation}
                        onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                        className="w-full border border-line-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[green-600]/30 focus:border-[green-600]"
                        placeholder="Ex. Directeur Général"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-500 block mb-1">Description</label>
                      <input
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full border border-line-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[green-600]/30 focus:border-[green-600]"
                        placeholder="Description du rôle"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saveMut.isPending || !form.designation}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[green-600] hover:bg-[green-700] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Enregistrer
                    </button>
                    <button onClick={cancelForm} className="flex items-center gap-1.5 border border-line-200 text-ink-700 px-4 py-2 rounded-lg text-sm hover:bg-surface-50">
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
