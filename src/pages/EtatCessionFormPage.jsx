import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Save, Loader2, Plus, X, Trash2,
  CheckCircle2, XCircle, Search, FileText, Fuel,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import {
  useEtatCession, useSaveEtatCession, useSaveLigneEC,
  useDeleteLigneEC, useEtatCessionStatut, useDeleteEtatCession,
} from "../hooks/useEtatsCession";
import { useContratsPaginated } from "../hooks/useContrats";
import { useContratBaremes } from "../hooks/useContratBaremes";
import { x3Service } from "../services/x3Service";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { SkeletonCard } from "../components/Skeleton";

const fmtNum  = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Rôles DCG — ne voient pas le bloc RH
const DCG_ROLES = ["DCG", "Assistant DCG"];

const POSTE_CONFIG = {
  MTX: {
    label:  "Cession Matériaux (MTX)",
    color:  { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500", btn: "text-blue-600" },
    prixEditable: false,
    hasBonTransfert: true,
  },
  GASOIL: {
    label:  "Gasoil",
    color:  { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-400", btn: "text-orange-600" },
    prixEditable: true,
    hasBonTransfert: false,
  },
  MTL: {
    label:  "Cession Matériel (MTL)",
    color:  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500", btn: "text-violet-600" },
    prixEditable: false,
    hasBonTransfert: false,
    gmao: true,
  },
  RH: {
    label:  "Ressources Humaines (RH)",
    color:  { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", dot: "bg-green-500", btn: "text-green-600" },
    prixEditable: false,
    hasBonTransfert: false,
  },
};

const LIGNE_INIT = { bareme_cb_id: "", designation: "", unite: "", quantite: "", prix_unitaire: "", bon_transfert: "" };

// Mapping poste → type barème
const POSTE_TO_TYPE = { MTX: "mtx", MTL: "mtl", RH: "rh" };

// ─── Bloc par poste ──────────────────────────────────────────────
function PosteSection({ poste, lignes, canEdit, etatId, contratBaremes, x3Config }) {
  const { addToast }                = useToast();
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(LIGNE_INIT);
  const [confirmDel, setConfirmDel] = useState(null);
  const [x3Loading, setX3Loading]   = useState(false);
  const [x3Preview, setX3Preview]   = useState(null); // lignes proposées par X3

  const saveMut   = useSaveLigneEC();
  const deleteMut = useDeleteLigneEC();

  const cfg   = POSTE_CONFIG[poste];
  const c     = cfg.color;
  const total = lignes.reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);

  // Articles du barème contrat pour ce type (MTX/MTL/RH) — vide pour GASOIL
  const baremeType = POSTE_TO_TYPE[poste] ?? null;
  const articlesBareme = baremeType
    ? contratBaremes.filter(cb => cb.bareme?.type === baremeType)
    : [];
  const useBareme = articlesBareme.length > 0;

  // Quand l'utilisateur sélectionne un article du barème
  function handleSelectArticle(cbId) {
    if (!cbId) { setForm(LIGNE_INIT); return; }
    const cb = articlesBareme.find(a => String(a.id) === String(cbId));
    if (!cb) return;
    const prix = cb.prix_contrat != null ? parseFloat(cb.prix_contrat) : parseFloat(cb.bareme?.prix_unitaire ?? 0);
    setForm(f => ({
      ...f,
      bareme_cb_id:  cb.id,
      designation:   cb.bareme?.designation ?? "",
      unite:         cb.bareme?.unite ?? "",
      prix_unitaire: String(prix),
    }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.designation) return addToast("Désignation obligatoire.", "error");
    if (!form.quantite)    return addToast("Quantité obligatoire.", "error");
    if (cfg.prixEditable && !form.prix_unitaire) return addToast("Prix unitaire obligatoire.", "error");
    try {
      await saveMut.mutateAsync({
        etat_cession_id: parseInt(etatId, 10),
        poste,
        designation:    form.designation,
        unite:          form.unite || null,
        quantite:       parseFloat(form.quantite),
        prix_unitaire:  parseFloat(form.prix_unitaire || 0),
        bon_transfert:  form.bon_transfert || null,
      });
      addToast("Ligne ajoutée.", "success");
      setShowForm(false);
      setForm(LIGNE_INIT);
    } catch (err) {
      addToast(err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMut.mutateAsync(id);
      setConfirmDel(null);
    } catch {
      addToast("Erreur suppression.", "error");
    }
  }

  async function handleX3Import() {
    if (!x3Config?.chantier_code) return addToast("Ce chantier n'a pas de code X3 configuré.", "error");
    setX3Loading(true);
    try {
      const rows = await x3Service.getCessionsMtx({
        chantier_code: x3Config.chantier_code,
        periode_debut: x3Config.periode_debut,
        periode_fin:   x3Config.periode_fin,
      });
      // Filtre : seulement les articles MTX (pas GASOIL)
      const mtxRows = rows.filter(r => r.code_article !== "GASOIL");
      if (mtxRows.length === 0) return addToast("Aucune donnée X3 pour cette période.", "info");
      setX3Preview(mtxRows);
    } catch {
      addToast("Erreur lors de la récupération des données X3.", "error");
    } finally {
      setX3Loading(false);
    }
  }

  async function confirmX3Import() {
    if (!x3Preview) return;
    try {
      for (const row of x3Preview) {
        await saveMut.mutateAsync({
          etat_cession_id: parseInt(etatId, 10),
          poste,
          designation:   row.designation,
          unite:         row.unite,
          quantite:      parseFloat(row.quantite),
          prix_unitaire: parseFloat(row.prix_unitaire),
          bon_transfert: null,
        });
      }
      addToast(`${x3Preview.length} lignes importées depuis X3.`, "success");
      setX3Preview(null);
    } catch {
      addToast("Erreur lors de l'import X3.", "error");
    }
  }

  const montantPreview = form.quantite && form.prix_unitaire
    ? parseFloat(form.quantite) * parseFloat(form.prix_unitaire)
    : 0;

  return (
    <div className={`border rounded-2xl overflow-hidden ${c.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3.5 ${c.bg} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className="text-sm font-semibold text-gray-900">{cfg.label}</span>
          {cfg.gmao && <span className="text-[10px] px-2 py-0.5 bg-violet-200 text-violet-700 rounded-full font-medium">GMAO</span>}
          {cfg.prixEditable && <span className="text-[10px] px-2 py-0.5 bg-orange-200 text-orange-700 rounded-full font-medium">Prix libre</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
            {lignes.length} ligne{lignes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-800">{fmtNum(total)} FCFA</span>
          {canEdit && poste === "MTX" && x3Config?.chantier_code && (
            <button onClick={handleX3Import} disabled={x3Loading}
              className="inline-flex items-center gap-1 text-xs font-medium bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {x3Loading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
              Charger X3
            </button>
          )}
          {canEdit && !cfg.gmao && (
            <button onClick={() => { setShowForm(s => !s); setForm(LIGNE_INIT); }}
              className={`text-xs font-medium hover:underline ${c.btn}`}>
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Bons de transfert (MTX seulement) */}
      {poste === "MTX" && lignes.length > 0 && (() => {
        const bts = [...new Set(lignes.map(l => l.bon_transfert).filter(Boolean))];
        if (bts.length === 0) return null;
        return (
          <div className="px-5 py-3 border-b border-blue-100 bg-blue-50/40">
            <p className="text-xs font-semibold text-blue-700 mb-2">
              Bons de transfert ({bts.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {bts.map(bt => (
                <span key={bt} className="inline-flex items-center gap-1 text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full">
                  <FileText size={10} /> {bt}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* GMAO notice */}
      {cfg.gmao && lignes.length === 0 && (
        <div className="px-5 py-6 text-center text-sm text-violet-400 bg-violet-50/40">
          En attente des données GMAO — les lignes MTL sont importées automatiquement.
        </div>
      )}

      {/* Tableau lignes */}
      {(!cfg.gmao || lignes.length > 0) && lignes.length === 0 && !showForm ? (
        <div className="px-5 py-6 text-center text-sm text-gray-400">
          Aucune ligne. {canEdit && "Cliquez sur « Ajouter » pour commencer."}
        </div>
      ) : lignes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Désignation</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Unité</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-24">Quantité</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">
                  Prix unit. {cfg.prixEditable ? <span className="text-orange-400">✏</span> : <span className="text-gray-300">🔒</span>}
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-32">Montant</th>
                {cfg.hasBonTransfert && <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Bon transfert</th>}
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lignes.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-800">{l.designation}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs uppercase">{l.unite || "—"}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{fmtNum(l.quantite)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-600">{fmtNum(l.prix_unitaire)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-800">{fmtNum(l.montant)} FCFA</td>
                  {cfg.hasBonTransfert && (
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {l.bon_transfert
                        ? <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"><FileText size={10} /> {l.bon_transfert}</span>
                        : "—"}
                    </td>
                  )}
                  {canEdit && (
                    <td className="pr-3 py-2.5 text-right">
                      {confirmDel === l.id ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <button onClick={() => handleDelete(l.id)} className="text-red-600 font-medium">Oui</button>
                          <button onClick={() => setConfirmDel(null)} className="text-gray-400 ml-1">Non</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDel(l.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={cfg.hasBonTransfert ? 4 : 4} className="px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total {cfg.label}
                </td>
                <td className="px-5 py-2.5 text-right font-bold text-gray-900">{fmtNum(total)} FCFA</td>
                {cfg.hasBonTransfert && <td />}
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Prévisualisation import X3 */}
      {x3Preview && (
        <div className="border-t border-blue-200 bg-blue-50 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-800">
              {x3Preview.length} article{x3Preview.length > 1 ? "s" : ""} trouvé{x3Preview.length > 1 ? "s" : ""} dans X3 — confirmer l'import ?
            </p>
            <button onClick={() => setX3Preview(null)} className="text-blue-400 hover:text-blue-600"><X size={16} /></button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-blue-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-100 text-blue-700">
                  <th className="text-left px-3 py-2">Désignation</th>
                  <th className="text-left px-3 py-2">Unité</th>
                  <th className="text-right px-3 py-2">Quantité</th>
                  <th className="text-right px-3 py-2">Prix unit.</th>
                  <th className="text-right px-3 py-2">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 bg-white">
                {x3Preview.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-gray-800">{r.designation}</td>
                    <td className="px-3 py-1.5 text-gray-500 uppercase">{r.unite}</td>
                    <td className="px-3 py-1.5 text-right">{fmtNum(r.quantite)}</td>
                    <td className="px-3 py-1.5 text-right">{fmtNum(r.prix_unitaire)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmtNum(parseFloat(r.quantite) * parseFloat(r.prix_unitaire))} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setX3Preview(null)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
            <button onClick={confirmX3Import} disabled={saveMut.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Importer {x3Preview.length} ligne{x3Preview.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Formulaire ajout inline */}
      {showForm && canEdit && (
        <div className={`border-t ${c.border} ${c.bg} px-5 py-4`}>
          <form onSubmit={handleAdd}>

            {/* Saisie via barème (MTX / MTL / RH avec articles définis) */}
            {useBareme ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Article du barème *</label>
                  <select
                    value={form.bareme_cb_id}
                    onChange={e => handleSelectArticle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none"
                    autoFocus
                  >
                    <option value="">— Sélectionner un article —</option>
                    {articlesBareme.map(cb => (
                      <option key={cb.id} value={cb.id}>
                        {cb.bareme?.designation} — {fmtNum(cb.prix_contrat ?? cb.bareme?.prix_unitaire)} FCFA / {cb.bareme?.unite}
                      </option>
                    ))}
                  </select>
                </div>

                {form.bareme_cb_id && (
                  <div className={`grid gap-3 items-end ${cfg.hasBonTransfert ? "grid-cols-[120px_160px_auto]" : "grid-cols-[120px_auto]"}`}>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500 font-medium">Quantité *</label>
                      <input type="number" value={form.quantite}
                        onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                        required min="0" step="any" placeholder="0" autoFocus
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
                    </div>
                    {cfg.hasBonTransfert && (
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 font-medium">Bon de transfert</label>
                        <input type="text" value={form.bon_transfert}
                          onChange={e => setForm(f => ({ ...f, bon_transfert: e.target.value }))}
                          placeholder="BT-2026-001"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
                      </div>
                    )}
                    <div className="flex items-end gap-2 pb-0.5">
                      <button type="submit" disabled={saveMut.isPending}
                        className="inline-flex items-center gap-1 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
                        {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} OK
                      </button>
                      <button type="button" onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                    </div>
                  </div>
                )}

                {!form.bareme_cb_id && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
                  </div>
                )}
              </div>
            ) : (
              /* Saisie libre (GASOIL ou barème vide) */
              <div className={`grid gap-3 items-end ${cfg.hasBonTransfert ? "grid-cols-[1fr_70px_90px_110px_140px_auto]" : "grid-cols-[1fr_70px_90px_110px_auto]"}`}>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Désignation *</label>
                  <input type="text" value={form.designation}
                    onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                    autoFocus required placeholder="Description…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Unité</label>
                  <input type="text" value={form.unite}
                    onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}
                    placeholder="T, L…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Quantité *</label>
                  <input type="number" value={form.quantite}
                    onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                    required min="0" step="any" placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Prix unit. {cfg.prixEditable && <span className="text-orange-500">*</span>}</label>
                  <input type="number" value={form.prix_unitaire}
                    onChange={e => setForm(f => ({ ...f, prix_unitaire: e.target.value }))}
                    required={cfg.prixEditable} min="0" step="any" placeholder="0"
                    disabled={!cfg.prixEditable}
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${cfg.prixEditable ? "border-orange-300 focus:ring-2 focus:ring-orange-400" : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"}`} />
                </div>
                {cfg.hasBonTransfert && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Bon de transfert</label>
                    <input type="text" value={form.bon_transfert}
                      onChange={e => setForm(f => ({ ...f, bon_transfert: e.target.value }))}
                      placeholder="BT-2026-001"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
                  </div>
                )}
                <div className="flex items-end gap-2 pb-0.5">
                  <button type="submit" disabled={saveMut.isPending}
                    className="inline-flex items-center gap-1 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60 whitespace-nowrap">
                    {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} OK
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
              </div>
            )}

            {montantPreview > 0 && (
              <p className="text-xs text-[#087F3E] font-medium mt-2">
                Montant : {fmtNum(montantPreview)} FCFA
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────
export default function EtatCessionFormPage() {
  const { id }          = useParams();
  const isNew           = !id || id === "nouveau";
  const navigate        = useNavigate();
  const { addToast }    = useToast();
  const { currentUser } = useUser();
  const [searchParams]  = useSearchParams();

  const isDCG = DCG_ROLES.includes(currentUser?.role?.designation);

  // Postes visibles selon profil
  const POSTES_VISIBLES = isNew ? [] :
    Object.keys(POSTE_CONFIG).filter(p => !(p === "RH" && isDCG));

  const [form, setForm]           = useState({ contrat_id: searchParams.get("contrat_id") ?? "", periode_debut: "", periode_fin: "", observations: "" });
  const [pendingStatut, setPendingStatut] = useState(null);

  const { data: etat, isLoading, isError } = useEtatCession(isNew ? null : id);
  const { data: contratsData } = useContratsPaginated({ count: 200 });
  const contrats = contratsData?.data ?? [];

  const saveMut   = useSaveEtatCession();
  const statutMut = useEtatCessionStatut();
  const deleteMut = useDeleteEtatCession();

  useEffect(() => {
    if (!isNew && etat) {
      setForm({
        contrat_id:    etat.contrat_id ?? "",
        periode_debut: etat.periode_debut?.slice(0, 10) ?? "",
        periode_fin:   etat.periode_fin?.slice(0, 10)   ?? "",
        observations:  etat.observations ?? "",
      });
    }
  }, [isNew, etat]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.contrat_id)    return addToast("Sélectionnez un contrat.", "error");
    if (!form.periode_debut) return addToast("La date de début est obligatoire.", "error");
    if (!form.periode_fin)   return addToast("La date de fin est obligatoire.", "error");

    const payload = {
      contrat_id:    parseInt(form.contrat_id, 10),
      periode_debut: form.periode_debut,
      periode_fin:   form.periode_fin,
      observations:  form.observations || null,
    };
    if (!isNew) payload.id = parseInt(id, 10);

    try {
      const res = await saveMut.mutateAsync(payload);
      addToast(isNew ? "État de cession créé." : "Mis à jour.", "success");
      const newId = res?.data?.id ?? id;
      navigate(`/etats-cession/${newId}`, { replace: true });
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? err.response?.data?.error ?? "Erreur.", "error");
    }
  }

  async function handleStatut(statut) {
    try {
      await statutMut.mutateAsync({ id: parseInt(id, 10), statut });
      addToast("Statut mis à jour.", "success");
      setPendingStatut(null);
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  async function handleDelete() {
    try {
      await deleteMut.mutateAsync(parseInt(id, 10));
      addToast("État de cession supprimé.", "success");
      navigate("/etats-cession");
    } catch (err) {
      addToast(err.response?.data?.errors?.[0] ?? "Erreur.", "error");
    }
  }

  if (!isNew && isLoading) return <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  if (!isNew && (isError || !etat)) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <p className="text-lg font-semibold">État de cession introuvable</p>
      <button onClick={() => navigate("/etats-cession")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour</button>
    </div>
  );

  const canEdit = isNew || etat?.statut === "brouillon";
  const lignes  = etat?.lignes ?? [];
  const totalEC = lignes.reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);

  const contratIdForBareme = !isNew && etat ? etat.contrat_id : null;
  const { data: contratBaremes = [] } = useContratBaremes(contratIdForBareme);

  const x3Config = !isNew && etat ? {
    chantier_code: etat.contrat?.chantier?.code_x3 ?? null,
    periode_debut: etat.periode_debut?.slice(0, 10) ?? null,
    periode_fin:   etat.periode_fin?.slice(0, 10)   ?? null,
  } : null;

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#087F3E] focus:border-[#087F3E] outline-none";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/etats-cession")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> États de cession
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{isNew ? "Nouvel état de cession" : etat?.code}</span>
      </div>

      <PageHeader
        title={isNew ? "Nouvel état de cession" : etat.code}
        subtitle={isNew ? "Renseignez le contrat et la période" :
          [etat.contrat?.code, etat.contrat?.chantier?.designation, etat.contrat?.soustraitant?.raison_sociale].filter(Boolean).join(" · ")}
        action={!isNew && (
          <div className="flex items-center gap-2">
            {/* Bouton raccourci CONSULTATION */}
            <Link
              to="/etats-cession/consultation"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-2 border-[#087F3E] text-[#087F3E] rounded-lg hover:bg-[#087F3E] hover:text-white transition-all"
            >
              <Search size={13} /> CONSULTATION
            </Link>
            <StatusBadge statut={etat.statut} />
            {etat.statut === "brouillon" && (
              <button onClick={() => setPendingStatut("soumis")}
                className="px-4 py-2 bg-[#087F3E] text-white rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
                Soumettre
              </button>
            )}
            {etat.statut === "soumis" && (
              <>
                <button onClick={() => setPendingStatut("valide")}
                  className="px-4 py-2 bg-[#087F3E] text-white rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
                  Valider / Arrêter
                </button>
                <button onClick={() => setPendingStatut("rejete")}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                  Rejeter
                </button>
              </>
            )}
          </div>
        )}
      />

      {/* Infos globales */}
      {!isNew && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Période</p>
              <p className="text-sm font-semibold text-gray-800">
                {fmtDate(etat.periode_debut)} → {fmtDate(etat.periode_fin)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contrat</p>
              <Link to={`/contrats/${etat.contrat_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline">
                {etat.contrat?.code ?? "—"}
              </Link>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sous-traitant</p>
              <p className="text-sm text-gray-700">{etat.contrat?.soustraitant?.raison_sociale ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total consolidé</p>
              <p className="text-xl font-bold text-gray-900">{fmtNum(etat.montant_total ?? totalEC)} FCFA</p>
            </div>
          </div>
          {etat.statut === "rejete" && etat.motif_rejet && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <XCircle size={16} /> Rejeté — {etat.motif_rejet}
            </div>
          )}
          {etat.statut === "valide" && (
            <div className="mt-4 flex items-center gap-2 bg-[#E8F5EE] border border-[#087F3E]/30 rounded-lg px-4 py-3 text-sm text-[#087F3E]">
              <CheckCircle2 size={16} /> Arrêté et validé — consommable par les décomptes
            </div>
          )}
          {canEdit && etat.statut === "brouillon" && (
            <div className="mt-4 flex justify-end">
              <button onClick={() => setPendingStatut("brouillon_delete")}
                className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Supprimer cet état de cession
              </button>
            </div>
          )}
        </div>
      )}

      {/* Formulaire création */}
      {isNew && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Contrat</h3>
            <select value={form.contrat_id} onChange={e => set("contrat_id", e.target.value)} className={inputCls}>
              <option value="">— Sélectionner un contrat actif —</option>
              {contrats.filter(c => c.statut === "actif").map(c => (
                <option key={c.id} value={c.id}>{c.code} · {c.soustraitant?.raison_sociale ?? "?"} · {c.objet}</option>
              ))}
            </select>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Période de travaux</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Date début *</label>
                <input type="date" value={form.periode_debut}
                  onChange={e => { const v = e.target.value; setForm(f => ({ ...f, periode_debut: v, periode_fin: f.periode_fin < v ? "" : f.periode_fin })); }}
                  className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Date fin *</label>
                <input type="date" value={form.periode_fin} min={form.periode_debut || undefined}
                  onChange={e => set("periode_fin", e.target.value)} disabled={!form.periode_debut}
                  className={inputCls} />
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Observations</label>
            <textarea value={form.observations} onChange={e => set("observations", e.target.value)}
              rows={3} placeholder="Remarques éventuelles…" className={`${inputCls} resize-none`} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/etats-cession")}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">Annuler</button>
            <button type="submit" disabled={saveMut.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087F3E] hover:bg-[#065A2C] text-white rounded-lg text-sm font-medium disabled:opacity-60">
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Créer l'état de cession
            </button>
          </div>
        </form>
      )}

      {/* Blocs par poste */}
      {!isNew && (
        <div className="space-y-5">
          {POSTES_VISIBLES.map(poste => (
            <PosteSection
              key={poste}
              poste={poste}
              lignes={lignes.filter(l => l.poste === poste)}
              canEdit={canEdit}
              etatId={id}
              contratBaremes={contratBaremes}
              x3Config={x3Config}
            />
          ))}

          {/* Résumé total */}
          {lignes.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {POSTES_VISIBLES.map(poste => {
                  const montant = lignes.filter(l => l.poste === poste).reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);
                  const cfg = POSTE_CONFIG[poste];
                  const c   = cfg.color;
                  return (
                    <div key={poste} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{poste}</p>
                      <p className="text-lg font-bold text-gray-900">{fmtNum(montant)} FCFA</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Total consolidé</span>
                <span className="text-xl font-bold text-[#087F3E]">{fmtNum(totalEC)} FCFA</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmation statut */}
      {pendingStatut && pendingStatut !== "brouillon_delete" && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPendingStatut(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {pendingStatut === "soumis" ? "Soumettre l'état de cession ?" :
               pendingStatut === "valide" ? "Valider et arrêter l'état de cession ?" :
               "Rejeter l'état de cession ?"}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {pendingStatut === "valide" ? "L'état sera arrêté et consommable par les décomptes." :
               pendingStatut === "soumis" ? "L'état passera en contrôle DCG." : "Cette action est irréversible."}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPendingStatut(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={() => handleStatut(pendingStatut)} disabled={statutMut.isPending}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 text-white
                  ${pendingStatut === "rejete" ? "bg-red-500 hover:bg-red-600" : "bg-[#087F3E] hover:bg-[#065A2C]"}`}>
                {statutMut.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {pendingStatut === "brouillon_delete" && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPendingStatut(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Supprimer l'état de cession ?</h3>
            <p className="text-sm text-gray-500 mb-5">Toutes les lignes seront supprimées. Action irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPendingStatut(null)} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-60">
                {deleteMut.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
