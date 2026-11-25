import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, FileDown, Trash2, FileText, Loader2, X, Search, Filter } from "lucide-react";
import Pagination from "../components/Pagination";
import { useNotesDevisPaginated, useCreateNoteDevis, useDeleteNoteDevis } from "../hooks/useNotesDevis";
import { useEtatsCessionPaginated, useEtatCession } from "../hooks/useEtatsCession";
import { useChantiersPaginated } from "../hooks/useChantiers";
import { useSousTraitantsPaginated } from "../hooks/useSousTraitants";
import { useContratsPaginated } from "../hooks/useContrats";
import { usePeutFaire } from "../hooks/useParametres";
import SearchSelect from "../components/SearchSelect";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import { SkeletonTable } from "../components/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "../components/Table";
import { fmtNum } from "../utils/formatters";

const BASE = import.meta.env.VITE_API_BASE + "/api";
function auth() { const t = localStorage.getItem("stt_token"); return t ? { Authorization: `Bearer ${t}` } : {}; }

const POSTES_ORDER = { GASOIL: 0, MTX: 1, MTL: 2, RH: 3 };

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtPeriode(debut, fin) {
  if (!debut) return "—";
  return `${fmtDate(debut)} → ${fmtDate(fin)}`;
}

export default function NoteDevisListPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: peutVoir, isLoading: checkingPerm } = usePeutFaire("voir_notes_devis");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedEcId, setSelectedEcId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Filtres modal
  const [ecCode, setEcCode]             = useState("");
  const [ecStatut, setEcStatut]         = useState("pret");
  const [ecSttId, setEcSttId]           = useState("");
  const [ecContratId, setEcContratId]   = useState("");
  const [ecChantierId, setEcChantierId] = useState("");
  const [ecCodeDebounced, setEcCodeDebounced] = useState("");

  useEffect(() => { const t = setTimeout(() => setEcCodeDebounced(ecCode.trim()), 350); return () => clearTimeout(t); }, [ecCode]);

  const ecFilters = useMemo(() => ({
    code:           ecCodeDebounced           || undefined,
    contrat_id:     ecContratId ? parseInt(ecContratId) : undefined,
    soustraitant_id: ecSttId ? parseInt(ecSttId) : undefined,
    statut:         ecStatut                  || undefined,
    chantier_id:    ecChantierId ? parseInt(ecChantierId) : undefined,
    count: 200,
  }), [ecCodeDebounced, ecContratId, ecSttId, ecStatut, ecChantierId]);

  const { data, isLoading, isError } = useNotesDevisPaginated({ page, count: 15 });
  const rows = data?.data ?? [];
  const meta = data?.metadata ?? {};
  const totalPages = meta.last_page ?? 1;

  // États de cession filtrés pour le modal
  const { data: ecsData, isLoading: ecsLoading } = useEtatsCessionPaginated(ecFilters);
  const ecsList = ecsData?.data ?? [];

  // Badge : EC prêtes à transformer
  const { data: pretsData } = useEtatsCessionPaginated({ statut: "pret", count: 500 });
  const nbPrets = pretsData?.data?.length ?? 0;

  // Listes pour les SearchSelect
  const { data: chantiersData } = useChantiersPaginated({ count: 500 });
  const chantiersList = chantiersData?.data ?? [];
  const { data: sttsData } = useSousTraitantsPaginated({ count: 500 });
  const sttsList = sttsData?.data ?? [];
  const { data: contratsData } = useContratsPaginated({ count: 500 });
  const contratsList = contratsData?.data ?? [];

  // Chargement complet de l'état sélectionné (avec lignes)
  const { data: selectedEcData, isLoading: loadingEc } = useEtatCession(selectedEcId || null);
  const selectedEc = selectedEcData ?? null;

  const createMut = useCreateNoteDevis();
  const deleteMut = useDeleteNoteDevis();

  async function handleGenerer() {
    if (!selectedEcId) return addToast("Sélectionnez un état de cession.", "error");
    try {
      const res = await createMut.mutateAsync({ etat_cession_id: parseInt(selectedEcId) });
      addToast("Note de débit générée.", "success");
      setShowModal(false);
      setSelectedEcId("");
      const id = res?.data?.id;
      if (id) navigate(`/notes-debit/${id}`);
    } catch (err) {
      addToast(err?.errors?.[0] ?? err?.error ?? "Erreur lors de la génération.", "error");
    }
  }

  async function handleDelete() {
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      addToast(`Note ${confirmDelete.code} supprimée.`, "success");
    } catch (err) {
      addToast(err?.error ?? "Erreur lors de la suppression.", "error");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handlePdf(id, code) {
    try {
      const r = await fetch(`${BASE}/pdf/note-devis/${id}`, { headers: auth() });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `note-devis-${code}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      addToast("Erreur lors du téléchargement PDF.", "error");
    }
  }

  // Lignes de l'état sélectionné, groupées par poste
  const lignesParPoste = selectedEc
    ? (selectedEc.lignes ?? []).slice().sort((a, b) => (POSTES_ORDER[a.poste] ?? 9) - (POSTES_ORDER[b.poste] ?? 9))
    : [];

  if (!checkingPerm && !peutVoir) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-ink-500 text-sm">Vous n'avez pas accès à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes de débit"
        subtitle="Factures générées depuis les états de cession validés"
        action={
          <button onClick={() => { setShowModal(true); setSelectedEcId(""); }}
            className="relative inline-flex items-center gap-2 bg-[green-600] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[green-700] transition-colors">
            <Plus size={16} /> Nouvelle note de débit
            {nbPrets > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-blue-500 text-white rounded-full">
                {nbPrets}
              </span>
            )}
          </button>
        }
      />

      {isLoading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : isError ? (
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-line-200">
          Impossible de charger les notes de débit.
        </div>
      ) : (
        <div className="space-y-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>État de cession</TableHead>
                <TableHead>Chantier</TableHead>
                <TableHead>Sous-traitant</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">Montant HT</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={8} icon={FileText} message="Aucune note de débit." />
              ) : rows.map(n => (
                <TableRow key={n.id} clickable onClick={() => navigate(`/notes-debit/${n.id}`)}>
                  <TableCell className="text-xs text-ink-500">{fmtDate(n.created_at)}</TableCell>
                  <TableCell><span className="font-mono font-semibold">{n.code}</span></TableCell>
                  <TableCell>
                    <Link to={`/etats-cession/${n.etat_cession_id}`}
                      onClick={e => e.stopPropagation()}
                      className="font-mono text-[green-600] hover:underline text-xs">
                      {n.etat_cession?.code ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-ink-500 max-w-[140px] truncate">
                    {n.etat_cession?.contrat?.chantier?.designation ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-ink-500 max-w-[140px] truncate">
                    {n.etat_cession?.contrat?.soustraitant?.raison_sociale ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-ink-500 whitespace-nowrap">
                    {fmtPeriode(n.periode_debut, n.periode_fin)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmtNum(Math.round(n.montant_ht))} FCFA
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handlePdf(n.id, n.code)}
                        className="p-1.5 rounded hover:bg-red-50 text-ink-400 hover:text-red-500 transition-colors"
                        title="PDF">
                        <FileDown size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete({ id: n.id, code: n.code })}
                        className="p-1.5 rounded hover:bg-red-50 text-ink-300 hover:text-red-500 transition-colors"
                        title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={meta.total} onPage={setPage} />
        </div>
      )}

      {/* Modal création — layout 2 colonnes */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-ink-900">Nouvelle note de débit</h2>
                <p className="text-xs text-ink-400 mt-0.5">{ecsList.length} état{ecsList.length !== 1 ? "s" : ""} prêt{ecsList.length !== 1 ? "s" : ""} à transformer</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-line-100 text-ink-400"><X size={18} /></button>
            </div>

            {/* Corps — 2 colonnes */}
            <div className="flex flex-1 min-h-0">

              {/* Colonne gauche : liste EC */}
              <div className="w-[380px] flex-shrink-0 border-r border-line-100 flex flex-col">
                {/* Filtres */}
                <div className="px-4 py-3 border-b border-line-100 space-y-2 flex-shrink-0">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input type="text" placeholder="Rechercher…" value={ecCode}
                      onChange={e => { setEcCode(e.target.value); setSelectedEcId(""); }}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-line-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[green-600]/30 focus:border-[green-600]" />
                  </div>
                  <div className="flex gap-2">
                    <SearchSelect value={ecStatut} onChange={e => { setEcStatut(e.target.value); setSelectedEcId(""); }}
                      className="flex-1 border border-line-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none text-ink-500">
                      <option value="pret">Prêt · ND</option>
                      <option value="">Tous les statuts</option>
                      <option value="valide">Validé</option>
                    </SearchSelect>
                    <SearchSelect value={ecChantierId} onChange={e => { setEcChantierId(e.target.value); setSelectedEcId(""); }}
                      className="flex-1 border border-line-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none text-ink-500">
                      <option value="">Tous chantiers</option>
                      {chantiersList.map(c => <option key={c.id} value={c.id}>{c.designation}</option>)}
                    </SearchSelect>
                  </div>
                </div>

                {/* Liste scrollable */}
                <div className="flex-1 overflow-y-auto">
                  {ecsLoading ? (
                    <div className="flex items-center justify-center py-16 text-ink-400 text-sm gap-2">
                      <Loader2 size={16} className="animate-spin" /> Chargement…
                    </div>
                  ) : ecsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <FileText size={32} className="text-ink-300 mb-3" />
                      <p className="text-sm text-ink-400">Aucun état de cession prêt.</p>
                      <p className="text-xs text-ink-300 mt-1">L'Assistant DCG doit d'abord marquer des EC.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-line-100">
                      {ecsList.map(ec => {
                        const isSelected = String(selectedEcId) === String(ec.id);
                        return (
                          <li
                            key={ec.id}
                            onClick={() => setSelectedEcId(String(ec.id))}
                            className={`px-4 py-3 cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-surface-50 border-l-2 border-transparent"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-semibold text-ink-900">{ec.code}</p>
                                <p className="text-xs text-ink-500 truncate mt-0.5">{ec.contrat?.chantier?.designation ?? "—"}</p>
                                <p className="text-[11px] text-ink-400 truncate">{ec.contrat?.soustraitant?.raison_sociale ?? "—"}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-semibold tabular-nums text-ink-700">{fmtNum(Math.round(ec.montant_total ?? 0))}</p>
                                <p className="text-[10px] text-ink-400">FCFA</p>
                                <p className="text-[10px] text-ink-400 mt-1 whitespace-nowrap">{fmtDate(ec.periode_fin)}</p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Colonne droite : détail + lignes */}
              <div className="flex-1 flex flex-col min-w-0">
                {!selectedEcId ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-ink-400">
                    <FileText size={40} className="text-ink-300 mb-3" />
                    <p className="text-sm font-medium text-ink-500">Sélectionnez un état de cession</p>
                    <p className="text-xs text-ink-300 mt-1">Cliquez sur une ligne à gauche pour voir le détail</p>
                  </div>
                ) : loadingEc ? (
                  <div className="flex-1 flex items-center justify-center text-ink-400 text-sm gap-2">
                    <Loader2 size={16} className="animate-spin" /> Chargement…
                  </div>
                ) : selectedEc ? (
                  <>
                    {/* Infos EC */}
                    <div className="px-6 py-4 border-b border-line-100 flex-shrink-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-ink-900">{selectedEc.code}</span>
                        <span className="text-xs text-ink-400">{fmtPeriode(selectedEc.periode_debut, selectedEc.periode_fin)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="bg-surface-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-ink-400 uppercase tracking-wide">Chantier</p>
                          <p className="text-xs font-semibold text-ink-700 mt-0.5 truncate">{selectedEc.contrat?.chantier?.designation ?? "—"}</p>
                        </div>
                        <div className="bg-surface-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-ink-400 uppercase tracking-wide">Sous-traitant</p>
                          <p className="text-xs font-semibold text-ink-700 mt-0.5 truncate">{selectedEc.contrat?.soustraitant?.raison_sociale ?? "—"}</p>
                        </div>
                        <div className="bg-[green-50] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[green-600]/70 uppercase tracking-wide">Montant total</p>
                          <p className="text-xs font-bold text-[green-600] mt-0.5">{fmtNum(Math.round(selectedEc.montant_total ?? 0))} FCFA</p>
                        </div>
                      </div>
                    </div>

                    {/* Lignes scrollables */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                      {lignesParPoste.length === 0 ? (
                        <div className="text-center py-10 text-ink-400 text-sm">Aucune ligne.</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-white">
                            <tr className="border-b border-line-200">
                              <th className="text-left pb-2 font-semibold text-ink-500 uppercase tracking-wide">Poste</th>
                              <th className="text-left pb-2 font-semibold text-ink-500 uppercase tracking-wide">Article</th>
                              <th className="text-left pb-2 font-semibold text-ink-500 uppercase tracking-wide">Désignation</th>
                              <th className="text-right pb-2 font-semibold text-ink-500 uppercase tracking-wide">Qté</th>
                              <th className="text-right pb-2 font-semibold text-ink-500 uppercase tracking-wide">P.U.</th>
                              <th className="text-right pb-2 font-semibold text-ink-500 uppercase tracking-wide">Montant</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line-100">
                            {lignesParPoste.map((l, i) => (
                              <tr key={i} className="hover:bg-surface-50/50">
                                <td className="py-2 pr-2"><span className="text-[10px] font-semibold bg-line-100 text-ink-500 px-1.5 py-0.5 rounded">{l.poste}</span></td>
                                <td className="py-2 pr-2 font-mono text-ink-500">{l.code_article ?? "—"}</td>
                                <td className="py-2 pr-2 text-ink-500 max-w-[160px] truncate">{l.designation}</td>
                                <td className="py-2 pr-2 text-right tabular-nums text-ink-700">{fmtNum(l.quantite)}</td>
                                <td className="py-2 pr-2 text-right tabular-nums text-ink-700">{fmtNum(l.prix_unitaire)}</td>
                                <td className="py-2 text-right tabular-nums font-semibold text-ink-900">{fmtNum(Math.round(l.montant))} FCFA</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-line-100 flex-shrink-0">
              <button onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-lg border border-line-200 text-sm text-ink-500 hover:bg-surface-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleGenerer}
                disabled={!selectedEcId || createMut.isPending}
                className="px-6 py-2.5 rounded-lg bg-[green-600] text-white text-sm font-medium hover:bg-[green-700] transition-colors disabled:opacity-60 flex items-center gap-2">
                {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
                {selectedEcId && selectedEc ? `Générer — ${selectedEc.code}` : "Générer la note de débit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-50"><Trash2 size={18} className="text-red-500" /></div>
              <h2 className="text-base font-bold text-ink-900">Supprimer {confirmDelete.code} ?</h2>
            </div>
            <p className="text-sm text-ink-500">Cette action est irréversible.</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-line-200 text-sm text-ink-500 hover:bg-surface-50">Annuler</button>
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteMut.isPending && <Loader2 size={14} className="animate-spin" />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
