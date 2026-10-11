import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { X, Upload, Download, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { telechargerModeleBareme } from "../utils/baremeModele";
const PAGE = 100;
import SearchSelect from "./SearchSelect";

const STATUTS = {
  cree:       { label: "Nouveau",   cls: "bg-green-100 text-green-700" },
  mis_a_jour: { label: "Modifié",   cls: "bg-blue-100 text-blue-700" },
  retabli:    { label: "Rétabli",   cls: "bg-violet-100 text-violet-700" },
  inchange:   { label: "Inchangé",  cls: "bg-gray-100 text-gray-600" },
  erreur:     { label: "Erreur",    cls: "bg-red-100 text-red-700" },
};

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Lit un fichier CSV / XLSX et renvoie [{code_article, unite, prix}] d'après les en-têtes CodeArticle, Unité, Prix unitaire. */
async function lireFichier(file) {
  const buf = await file.arrayBuffer();
  let wb;
  if (/\.(csv|txt)$/i.test(file.name)) {
    // CSV : UTF-8 (avec ou sans BOM), sinon Windows-1252 (export Excel français)
    let texte;
    try { texte = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch { texte = new TextDecoder("windows-1252").decode(buf); }
    wb = XLSX.read(texte.replace(/^\uFEFF/, ""), { type: "string", FS: texte.split("\n")[0].includes(";") ? ";" : undefined });
  } else {
    wb = XLSX.read(buf, { type: "array" });
  }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
  if (rows.length < 2) throw new Error("Le fichier est vide.");

  const entetes = rows[0].map(norm);
  const col = (...noms) => entetes.findIndex((h) => noms.includes(h));
  const iCode = col("codearticle", "code", "article", "codeart");
  const iDesig = col("designation", "libelle", "designationarticle", "nom", "intitule");
  const iUnite = col("unite", "unit", "u");
  const iPrix = col("prixunitaire", "prix", "pu", "prixunitairefcfa", "prixunit");
  if ((iCode < 0 && iDesig < 0) || iPrix < 0) {
    throw new Error("Colonnes attendues : CodeArticle (ou Désignation), Unité, Prix unitaire : en-têtes introuvables.");
  }

  return rows.slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .map((r) => ({
      code_article: iCode >= 0 ? String(r[iCode] ?? "").trim() : "",
      designation: iDesig >= 0 ? String(r[iDesig] ?? "").trim() : "",
      unite: iUnite >= 0 ? String(r[iUnite] ?? "").trim() : "",
      prix: String(r[iPrix] ?? "").trim(),
    }));
}

/**
 * Import d'un barème par fichier : analyse (simulation) puis application des lignes valides.
 *  onAnalyser({ lignes, date_effet }) / onAppliquer({ lignes, date_effet }) -> { lignes, resume }
 */
export default function ImportBaremeDialog({ titre, description, avecDate = false, lignesModele = [], nomModele, onAnalyser, onAppliquer, onClose }) {
  const inputRef = useRef(null);
  const [fichier, setFichier] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [dateEffet, setDateEffet] = useState("");
  const [rapport, setRapport] = useState(null);
  const [etat, setEtat] = useState("idle"); // idle | analyse | applique | termine
  const [erreur, setErreur] = useState(null);
  const [filtre, setFiltre] = useState("utiles"); // utiles | erreur | inchange | tous
  const [affiche, setAffiche] = useState(PAGE);

  const msg = (e) => e?.response?.data?.errors?.[0] ?? e?.response?.data?.message ?? e?.message ?? "Erreur.";

  async function choisir(file) {
    if (!file) return;
    setErreur(null); setRapport(null); setFichier(file); setEtat("analyse"); setFiltre("utiles"); setAffiche(PAGE);
    try {
      const l = await lireFichier(file);
      setLignes(l);
      setRapport(await onAnalyser({ lignes: l, date_effet: dateEffet || null }));
      setEtat("idle");
    } catch (e) {
      setErreur(msg(e)); setEtat("idle"); setLignes([]);
    }
  }

  async function reanalyser(d) {
    setDateEffet(d);
    if (!lignes.length) return;
    try { setRapport(await onAnalyser({ lignes, date_effet: d || null })); } catch (e) { setErreur(msg(e)); }
  }

  // Une ligne sans correspondance sûre : l'utilisateur choisit l'article X3 parmi les propositions
  async function choisirArticle(ligneFichier, code) {
    if (!code) return;
    const idx = ligneFichier - 2; // ligne 1 = en-têtes
    const maj = lignes.map((l, i) => (i === idx ? { ...l, code_article: code } : l));
    setLignes(maj);
    setErreur(null);
    try { setRapport(await onAnalyser({ lignes: maj, date_effet: dateEffet || null })); } catch (e) { setErreur(msg(e)); }
  }

  async function appliquer() {
    setEtat("applique"); setErreur(null);
    try {
      setRapport(await onAppliquer({ lignes, date_effet: dateEffet || null }));
      setEtat("termine");
    } catch (e) { setErreur(msg(e)); setEtat("idle"); }
  }

  const r = rapport?.resume;
  const aImporter = r ? r.cree + r.mis_a_jour + r.retabli : 0;

  const toutes = rapport?.lignes ?? [];
  const correspond = (l) => {
    if (filtre === "tous") return true;
    if (filtre === "erreur") return l.statut === "erreur";
    if (filtre === "inchange") return l.statut === "inchange";
    return l.statut !== "inchange"; // utiles : changements + erreurs
  };
  const visibles = toutes.filter(correspond);
  const aucuneModif = r && aImporter === 0 && r.erreur === 0;

  function exporterRapport() {
    const libelle = (s) => (STATUTS[s]?.label ?? s);
    const ws = XLSX.utils.aoa_to_sheet([
      ["Ligne", "CodeArticle", "Désignation", "Unité", "Prix du fichier", "Prix avant", "Résultat", "Détail"],
      ...toutes.map((l) => [l.ligne, l.code_article, l.designation ?? "", l.unite ?? "", l.prix ?? "", l.ancien ?? "", libelle(l.statut), l.message ?? ""]),
    ]);
    ws["!cols"] = [{ wch: 7 }, { wch: 16 }, { wch: 44 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport d'import");
    XLSX.writeFile(wb, "rapport_import_bareme.xlsx");
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><FileSpreadsheet size={17} className="text-[#087F3E]" />{titre}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-xs text-gray-500">{description}</p>

          <div className="flex flex-wrap items-center gap-3">
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { choisir(e.target.files[0]); e.target.value = ""; }} />
            <button onClick={() => inputRef.current?.click()} disabled={etat === "analyse" || etat === "applique"}
              className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60">
              {etat === "analyse" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {fichier ? "Choisir un autre fichier" : "Choisir un fichier (CSV, Excel)"}
            </button>
            <button onClick={() => telechargerModeleBareme(lignesModele, nomModele)}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
              <Download size={14} /> Modèle
            </button>
            {avecDate && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 ml-auto">
                Date d'effet
                <input type="date" value={dateEffet} onChange={(e) => reanalyser(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#087F3E]/30" />
              </label>
            )}
          </div>
          {fichier && <p className="text-xs text-gray-400">{fichier.name} — {lignes.length} ligne{lignes.length > 1 ? "s" : ""}</p>}

          {erreur && (
            <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{erreur}
            </div>
          )}

          {etat === "termine" && r && (
            <div className="flex gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
              <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
              Import terminé : {r.cree} nouveau(x), {r.mis_a_jour} modifié(s){r.retabli ? `, ${r.retabli} rétabli(s)` : ""}, {r.inchange} inchangé(s), {r.erreur} ignoré(s) en erreur.
            </div>
          )}

          {aucuneModif && etat !== "termine" && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span><strong>Aucune modification détectée</strong> : les {r.total} lignes ont le même prix que le barème actuel.
              Vérifiez que vous avez modifié la colonne <strong>« Prix unitaire »</strong> (et non une colonne « (info) »).</span>
            </div>
          )}

          {rapport && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  ["utiles", `À traiter (${r.total - r.inchange})`],
                  ["erreur", `Erreurs (${r.erreur})`],
                  ["inchange", `Inchangés (${r.inchange})`],
                  ["tous", `Toutes (${r.total})`],
                ].map(([k, label]) => (
                  <button key={k} onClick={() => { setFiltre(k); setAffiche(PAGE); }}
                    className={`px-2.5 py-1 rounded-full border font-medium ${filtre === k ? "bg-[#087F3E] text-white border-[#087F3E]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    {label}
                  </button>
                ))}
                <span className="mx-1 text-gray-300">|</span>
                {Object.entries(STATUTS).map(([k, s]) => r[k] > 0 && k !== "inchange" && (
                  <span key={k} className={`px-2 py-1 rounded-full font-medium ${s.cls}`}>{s.label} : {r[k]}</span>
                ))}
                <button onClick={exporterRapport} className="ml-auto inline-flex items-center gap-1 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50">
                  <Download size={12} /> Rapport Excel
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-auto max-h-80">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-3 py-2">Ligne</th>
                      <th className="text-left px-3 py-2">Article</th>
                      <th className="text-right px-3 py-2">Prix</th>
                      <th className="text-left px-3 py-2">Résultat</th>
                      <th className="text-left px-3 py-2">Détail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibles.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Aucune ligne dans ce filtre.</td></tr>
                    )}
                    {visibles.slice(0, affiche).map((l, i) => {
                      const s = STATUTS[l.statut] ?? STATUTS.erreur;
                      return (
                        <tr key={i} className={l.statut === "erreur" ? "bg-red-50/40" : ""}>
                          <td className="px-3 py-2 text-gray-400">{l.ligne}</td>
                          <td className="px-3 py-2"><span className="font-mono">{l.code_article || "—"}</span>{l.designation && <span className="block text-gray-400 truncate max-w-[220px]">{l.designation}</span>}</td>
                          <td className="px-3 py-2 text-right font-mono">{l.prix != null ? new Intl.NumberFormat("fr-FR").format(l.prix) : "—"}{l.ancien != null && l.statut !== "inchange" && <span className="block text-gray-400">avant {new Intl.NumberFormat("fr-FR").format(l.ancien)}</span>}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span></td>
                          <td className="px-3 py-2 text-gray-600">
                            {l.message}
                            {l.statut === "erreur" && l.suggestions?.length > 0 && etat !== "termine" && (
                              <div className="mt-1.5">
                                <SearchSelect
                                  value=""
                                  onChange={(e) => choisirArticle(l.ligne, e.target.value)}
                                  placeholder="Choisir l'article…"
                                  className="w-72 border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white">
                                  <option value="">Choisir l'article parmi les propositions…</option>
                                  {l.suggestions.map((s) => (
                                    <option key={s.code_article} value={s.code_article}>
                                      {`${s.code_article} — ${s.designation} (${s.unite ?? "?"}) · ${Math.round(Math.min(s.score, 1) * 100)} %`}
                                    </option>
                                  ))}
                                </SearchSelect>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visibles.length > affiche && (
                <button onClick={() => setAffiche((n) => n + PAGE)} className="w-full text-xs text-[#087F3E] font-medium py-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50">
                  Afficher {Math.min(PAGE, visibles.length - affiche)} lignes de plus ({visibles.length - affiche} restantes)
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Les lignes en erreur sont ignorées ; les autres sont importées.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">{etat === "termine" ? "Fermer" : "Annuler"}</button>
            {etat !== "termine" && (
              <button onClick={appliquer} disabled={!rapport || aImporter === 0 || etat === "applique"}
                className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-50">
                {etat === "applique" && <Loader2 size={14} className="animate-spin" />}
                Importer {aImporter > 0 ? `${aImporter} ligne${aImporter > 1 ? "s" : ""}` : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
