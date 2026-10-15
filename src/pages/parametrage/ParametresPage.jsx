import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { useParametresPaginated, useUpdateParametre } from "../../hooks/useParametres";
import { Spinner } from "./shared";

export default function ParametresPage() {
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
    return (
      <div className="space-y-6">
        <PageHeader title="Paramètres" subtitle="Configuration générale de la plateforme" />
        <div className="flex justify-center py-12"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Configuration générale de la plateforme" />

      <div className="bg-white rounded-xl border border-gray-200 px-6 pb-8">
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
      </div>
    </div>
  );
}
