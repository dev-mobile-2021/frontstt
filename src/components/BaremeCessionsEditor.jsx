import { useState, useMemo, Fragment } from "react";
import { Plus, Trash2, X, Search, Package, Truck, Users, Check, Ban } from "lucide-react";
import { BAREME_MTX, BAREME_MTL, BAREME_RH } from "../data/baremesCessions";
import MoneyDisplay from "./MoneyDisplay";
import ImportFileButton from "./ImportFileButton";

const CAT_CONFIG = {
  mtx: { label: "MTX — Matériaux", icon: Package, catalogue: BAREME_MTX, groupField: "famille", nameField: "designation", color: "orange" },
  mtl: { label: "MTL — Matériel",  icon: Truck,   catalogue: BAREME_MTL, groupField: "categorie", nameField: "designation", color: "blue" },
  rh:  { label: "RH — Ressources humaines", icon: Users, catalogue: BAREME_RH, groupField: "typePersonnel", nameField: "qualification", color: "purple" },
};

const STATUT_PRIX_BADGE = {
  "Négocié - en attente de validation": { cls: "bg-orange-50 text-orange-700 border-orange-200", label: "Prix en attente de validation" },
  "Négocié - validé":                   { cls: "bg-[#E8F5EE] text-[#065A2C] border-[#b5ddc8]",   label: "Prix validé" },
  "Négocié - rejeté":                   { cls: "bg-red-50 text-red-600 border-red-200",           label: "Prix rejeté" },
};

const today = () => new Date().toISOString().slice(0, 10);

function refPrice(cat, item) {
  if (cat === "mtx") return item.prixUnitaireReference;
  if (cat === "mtl") return item.uniteFacturation === "heure" ? item.tarifHoraire : item.tarifJournalier;
  if (cat === "rh")  return item.typePersonnel === "journalier" ? item.coutJournalier : item.salaireBrutMensuel;
  return 0;
}

function refUnite(cat, item) {
  if (cat === "mtx") return item.unite;
  if (cat === "mtl") return item.uniteFacturation;
  if (cat === "rh")  return item.typePersonnel === "journalier" ? "jour" : "mois";
  return "";
}

function nouvelleLigne(cat, item) {
  const prix = refPrice(cat, item);
  return {
    baremeRefId: item.id,
    designation: item[CAT_CONFIG[cat].nameField],
    unite: refUnite(cat, item),
    prixReference: prix,
    prixContrat: prix,
    coefficientRendement: item.coefficientRendementDefaut ?? null,
    statutPrix: "Prix de référence",
    dateValidationPrix: null,
    motifRejetPrix: null,
  };
}

