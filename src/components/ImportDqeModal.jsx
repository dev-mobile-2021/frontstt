import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { X, Upload, Download, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Données d'exemple du modèle (identiques à Modele_DQE_Import.xlsx). */
const EXEMPLE_DQE = [
  { numero: 100, ra: "6A83", dra: "ST: Bâtiment TCE", lignes: [
    ["100-1", "F/pose,,,,,,,,,,", "m2", 3600,   300.12],
    ["100-2", "F/pose,,,,,,,,,,", "m2", 9800,   500.22],
    ["100-3", "F/pose,,,,,,,,,,", "m2", 7200,   2000.44],
    ["100-4", "F/pose,,,,,,,,,,", "m2", 400000, 1600.56],
  ]},
  { numero: 200, ra: "6A40", dra: "ST Voirie / TP", lignes: [
    ["200-1", "F/pose,,,,,,,,,,", "ml", 50000, 300.55],
    ["200-2", "F/pose,,,,,,,,,,", "ml", 3900,  2000.66],
    ["200-3", "F/pose,,,,,,,,,,", "ml", 72000, 1433.46],
    ["200-4", "F/pose,,,,,,,,,,", "ml", 6000,  360000],
  ]},
  { numero: 300, ra: "6A63", dra: "ST: Façonnage-Pose aciers", lignes: [
    ["300-1", "F/pose,,,,,,,,,,", "kg", 3500,  5200],
    ["300-2", "F/pose,,,,,,,,,,", "kg", 4200,  52333],
    ["300-3", "F/pose,,,,,,,,,,", "kg", 55533, 300.6],
    ["300-4", "F/pose,,,,,,,,,,", "kg", 45036, 44.56],
  ]},
  { numero: 400, ra: "6B28", dra: "ST espace vert", lignes: [
    ["400-1", "F/pose,,,,,,,,,,", "u", 86422,   69.36],
    ["400-2", "F/pose,,,,,,,,,,", "u", 3388,    4000.36],
    ["400-3", "F/pose,,,,,,,,,,", "u", 6541236, 5.44],
    ["400-4", "F/pose,,,,,,,,,,", "u", 66,      5002.22],
  ]},
];

const FMT_PU      = "#,##0";
const FMT_QTE     = '_-* #,##0.00_-;\\-* #,##0.00_-;_-* "-"_-;_-@_-';
const FMT_MONTANT = '_-* #,##0_-;\\-* #,##0_-;_-* "-"_-;_-@_-';

/**
 * Génère et télécharge le modèle Excel DQE — même structure que Modele_DQE_Import.xlsx :
 *   Ligne 1  : B1:H1 fusionné « DQE MARCHE SOUS-TRAITANT »
 *   Ligne 3  : en-têtes C..H  N° Item | Désignation | U | PU | Qté Marché | Montant
 *   Ligne 6  : « Montant Total » (D) + total (H)
 *   Ligne 7+ : récapitulatif des rubriques  A=code RA | B=désignation RA | H=montant
 *   Puis par poste : ligne poste (C=100, D=« Poste 100 », H=sous-total)
 *                    lignes DQE (A=RA, B=désig RA, C=100-1, D, E=U, F=PU, G=Qté, H=Montant)
 */
function telechargerModele() {
  const vide = () => ["", "", "", "", "", "", "", ""];
  const rows = [];
  const fmts = []; // [ligne, colonne, format]

  // Calcul des montants
  const postes = EXEMPLE_DQE.map((p) => {
    const lignes = p.lignes.map(([item, des, u, pu, qte]) => ({ item, des, u, pu, qte, montant: Math.round(pu * qte) }));
    return { ...p, lignes, total: lignes.reduce((s, l) => s + l.montant, 0) };
  });
  const rubriques = [];
  postes.forEach((p) => {
    let r = rubriques.find((x) => x.ra === p.ra);
    if (!r) { r = { ra: p.ra, dra: p.dra, total: 0 }; rubriques.push(r); }
    r.total += p.total;
  });
  const totalGeneral = rubriques.reduce((s, r) => s + r.total, 0);

  // Ligne 1 : titre
  rows.push(["", "DQE MARCHE SOUS-TRAITANT", "", "", "", "", "", ""]);
  rows.push(vide());
  // Ligne 3 : en-têtes
  rows.push(["", "", "N° Item", "Désignation", "U", "PU", "Qté\nMarché", "Montant"]);
  rows.push(vide());
  rows.push(vide());
  // Ligne 6 : montant total
  rows.push(["", "", "", "Montant Total", "", "", "", totalGeneral]);
  fmts.push([rows.length - 1, 7, FMT_MONTANT]);
  // Récapitulatif des rubriques
  rubriques.forEach((r) => {
    rows.push([r.ra, r.dra, "", "", "", "", "", r.total]);
    fmts.push([rows.length - 1, 7, FMT_MONTANT]);
  });
  rows.push(vide());
  // Postes et lignes
  postes.forEach((p) => {
    rows.push(["", "", p.numero, `Poste ${p.numero}`, "", "", "", p.total]);
    fmts.push([rows.length - 1, 7, FMT_MONTANT]);
    p.lignes.forEach((l) => {
      rows.push([p.ra, p.dra, l.item, l.des, l.u, l.pu, l.qte, l.montant]);
      const r = rows.length - 1;
      fmts.push([r, 5, FMT_PU], [r, 6, FMT_QTE], [r, 7, FMT_MONTANT]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  fmts.forEach(([r, c, z]) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell && typeof cell.v === "number") cell.z = z;
  });

  ws["!merges"] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 7 } }]; // B1:H1
  ws["!cols"] = [
    { wch: 8.43 },  // A  RA
    { wch: 23.55 }, // B  Désignation RA
    { wch: 11.55 }, // C  N° Item
    { wch: 20.66 }, // D  Désignation
    { wch: 12 },    // E  U
    { wch: 8.43 },  // F  PU
    { wch: 15.78 }, // G  Qté Marché
    { wch: 22.66 }, // H  Montant
  ];
  ws["!rows"] = rows.map((_, i) =>
    i === 0 ? { hpt: 23.4 } :
    i === 2 ? { hpt: 36.75 } :
    i === 3 ? { hpt: 21 } :
    i === 4 ? { hpt: 18 } :
    i === 5 ? { hpt: 36 } :
    i <= 5 + rubriques.length + 1 ? { hpt: 18 } :
    { hpt: 21.9 }
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DQE ");
  XLSX.writeFile(wb, "Modele_DQE_Import.xlsx");
}

/** Convertit une cellule en nombre (gère 1 234,56 / 1,234.56 / 1234.56 / "-"). */
function toNum(v) {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/[\s\u00a0\u202f]/g, "");
  if (!s || s === "-") return 0;
  if (s.includes(",") && s.includes(".")) {
    // le dernier séparateur est le décimal
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = /,\d{3}(,|$)/.test(s) && !/,\d{1,2}$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Parse le format X3 (PF_X3_STT) : RA | Désig RA | N° Item | Désignation | U | PU | Qté Marché | Montant */
function parseFormatX3(rows, headerRowIdx) {
  // Trouver les indices des colonnes sur la ligne d'en-tête
  const entetes = rows[headerRowIdx].map(norm);
  const col = (...noms) => entetes.findIndex((h) => noms.some(n => h.includes(n)));

  // Format officiel : col0=RA | col1=Désig RA (sans titre) | col2=N° Item | col3=Désignation | col4=U | col5=PU | col6=Qté | col7=Montant
  const iRA   = col("ra", "rubrique");
  const iItem = col("item", "no");
  const iDes  = col("designation", "libelle");
  const iU    = entetes.findIndex((h) => h === "u" || h.includes("unite"));
  const iPU   = col("pu", "prixunit", "prix");
  const iQte  = col("qte", "quantite");

  const colRA   = iRA   >= 0 ? iRA   : 0;
  const colDRA  = colRA + 1;                          // Désig RA : toujours juste après RA (sans titre)
  const colItem = iItem >= 0 ? iItem : 2;
  const colDes  = iDes  >= 0 ? iDes  : 3;            // Désignation ligne : colonne labelisée
  const colU    = iU    >= 0 ? iU    : 4;
  const colPU   = iPU   >= 0 ? iPU   : 5;
  const colQte  = iQte  >= 0 ? iQte  : 6;

  // Récapitulatif des rubriques en tête de fichier (A=RA, B=désignation, sans N° Item)
  const libellesRA = {};
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const ra  = String(rows[i][colRA]   ?? "").trim();
    const dra = String(rows[i][colDRA]  ?? "").trim();
    const it  = String(rows[i][colItem] ?? "").trim();
    if (ra && dra && !it && !libellesRA[ra]) libellesRA[ra] = dra;
  }

  const postesByNum  = {}; // "100" → poste obj
  const rubriquesMap = {}; // "6A83" → rubrique obj
  const rubriques    = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row  = rows[i];
    const ra   = String(row[colRA]   ?? "").trim();
    const dra  = String(row[colDRA]  ?? "").trim();
    const item = String(row[colItem] ?? "").trim();
    const des  = String(row[colDes]  ?? "").trim();

    if (!item && !des) continue;

    if (item && /^\d+$/.test(item) && des && !ra) {
      // Ligne poste : item = "100", RA vide
      postesByNum[item] = { numero: item, designation: des, lignes: [] };
    } else if (item && /^\d+-\d+/.test(item) && des) {
      // Ligne DQE : item = "100-1"
      const posteNum = item.split("-")[0];

      // Créer le poste s'il n'existe pas encore
      if (!postesByNum[posteNum]) {
        postesByNum[posteNum] = { numero: posteNum, designation: `Poste ${posteNum}`, lignes: [] };
      }

      // Créer/récupérer la rubrique via le code RA
      const raKey = ra || "__default__";
      if (!rubriquesMap[raKey]) {
        const rub = { code: null, code_x3: ra || null, designation: dra || libellesRA[ra] || ra || "Rubrique", postes: [] };
        rubriquesMap[raKey] = rub;
        rubriques.push(rub);
      }

      // Rattacher le poste à la rubrique s'il n'est pas encore dedans
      const rub = rubriquesMap[raKey];
      if (!rub.postes.includes(postesByNum[posteNum])) {
        rub.postes.push(postesByNum[posteNum]);
      }

      const qte = toNum(row[colQte]);
      const pu  = toNum(row[colPU]);
      postesByNum[posteNum].lignes.push({
        code_x3:         item,
        designation:     des,
        unite:           String(row[colU] ?? "").trim() || null,
        quantite_prevue: qte,
        prix_unitaire:   pu,
      });
    }
  }

  const cleaned = rubriques
    .map((r) => ({ ...r, postes: r.postes.filter((p) => p.lignes.length > 0) }))
    .filter((r) => r.postes.length > 0);

  return cleaned;
}

/** Détecte si le fichier est au format X3 (cherche une colonne "N° Item" ou "item") */
function detectFormatX3(rows) {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const entetes = rows[i].map(v => norm(String(v ?? "")));
    if (entetes.some(h => h.includes("item") || h.includes("noitem"))) {
      return i; // retourne l'index de la ligne d'en-tête
    }
  }
  return -1;
}

