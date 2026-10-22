import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, FileDown, Trash2, FileText, Loader2, X, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
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
        <p className="text-gray-500 text-sm">Vous n'avez pas accès à cette page.</p>
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
            className="relative inline-flex items-center gap-2 bg-[#087F3E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#065A2C] transition-colors">
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
        <div className="text-center py-16 text-red-500 text-sm bg-white rounded-xl border border-gray-200">
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
                  <TableCell className="text-xs text-gray-500">{fmtDate(n.created_at)}</TableCell>
                  <TableCell><span className="font-mono font-semibold">{n.code}</span></TableCell>
                  <TableCell>
                    <Link to={`/etats-cession/${n.etat_cession_id}`}
                      onClick={e => e.stopPropagation()}
                      className="font-mono text-[#087F3E] hover:underline text-xs">
                      {n.etat_cession?.code ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 max-w-[140px] truncate">
                    {n.etat_cession?.contrat?.chantier?.designation ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 max-w-[140px] truncate">
                    {n.etat_cession?.contrat?.soustraitant?.raison_sociale ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                    {fmtPeriode(n.periode_debut, n.periode_fin)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmtNum(Math.round(n.montant_ht))} FCFA
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handlePdf(n.id, n.code)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="PDF">
                        <FileDown size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete({ id: n.id, code: n.code })}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-gray-500">Page {meta.current_page} / {meta.last_page} — {meta.total} résultat{meta.total !== 1 ? "s" : ""}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${n === page ? "bg-[#087F3E] text-white font-semibold" : "hover:bg-gray-100 text-gray-600"}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">Nouvelle note de débit</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Filtres */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Filter size={12} /> Filtrer les états de cession
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Code EC" value={ecCode} onChange={e => setEcCode(e.target.value)}
                      className="w-full pl-7 pr-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]" />
                  </div>
                  <SearchSelect value={ecContratId} onChange={e => { setEcContratId(e.target.value); setSelectedEcId(""); }}
                    placeholder="Contrat" searchPlaceholder="Rechercher un contrat…"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] text-gray-600">
                    <option value="">Tous les contrats</option>
                    {contratsList.map(c => <option key={c.id} value={c.id}>{c.code}{c.chantier?.designation ? ` — ${c.chantier.designation}` : ""}</option>)}
                  </SearchSelect>
                  <SearchSelect value={ecSttId} onChange={e => { setEcSttId(e.target.value); setSelectedEcId(""); }}
                    placeholder="Sous-traitant" searchPlaceholder="Rechercher un sous-traitant…"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] text-gray-600">
                    <option value="">Tous les sous-traitants</option>
                    {sttsList.map(s => <option key={s.id} value={s.id}>{s.raison_sociale}</option>)}
                  </SearchSelect>
                  <SearchSelect value={ecStatut} onChange={e => { setEcStatut(e.target.value); setSelectedEcId(""); }}
                    placeholder="Statut" searchPlaceholder="Rechercher…"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] text-gray-600">
                    <option value="">Tous les statuts</option>
                    <option value="pret">Prêt · ND</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="soumis">Soumis</option>
                    <option value="valide">Validé</option>
                    <option value="rejete">Rejeté</option>
                  </SearchSelect>
                  <SearchSelect value={ecChantierId} onChange={e => { setEcChantierId(e.target.value); setSelectedEcId(""); }}
                    placeholder="Chantier" searchPlaceholder="Rechercher un chantier…"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E] text-gray-600 col-span-2 md:col-span-1">
                    <option value="">Tous les chantiers</option>
                    {chantiersList.map(c => <option key={c.id} value={c.id}>{c.designation}</option>)}
                  </SearchSelect>
                </div>
              </div>

              {/* Sélection état de cession */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                  État de cession <span className="text-red-500">*</span>
                  <span className="ml-2 font-normal text-gray-400 normal-case">({ecsList.length} résultat{ecsList.length !== 1 ? "s" : ""})</span>
                </label>
                {ecsLoading ? (
                  <div className="text-xs text-gray-400 py-2">Chargement…</div>
                ) : (
                  <SearchSelect value={selectedEcId} onChange={e => setSelectedEcId(e.target.value)}
                    placeholder="— Sélectionner un état de cession —"
                    searchPlaceholder="Rechercher par code, chantier, sous-traitant…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]">
                    <option value="">— Sélectionner un état de cession —</option>
                    {ecsList.map(ec => (
                      <option key={ec.id} value={ec.id}>
                        {ec.code} — {ec.contrat?.chantier?.designation ?? "?"} — {ec.contrat?.soustraitant?.raison_sociale ?? "?"}
                      </option>
                    ))}
                  </SearchSelect>
                )}
              </div>

              {/* Aperçu de l'état sélectionné */}
              {selectedEcId && loadingEc && (
                <div className="text-center py-6 text-gray-400 text-sm">Chargement des lignes…</div>
              )}
              {selectedEc && !loadingEc && (
                <div className="space-y-4">
                  {/* Infos */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Période</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5">{fmtPeriode(selectedEc.periode_debut, selectedEc.periode_fin)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Chantier</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{selectedEc.contrat?.chantier?.designation ?? "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sous-traitant</p>
                      <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{selectedEc.contrat?.soustraitant?.raison_sociale ?? "—"}</p>
                    </div>
                    <div className="bg-[#E8F5EE] rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-[#087F3E]/70 uppercase tracking-wide">Montant total</p>
                      <p className="text-xs font-bold text-[#087F3E] mt-0.5">{fmtNum(Math.round(selectedEc.montant_total ?? 0))} FCFA</p>
                    </div>
                  </div>

                  {/* Tableau des lignes */}
                  {lignesParPoste.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lignes de l'état de cession</p>
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
                          {lignesParPoste.map((l, i) => (
                            <TableRow key={i}>
                              <TableCell><span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l.poste}</span></TableCell>
                              <TableCell><span className="font-mono text-xs text-gray-600">{l.code_article ?? "—"}</span></TableCell>
                              <TableCell className="max-w-[200px] whitespace-normal text-xs">{l.designation}</TableCell>
                              <TableCell className="text-xs text-gray-500">{l.unite ?? "—"}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs">{fmtNum(l.quantite)}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs">{fmtNum(l.prix_unitaire)} FCFA</TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-semibold">{fmtNum(Math.round(l.montant))} FCFA</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {lignesParPoste.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
                      Cet état de cession ne contient aucune ligne.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleGenerer}
                disabled={!selectedEcId || createMut.isPending}
                className="flex-1 py-2.5 rounded-lg bg-[#087F3E] text-white text-sm font-medium hover:bg-[#065A2C] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
                Générer la note de débit
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
              <h2 className="text-base font-bold text-gray-900">Supprimer {confirmDelete.code} ?</h2>
            </div>
            <p className="text-sm text-gray-500">Cette action est irréversible.</p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
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
