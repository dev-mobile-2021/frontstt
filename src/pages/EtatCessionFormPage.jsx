import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Save, Loader2, Plus, X, Trash2,
  CheckCircle2, XCircle, Search, FileText, Fuel, FileDown, Sheet,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import {
  useEtatCession, useSaveEtatCession, useSaveLigneEC,
  useDeleteLigneEC, useEtatCessionStatut, useEtatCessionStatutBloc, useDeleteEtatCession,
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
  },
  GASOIL: {
    label:  "Gasoil",
    color:  { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-400", btn: "text-orange-600" },
    prixEditable: true,
  },
  MTL: {
    label:  "Cession Matériel (MTL)",
    color:  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500", btn: "text-violet-600" },
    prixEditable: false,
    gmao: true,
  },
  RH: {
    label:  "Ressources Humaines (RH)",
    color:  { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700", dot: "bg-green-500", btn: "text-green-600" },
    prixEditable: false,
  },
};

const LIGNE_INIT = { bareme_cb_id: "", designation: "", unite: "", quantite: "", prix_unitaire: "" };

// Mapping poste → type barème
const POSTE_TO_TYPE = { MTX: "mtx", GASOIL: "gasoil", MTL: "mtl", RH: "rh" };

// Labels statuts bloc
const STATUT_BLOC_LABEL = {
  vide:         { label: "Vide",               color: "bg-gray-100 text-gray-500" },
  alimente:     { label: "Alimenté",           color: "bg-blue-100 text-blue-700" },
  qte_visees:   { label: "Quantités visées",   color: "bg-amber-100 text-amber-700" },
  prix_valides: { label: "Prix validés",       color: "bg-green-100 text-green-700" },
  arrete:       { label: "Arrêté",             color: "bg-purple-100 text-purple-700" },
};

// ─── Bloc par poste ──────────────────────────────────────────────
function PosteSection({ poste, lignes, canEdit, etatId, contratBaremes, x3Config, statutBloc, onStatutBloc, viseQtePar, viseQteLe, visePrixPar, visePrixLe, onDownloadBon }) {
  const { addToast }                = useToast();
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(LIGNE_INIT);
  const [confirmDel, setConfirmDel] = useState(null);
  const [x3Loading, setX3Loading]   = useState(false);
  const [editingLigne, setEditingLigne] = useState(null);
  const [editLignePrix, setEditLignePrix] = useState("");

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

  // Trouve le prix contrat pour un article X3 (par code_article → bareme.code)
  function getPrixBareme(codeArticle) {
    const cb = contratBaremes.find(cb => cb.bareme?.code === codeArticle);
    return cb?.prix_contrat ?? null;
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
      const gasoilCodes = contratBaremes
        .filter(cb => cb.bareme?.type === "gasoil")
        .map(cb => cb.bareme?.code);
      const filtered = poste === "GASOIL"
        ? rows.filter(r => gasoilCodes.includes(r.code_article))
        : rows.filter(r => !gasoilCodes.includes(r.code_article));

      if (filtered.length === 0) return addToast("Aucune donnée X3 pour cette période.", "info");

      // Supprimer les lignes existantes pour ce poste avant de réimporter
      for (const l of lignes) {
        await deleteMut.mutateAsync(l.id);
      }

      for (const row of filtered) {
        const prixBareme = getPrixBareme(row.code_article);
        const prixX3     = parseFloat(row.prix_unitaire);
        const prix       = prixBareme ?? (isNaN(prixX3) ? 0 : prixX3);
        await saveMut.mutateAsync({
          etat_cession_id: parseInt(etatId, 10),
          poste,
          code_article:  row.code_article ?? null,
          date_sortie:   row.date_sortie ?? null,
          ref_bs:        row.ref_bs ?? null,
          ref_br:        row.ref_br ?? null,
          designation:   row.designation,
          unite:         row.unite ?? null,
          quantite:      parseFloat(row.quantite) || 0,
          prix_unitaire: prix,
        });
      }
      addToast(`${filtered.length} lignes importées depuis X3.`, "success");
    } catch (err) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Erreur inconnue";
      addToast(`Erreur import X3 : ${msg}`, "error");
    } finally {
      setX3Loading(false);
    }
  }

  async function handleUpdateLignePrix(ligneId) {
    const prix = parseFloat(editLignePrix);
    if (isNaN(prix) || prix < 0) return addToast("Prix invalide.", "error");
    const l = lignes.find(l => l.id === ligneId);
    if (!l) return;
    try {
      await saveMut.mutateAsync({
        id:              ligneId,
        etat_cession_id: parseInt(etatId, 10),
        poste,
        code_article:    l.code_article ?? null,
        date_sortie:     l.date_sortie  ?? null,
        ref_bs:          l.ref_bs       ?? null,
        ref_br:          l.ref_br       ?? null,
        designation:     l.designation  ?? "",
        unite:           l.unite        ?? "",
        quantite:        l.quantite     ?? 0,
        prix_unitaire:   prix,
      });
      setEditingLigne(null);
      addToast("Prix mis à jour.", "success");
    } catch (err) {
      addToast(err?.response?.data?.error ?? "Erreur.", "error");
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
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
            {lignes.length} ligne{lignes.length !== 1 ? "s" : ""}
          </span>
          {statutBloc && (() => {
            const s = STATUT_BLOC_LABEL[statutBloc] ?? STATUT_BLOC_LABEL.vide;
            return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
          })()}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{fmtNum(total)} FCFA</span>
          {/* Boutons validation bloc */}
          {statutBloc === "alimente" && onStatutBloc && (
            <button onClick={() => onStatutBloc(poste.toLowerCase(), "qte_visees")}
              className="inline-flex items-center gap-1 text-xs font-medium bg-amber-500 text-white px-2.5 py-1 rounded-lg hover:bg-amber-600">
              <CheckCircle2 size={11} /> Viser quantités
            </button>
          )}
          {statutBloc === "qte_visees" && onStatutBloc && (
            <>
              <button onClick={() => onStatutBloc(poste.toLowerCase(), "prix_valides")}
                className="inline-flex items-center gap-1 text-xs font-medium bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700">
                <CheckCircle2 size={11} /> Valider les prix
              </button>
              <button onClick={() => onStatutBloc(poste.toLowerCase(), "alimente")}
                className="inline-flex items-center gap-1 text-xs font-medium bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">
                <XCircle size={11} /> Rejeter
              </button>
            </>
          )}
          {/* prix_valides = état final du bloc — aucun bouton de régression */}
          {/* Charger X3 pour MTX et GASOIL */}
          {canEdit && (poste === "MTX" || poste === "GASOIL") && x3Config?.chantier_code && (
            <button onClick={handleX3Import} disabled={x3Loading}
              className="inline-flex items-center gap-1 text-xs font-medium bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {x3Loading ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
              Charger X3
            </button>
          )}
          {canEdit && !cfg.gmao && poste !== "MTX" && poste !== "GASOIL" && statutBloc !== "prix_valides" && (
            <button onClick={() => { setShowForm(s => !s); setForm(LIGNE_INIT); }}
              className={`text-xs font-medium hover:underline ${c.btn}`}>
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Traceabilité */}
      {(viseQtePar || visePrixPar) && (
        <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/60 text-xs text-gray-500 flex flex-wrap gap-3">
          {viseQtePar && (
            <span>
              Quantités visées par <strong className="text-gray-700">{viseQtePar}</strong>
              {viseQteLe && <> le {new Date(viseQteLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</>}
            </span>
          )}
          {visePrixPar && (
            <span>
              · Montants visés par <strong className="text-gray-700">{visePrixPar}</strong>
              {visePrixLe && <> le {new Date(visePrixLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</>}
            </span>
          )}
        </div>
      )}

      {/* Bons de transfert (MTX seulement) */}
      {poste === "MTX" && lignes.length > 0 && (() => {
        const bsList = [...new Map(lignes.filter(l => l.ref_bs).map(l => [l.ref_bs, { ref: l.ref_bs, date: l.date_sortie }])).values()];
        const brList = [...new Map(lignes.filter(l => l.ref_br).map(l => [l.ref_br, { ref: l.ref_br }])).values()];
        const allRefs = [
          ...bsList.map(b => ({ ref: b.ref, date: b.date, type: "bs" })),
          ...brList.map(b => ({ ref: b.ref, date: null, type: "br" })),
        ];
        if (allRefs.length === 0) return null;
        const fmtD = d => d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" }) : null;
        return (
          <div className="px-5 py-3 border-b border-blue-100 bg-blue-50/30">
            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <FileText size={11} /> Bons de transfert ({allRefs.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {allRefs.map(r => (
                <button key={r.ref}
                  onClick={() => onDownloadBon && onDownloadBon(r.ref)}
                  className="inline-flex items-center gap-1.5 text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-mono hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer">
                  <FileDown size={10} />
                  {r.ref}
                  {r.date && <span className="text-blue-400 font-sans">· {fmtD(r.date)}</span>}
                </button>
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
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Code article</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Désignation</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Unité</th>
                {poste === "MTX" && <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-24">Date sortie</th>}
                {poste === "MTX" && <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Réf. BS</th>}
                {poste === "MTX" && <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Réf. BR</th>}
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-24">Quantité</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">
                  Prix unit. <span className="text-gray-300 text-xs">✏</span>
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-32">Montant</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lignes.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5">
                    {l.code_article
                      ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l.code_article}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-800">{l.designation}</td>
                  {poste === "MTX" && <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{l.date_sortie ? new Date(l.date_sortie).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>}
                  {poste === "MTX" && <td className="px-3 py-2.5"><span className="font-mono text-xs text-blue-600">{l.ref_bs ?? "—"}</span></td>}
                  {poste === "MTX" && <td className="px-3 py-2.5"><span className="font-mono text-xs text-green-600">{l.ref_br ?? "—"}</span></td>}
                  <td className="px-3 py-2.5 text-gray-500 text-xs uppercase">{l.unite || "—"}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{fmtNum(l.quantite)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    {canEdit && editingLigne === l.id ? (
                      <input type="number" min="0" step="any" value={editLignePrix}
                        onChange={e => setEditLignePrix(e.target.value)}
                        onBlur={() => handleUpdateLignePrix(l.id)}
                        onKeyDown={e => { if (e.key === "Enter") handleUpdateLignePrix(l.id); if (e.key === "Escape") setEditingLigne(null); }}
                        className="w-28 border border-[#087F3E] rounded px-1.5 py-1 text-xs text-right focus:ring-1 focus:ring-[#087F3E] outline-none"
                        autoFocus />
                    ) : canEdit ? (
                      <button onClick={() => { setEditingLigne(l.id); setEditLignePrix(String(l.prix_unitaire)); }}
                        className="text-gray-600 hover:text-[#087F3E] transition-colors tabular-nums">
                        {fmtNum(l.prix_unitaire)} FCFA
                      </button>
                    ) : (
                      <span className="tabular-nums text-gray-600">{fmtNum(l.prix_unitaire)} FCFA</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-800">{fmtNum(l.montant)} FCFA</td>
                  {canEdit && (
                    <td className="pr-3 py-2.5 text-right">
                      <button onClick={() => setConfirmDel(l.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
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
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Formulaire ajout (barème ou libre) */}
      {showForm && canEdit && useBareme && (
        <div className={`border-t ${c.border} ${c.bg} px-5 py-4`}>
          <form onSubmit={handleAdd}>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Article du barème *</label>
                <select value={form.bareme_cb_id} onChange={e => handleSelectArticle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" autoFocus>
                  <option value="">— Sélectionner un article —</option>
                  {articlesBareme.map(cb => (
                    <option key={cb.id} value={cb.id}>
                      {cb.bareme?.designation} — {fmtNum(cb.prix_contrat ?? cb.bareme?.prix_unitaire)} FCFA / {cb.bareme?.unite}
                    </option>
                  ))}
                </select>
              </div>
              {form.bareme_cb_id && (
                <div className="grid gap-3 items-end grid-cols-[120px_auto]">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-medium">Quantité *</label>
                    <input type="number" value={form.quantite}
                      onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
                      required min="0" step="any" placeholder="0" autoFocus
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#087F3E] outline-none" />
                  </div>
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
          </form>
        </div>
      )}

      {showForm && canEdit && !useBareme && (
        <div className={`border-t ${c.border} ${c.bg} px-5 py-4`}>
          <form onSubmit={handleAdd}>
              <div className="grid gap-3 items-end grid-cols-[1fr_70px_90px_110px_auto]">
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
                <div className="flex items-end gap-2 pb-0.5">
                  <button type="submit" disabled={saveMut.isPending}
                    className="inline-flex items-center gap-1 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60 whitespace-nowrap">
                    {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} OK
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
              </div>

            {montantPreview > 0 && (
              <p className="text-xs text-[#087F3E] font-medium mt-2">
                Montant : {fmtNum(montantPreview)} FCFA
              </p>
            )}
          </form>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Supprimer la ligne ?</p>
                <p className="text-xs text-gray-400 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => handleDelete(confirmDel)} disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 inline-flex items-center gap-1.5">
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
  const [motifRejet,    setMotifRejet]    = useState("");

  const handleDownload = async (url, filename) => {
    try {
      const token = localStorage.getItem("stt_token");
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Erreur téléchargement");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    } catch (e) {
      addToast("Erreur lors du téléchargement", "error");
    }
  };
  const handlePdf   = () => handleDownload(`${import.meta.env.VITE_API_BASE}/api/pdf/etatcession/${id}`,   `dossier-cession-${etat?.code ?? id}.pdf`);
  const handleExcel = () => handleDownload(`${import.meta.env.VITE_API_BASE}/api/excel/etatcession/${id}`, `dossier-cession-${etat?.code ?? id}.xlsx`);

  const { data: etat, isLoading, isError } = useEtatCession(isNew ? null : id);
  const { data: contratsData } = useContratsPaginated({ count: 200 });
  const contrats = contratsData?.data ?? [];
  const { data: contratBaremes = [] } = useContratBaremes(isNew ? null : etat?.contrat_id ?? null);

  const saveMut      = useSaveEtatCession();
  const statutMut    = useEtatCessionStatut();
  const statutBlocMut = useEtatCessionStatutBloc();
  const deleteMut    = useDeleteEtatCession();

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

  async function handleStatut(statut, motif) {
    try {
      await statutMut.mutateAsync({ id: parseInt(id, 10), statut, motif: motif ?? null });
      addToast(
        statut === "soumis"    ? "État soumis à la validation DCG."       :
        statut === "valide"    ? "État validé et arrêté."                  :
        statut === "brouillon" ? "Remis en brouillon — vous pouvez corriger les lignes." :
        "État rejeté.",
        statut === "rejete" ? "error" : "success"
      );
      setPendingStatut(null);
      setMotifRejet("");
    } catch (err) {
      addToast(err.response?.data?.error ?? err.response?.data?.errors?.[0] ?? "Erreur.", "error");
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

  // Édition des lignes : brouillon uniquement
  const canEdit = isNew || etat?.statut === "brouillon";
  // Avancement des statuts de bloc (Viser qtés, Valider prix) : soumis uniquement
  const canAdvanceBloc = etat?.statut === "soumis";
  const lignes  = etat?.lignes ?? [];
  const totalEC = lignes.reduce((s, l) => s + parseFloat(l.montant ?? 0), 0);

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
            <button onClick={handlePdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-red-400 text-red-600 rounded-lg hover:bg-red-50 transition-all">
              <FileDown size={13} /> PDF
            </button>
            <button onClick={handleExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-emerald-500 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-all">
              <Sheet size={13} /> Excel
            </button>
            <StatusBadge statut={etat.statut} />

            {/* brouillon : soumettre */}
            {etat.statut === "brouillon" && (
              <button onClick={() => setPendingStatut("soumis")}
                className="px-4 py-2 bg-[#087F3E] text-white rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
                Soumettre
              </button>
            )}

            {/* soumis : valider ou rejeter */}
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

            {/* rejete : remettre en brouillon pour correction */}
            {etat.statut === "rejete" && (
              <button onClick={() => setPendingStatut("brouillon")}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                Corriger (remettre en brouillon)
              </button>
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
          {/* Bandeaux d'état */}
          {etat.statut === "soumis" && (
            <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <Loader2 size={16} className="flex-shrink-0" />
              <span>En attente de validation DCG — les lignes ne peuvent plus être modifiées.</span>
            </div>
          )}
          {etat.statut === "rejete" && etat.motif_rejet && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <XCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Rejeté</p>
                <p className="mt-0.5">{etat.motif_rejet}</p>
                <p className="mt-1 text-xs text-red-500">Cliquez sur « Corriger » dans la barre d'actions pour remettre en brouillon et modifier les lignes.</p>
              </div>
            </div>
          )}
          {etat.statut === "rejete" && !etat.motif_rejet && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <XCircle size={16} /> Rejeté — cliquez sur « Corriger » pour remettre en brouillon.
            </div>
          )}
          {etat.statut === "valide" && (
            <div className="mt-4 flex items-center gap-2 bg-[#E8F5EE] border border-[#087F3E]/30 rounded-lg px-4 py-3 text-sm text-[#087F3E]">
              <CheckCircle2 size={16} /> Arrêté et validé — consommable par les décomptes. Les lignes sont verrouillées.
            </div>
          )}
          {etat.statut === "brouillon" && (
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
              statutBloc={etat?.["statut_" + poste.toLowerCase()] ?? "vide"}
              onStatutBloc={canAdvanceBloc ? async (bloc, statut) => {
                try {
                  await statutBlocMut.mutateAsync({ id: parseInt(id, 10), bloc, statut });
                  addToast(`Statut ${bloc.toUpperCase()} mis à jour.`, "success");
                } catch (e) {
                  addToast(`Erreur : ${e?.response?.data?.error ?? e?.message ?? "Impossible de changer le statut."}`, "error");
                }
              } : null}
              viseQtePar={etat?.vise_qte_par}
              viseQteLe={etat?.vise_qte_le}
              visePrixPar={etat?.vise_prix_par}
              visePrixLe={etat?.vise_prix_le}
              onDownloadBon={(ref) => handleDownload(
                `${import.meta.env.VITE_API_BASE}/api/pdf/bon-transfert/${id}/${encodeURIComponent(ref)}`,
                `bon-transfert-${ref}.pdf`
              )}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {pendingStatut === "soumis"    ? "Soumettre l'état de cession ?"          :
                 pendingStatut === "valide"    ? "Valider et arrêter l'état de cession ?" :
                 pendingStatut === "brouillon" ? "Remettre en brouillon ?"                :
                 "Rejeter l'état de cession ?"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {pendingStatut === "soumis"    ? "L'état passera en contrôle DCG. Les lignes seront verrouillées." :
                 pendingStatut === "valide"    ? "L'état sera arrêté et consommable par les décomptes. Action irréversible." :
                 pendingStatut === "brouillon" ? "Les lignes seront de nouveau modifiables pour correction." :
                 "L'état sera rejeté. Saisissez un motif."}
              </p>
            </div>

            {/* Motif de rejet */}
            {pendingStatut === "rejete" && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Motif du rejet <span className="text-red-500">*</span></label>
                <textarea
                  value={motifRejet ?? ""}
                  onChange={e => setMotifRejet(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
                  placeholder="Raison du rejet…"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => { setPendingStatut(null); setMotifRejet(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button
                onClick={() => handleStatut(pendingStatut, pendingStatut === "rejete" ? motifRejet : undefined)}
                disabled={statutMut.isPending || (pendingStatut === "rejete" && !motifRejet?.trim())}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 text-white
                  ${pendingStatut === "rejete"    ? "bg-red-500 hover:bg-red-600"      :
                    pendingStatut === "brouillon" ? "bg-amber-500 hover:bg-amber-600"  :
                    "bg-[#087F3E] hover:bg-[#065A2C]"}`}>
                {statutMut.isPending && <Loader2 size={14} className="animate-spin" />} Confirmer
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