/** Parse un fichier Excel/CSV et retourne la structure DQE hiérarchique. */
async function parseFichier(file) {
  const buf = await file.arrayBuffer();
  let wb;
  if (/\.(csv|txt)$/i.test(file.name)) {
    let texte;
    try { texte = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch { texte = new TextDecoder("windows-1252").decode(buf); }
    wb = XLSX.read(texte.replace(/^﻿/, ""), { type: "string", FS: texte.split("\n")[0].includes(";") ? ";" : undefined });
  } else {
    wb = XLSX.read(buf, { type: "array" });
  }

  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });
  if (rows.length < 2) throw new Error("Le fichier est vide.");

  // Détecter le format
  const x3HeaderRow = detectFormatX3(rows);
  let cleaned;

  if (x3HeaderRow >= 0) {
    // Format X3 (PF_X3_STT)
    cleaned = parseFormatX3(rows, x3HeaderRow);
    if (!cleaned.length) throw new Error("Aucune ligne DQE trouvée dans le fichier X3. Vérifiez que les N° Item sont au format 100-1, 100-2...");
  } else {
    // Format standard (Type / Code / Désignation)
    const entetes = rows[0].map(norm);
    const col = (...noms) => entetes.findIndex((h) => noms.includes(h));

    const iType  = col("type");
    const iCode  = col("code");
    const iDesig = col("designation", "libelle", "intitule");
    const iUnite = col("unite", "unit", "u");
    const iQte   = col("quantite", "qte", "quantiteprevue");
    const iPu    = col("prixunitaire", "pu", "prix", "prixunit");

    if (iType < 0 || iDesig < 0) {
      throw new Error("Format non reconnu. Utilisez le modèle fourni (colonnes Type/Désignation) ou le fichier X3 (colonnes N° Item).");
    }

    const rubriques = [];
    let curRub = null, curPoste = null, lignesOrphelines = 0;

    for (let i = 1; i < rows.length; i++) {
      const row  = rows[i];
      if (row.every((c) => String(c).trim() === "")) continue;
      const type  = norm(row[iType] ?? "");
      const desig = String(row[iDesig] ?? "").trim();
      const code  = iCode >= 0 ? String(row[iCode] ?? "").trim() : "";

      if (type === "rubrique") {
        if (!desig) continue;
        curRub = { code: code || null, code_x3: null, designation: desig, postes: [] };
        rubriques.push(curRub);
        curPoste = null;
      } else if (type === "poste") {
        if (!desig || !curRub) continue;
        curPoste = { designation: desig, lignes: [] };
        curRub.postes.push(curPoste);
      } else if (type === "ligne") {
        if (!desig) continue;
        if (!curPoste) { lignesOrphelines++; continue; }
        const qte = iQte >= 0 ? toNum(row[iQte]) : 0;
        const pu  = iPu  >= 0 ? toNum(row[iPu])  : 0;
        curPoste.lignes.push({
          designation:     desig,
          unite:           iUnite >= 0 ? String(row[iUnite] ?? "").trim() || null : null,
          quantite_prevue: qte,
          prix_unitaire:   pu,
        });
      }
    }

    if (!rubriques.length) throw new Error("Aucune rubrique trouvée.");
    cleaned = rubriques
      .map((r) => ({ ...r, postes: r.postes.filter((p) => p.lignes.length > 0) }))
      .filter((r) => r.postes.length > 0);

    if (!cleaned.length) throw new Error("Aucune ligne DQE trouvée.");
  }

  const stats = {
    rubriques: cleaned.length,
    postes:    cleaned.reduce((s, r) => s + r.postes.length, 0),
    lignes:    cleaned.reduce((s, r) => r.postes.reduce((s2, p) => s2 + p.lignes.length, s), 0),
    orphelines: 0,
    formatX3:  x3HeaderRow >= 0,
  };

  return { rubriques: cleaned, stats };
}

