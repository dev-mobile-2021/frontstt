import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Paperclip, Search, Filter } from "lucide-react";
import { useAttachements } from "../context/AttachementsContext";
import { useUser } from "../context/UserContext";

const num = (v) => new Intl.NumberFormat("fr-FR").format(Math.round(v || 0));

const STATUT_COLORS = {
  "Validé":            "bg-green-100 text-green-700",
  "En rapprochement":  "bg-orange-100 text-orange-700",
  "Soumis au DACC":    "bg-purple-100 text-purple-700",
  "Soumis au DT":      "bg-blue-100 text-blue-700",
  "En cours":          "bg-yellow-100 text-yellow-700",
  "Rejeté":            "bg-red-100 text-red-700",
  "Ouvert":            "bg-gray-100 text-gray-500",
};

const STATUT_ORDER = ["Soumis au DACC", "Soumis au DT", "En rapprochement", "En cours", "Validé", "Rejeté", "Ouvert"];

export default function AttachementsListPage() {
  const navigate = useNavigate();
  const { attachements } = useAttachements();
  const { currentUser } = useUser();
  const [search, setSearch] = useState("");
  const [filtrStatut, setFiltrStatut] = useState("Tous");

  const role = currentUser?.roleId;

  const filtered = attachements
    .filter(a => {
      const q = search.toLowerCase();
      const matchText = !q || a.code.toLowerCase().includes(q) || a.contratId.toLowerCase().includes(q) || a.periodeDebut.includes(q);
      const matchStatut = filtrStatut === "Tous" || a.statut === filtrStatut;
      return matchText && matchStatut;
    })
    .sort((a, b) => {
      const sa = STATUT_ORDER.indexOf(a.statut);
      const sb = STATUT_ORDER.indexOf(b.statut);
      if (sa !== sb) return sa - sb;
      return b.periodeDebut.localeCompare(a.periodeDebut);
    });

  const pendingCount = attachements.filter(a => {
    if (role === "CT")   return a.statut === "Ouvert" || a.statut === "En cours";
    if (role === "DT")   return a.statut === "Soumis au DT" || a.statut === "En rapprochement";
    if (role === "DACC") return a.statut === "Soumis au DACC";
    return false;
  }).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers d'attachement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Constat terrain · Rapprochement STT · Visa DACC</p>
        </div>
        {(role === "CT" || role === "DT") && (
          <Link to="/contrats" className="flex items-center gap-2 bg-[#087F3E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#065A2C] transition-colors">
            <Plus size={15} /> Initier depuis un contrat
          </Link>
        )}
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{pendingCount} dossier{pendingCount > 1 ? "s" : ""}</span> en attente de votre action.
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un dossier, contrat…" className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["Tous", ...STATUT_ORDER].map(s => (
            <button key={s} onClick={() => setFiltrStatut(s)} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${filtrStatut === s ? "bg-[#087F3E] text-white border-[#087F3E]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Paperclip size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun dossier trouvé</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contrat</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Période</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Montant final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(a => {
                const isPending = (role === "CT" && (a.statut === "Ouvert" || a.statut === "En cours")) || (role === "DT" && (a.statut === "Soumis au DT" || a.statut === "En rapprochement")) || (role === "DACC" && a.statut === "Soumis au DACC");
                return (
                  <tr key={a.id} onClick={() => navigate(`/attachements/${a.id}`)} className={`cursor-pointer hover:bg-gray-50 transition-colors ${isPending ? "bg-amber-50/40" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {isPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                        <span className="font-semibold text-gray-900">{a.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{a.contratId}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{a.periodeDebut} → {a.periodeFin}</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUT_COLORS[a.statut] || "bg-gray-100 text-gray-500"}`}>{a.statut}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-[#087F3E]">
                      {a.montantFinal != null ? `${num(a.montantFinal)} FCFA` : <span className="text-gray-400 font-normal">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
