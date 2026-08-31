import { useState } from "react";
import { Plus, GitBranch, List, Settings, Users, CheckCircle2, ToggleLeft, ToggleRight, Tags, Hash, Package, Truck, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Tabs from "../components/Tabs";
import WorkflowSteps from "../components/WorkflowSteps";
import { motifsAutresDeductions } from "../data/motifsAutresDeductions";
import { BAREME_MTX, BAREME_MTL, BAREME_RH } from "../data/baremesCessions";
import { RA_CODES } from "../data/rubriquesAnalytiques";
import SyncBadge from "../components/SyncBadge";
import ImportFileButton from "../components/ImportFileButton";
import { useToast } from "../context/ToastContext";
import { useParametres } from "../context/ParametresContext";
import { CIRCUIT_CONTRAT, CIRCUIT_DECOMPTE } from "../data/circuits";

// ── Profils validateurs ───────────────────────────────────────────
// Pas de libellé développé : seul le sigle du profil est affiché (cf. renommage DAC → DACC).
// Liste dérivée des vrais circuits (source unique de vérité) plutôt qu'une liste figée en doublon.
const PROFILS = Array.from(new Set([...CIRCUIT_CONTRAT, ...CIRCUIT_DECOMPTE].map(s => s.profil)))
  .map((profil, i) => ({ ordre: i + 1, profil, statut: "validé" }));

// ── Utilisateurs mock ─────────────────────────────────────────────
const USERS = [
  { id: 1, nom: "Oumar SOW",        role: "DG",                email: "c.diop@cse.sn",   actif: true  },
  { id: 2, nom: "Aliou BA",         role: "DGA",              email: "m.fall@cse.sn",   actif: true  },
  { id: 3, nom: "Ibrahima SECK",       role: "DEX",               email: "i.seck@cse.sn",   actif: true  },
  { id: 4, nom: "Fatou NDIAYE",        role: "DEXA",              email: "f.ndiaye@cse.sn", actif: true  },
  { id: 5, nom: "Moussa BA",       role: "DACC",              email: "a.diallo@cse.sn", actif: true  },
  { id: 6, nom: "Aïssatou DIAGNE",     role: "CT",                email: "a.diagne@cse.sn", actif: true  },
  { id: 7, nom: "Consultant HTSOFT 1", role: "Consultant HTSOFT", email: "dev1@htsoft.sn",  actif: true  },
  { id: 8, nom: "Consultant HTSOFT 2", role: "Consultant HTSOFT", email: "dev2@htsoft.sn",  actif: false },
];

// ── Onglet Circuits ───────────────────────────────────────────────
function TabCircuits() {
  return (
    <div className="space-y-6 pt-4">
      <div className="bg-[#E8F5EE] border-l-4 border-[#087F3E] px-5 py-4 rounded-r-xl">
        <p className="text-sm text-[#065A2C]">
          Le circuit de validation s'applique à tous les décomptes de sous-traitance. Il peut être surchargé contrat par contrat dans la fiche contrat.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Circuit par défaut</h3>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <WorkflowSteps steps={CIRCUIT_CONTRAT.map(s => ({ ...s, nom: s.libelle }))} orientation="horizontal" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Profils de validation</h3>
          <button className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors">
            <Plus size={12} /> Ajouter un profil
          </button>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Ordre", "Code profil", "Statut"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PROFILS.map(p => (
                <tr key={p.profil} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-[#087F3E] text-white text-xs flex items-center justify-center font-bold">{p.ordre}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{p.profil}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs bg-[#E8F5EE] text-[#065A2C] px-2 py-0.5 rounded-full font-medium w-fit">
                      <CheckCircle2 size={10} /> Actif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Onglet Motifs ─────────────────────────────────────────────────
function TabMotifs() {
  const { addToast } = useToast();
  const [motifs, setMotifs] = useState(motifsAutresDeductions);

  function toggle(id) {
    setMotifs(prev => prev.map(m => m.id === id ? { ...m, actif: !m.actif } : m));
    addToast("Motif mis à jour.", "success");
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{motifs.length} motifs configurés</p>
        <button className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors">
          <Plus size={12} /> Ajouter un motif
        </button>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code", "Libellé", "Date création", "Actif"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {motifs.map(m => (
              <tr key={m.id} className={`hover:bg-gray-50 ${!m.actif ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{m.libelle}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(m.dateCreation).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(m.id)} className="transition-colors">
                    {m.actif
                      ? <ToggleRight size={22} className="text-[#087F3E]" />
                      : <ToggleLeft  size={22} className="text-gray-300" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Onglet Taux ───────────────────────────────────────────────────
function TabTaux() {
  const { addToast } = useToast();
  const [tauxRG, setTauxRG] = useState(5);
  const [tauxAD, setTauxAD] = useState(15);
  const { toleranceRapprochement, setToleranceRapprochement } = useParametres();

  function save() { addToast("Taux enregistrés avec succès.", "success"); }

  return (
    <div className="space-y-6 pt-4 max-w-xl">
      {[
        { label: "Retenue de Garantie (RG)", val: tauxRG, set: setTauxRG, hint: "Déduit à chaque décompte, restitué à la réception définitive." },
        { label: "Avance de Démarrage (AD)", val: tauxAD, set: setTauxAD, hint: "Versée en début de contrat, remboursée prorata à chaque décompte." },
      ].map(({ label, val, set, hint }) => (
        <div key={label} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
          <div className="flex items-center gap-3">
            <div className="relative w-32">
              <input
                type="number"
                min={0} max={100}
                value={val}
                onChange={e => set(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
            </div>
            <div className="flex items-center gap-3">
              {["En taux", "En valeur absolue"].map(opt => (
                <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name={`mode-${label}`} defaultChecked={opt === "En taux"}
                    className="text-[#087F3E] focus:ring-[#087F3E]" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
      ))}

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">TVA</h3>
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <input type="number" value={18} readOnly
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
          </div>
          <span className="text-xs text-gray-400">Taux légal sénégalais — non modifiable</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Tolérance de rapprochement des factures</h3>
        <div className="flex items-center gap-3">
          <div className="relative w-40">
            <input
              type="number"
              min={0}
              value={toleranceRapprochement}
              onChange={e => setToleranceRapprochement(Math.max(0, Number(e.target.value) || 0))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">FCFA</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Écart maximal toléré entre le net TTC de la facture CSE et celui de la facture sous-traitant pour que le rapprochement soit considéré conforme.
          Valeur par défaut <strong>0 FCFA</strong> — correspondance exacte exigée par le cahier des charges. Une tolérance non nulle permet d'absorber les écarts d'arrondi.
        </p>
      </div>

      <button onClick={save} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        Enregistrer les taux par défaut
      </button>
    </div>
  );
}

// ── Onglet Barèmes de cessions ────────────────────────────────────
function EditablePrice({ value, onChange }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value ?? ""}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#087F3E]"
    />
  );
}

function TabBaremeMTX() {
  const { addToast } = useToast();
  const [rows, setRows] = useState(BAREME_MTX);

  function updatePrix(id, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, prixUnitaireReference: value } : r));
  }
  function handleImport(n) {
    setRows(prev => [...prev, ...Array.from({ length: n }, (_, i) => ({
      id: `mtx-import-${Date.now()}-${i}`, codeArticleX3: `X3-IMP-${Date.now().toString().slice(-4)}${i}`,
      designation: "Article importé", famille: "Sable et agrégats", unite: "m³", prixUnitaireReference: 0, coefficientRendementDefaut: 1, actif: true,
    }))]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SyncBadge
          source="Sage X3 — référentiel articles"
          initialSync="20/08/2026 à 06:00"
          buttonLabel="Synchroniser les articles"
          resultMessage={`Synchronisation terminée — ${rows.length} élément(s) à jour, 0 nouveau(x). Les prix ne sont pas fournis par X3.`}
        />
        <ImportFileButton label="Importer une grille tarifaire" onImport={handleImport} nAjoutes={2} itemLabel="article" />
      </div>
      <p className="text-xs text-gray-400">Source des articles : Sage X3 (référentiel articles). Les prix unitaires de référence sont propres à la plateforme — X3 ne fournit que les quantités de cession.</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code X3", "Désignation", "Famille", "Unité", "Prix référence (FCFA)", "Rendement"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.codeArticleX3}</td>
                <td className="px-4 py-2.5 text-gray-800">{r.designation}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.famille}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.unite}</td>
                <td className="px-4 py-2.5"><EditablePrice value={r.prixUnitaireReference} onChange={(v) => updatePrix(r.id, v)} /></td>
                <td className="px-4 py-2.5 text-gray-500">{r.coefficientRendementDefaut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabBaremeMTL() {
  const [rows, setRows] = useState(BAREME_MTL);

  function updateTarif(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function handleImport(n) {
    setRows(prev => [...prev, ...Array.from({ length: n }, (_, i) => ({
      id: `mtl-import-${Date.now()}-${i}`, codeMateriel: `GMAO-IMP-${Date.now().toString().slice(-4)}${i}`,
      designation: "Engin importé", categorie: "Transport", uniteFacturation: "jour", tarifHoraire: 0, tarifJournalier: 0, sourceBareme: "GMAO - Atelier Central", actif: true,
    }))]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SyncBadge
          source="GMAO — Atelier Central"
          initialSync="18/08/2026 à 07:30"
          buttonLabel="Récupérer depuis la GMAO"
          resultMessage={`Synchronisation terminée — ${rows.length} élément(s) à jour, 0 nouveau(x).`}
        />
        <ImportFileButton label="Importer une grille tarifaire" onImport={handleImport} nAjoutes={2} itemLabel="engin" />
      </div>
      <p className="text-xs text-gray-400">Le matériel est facturé à la durée d'utilisation (heure ou jour), et non à la quantité — le barème est paramétré par la Direction Matériel dans la GMAO.</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code", "Désignation", "Catégorie", "Facturation", "Tarif horaire", "Tarif journalier"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.codeMateriel}</td>
                <td className="px-4 py-2.5 text-gray-800">{r.designation}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.categorie}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.uniteFacturation === "heure" ? "bg-blue-50 text-blue-700" : "bg-[#E8F5EE] text-[#065A2C]"}`}>
                    {r.uniteFacturation === "heure" ? "à l'heure" : "au jour"}
                  </span>
                </td>
                <td className="px-4 py-2.5"><EditablePrice value={r.tarifHoraire} onChange={(v) => updateTarif(r.id, "tarifHoraire", v)} /></td>
                <td className="px-4 py-2.5"><EditablePrice value={r.tarifJournalier} onChange={(v) => updateTarif(r.id, "tarifJournalier", v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabBaremeRH() {
  const [rows, setRows] = useState(BAREME_RH);

  function update(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function handleImport(n) {
    setRows(prev => [...prev, ...Array.from({ length: n }, (_, i) => ({
      id: `rh-import-${Date.now()}-${i}`, qualification: "Qualification importée", typePersonnel: "journalier",
      coutJournalier: 0, salaireBrutMensuel: null, tauxChargesSociales: null, sourceBareme: "États de paie DCH", actif: true,
    }))]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">Source : États de paie DCH — pas de synchronisation automatique</span>
        <ImportFileButton label="Importer une grille tarifaire" onImport={handleImport} nAjoutes={2} itemLabel="qualification" />
      </div>
      <p className="text-xs text-gray-400">Deux régimes : journalier (coût par jour-homme) et permanent (salaire brut mensuel + charges sociales, au prorata des jours affectés).</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Qualification", "Régime", "Coût journalier", "Salaire brut mensuel", "Charges sociales"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-800">{r.qualification}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.typePersonnel === "journalier" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>
                    {r.typePersonnel}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {r.typePersonnel === "journalier"
                    ? <EditablePrice value={r.coutJournalier} onChange={(v) => update(r.id, "coutJournalier", v)} />
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  {r.typePersonnel === "permanent"
                    ? <EditablePrice value={r.salaireBrutMensuel} onChange={(v) => update(r.id, "salaireBrutMensuel", v)} />
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-500">{r.typePersonnel === "permanent" ? `${r.tauxChargesSociales}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const BAREME_SUBTABS = [
  { id: "mtx", label: "MTX — Matériaux", icon: Package },
  { id: "mtl", label: "MTL — Matériel", icon: Truck },
  { id: "rh",  label: "RH — Personnel", icon: Users },
];

function TabBaremesCessions() {
  const [sub, setSub] = useState("mtx");
  return (
    <div className="space-y-5 pt-4">
      <div className="bg-[#E8F5EE] border-l-4 border-[#087F3E] px-5 py-4 rounded-r-xl">
        <p className="text-sm text-[#065A2C] leading-relaxed">
          Barèmes tarifaires de référence pour les cessions MTX, MTL et RH. Chaque contrat en dérive son propre barème
          (surchargeable) dans son onglet <strong>Barème de cessions</strong>.
        </p>
      </div>
      <div className="flex gap-2">
        {BAREME_SUBTABS.map(t => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${active ? "bg-[#087F3E] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>
      {sub === "mtx" && <TabBaremeMTX />}
      {sub === "mtl" && <TabBaremeMTL />}
      {sub === "rh"  && <TabBaremeRH />}
    </div>
  );
}

// ── Onglet Récupération des cessions ──────────────────────────────
function formatDateHeure(iso) {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " à " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function TabRecuperationCessions() {
  const { cessionsParams, updateCessionsParams } = useParametres();
  const { addToast } = useToast();
  const [magasinsText, setMagasinsText] = useState(cessionsParams.magasins.join(", "));

  function save() {
    updateCessionsParams({ magasins: magasinsText.split(",").map(s => s.trim()).filter(Boolean) });
    addToast("Paramètres de récupération des cessions enregistrés.", "success");
  }

  return (
    <div className="space-y-6 pt-4 max-w-xl">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Arrêté périodique des états de cession</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700">Jour du mois</span>
          <div className="relative w-24">
            <input
              type="number"
              min={1} max={28}
              value={cessionsParams.jourArreteMensuel}
              onChange={e => updateCessionsParams({ jourArreteMensuel: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">Date proposée par défaut à la création d'un état de cession — modifiable état par état.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Fréquence de récupération (Sage X3)</h3>
        <select
          value={cessionsParams.frequence}
          onChange={e => updateCessionsParams({ frequence: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
        >
          <option value="quotidienne">Quotidienne</option>
          <option value="hebdomadaire">Hebdomadaire</option>
          <option value="mensuelle">Mensuelle</option>
          <option value="manuelle">Manuelle uniquement</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Plage de dates par défaut</h3>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={cessionsParams.depuisDerniereRecuperation}
            onChange={e => updateCessionsParams({ depuisDerniereRecuperation: e.target.checked })}
            className="w-4 h-4 accent-[#087F3E]"
          />
          <span className="text-sm text-gray-700">Depuis la dernière récupération</span>
        </label>
        {!cessionsParams.depuisDerniereRecuperation && (
          <div className="flex items-center gap-3">
            <div className="relative w-28">
              <input
                type="number"
                min={1}
                value={cessionsParams.plageDefautJours}
                onChange={e => updateCessionsParams({ plageDefautJours: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
              />
            </div>
            <span className="text-sm text-gray-500">derniers jours</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Sage X3 — mouvements de stock (section MTX)</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type de mouvement à interroger</label>
          <input
            type="text"
            value={cessionsParams.typeMouvementX3}
            onChange={e => updateCessionsParams({ typeMouvementX3: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Magasins concernés (codes séparés par des virgules)</label>
          <input
            type="text"
            value={magasinsText}
            onChange={e => setMagasinsText(e.target.value)}
            placeholder="Ex. MAG-DKR-01, MAG-THS-02"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
          />
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Dernière récupération effectuée</h3>
        {[
          { key: "x3",         label: "Sage X3 (matériaux)" },
          { key: "pointageMTL", label: "Pointage journalier (matériel)" },
          { key: "paie",       label: "Paie (ressources humaines)" },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            <span className="text-gray-500">{formatDateHeure(cessionsParams.derniereRecuperation[key])}</span>
          </div>
        ))}
      </div>

      <button onClick={save} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
        Enregistrer
      </button>
    </div>
  );
}

// ── Onglet Rubriques analytiques ──────────────────────────────────
function TabReferentielRA() {
  const [rows] = useState(RA_CODES);
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">{rows.length} rubriques analytiques configurées</p>
        <SyncBadge
          source="Sage X3 Projets"
          initialSync="20/08/2026 à 06:00"
          resultMessage={`Synchronisation terminée — ${rows.length} élément(s) à jour, 0 nouveau(x).`}
        />
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Code RA", "Libellé"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => (
              <tr key={r.code} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">{r.code}</td>
                <td className="px-4 py-3 text-gray-700">{r.libelle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Onglet Utilisateurs ───────────────────────────────────────────
function TabUtilisateurs() {
  const [users] = useState(USERS);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} utilisateurs</p>
        <button className="flex items-center gap-1.5 text-xs text-[#087F3E] font-medium border border-[#087F3E] px-3 py-1.5 rounded-lg hover:bg-[#E8F5EE] transition-colors">
          <Plus size={12} /> Ajouter un utilisateur
        </button>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Nom", "Rôle", "Email", "Statut"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.actif ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#087F3E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {u.nom.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.nom}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-sm">{u.role}</td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{u.email}</td>
                <td className="px-4 py-3">
                  {u.actif
                    ? <span className="text-xs bg-[#E8F5EE] text-[#065A2C] px-2 py-0.5 rounded-full font-medium">Actif</span>
                    : <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">Inactif</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
const TAB_ITEMS = [
  { id: "circuits",    label: "Circuits de validation",  icon: GitBranch },
  { id: "motifs",      label: "Motifs déductions",       icon: List },
  { id: "taux",        label: "Taux par défaut",         icon: Settings },
  { id: "baremes",     label: "Barèmes de cessions",     icon: Tags },
  { id: "recuperation-cessions", label: "Récupération des cessions", icon: RefreshCw },
  { id: "referentiel-ra", label: "Rubriques analytiques", icon: Hash },
  { id: "utilisateurs",label: "Utilisateurs & Profils",  icon: Users },
];

export default function ParametragePage() {
  const [activeTab, setActiveTab] = useState("circuits");

  return (
    <div className="space-y-6">
      <PageHeader title="Paramétrage" subtitle="Configuration globale de la plateforme" />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-5 pt-2">
          <Tabs items={TAB_ITEMS} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="px-6 pb-8">
          {activeTab === "circuits"     && <TabCircuits />}
          {activeTab === "motifs"       && <TabMotifs />}
          {activeTab === "taux"         && <TabTaux />}
          {activeTab === "baremes"      && <TabBaremesCessions />}
          {activeTab === "recuperation-cessions" && <TabRecuperationCessions />}
          {activeTab === "referentiel-ra" && <TabReferentielRA />}
          {activeTab === "utilisateurs" && <TabUtilisateurs />}
        </div>
      </div>
    </div>
  );
}
