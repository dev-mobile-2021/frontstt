import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileDown, Trash2, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { useNoteDevis, useDeleteNoteDevis } from "../hooks/useNotesDevis";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import { SkeletonCard } from "../components/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "../components/Table";
import { fmtNum } from "../utils/formatters";

const BASE = import.meta.env.VITE_API_BASE + "/api";
function auth() { const t = localStorage.getItem("stt_token"); return t ? { Authorization: `Bearer ${t}` } : {}; }

const POSTES_ORDER = { GASOIL: 0, MTX: 1, MTL: 2, RH: 3 };

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function NoteDevisDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: noteData, isLoading, isError } = useNoteDevis(id);
  const note = noteData?.data;
  const deleteMut = useDeleteNoteDevis();

  async function handlePdf() {
    try {
      const r = await fetch(`${BASE}/pdf/note-devis/${id}`, { headers: auth() });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `note-devis-${note?.code ?? id}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      addToast("Erreur lors du téléchargement PDF.", "error");
    }
  }

  async function handleDelete() {
    try {
      await deleteMut.mutateAsync(parseInt(id));
      addToast("Note de devis supprimée.", "success");
      navigate("/notes-devis");
    } catch (err) {
      addToast(err?.error ?? "Erreur lors de la suppression.", "error");
    }
    setConfirmDelete(false);
  }

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  if (isError || !note) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <p className="text-lg font-semibold">Note de devis introuvable</p>
      <button onClick={() => navigate("/notes-devis")} className="mt-4 text-sm text-[#087F3E] hover:underline">Retour</button>
    </div>
  );

  const ec = note.etat_cession;
  const chantier = ec?.contrat?.chantier;
  const stt = ec?.contrat?.soustraitant;

  const lignes = (note.lignes ?? []).slice().sort(
    (a, b) => (POSTES_ORDER[a.poste] ?? 9) - (POSTES_ORDER[b.poste] ?? 9)
  );

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/notes-devis")} className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={14} /> Retour aux notes de devis
      </button>

      <PageHeader
        title={note.code}
        subtitle={[chantier?.designation, stt?.raison_sociale].filter(Boolean).join(" · ")}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">
              <Trash2 size={13} /> Supprimer
            </button>
            <button onClick={handlePdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087F3E] text-white rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
              <FileDown size={14} /> Télécharger la facture
            </button>
          </div>
        }
      />

      {/* Infos */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Période</p>
            <p className="text-sm font-semibold text-gray-800">{fmtDate(note.periode_debut)} → {fmtDate(note.periode_fin)}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">État de cession</p>
            <Link to={`/etats-cession/${note.etat_cession_id}`} className="text-sm font-semibold text-[#087F3E] hover:underline">
              {ec?.code ?? "—"}
            </Link>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Chantier</p>
            <p className="text-sm text-gray-700">{chantier?.designation ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Sous-traitant</p>
            <p className="text-sm text-gray-700">{stt?.raison_sociale ?? "—"}</p>
          </div>
          <div className="bg-[#E8F5EE] rounded-xl px-4 py-3">
            <p className="text-[11px] text-[#087F3E]/70 uppercase tracking-wide mb-1">Montant HT</p>
            <p className="text-xl font-bold text-[#087F3E] tabular-nums">{fmtNum(Math.round(note.montant_ht))} FCFA</p>
          </div>
        </div>
      </div>

      {/* Tableau des lignes */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lignes</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Poste</TableHead>
              <TableHead>Code Article</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead className="text-right">Quantité</TableHead>
              <TableHead className="text-right">Prix Unit.</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.length === 0 ? (
              <TableEmpty colSpan={7} icon={FileText} message="Aucune ligne." />
            ) : lignes.map((l, i) => (
              <TableRow key={i}>
                <TableCell><span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l.poste ?? "—"}</span></TableCell>
                <TableCell><span className="font-mono text-xs text-gray-600">{l.code_article ?? "—"}</span></TableCell>
                <TableCell className="whitespace-normal max-w-[260px] text-xs">{l.designation}</TableCell>
                <TableCell className="text-xs text-gray-500">{l.unite ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-xs">{fmtNum(l.quantite)}</TableCell>
                <TableCell className="text-right tabular-nums text-xs">{fmtNum(l.prix_unitaire)} FCFA</TableCell>
                <TableCell className="text-right tabular-nums text-xs font-semibold">{fmtNum(Math.round(l.montant))} FCFA</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {lignes.length > 0 && (
          <div className="flex justify-between items-center px-3 py-2.5 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total HT</span>
            <span className="font-bold text-[#087F3E]">{fmtNum(Math.round(note.montant_ht))} FCFA</span>
          </div>
        )}
      </div>

      {/* Modal suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Supprimer {note.code} ?</h3>
            <p className="text-sm text-gray-500">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-60">
                {deleteMut.isPending && <Loader2 size={14} className="animate-spin" />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
