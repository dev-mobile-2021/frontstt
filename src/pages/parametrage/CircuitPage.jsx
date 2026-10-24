import { useState } from "react";
import {
  Plus, Trash2, Edit2, Save, X,
  CheckCircle, ChevronUp, ChevronDown, Loader2, Shield,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import SearchSelect from "../../components/SearchSelect";
import { useToast } from "../../context/ToastContext";
import { useCircuitEtapes, useSaveCircuitEtape, useDeleteCircuitEtape, useReorderCircuit } from "../../hooks/useCircuit";
import { useRolesPaginated } from "../../hooks/useRoles";
import { Spinner, ConfirmDelete, MODULES, MODULE_STATUTS } from "./shared";

export default function CircuitPage() {
  const { addToast } = useToast();
  const [selectedModule, setSelectedModule] = useState("attachement");
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
    <div className="space-y-6">
      <PageHeader title="Circuit de validation" subtitle="Configuration des étapes de validation par module" />

      <div className="bg-white rounded-xl border border-gray-200 px-6 pb-8">
        <div className="space-y-5 pt-4">
          {/* Module selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Module :</label>
            <SearchSelect
              value={selectedModule}
              onChange={e => { setSelectedModule(e.target.value); setShowForm(false); setEditId(null); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            >
              {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </SearchSelect>
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
                      <SearchSelect
                        value={form.statut_avant}
                        onChange={e => setForm(f => ({ ...f, statut_avant: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                      >
                        <option value="">— Choisir —</option>
                        {(MODULE_STATUTS[selectedModule] ?? []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </SearchSelect>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Statut après</label>
                      <SearchSelect
                        value={form.statut_apres}
                        onChange={e => setForm(f => ({ ...f, statut_apres: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
                      >
                        <option value="">— Choisir —</option>
                        {(MODULE_STATUTS[selectedModule] ?? []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </SearchSelect>
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
      </div>
    </div>
  );
}