// ── Sélecteur depuis le référentiel ──────────────────────────────
function SelectorModal({ cat, alreadySelectedIds, onClose, onConfirm }) {
  const cfg = CAT_CONFIG[cat];
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [checked, setChecked] = useState({});

  const groups = useMemo(() => [...new Set(cfg.catalogue.map(i => i[cfg.groupField]))].sort(), [cfg]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cfg.catalogue.filter(i => {
      if (alreadySelectedIds.has(i.id)) return false;
      if (group && i[cfg.groupField] !== group) return false;
      if (q && !i[cfg.nameField].toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cfg, search, group, alreadySelectedIds]);

  const nChecked = Object.values(checked).filter(Boolean).length;

  function toggle(id) { setChecked(prev => ({ ...prev, [id]: !prev[id] })); }

  function confirm() {
    const items = filtered.filter(i => checked[i.id]);
    if (items.length === 0) return;
    onConfirm(items);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Sélectionner depuis le référentiel — {cfg.label}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#087F3E]"
            />
          </div>
          <select value={group} onChange={e => setGroup(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#087F3E]">
            <option value="">{cat === "mtx" ? "Toutes familles" : cat === "mtl" ? "Toutes catégories" : "Tous types"}</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun article disponible (déjà sélectionnés ou aucun résultat).</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(item => (
                <label key={item.id} className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded">
                  <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggle(item.id)} className="accent-[#087F3E]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{item[cfg.nameField]}</p>
                    <p className="text-xs text-gray-400">{item[cfg.groupField]}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <MoneyDisplay amount={refPrice(cat, item)} variant="small" />
                    <p className="text-[10px] text-gray-400">/ {refUnite(cat, item)}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">{nChecked} article{nChecked > 1 ? "s" : ""} sélectionné{nChecked > 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100">Annuler</button>
            <button
              onClick={confirm}
              disabled={nChecked === 0}
              className="text-sm bg-[#087F3E] disabled:opacity-40 text-white px-4 py-2 rounded-lg hover:bg-[#065A2C]"
            >
              Ajouter la sélection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section d'une catégorie (MTX / MTL / RH) ─────────────────────
function CategorieSection({ cat, lignes, isEditable, onChange, allowImport, emptyMessage, currentUser, showPriceValidationActions }) {
  const cfg = CAT_CONFIG[cat];
  const Icon = cfg.icon;
  const [showSelector, setShowSelector] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [motifDraft, setMotifDraft] = useState("");

  const isDACC = currentUser?.roleId === "DACC";
  const canActOnPrix = showPriceValidationActions && isDACC;

  function handleConfirmSelection(items) {
    onChange([...lignes, ...items.map(item => nouvelleLigne(cat, item))]);
    setShowSelector(false);
  }

  function updatePrix(baremeRefId, value) {
    const prix = parseFloat(value) || 0;
    onChange(lignes.map(l => {
      if (l.baremeRefId !== baremeRefId) return l;
      const estReference = prix === l.prixReference;
      return {
        ...l,
        prixContrat: prix,
        statutPrix: estReference ? "Prix de référence" : "Négocié - en attente de validation",
        dateValidationPrix: null,
        motifRejetPrix: null,
      };
    }));
  }

  function removeLigne(baremeRefId) {
    onChange(lignes.filter(l => l.baremeRefId !== baremeRefId));
  }

  function handleImport(n) {
    const catalogue = cfg.catalogue.filter(i => !lignes.some(l => l.baremeRefId === i.id));
    const picked = catalogue.slice(0, n);
    if (picked.length === 0) return;
    onChange([...lignes, ...picked.map(item => nouvelleLigne(cat, item))]);
  }

  function validerPrix(baremeRefId) {
    onChange(lignes.map(l => l.baremeRefId === baremeRefId
      ? { ...l, statutPrix: "Négocié - validé", dateValidationPrix: today(), motifRejetPrix: null }
      : l));
  }

  function confirmerRejetPrix(baremeRefId) {
    if (!motifDraft.trim()) return;
    onChange(lignes.map(l => l.baremeRefId === baremeRefId
      ? { ...l, prixContrat: l.prixReference, statutPrix: "Négocié - rejeté", dateValidationPrix: today(), motifRejetPrix: motifDraft.trim() }
      : l));
    setRejectingId(null);
    setMotifDraft("");
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{lignes.length}</span>
        </div>
        {isEditable && (
          <div className="flex items-center gap-2">
            {allowImport && <ImportFileButton label="Importer" onImport={handleImport} nAjoutes={2} itemLabel="article" />}
            <button
              onClick={() => setShowSelector(true)}
              className="flex items-center gap-1.5 text-xs bg-[#087F3E] text-white px-3 py-1.5 rounded-lg hover:bg-[#065A2C] transition-colors"
            >
              <Plus size={12} /> Sélectionner depuis le référentiel
            </button>
          </div>
        )}
      </div>

      {lignes.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6 px-4">
          {isEditable
            ? `Aucun article ${cat.toUpperCase()} — utilisez « Sélectionner depuis le référentiel » ci-dessus pour en ajouter.`
            : emptyMessage || `Aucun article ${cat.toUpperCase()} rattaché à ce contrat.`}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              {["Désignation", "Unité", "Prix référence", "Prix contrat", ""].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lignes.map(l => {
              const statutPrix = l.statutPrix || "Prix de référence";
              const badge = STATUT_PRIX_BADGE[statutPrix];
              const enAttente = statutPrix === "Négocié - en attente de validation";
              const ecartPct = l.prixReference ? Math.round(((l.prixContrat - l.prixReference) / l.prixReference) * 1000) / 10 : 0;
              return (
                <Fragment key={l.baremeRefId}>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-800">{l.designation}</td>
                    <td className="px-4 py-2.5 text-gray-500">{l.unite}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Intl.NumberFormat("fr-FR").format(l.prixReference)} FCFA
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditable ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={l.prixContrat}
                          onChange={e => updatePrix(l.baremeRefId, e.target.value)}
                          className="w-28 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#087F3E]"
                        />
                      ) : (
                        <span className="font-medium text-gray-800">{new Intl.NumberFormat("fr-FR").format(l.prixContrat)} FCFA</span>
                      )}
                      {badge && (
                        <span
                          title={`Réf. ${new Intl.NumberFormat("fr-FR").format(l.prixReference)} FCFA`}
                          className={`ml-2 text-[10px] border rounded-full px-1.5 py-0.5 font-medium whitespace-nowrap ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditable && (
                        <button onClick={() => removeLigne(l.baremeRefId)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {enAttente && canActOnPrix && (
                    <tr className="bg-orange-50/60">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                          <div className="flex items-center gap-4 text-xs text-gray-700">
                            <span>Prix référence : <strong>{new Intl.NumberFormat("fr-FR").format(l.prixReference)} FCFA</strong></span>
                            <span>Prix négocié : <strong>{new Intl.NumberFormat("fr-FR").format(l.prixContrat)} FCFA</strong></span>
                            <span className={ecartPct >= 0 ? "text-orange-700 font-semibold" : "text-blue-700 font-semibold"}>
                              Écart : {ecartPct >= 0 ? "+" : ""}{ecartPct}%
                            </span>
                          </div>
                          {rejectingId === l.baremeRefId ? (
                            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                              <input
                                autoFocus
                                type="text"
                                value={motifDraft}
                                onChange={e => setMotifDraft(e.target.value)}
                                placeholder="Motif du rejet (obligatoire)…"
                                className="flex-1 border border-red-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                              />
                              <button
                                onClick={() => confirmerRejetPrix(l.baremeRefId)}
                                disabled={!motifDraft.trim()}
                                className="text-xs bg-red-600 disabled:opacity-40 text-white px-2.5 py-1 rounded-lg hover:bg-red-700"
                              >
                                Confirmer le rejet
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setMotifDraft(""); }}
                                className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                onClick={() => validerPrix(l.baremeRefId)}
                                className="flex items-center gap-1 text-xs bg-[#087F3E] text-white px-2.5 py-1 rounded-lg hover:bg-[#065A2C]"
                              >
                                <Check size={12} /> Valider le prix
                              </button>
                              <button
                                onClick={() => { setRejectingId(l.baremeRefId); setMotifDraft(""); }}
                                className="flex items-center gap-1 text-xs border border-red-300 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50"
                              >
                                <Ban size={12} /> Rejeter le prix
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {showSelector && (
        <SelectorModal
          cat={cat}
          alreadySelectedIds={new Set(lignes.map(l => l.baremeRefId))}
          onClose={() => setShowSelector(false)}
          onConfirm={handleConfirmSelection}
        />
      )}
    </div>
  );
}

/**
 * Éditeur du barème de cessions (MTX/MTL/RH) — utilisé au niveau du contrat
 * et au niveau de l'avenant. Purement contrôlé : bareme = { mtx, mtl, rh },
 * onChange(newBareme) — la persistance est de la responsabilité de l'appelant.
 *
 * showPriceValidationActions contrôle l'affichage des boutons Valider/Rejeter le prix
 * (DACC) : désactivé côté avenant, où les prix négociés sont validés en bloc en même
 * temps que l'avenant lui-même plutôt que ligne par ligne.
 */
export default function BaremeCessionsEditor({ bareme, onChange, isEditable, allowImport = false, emptyMessage, currentUser, showPriceValidationActions = true }) {
  const safe = { mtx: bareme?.mtx || [], mtl: bareme?.mtl || [], rh: bareme?.rh || [] };

  function setCat(cat, lignes) {
    onChange({ ...safe, [cat]: lignes });
  }

  return (
    <div className="space-y-4">
      <CategorieSection cat="mtx" lignes={safe.mtx} isEditable={isEditable} onChange={l => setCat("mtx", l)} allowImport={allowImport} emptyMessage={emptyMessage} currentUser={currentUser} showPriceValidationActions={showPriceValidationActions} />
      <CategorieSection cat="mtl" lignes={safe.mtl} isEditable={isEditable} onChange={l => setCat("mtl", l)} allowImport={allowImport} emptyMessage={emptyMessage} currentUser={currentUser} showPriceValidationActions={showPriceValidationActions} />
      <CategorieSection cat="rh"  lignes={safe.rh}  isEditable={isEditable} onChange={l => setCat("rh", l)}  allowImport={allowImport} emptyMessage={emptyMessage} currentUser={currentUser} showPriceValidationActions={showPriceValidationActions} />
    </div>
  );
}
