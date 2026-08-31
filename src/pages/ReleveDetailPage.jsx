import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Send, CheckCircle2, XCircle, Download,
  AlertTriangle, Building2, Hash, FileText, Lock, RotateCcw, Upload, Loader2,
} from "lucide-react";
import { useReleves } from "../context/RelevesContext";
import { useDecomptes } from "../context/DecomptesContext";
import { useContrats } from "../context/ContratsContext";
import { useBonsCommande } from "../context/BonsCommandeContext";
import { useFactures } from "../context/FacturesContext";
import { useParametres } from "../context/ParametresContext";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { chantiers } from "../data/chantiers";
import { sousTraitants } from "../data/sous_traitants";
import { CIRCUIT_DECOMPTE } from "../data/circuits";
import { RA_LABELS } from "../data/rubriquesAnalytiques";
import { getMontantActualise } from "../utils/contratMetrics";
import { getBCDuContrat, getSoldeDisponible } from "../utils/bcMetrics";
import { rapprocherFactures } from "../utils/factureCalcul";
import { formatDate } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import MoneyDisplay from "../components/MoneyDisplay";

const STATUTS_CUMUL = ["Approuvé", "Payé"];

function fmt(n) { return new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)); }

function ligneVal(decompte, code, field = "mensuel") {
  if (code === "C'" && field === "cumulM") {
    return decompte?.lignes?.find(l => l.codePoste === "C")?.cumulRembM || 0;
  }
  if (code === "C'" && field === "mensuel") {
    return decompte?.lignes?.find(l => l.codePoste === "C")?.remboursement || 0;
  }
  return decompte?.lignes?.find(l => l.codePoste === code)?.[field] || 0;
}

function findSignatureDate(contrat) {
  const daccStep = (contrat.circuitValidation || []).find(s => s.profil === "DACC" && s.statut === "validé");
  return daccStep?.date || contrat.dateDebut;
}

