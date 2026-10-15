import { useState, Fragment } from "react";
import {
  Plus, Trash2, Edit2, Save, X,
  ChevronUp, ChevronDown, Loader2, Search, Upload, Download,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { useBaremeGeneral, useAddBaremeGeneral, useSetPrixGeneral, useRemoveBaremeGeneral, useHistoriqueBaremeGeneral, useRefreshBareme } from "../../hooks/useBaremeHierarchie";
import { baremeHierarchieService } from "../../services/baremeHierarchieService";
import ImportBaremeDialog from "../../components/ImportBaremeDialog";
import { telechargerModeleBareme } from "../../utils/baremeModele";
import ArticleX3Select from "../../components/ArticleX3Select";
import { Spinner, ConfirmDelete } from "./shared";

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

export default function BaremesPage() {
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
    <div className="space-y-6">
      <PageHeader title="Barèmes généraux" subtitle="Prix de base de la CSE hérités par chantiers et contrats" />

      <div className="bg-white rounded-xl border border-gray-200 px-6 pb-8">
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
      </div>
    </div>
  );
}