export default function ImportDqeModal({ contratId, onImported, onClose }) {
  const inputRef = useRef(null);
  const [fichier, setFichier]   = useState(null);
  const [parsed, setParsed]     = useState(null);   // { rubriques, stats }
  const [remplacer, setRemplacer] = useState(true);
  const [etat, setEtat]         = useState("idle"); // idle | parsing | importing | done
  const [erreur, setErreur]     = useState(null);

  async function choisir(file) {
    if (!file) return;
    setErreur(null); setParsed(null); setFichier(file); setEtat("parsing");
    try {
      const result = await parseFichier(file);
      setParsed(result);
      setEtat("idle");
    } catch (e) {
      setErreur(e.message); setEtat("idle");
    }
  }

  async function importer() {
    if (!parsed) return;
    setEtat("importing"); setErreur(null);
    try {
      const { data } = await import("../services/http").then((m) => m.default.post(
        `/contrat/${contratId}/dqe/import`,
        { rubriques: parsed.rubriques, remplacer }
      ));
      setEtat("done");
      onImported?.(data);
    } catch (e) {
      setErreur(e?.response?.data?.message ?? e.message ?? "Erreur lors de l'import.");
      setEtat("idle");
    }
  }

  const done = etat === "done";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet size={17} className="text-[#087F3E]" />
            Importer un DQE
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500">
            Le fichier doit suivre le modèle DQE : en-têtes <strong>N° Item</strong>, <strong>Désignation</strong>, <strong>U</strong>, <strong>PU</strong>, <strong>Qté Marché</strong>, <strong>Montant</strong> (colonnes C à H), code <strong>RA</strong> et désignation RA en colonnes A et B, postes numérotés <strong>100</strong>, <strong>200</strong>… et lignes <strong>100-1</strong>, <strong>100-2</strong>… Téléchargez le modèle pour voir un exemple.
          </p>

          {/* Actions fichier */}
          <div className="flex flex-wrap gap-3">
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { choisir(e.target.files[0]); e.target.value = ""; }} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={etat === "parsing" || etat === "importing"}
              className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-60"
            >
              {etat === "parsing" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {fichier ? "Choisir un autre fichier" : "Choisir un fichier (CSV, Excel)"}
            </button>
            <button
              onClick={telechargerModele}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <Download size={14} /> Modèle
            </button>
          </div>

          {fichier && <p className="text-xs text-gray-400">{fichier.name}</p>}

          {/* Erreur */}
          {erreur && (
            <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{erreur}
            </div>
          )}

          {/* Succès */}
          {done && (
            <div className="flex gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-800">
              <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
              DQE importé avec succès.
            </div>
          )}

          {/* Aperçu */}
          {parsed && !done && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Aperçu</p>
                <div className="flex gap-6 text-sm">
                  <div><span className="font-bold text-[#087F3E]">{parsed.stats.rubriques}</span> <span className="text-gray-500">rubrique{parsed.stats.rubriques > 1 ? "s" : ""}</span></div>
                  <div><span className="font-bold text-[#087F3E]">{parsed.stats.postes}</span> <span className="text-gray-500">poste{parsed.stats.postes > 1 ? "s" : ""}</span></div>
                  <div><span className="font-bold text-[#087F3E]">{parsed.stats.lignes}</span> <span className="text-gray-500">ligne{parsed.stats.lignes > 1 ? "s" : ""}</span></div>
                </div>
                {parsed.stats.orphelines > 0 && (
                  <p className="text-xs text-amber-600">{parsed.stats.orphelines} ligne(s) sans poste parent ignorée(s).</p>
                )}
                <ul className="text-xs text-gray-600 space-y-0.5 mt-1">
                  {parsed.rubriques.map((r, i) => (
                    <li key={i}><span className="font-medium">{r.code ? `[${r.code}] ` : ""}{r.designation}</span> — {r.postes.length} poste{r.postes.length > 1 ? "s" : ""}, {r.postes.reduce((s, p) => s + p.lignes.length, 0)} ligne{r.postes.reduce((s, p) => s + p.lignes.length, 0) > 1 ? "s" : ""}</li>
                  ))}
                </ul>
              </div>

              {/* Option remplacer / ajouter */}
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={remplacer} onChange={() => setRemplacer(true)} className="accent-[#087F3E]" />
                  <span>Remplacer le DQE existant</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!remplacer} onChange={() => setRemplacer(false)} className="accent-[#087F3E]" />
                  <span>Ajouter au DQE existant</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            {done ? "Fermer" : "Annuler"}
          </button>
          {!done && (
            <button
              onClick={importer}
              disabled={!parsed || etat === "importing"}
              className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#065A2C] disabled:opacity-50"
            >
              {etat === "importing" && <Loader2 size={14} className="animate-spin" />}
              Importer {parsed ? `(${parsed.stats.lignes} ligne${parsed.stats.lignes > 1 ? "s" : ""})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