// ── Bloc Marché ───────────────────────────────────────────────────
function BlocMarche({ contrat }) {
  const tauxTVA = contrat.tauxTVA ?? 18;
  const montantInitial = contrat.montantInitialHT ?? contrat.montantHT;
  const avenantsValides = (contrat.avenants || []).filter(a => a.statutValidationDFC === "Validé")
    .sort((a, b) => (a.dateSignature || "").localeCompare(b.dateSignature || ""));

  let cumulHT = montantInitial;
  const rows = [
    {
      label: "Montant marché",
      htvaPartiel: montantInitial,
      htvaCumule: cumulHT,
      date: findSignatureDate(contrat),
    },
    ...avenantsValides.map((a, i) => {
      cumulHT += a.montant || 0;
      return {
        label: `Avenant ${i + 1} (${a.numero})`,
        htvaPartiel: a.montant,
        htvaCumule: cumulHT,
        date: a.dateSignature,
      };
    }),
  ];
  const totalHT = cumulHT;
  const totalTTC = Math.round(totalHT * (1 + tauxTVA / 100));

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Bloc marché</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white border-b border-gray-100">
            {["Libellé", "HTVA partiel", "HTVA cumulé", "TTC partiel", "TTC cumulé", "Date"].map(h => (
              <th key={h} className={`px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide ${h === "Libellé" ? "text-left" : h === "Date" ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-4 py-2 text-gray-800">{r.label}</td>
              <td className={`px-4 py-2 text-right ${r.htvaPartiel < 0 ? "text-red-600" : "text-gray-700"}`}>{r.htvaPartiel >= 0 && i > 0 ? "+" : ""}{fmt(r.htvaPartiel)}</td>
              <td className="px-4 py-2 text-right font-medium text-gray-900">{fmt(r.htvaCumule)}</td>
              <td className={`px-4 py-2 text-right ${r.htvaPartiel < 0 ? "text-red-600" : "text-gray-700"}`}>{fmt(Math.round(r.htvaPartiel * (1 + tauxTVA / 100)))}</td>
              <td className="px-4 py-2 text-right font-medium text-gray-900">{fmt(Math.round(r.htvaCumule * (1 + tauxTVA / 100)))}</td>
              <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(r.date)}</td>
            </tr>
          ))}
          <tr className="bg-[#E8F5EE] border-t-2 border-[#087F3E]/20">
            <td className="px-4 py-2.5 font-bold text-[#065A2C]">Marché actualisé</td>
            <td className="px-4 py-2.5"></td>
            <td className="px-4 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totalHT)}</td>
            <td className="px-4 py-2.5"></td>
            <td className="px-4 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totalTTC)}</td>
            <td className="px-4 py-2.5"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Historique des décomptes ──────────────────────────────────────
function HistoriqueDecomptes({ decomptesScope }) {
  let totA = 0, totD = 0, totG = 0, totI = 0, totK = 0, totNetHT = 0, totNetTTC = 0;
  decomptesScope.forEach(d => {
    totA += ligneVal(d, "A");
    totD += ligneVal(d, "D");
    totG += ligneVal(d, "G");
    totI += ligneVal(d, "I");
    totK += ligneVal(d, "K");
    totNetHT += d.montantsCalcules?.net_ht || 0;
    totNetTTC += d.montantsCalcules?.net_ttc || 0;
  });
  const last = decomptesScope[decomptesScope.length - 1];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Historique des décomptes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              {["N°", "Date", "Travaux partiel", "Travaux cumulé", "Avance versée / remb. / solde", "RG partiel / cumulé", "Cessions MTX", "Cessions MTL", "Cessions RH", "Net HT", "Net TTC"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {decomptesScope.map(d => {
              const versee = ligneVal(d, "C", "cumulM");
              const remb = ligneVal(d, "C'", "cumulM");
              return (
                <tr key={d.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 font-mono font-semibold text-gray-900">{d.code}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(d.dateFin)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{fmt(ligneVal(d, "A"))}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmt(ligneVal(d, "A", "cumulM"))}</td>
                  <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{fmt(versee)} / {fmt(remb)} / {fmt(versee - remb)}</td>
                  <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{fmt(ligneVal(d, "D"))} / {fmt(ligneVal(d, "D", "cumulM"))}</td>
                  <td className="px-3 py-2 text-right text-orange-600">{ligneVal(d, "G") > 0 ? fmt(ligneVal(d, "G")) : "—"}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{ligneVal(d, "I") > 0 ? fmt(ligneVal(d, "I")) : "—"}</td>
                  <td className="px-3 py-2 text-right text-purple-600">{ligneVal(d, "K") > 0 ? fmt(ligneVal(d, "K")) : "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(d.montantsCalcules?.net_ht)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-[#087F3E]">{fmt(d.montantsCalcules?.net_ttc)}</td>
                </tr>
              );
            })}
            <tr className="bg-[#E8F5EE] border-t-2 border-[#087F3E]/20">
              <td className="px-3 py-2.5 font-bold text-[#065A2C]" colSpan={2}>RÉCAP</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totA)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C]">{fmt(ligneVal(last, "A", "cumulM"))}</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C] whitespace-nowrap">
                {fmt(ligneVal(last, "C", "cumulM"))} / {fmt(ligneVal(last, "C'", "cumulM"))} / {fmt(ligneVal(last, "C", "cumulM") - ligneVal(last, "C'", "cumulM"))}
              </td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C] whitespace-nowrap">{fmt(totD)} / {fmt(ligneVal(last, "D", "cumulM"))}</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totG)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totI)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totK)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totNetHT)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totNetTTC)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Ventilation par rubrique analytique ───────────────────────────
function VentilationRA({ contrat, travauxCumules }) {
  const ventilation = useMemo(() => {
    const articles = contrat.articles || [];
    const totalDQE = articles.reduce((s, a) => s + (a.montantHT || 0), 0);
    if (totalDQE <= 0) return [];
    const parCode = {};
    articles.forEach(a => {
      parCode[a.codeRA] = (parCode[a.codeRA] || 0) + (a.montantHT || 0);
    });
    return Object.entries(parCode)
      .map(([code, montantDQE]) => ({
        code,
        libelle: RA_LABELS[code] || code,
        montantCumule: Math.round(travauxCumules * (montantDQE / totalDQE)),
        pct: (montantDQE / totalDQE) * 100,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [contrat, travauxCumules]);

  const totalPct = ventilation.reduce((s, v) => s + v.pct, 0);
  const totalMontant = ventilation.reduce((s, v) => s + v.montantCumule, 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Ventilation des travaux par rubrique analytique</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white border-b border-gray-100">
            {["Code RA", "Libellé", "Montant cumulé", "% du total", ""].map(h => (
              <th key={h} className={`px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide ${h.includes("Montant") || h.includes("%") ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ventilation.map(v => (
            <tr key={v.code}>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">{v.code}</td>
              <td className="px-4 py-2 text-gray-800">{v.libelle}</td>
              <td className="px-4 py-2 text-right font-medium text-gray-900">{fmt(v.montantCumule)} FCFA</td>
              <td className="px-4 py-2 text-right text-gray-600">{v.pct.toFixed(1)}%</td>
              <td className="px-4 py-2 w-40">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#087F3E] rounded-full" style={{ width: `${v.pct}%` }} />
                </div>
              </td>
            </tr>
          ))}
          <tr className="bg-[#E8F5EE] border-t-2 border-[#087F3E]/20">
            <td className="px-4 py-2.5 font-bold text-[#065A2C]" colSpan={2}>Total</td>
            <td className="px-4 py-2.5 text-right font-bold text-[#065A2C]">{fmt(totalMontant)} FCFA</td>
            <td className="px-4 py-2.5 text-right font-bold text-[#065A2C]">{totalPct.toFixed(1)}%</td>
            <td className="px-4 py-2.5"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Soldes en compte ───────────────────────────────────────────────
function SoldesEnCompte({ contrat, last, cumulFacture, bc }) {
  const versee = ligneVal(last, "C", "cumulM");
  const remb = ligneVal(last, "C'", "cumulM");
  const rgPreleve = ligneVal(last, "D", "cumulM");
  const rgRestitue = ligneVal(last, "E", "cumulM");
  const montantActualise = getMontantActualise(contrat);
  const soldeBC = bc ? getSoldeDisponible(bc) : null;

  const blocs = [
    {
      titre: "Avance de démarrage",
      lines: [
        { label: "Montant versé (cumulé)", val: versee },
        { label: "Cumul remboursé", val: remb },
        { label: "Reste à rembourser", val: versee - remb, strong: true },
      ],
    },
    {
      titre: "Retenue de garantie",
      lines: [
        { label: "Cumul prélevé", val: rgPreleve },
        { label: "Cumul restitué", val: rgRestitue },
        { label: "En dépôt", val: rgPreleve - rgRestitue, strong: true },
      ],
    },
    {
      titre: "Marché",
      lines: [
        { label: "Montant actualisé", val: montantActualise },
        { label: "Cumul facturé", val: cumulFacture },
        { label: "Solde disponible (BC)", val: soldeBC, strong: true, missing: bc === null },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {blocs.map(b => (
        <div key={b.titre} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{b.titre}</h4>
          </div>
          <div className="p-4 space-y-2">
            {b.lines.map(l => (
              <div key={l.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{l.label}</span>
                {l.missing ? (
                  <span className="text-xs text-gray-300">—</span>
                ) : (
                  <span className={`text-sm tabular-nums ${l.strong ? "font-bold text-gray-900" : "text-gray-700"}`}>{fmt(l.val)} FCFA</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
export default function ReleveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { releves, updateReleve } = useReleves();
  const { decomptes, updateDecompte, addFilMessage } = useDecomptes();
  const { contrats } = useContrats();
  const { bonsCommande } = useBonsCommande();
  const { factures, addFacture, updateFacture } = useFactures();
  const { toleranceRapprochement } = useParametres();
  const { currentUser } = useUser();
  const { addToast } = useToast();

  const [showContestForm, setShowContestForm] = useState(false);
  const [motif, setMotif] = useState("");
  const [ligneContestee, setLigneContestee] = useState("A — Travaux exécutés");

  const [showImportForm, setShowImportForm] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [pdfCharge, setPdfCharge] = useState(false);
  const [numeroFactureSTT, setNumeroFactureSTT] = useState("");
  const [dateFactureSTT, setDateFactureSTT] = useState(new Date().toISOString().slice(0, 10));
  const [montantSTT, setMontantSTT] = useState("");

  const releve = releves.find(r => r.id === id);
  const decompte = releve ? decomptes.find(d => d.id === releve.decompteId) : null;
  const contrat = releve ? contrats.find(c => c.id === releve.contratId) : null;
  const chantier = contrat ? chantiers.find(c => c.id === contrat.chantierId) : null;
  const stt = contrat ? sousTraitants.find(s => s.id === contrat.sousTraitantId) : null;
  const bc = contrat ? getBCDuContrat(contrat.id, bonsCommande) : null;
  // On exclut les factures CSE déjà en écart (historique d'un cycle précédent) : le rapprochement
  // doit toujours viser la facture CSE active du décompte, pas une facture déjà rejetée.
  const factureCSE = decompte ? factures.find(f => f.type === "cse" && f.decompteId === decompte.id && f.statut !== "Écart détecté") : null;

  const decomptesScope = useMemo(() => {
    if (!contrat || !decompte) return [];
    return decomptes
      .filter(d => d.contratId === contrat.id && STATUTS_CUMUL.includes(d.statut) && d.dateFin <= decompte.dateFin)
      .sort((a, b) => a.dateFin.localeCompare(b.dateFin));
  }, [contrat, decompte, decomptes]);

  if (!releve || !decompte || !contrat) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg font-semibold">Relevé introuvable</p>
        <button onClick={() => navigate("/releves")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour à la liste</button>
      </div>
    );
  }

  const last = decomptesScope[decomptesScope.length - 1] || decompte;
  const isDACC = currentUser?.roleId === "DACC";
  const isDCG = currentUser?.roleId === "DCG";

  function handleEnvoyer() {
    updateReleve(releve.id, { statut: "Envoyé au sous-traitant", dateEnvoi: new Date().toISOString().slice(0, 10) });
    addToast("Relevé envoyé au sous-traitant.", "success");
  }

  function handleAccepter() {
    updateReleve(releve.id, { statut: "Accepté", dateReponse: new Date().toISOString().slice(0, 10) });
    addToast("Le sous-traitant a accepté le relevé.", "success");
  }

  function handleContester() {
    if (!motif.trim()) { addToast("Le motif de contestation est requis.", "error"); return; }
    updateReleve(releve.id, {
      statut: "Contesté",
      dateReponse: new Date().toISOString().slice(0, 10),
      motifContestation: motif.trim(),
      ligneContestee,
    });
    addToast("Contestation enregistrée.", "error");
    setShowContestForm(false);
  }

  function handleReprendreDecompte() {
    updateDecompte(decompte.id, {
      statut: "Rejeté",
      validationEtape: { actuelle: 0, total: CIRCUIT_DECOMPTE.length, profilEnAttente: CIRCUIT_DECOMPTE[0].profil },
    });
    addFilMessage(decompte.id, {
      id: `msg-${Date.now()}`,
      auteur: { nom: "Système", role: "SYS", initiales: "SY" },
      date: new Date().toISOString(),
      message: `Décompte repris suite à contestation du sous-traitant sur le relevé ${releve.code} (ligne "${releve.ligneContestee}"). Motif : ${releve.motifContestation}`,
      type: "rejet",
    });
    addToast(`Décompte ${decompte.code} repassé en Rejeté.`, "error");
    navigate(`/decomptes/${decompte.id}`);
  }

  function handleOuvrirImport() {
    setMontantSTT(factureCSE ? String(factureCSE.montantTTC) : "");
    setShowImportForm(true);
  }

  function handleParcourir() {
    setImportLoading(true);
    setTimeout(() => {
      setImportLoading(false);
      setPdfCharge(true);
      addToast("Facture_sous_traitant.pdf chargée.", "success");
    }, 600);
  }

  function handleImporterEtRapprocher() {
    if (!numeroFactureSTT.trim() || !dateFactureSTT || !montantSTT) {
      addToast("Tous les champs sont requis.", "error");
      return;
    }
    if (!factureCSE) {
      addToast("Aucune facture CSE n'existe pour ce décompte — générez-la d'abord depuis la fiche décompte.", "error");
      return;
    }
    const montantTTC = parseFloat(montantSTT) || 0;
    const { conforme, ecart } = rapprocherFactures(factureCSE, { montantTTC }, toleranceRapprochement);
    const montantHT = Math.round(montantTTC / (1 + factureCSE.tauxTVA / 100));
    const newSTTId = `fac-stt-${decompte.id}-${Date.now()}`;
    const code = `FAC-STT-${new Date().getFullYear()}-${String(factures.filter(f => f.type === "sous_traitant").length + 1).padStart(3, "0")}`;
    const nouveauStatut = conforme ? "Rapprochée" : "Écart détecté";
    const motifRejet = conforme ? null : `Écart de ${fmt(ecart)} FCFA entre le net TTC facturé par le sous-traitant (${fmt(montantTTC)} FCFA) et celui de la facture CSE (${fmt(factureCSE.montantTTC)} FCFA).`;

    addFacture({
      id: newSTTId, code, type: "sous_traitant",
      contratId: contrat.id, decompteId: decompte.id, releveId: releve.id, factureLieeId: factureCSE.id,
      dateEmission: dateFactureSTT,
      lignes: factureCSE.lignes,
      montantHT, tauxTVA: factureCSE.tauxTVA, montantTVA: montantTTC - montantHT, montantTTC,
      statut: nouveauStatut,
      ecartRapprochement: conforme ? null : ecart,
      motifRejet,
      dateControleDACC: null, dateValidationDFC: null, datePaiement: null, referenceReglement: null,
      numeroFactureSTT: numeroFactureSTT.trim(),
    });
    updateFacture(factureCSE.id, { statut: nouveauStatut, factureLieeId: newSTTId, ecartRapprochement: conforme ? null : ecart });

    if (conforme) {
      addFilMessage(decompte.id, {
        id: `msg-${Date.now()}`,
        auteur: { nom: currentUser.nom, role: currentUser.roleId, initiales: currentUser.initiales },
        date: new Date().toISOString(),
        message: `Facture sous-traitant ${code} importée et rapprochée avec la facture CSE ${factureCSE.code} — montants conformes.`,
        type: "action",
      });
      addToast("Rapprochement conforme — factures passées au statut Rapprochée.", "success");
    } else {
      updateDecompte(decompte.id, {
        statut: "Rejeté",
        validationEtape: { actuelle: 0, total: CIRCUIT_DECOMPTE.length, profilEnAttente: CIRCUIT_DECOMPTE[0].profil },
      });
      addFilMessage(decompte.id, {
        id: `msg-${Date.now()}`,
        auteur: { nom: "Système", role: "SYS", initiales: "SY" },
        date: new Date().toISOString(),
        message: `Écart de rapprochement détecté entre la facture sous-traitant ${code} (${fmt(montantTTC)} FCFA) et la facture CSE ${factureCSE.code} (${fmt(factureCSE.montantTTC)} FCFA) — écart de ${fmt(ecart)} FCFA. Décompte repassé en Rejeté.`,
        type: "rejet",
      });
      addToast(`Écart détecté : ${fmt(ecart)} FCFA. Décompte repassé en Rejeté.`, "error");
    }
    setShowImportForm(false);
    navigate(`/factures/${newSTTId}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate("/releves")} className="hover:text-[#087F3E] flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Relevés
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{releve.code}</span>
      </div>

      <PageHeader
        title="Relevé de compte sous-traitant — Fiche de validation décompte"
        subtitle={releve.code}
        action={<StatusBadge statut={releve.statut} />}
      />

      {/* En-tête identifiants */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-4 gap-5">
        {[
          { icon: Building2, label: "Chantier", value: chantier?.nom || "—" },
          { icon: Hash, label: "Sous-traitant", value: `${stt?.raisonSociale || "—"} · NINEA ${stt?.ninea || "—"}` },
          { icon: FileText, label: "Contrat", value: contrat.code },
          { icon: FileText, label: "Décompte concerné", value: `${decompte.code} (${formatDate(decompte.dateDebut)} → ${formatDate(decompte.dateFin)})` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Icon size={11} />{label}</p>
            <p className="text-sm font-medium text-gray-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <BlocMarche contrat={contrat} />
      <HistoriqueDecomptes decomptesScope={decomptesScope} />
      <VentilationRA contrat={contrat} travauxCumules={ligneVal(last, "A", "cumulM")} />
      <SoldesEnCompte
        contrat={contrat}
        last={last}
        cumulFacture={decomptesScope.reduce((s, d) => s + (d.montantsCalcules?.net_ht || 0), 0)}
        bc={bc}
      />

      {/* Barre d'actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {releve.statut === "Généré" && (
          isDACC ? (
            <button onClick={handleEnvoyer} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <Send size={15} /> Envoyer au sous-traitant
            </button>
          ) : (
            <p className="text-sm text-gray-400">Seul le DACC peut envoyer ce relevé au sous-traitant.</p>
          )
        )}

        {releve.statut === "Envoyé au sous-traitant" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">Simulation de la réponse du sous-traitant</p>
            <p className="text-xs text-blue-600">Il n'y a pas de portail sous-traitant dans cette maquette — cet encart simule sa réponse.</p>
            {!showContestForm ? (
              <div className="flex gap-2">
                <button onClick={handleAccepter} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <CheckCircle2 size={15} /> Le sous-traitant accepte
                </button>
                <button onClick={() => setShowContestForm(true)} className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <XCircle size={15} /> Le sous-traitant conteste
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ligne contestée</label>
                  <select value={ligneContestee} onChange={e => setLigneContestee(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                    {["A — Travaux exécutés", "D — Retenue de garantie", "G — Cessions matériaux", "I — Cessions matériel", "K — Cessions RH"].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motif de contestation *</label>
                  <textarea rows={2} value={motif} onChange={e => setMotif(e.target.value)}
                    placeholder="Décrivez le motif de la contestation…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleContester} disabled={!motif.trim()}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                    <XCircle size={15} /> Confirmer la contestation
                  </button>
                  <button onClick={() => { setShowContestForm(false); setMotif(""); }} className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {releve.statut === "Accepté" && !showImportForm && (
          <div className="flex items-center justify-between bg-[#E8F5EE] border border-[#b5ddc8] rounded-xl p-4">
            <p className="text-sm text-[#065A2C]">
              Relevé accepté le <strong>{formatDate(releve.dateReponse)}</strong> — le sous-traitant peut émettre sa facture.
            </p>
            {isDCG ? (
              <button onClick={handleOuvrirImport} className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <Upload size={14} /> Enregistrer la facture du sous-traitant
              </button>
            ) : (
              <span title="Seul le DCG peut importer la facture du sous-traitant" className="flex items-center gap-2 bg-gray-200 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium opacity-70 cursor-not-allowed">
                <Lock size={14} /> Enregistrer la facture du sous-traitant
              </span>
            )}
          </div>
        )}

        {releve.statut === "Accepté" && showImportForm && (
          <div className="bg-[#F0FAF4] border border-[#087F3E]/30 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Import de la facture du sous-traitant</h4>
            {!factureCSE && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Aucune facture CSE n'existe encore pour ce décompte — générez-la depuis la fiche décompte avant de poursuivre.
              </p>
            )}
            <button
              onClick={handleParcourir}
              disabled={importLoading}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-60 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importLoading ? "Chargement…" : pdfCharge ? "Facture_sous_traitant.pdf chargée ✓" : "Parcourir…"}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numéro de facture du sous-traitant *</label>
                <input type="text" value={numeroFactureSTT} onChange={e => setNumeroFactureSTT(e.target.value)}
                  placeholder="Ex. FACT-CND-2026-0042"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date de facture *</label>
                <input type="date" value={dateFactureSTT} onChange={e => setDateFactureSTT(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Montant net TTC facturé (FCFA) *</label>
                <input type="text" inputMode="numeric" value={montantSTT} onChange={e => setMontantSTT(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
                {factureCSE && (
                  <p className="text-xs text-gray-400 mt-1">Facture CSE {factureCSE.code} : {fmt(factureCSE.montantTTC)} FCFA — pré-rempli, modifiable pour simuler un écart.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImporterEtRapprocher}
                disabled={!factureCSE || !numeroFactureSTT.trim() || !dateFactureSTT || !montantSTT}
                className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <CheckCircle2 size={15} /> Importer et rapprocher
              </button>
              <button onClick={() => setShowImportForm(false)} className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100">
                Annuler
              </button>
            </div>
          </div>
        )}

        {releve.statut === "Contesté" && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Relevé contesté par le sous-traitant</p>
                <p className="text-xs text-red-600 mt-0.5">Ligne contestée : <strong>{releve.ligneContestee}</strong></p>
                <p className="text-sm text-red-700 mt-1.5 leading-relaxed">{releve.motifContestation}</p>
              </div>
            </div>
            {decompte.statut !== "Rejeté" ? (
              <button onClick={handleReprendreDecompte} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <RotateCcw size={15} /> Reprendre le décompte
              </button>
            ) : (
              <p className="text-xs text-red-600 font-medium">Le décompte {decompte.code} est déjà repassé en Rejeté.</p>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <button onClick={() => addToast("PDF téléchargé.", "success")} className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition-colors">
            <Download size={14} /> Télécharger en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
