import { useState } from "react";
import { Search, Pencil, RotateCcw, Check, X, Loader2 } from "lucide-react";

const fmt = (n) => (n == null ? "—" : new Intl.NumberFormat("fr-FR").format(Math.round(n)));

const SOURCES = {
  base:     { label: "Barème général", cls: "bg-gray-100 text-gray-600" },
  chantier: { label: "Chantier", cls: "bg-blue-50 text-blue-700" },
  contrat:  { label: "Contrat",  cls: "bg-violet-50 text-violet-700" },
};

function SourceBadge({ source, level }) {
  // Vu du contrat, le parent est le chantier : un prix non modifié par le contrat vient du « barème chantier »
  // (qui reprend lui-même le barème général tant que le chantier n'a pas d'écart).
  const eff = level === "contrat" && source !== "contrat" ? "chantier" : source;
  const s = SOURCES[eff] ?? SOURCES.base;
  return <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${s.cls}`}>{s.label}</span>;
}

/**
 * Tableau de prix hérités avec écarts (chantier ou contrat).
 *  rows : [{ bareme_id, code, designation, unite, prix_base, prix_herite?, source_herite?, prix_effectif, source,
 *            prix_propose, statut_prix, contrat_bareme_id? }]
 *  level : "chantier" | "contrat"
 *  Un écart = source égale au niveau courant.
 */
export default function BaremePrixTable({
  rows = [], level = "contrat", canValidate = false, disabled = false,
  onSave, onReset, onValider, busyId = null,
}) {
  const [search, setSearch] = useState("");
  const [onlyEcarts, setOnlyEcarts] = useState(false);
  const [editing, setEditing] = useState(null); // bareme_id
  const [value, setValue] = useState("");

  const isEcart = (r) => r.source === level || r.prix_propose != null;

  const visibles = rows.filter((r) => {
    if (onlyEcarts && !isEcart(r)) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return r.designation?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q);
  });

  function startEdit(r) {
    setEditing(r.bareme_id);
    setValue(String(r.prix_propose ?? r.prix_effectif ?? ""));
  }

  async function commit(r) {
    const prix = parseFloat(value);
    if (isNaN(prix) || prix < 0) return;
    await onSave(r, prix);
    setEditing(null);
  }

  const ecarts = rows.filter(isEcart).length;
  const attente = rows.filter((r) => r.statut_prix === "en_attente").length;
  const heritage = level === "contrat" ? "du chantier" : "de la base";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un article (code ou désignation)…"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={onlyEcarts} onChange={(e) => setOnlyEcarts(e.target.checked)} />
          Écarts seulement
        </label>
        <span className="text-xs text-gray-400">
          {rows.length} article{rows.length > 1 ? "s" : ""} · {ecarts} écart{ecarts > 1 ? "s" : ""}
          {attente > 0 && <span className="text-amber-600 font-medium"> · {attente} en attente DACC</span>}
        </span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[780px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="text-left px-4 py-3">Article</th>
              <th className="text-left px-3 py-3">Unité</th>
              {level === "chantier" && <th className="text-right px-3 py-3">Prix de base</th>}
              {level === "contrat" && <th className="text-right px-3 py-3">Prix du chantier</th>}
              <th className="text-right px-3 py-3">Prix appliqué</th>
              <th className="text-left px-3 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                {rows.length === 0 ? "Aucun article dans le barème général. Le DACC doit d'abord l'alimenter (Paramétrage → Barème général)." : "Aucun article ne correspond."}
              </td></tr>
            )}
            {visibles.map((r) => {
              const ecart = isEcart(r);
              const enAttente = r.statut_prix === "en_attente";
              const isEditing = editing === r.bareme_id;
              const busy = busyId === r.bareme_id;
              return (
                <tr key={r.bareme_id} className={ecart ? "bg-amber-50/30" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.designation}</p>
                    <p className="text-xs font-mono text-gray-400">{r.code}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{r.unite ?? "—"}</td>
                  {level === "chantier" && <td className="px-3 py-3 text-right font-mono text-gray-600">{fmt(r.prix_base)}</td>}
                  {level === "contrat" && (
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono text-gray-600">{fmt(r.prix_herite)}</span>
                      <span className="ml-1.5"><SourceBadge source={r.source_herite} level={level} /></span>
                    </td>
                  )}
                  <td className="px-3 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input type="number" min="0" step="any" value={value} autoFocus
                          onChange={(e) => setValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commit(r); if (e.key === "Escape") setEditing(null); }}
                          className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:ring-2 focus:ring-[#087F3E] outline-none" />
                        <button onClick={() => commit(r)} className="p-1.5 rounded bg-[#087F3E] text-white hover:bg-[#065A2C]"><Check size={13} /></button>
                        <button onClick={() => setEditing(null)} className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"><X size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <span className={`font-mono font-semibold ${ecart ? "text-[#065A2C]" : "text-gray-800"}`}>{fmt(r.prix_effectif)}</span>
                        <span className="ml-1.5"><SourceBadge source={r.source} level={level} /></span>
                        {enAttente && r.prix_propose != null && (
                          <p className="text-xs text-amber-600 mt-0.5">Proposé : {fmt(r.prix_propose)}</p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {enAttente ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">En attente DACC</span>
                    ) : ecart ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Écart validé</span>
                    ) : (
                      <span className="text-xs text-gray-400">Hérité {heritage}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {busy && <Loader2 size={14} className="animate-spin text-gray-400" />}
                      {enAttente && canValidate && (
                        <button onClick={() => onValider(r)} disabled={busy}
                          className="text-xs font-medium text-[#087F3E] border border-[#087F3E]/40 px-2 py-1 rounded-lg hover:bg-[#E8F5EE]">Valider</button>
                      )}
                      {!disabled && !isEditing && (
                        <button onClick={() => startEdit(r)} title="Modifier le prix" disabled={busy}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-[#087F3E] hover:bg-gray-50"><Pencil size={13} /></button>
                      )}
                      {!disabled && ecart && !isEditing && (
                        <button onClick={() => onReset(r)} title={`Rétablir le prix hérité ${heritage}`} disabled={busy}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50"><RotateCcw size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
