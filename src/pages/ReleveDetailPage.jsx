import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Send, CheckCircle2, XCircle, Download,
  AlertTriangle, Loader2, FileText,
} from "lucide-react";
import { useReleve, useChangerStatutReleve } from "../hooks/useReleves";
import { useDecomptesPaginated } from "../hooks/useDecomptes";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/formatters";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const fmtNum  = n => new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0));
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const fmtMois = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const LIGNES_CONTEST = [
  "A — Travaux exécutés",
  "C — Avance démarrage",
  "D — Retenue de garantie",
  "G — Cessions matériaux",
  "I — Cessions matériel",
  "K — Cessions RH",
];

export default function ReleveDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { data: releve, isLoading } = useReleve(id);
  const changerStatut = useChangerStatutReleve();

  const [showContestForm, setShowContestForm] = useState(false);
  const [motif, setMotif]                     = useState("");
  const [ligneContestee, setLigneContestee]   = useState(LIGNES_CONTEST[0]);

  const contratId = releve?.contrat_id ? parseInt(releve.contrat_id) : null;
  const { data: decomptesData } = useDecomptesPaginated(
    { contrat_id: contratId, count: 200 },
    { enabled: !!contratId }
  );
  const tousDecomptes = (decomptesData?.data ?? []).sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? "")
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 size={24} className="animate-spin mr-2" /> Chargement…
    </div>
  );
  if (!releve) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <p className="text-lg font-semibold">Relevé introuvable</p>
      <button onClick={() => navigate("/releves")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour à la liste</button>
    </div>
  );

  const contrat  = releve.contrat;
  const stt      = contrat?.soustraitant;
  const chantier = contrat?.chantier;
  const decompte = releve.decompte;

  // Financiers contrat
  const montantInitial = parseFloat(contrat?.montant_initial ?? 0);
  const montantActuel  = parseFloat(contrat?.montant_actuel ?? montantInitial);
  const avenants       = (contrat?.avenants ?? []).filter(a => a.statut === "valide");
  const tauxTVA        = parseFloat(decompte?.taux_tva ?? 18) / 100;

  // Cumuls depuis tous les décomptes du contrat
  const cumulHT   = tousDecomptes.reduce((s, d) => s + parseFloat(d.montant_ht ?? 0), 0);
  const cumulRG   = tousDecomptes.reduce((s, d) => s + parseFloat(d.montant_retenue_garantie ?? 0), 0);
  const cumulAD   = tousDecomptes.reduce((s, d) => s + parseFloat(d.montant_avances_deduites ?? 0), 0);
  const solde     = montantActuel - cumulHT;

  function handleEnvoyer() {
    changerStatut.mutate(
      { id: releve.id, statut: "envoye" },
      { onSuccess: () => addToast("Relevé envoyé au sous-traitant.", "success") }
    );
  }
  function handleAccepter() {
    changerStatut.mutate(
      { id: releve.id, statut: "accepte" },
      { onSuccess: () => addToast("Relevé accepté.", "success") }
    );
  }
  function handleContester() {
    if (!motif.trim()) { addToast("Le motif est requis.", "error"); return; }
    changerStatut.mutate(
      { id: releve.id, statut: "conteste", motif_contestation: motif.trim(), ligne_contestee: ligneContestee },
      { onSuccess: () => { addToast("Contestation enregistrée.", "success"); setShowContestForm(false); setMotif(""); } }
    );
  }

  const busy = changerStatut.isLoading;

  // Calcul cumulatifs pour historique décomptes
  let cumulBrut = 0, cumulHTAcc = 0, cumulRGAcc = 0, cumulADAcc = 0;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
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

      {/* Identifiants */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chantier</p>
          <p className="text-sm font-semibold text-gray-800">{chantier?.designation || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sous-traitant</p>
          <p className="text-sm font-semibold text-gray-800">{stt?.raison_sociale || "—"}</p>
          {stt?.ninea && <p className="text-xs text-gray-500 mt-0.5">NINEA {stt.ninea}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contrat</p>
          <Link to={`/contrats/${releve.contrat_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline">
            {contrat?.code || "—"}
          </Link>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Décompte concerné</p>
          <Link to={`/decomptes/${releve.decompte_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline">
            {decompte?.code || "—"}
          </Link>
          {decompte?.etat_cession?.periode_debut && (
            <p className="text-xs text-gray-500 mt-0.5">
              {fmtMois(decompte.etat_cession.periode_debut)} → {fmtMois(decompte.etat_cession.periode_fin)}
            </p>
          )}
        </div>
      </div>

      {/* Bloc marché */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Bloc marché</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Libellé", "HTVA partiel", "HTVA cumulé", "TTC partiel", "TTC cumulé", "Date"].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-800">Montant marché</td>
                <td className="px-5 py-3 font-medium">{fmtNum(montantInitial)}</td>
                <td className="px-5 py-3 font-medium">{fmtNum(montantInitial)}</td>
                <td className="px-5 py-3 text-gray-600">{fmtNum(montantInitial * (1 + tauxTVA))}</td>
                <td className="px-5 py-3 text-gray-600">{fmtNum(montantInitial * (1 + tauxTVA))}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{fmtDate(contrat?.date_debut)}</td>
              </tr>
              {(() => {
                let cumHT = montantInitial, cumTTC = montantInitial * (1 + tauxTVA);
                return avenants.map((a, i) => {
                  const partHT  = parseFloat(a.montant ?? 0);
                  const partTTC = partHT * (1 + tauxTVA);
                  cumHT  += partHT;
                  cumTTC += partTTC;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-violet-700">{a.code ?? `Avenant ${i + 1}`}</td>
                      <td className="px-5 py-3 font-medium text-violet-700">{partHT >= 0 ? "+" : ""}{fmtNum(partHT)}</td>
                      <td className="px-5 py-3 font-medium">{fmtNum(cumHT)}</td>
                      <td className="px-5 py-3 text-gray-600">{fmtNum(partTTC)}</td>
                      <td className="px-5 py-3 text-gray-600">{fmtNum(cumTTC)}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{fmtDate(a.date_signature)}</td>
                    </tr>
                  );
                });
              })()}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-5 py-3 text-gray-900">Marché actualisé</td>
                <td className="px-5 py-3"></td>
                <td className="px-5 py-3 text-[#087F3E]">{fmtNum(montantActuel)}</td>
                <td className="px-5 py-3"></td>
                <td className="px-5 py-3 text-[#087F3E]">{fmtNum(montantActuel * (1 + tauxTVA))}</td>
                <td className="px-5 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique des décomptes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Historique des décomptes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["N°", "Date", "Travaux partiel", "Travaux cumulé", "Avance versée / remb. / solde", "RG partiel / cumulé", "Net HT", "Net TTC"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tousDecomptes.map(d => {
                const brut   = parseFloat(d.montant_brut ?? 0);
                const ht     = parseFloat(d.montant_ht ?? 0);
                const rg     = parseFloat(d.montant_retenue_garantie ?? 0);
                const ad     = parseFloat(d.montant_avances_deduites ?? 0);
                cumulBrut += brut; cumulHTAcc += ht; cumulRGAcc += rg; cumulADAcc += ad;
                const isCurrent = d.id === releve.decompte_id;
                return (
                  <tr key={d.id} className={`hover:bg-gray-50/50 ${isCurrent ? "bg-[#E8F5EE]/40" : ""}`}>
                    <td className={`px-4 py-2.5 font-mono text-xs font-semibold ${isCurrent ? "text-[#087F3E]" : "text-gray-900"}`}>
                      <Link to={`/decomptes/${d.id}`} className="hover:underline">{d.code}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(d.date_echeance ?? d.created_at)}</td>
                    <td className="px-4 py-2.5 font-medium">{fmtNum(brut)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtNum(cumulBrut)}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{fmtNum(ad)} / {fmtNum(cumulADAcc)} / {fmtNum(Math.max(0, cumulBrut * 0.15 - cumulADAcc))}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{fmtNum(rg)} / {fmtNum(cumulRGAcc)}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#087F3E]">{fmtNum(ht)}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{fmtNum(parseFloat(d.montant_ttc ?? 0))}</td>
                  </tr>
                );
              })}
            </tbody>
            {tousDecomptes.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td className="px-4 py-2.5 text-xs uppercase text-gray-500 tracking-wide" colSpan={2}>RÉCAP</td>
                  <td className="px-4 py-2.5">{fmtNum(cumulBrut)}</td>
                  <td className="px-4 py-2.5">{fmtNum(cumulBrut)}</td>
                  <td className="px-4 py-2.5 text-xs">{fmtNum(cumulADAcc)} / {fmtNum(cumulADAcc)} / 0</td>
                  <td className="px-4 py-2.5 text-xs">{fmtNum(cumulRGAcc)} / {fmtNum(cumulRGAcc)}</td>
                  <td className="px-4 py-2.5 text-[#087F3E]">{fmtNum(cumulHTAcc)}</td>
                  <td className="px-4 py-2.5">{fmtNum(tousDecomptes.reduce((s,d) => s + parseFloat(d.montant_ttc ?? 0), 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3 cartes résumé */}
      <div className="grid grid-cols-3 gap-4">
        {/* Avance de démarrage */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avance de démarrage</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Montant versé (cumulé)</span><span className="font-semibold">{fmtNum(cumulBrut * 0.15)} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cumul remboursé</span><span className="font-semibold">{fmtNum(cumulADAcc)} FCFA</span></div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span className={cumulBrut * 0.15 - cumulADAcc > 0 ? "text-amber-600" : "text-[#087F3E]"}>Reste à rembourser</span>
              <span className={cumulBrut * 0.15 - cumulADAcc > 0 ? "text-amber-600" : "text-[#087F3E]"}>{fmtNum(Math.max(0, cumulBrut * 0.15 - cumulADAcc))} FCFA</span>
            </div>
          </div>
        </div>

        {/* Retenue de garantie */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Retenue de garantie</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Cumul prélevé</span><span className="font-semibold">{fmtNum(cumulRGAcc)} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cumul restitué</span><span className="font-semibold">0 FCFA</span></div>
            <div className="flex justify-between border-t pt-2 font-bold"><span className="text-gray-700">En dépôt</span><span>{fmtNum(cumulRGAcc)} FCFA</span></div>
          </div>
        </div>

        {/* Marché */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marché</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Montant actualisé</span><span className="font-semibold">{fmtNum(montantActuel)} FCFA</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cumul facturé</span><span className="font-semibold">{fmtNum(cumulHTAcc)} FCFA</span></div>
            <div className="flex justify-between border-t pt-2 font-bold"><span className="text-[#087F3E]">Solde disponible</span><span className="text-[#087F3E]">{fmtNum(Math.max(0, solde))} FCFA</span></div>
          </div>
        </div>
      </div>

      {/* Statut accepté */}
      {releve.statut === "accepte" && (
        <div className="bg-[#E8F5EE] border border-[#b5ddc8] rounded-xl p-4">
          <p className="text-sm text-[#065A2C]">
            Relevé accepté le <strong>{formatDate(releve.date_retour)}</strong> — le sous-traitant peut émettre sa facture.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">

        {releve.statut === "genere" && (
          <button onClick={handleEnvoyer} disabled={busy}
            className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={15} />} Envoyer au sous-traitant
          </button>
        )}

        {releve.statut === "envoye" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">Réponse du sous-traitant</p>
            {!showContestForm ? (
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleAccepter} disabled={busy}
                  className="flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />} Le sous-traitant accepte
                </button>
                <button onClick={() => setShowContestForm(true)} disabled={busy}
                  className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <XCircle size={15} /> Le sous-traitant conteste
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ligne contestée</label>
                  <select value={ligneContestee} onChange={e => setLigneContestee(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                    {LIGNES_CONTEST.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motif de contestation *</label>
                  <textarea rows={3} value={motif} onChange={e => setMotif(e.target.value)}
                    placeholder="Décrivez le motif…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleContester} disabled={!motif.trim() || busy}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={15} />} Confirmer la contestation
                  </button>
                  <button onClick={() => { setShowContestForm(false); setMotif(""); }}
                    className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100">Annuler</button>
                </div>
              </div>
            )}
          </div>
        )}

        {releve.statut === "conteste" && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Relevé contesté par le sous-traitant</p>
                {releve.ligne_contestee && <p className="text-xs text-red-600 mt-0.5">Ligne contestée : <strong>{releve.ligne_contestee}</strong></p>}
                {releve.motif_contestation && <p className="text-sm text-red-700 mt-1.5 leading-relaxed">{releve.motif_contestation}</p>}
              </div>
            </div>
          </div>
        )}

        {releve.observations && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observations</p>
            <p className="text-sm text-gray-700">{releve.observations}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 flex-wrap">
          {releve.statut === "accepte" && (
            <Link to="/factures/nouveau"
              className="inline-flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#065A2C] transition-colors">
              <FileText size={15} /> Enregistrer la facture du sous-traitant
            </Link>
          )}
          <button onClick={() => addToast("PDF non disponible pour les relevés.", "info")}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition-colors">
            <Download size={14} /> Télécharger en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
