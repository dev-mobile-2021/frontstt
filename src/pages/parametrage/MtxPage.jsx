import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, FileText, Trash2, ChevronDown, Search, X, FolderOpen } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { useChantiersPaginated } from "../../hooks/useChantiers";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
function getToken() { return localStorage.getItem("stt_token"); }

const MOIS_FR = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function ChantierSearchSelect({ value, onChange, chantiers, placeholder = "Tous les chantiers" }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);
  const selected = chantiers.find(c => (c.code_x3 ?? c.code) === value);
  const filtered = chantiers.filter(c =>
    !search || `${c.code_x3 ?? c.code} ${c.designation}`.toLowerCase().includes(search.toLowerCase())
  );
  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div ref={ref} className="relative w-72">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-[#087F3E] focus:outline-none focus:ring-2 focus:ring-[#087F3E] transition-colors">
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? `${selected.code_x3 ?? selected.code} — ${selected.designation}` : `— ${placeholder} —`}
        </span>
        <ChevronDown size={14} className={`ml-2 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-[999] mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input autoFocus type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
              {search && <button onClick={() => setSearch("")}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>}
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-3 text-sm text-gray-400 text-center">Aucun résultat</li>}
            {filtered.map(c => {
              const code = c.code_x3 ?? c.code;
              return (
                <li key={c.id} onClick={() => { onChange(code); setOpen(false); setSearch(""); }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-green-50 hover:text-[#087F3E] transition-colors ${value === code ? "bg-green-50 text-[#087F3E] font-medium" : "text-gray-700"}`}>
                  <span className="font-mono text-xs text-gray-400 mr-2">{code}</span>{c.designation}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function MtxPage() {
  const { addToast } = useToast();
  const qc           = useQueryClient();
  const inputRef     = useRef(null);
  const [uploading, setUploading]         = useState(false);
  const [dragOver, setDragOver]           = useState(false);
  const [chantierCode, setChantierCode]   = useState("");

  const { data: chantiersResp } = useChantiersPaginated({ count: 200 });
  const chantiers = chantiersResp?.data ?? [];

  const { data: periodes = [], isLoading } = useQuery({
    queryKey: ["mtx_upload"],
    queryFn: () => axios.get(`${API_BASE}/mtx-upload`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.data.data ?? []),
  });

  async function handleUpload(files) {
    const xlsxFiles = Array.from(files).filter(f => f.name.match(/\.(xlsx|xls)$/i));
    if (!xlsxFiles.length) return addToast("Seuls les fichiers Excel (.xlsx) sont acceptés.", "error");
    if (!chantierCode) return addToast("Sélectionnez un chantier avant d'uploader.", "error");
    setUploading(true);
    for (const file of xlsxFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("chantier_code_x3", chantierCode);
      try {
        const res = await axios.post(`${API_BASE}/mtx-upload`, fd, {
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "multipart/form-data" },
        });
        addToast(res.data.message ?? "Importé avec succès.", "success");
      } catch (e) {
        const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? "Erreur";
        addToast(`${file.name} : ${msg}`, "error");
      }
    }
    setUploading(false);
    qc.invalidateQueries(["mtx_upload"]);
  }

  async function handleDelete(chantier, annee, mois) {
    try {
      await axios.delete(`${API_BASE}/mtx-upload/${encodeURIComponent(chantier)}/${annee}/${mois}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      qc.invalidateQueries(["mtx_upload"]);
      addToast("Données supprimées.", "success");
    } catch { addToast("Erreur suppression.", "error"); }
  }

  const grouped = periodes.reduce((acc, p) => {
    if (!acc[p.chantier_code_x3]) acc[p.chantier_code_x3] = [];
    acc[p.chantier_code_x3].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="Upload MTX" subtitle="Fichiers MTX (Bons de Sortie) pour alimenter les états de cession" />

      <div className="bg-white rounded-xl border border-gray-200 px-6 pb-8">
        <div className="py-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-gray-800">Fichiers MTX (Bons de Sortie)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Uploadez les fichiers Excel ND pour alimenter le "Charger X3" dans les états de cession.</p>
            </div>
            <div className="flex items-center gap-2">
              <ChantierSearchSelect value={chantierCode} onChange={setChantierCode} chantiers={chantiers} placeholder="Sélectionner un chantier" />
              <button onClick={() => inputRef.current?.click()} disabled={uploading || !chantierCode}
                className="inline-flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Uploader
              </button>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple className="hidden"
                onChange={e => { handleUpload(e.target.files); e.target.value = ""; }} />
            </div>
          </div>

          {/* Zone drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver && chantierCode ? "border-[#087F3E] bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <FolderOpen size={28} className={`mx-auto mb-2 ${dragOver && chantierCode ? "text-[#087F3E]" : "text-gray-300"}`} />
            <p className="text-sm text-gray-400">{chantierCode ? "Glissez-déposez le fichier Excel ici" : "Sélectionnez d'abord un chantier"}</p>
          </div>

          {isLoading && <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>}

          {!isLoading && periodes.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Aucun fichier MTX importé.</p>
          )}

          {Object.entries(grouped).map(([code, items]) => (
            <div key={code}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{code}</p>
              <div className="space-y-2">
                {items.map(p => (
                  <div key={`${p.chantier_code_x3}-${p.annee}-${p.mois}`}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{p.chantier_designation} — {MOIS_FR[p.mois]} {p.annee}</p>
                        <p className="text-xs text-gray-400">{p.nb_lignes} lignes · {p.chantier_code_x3}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(p.chantier_code_x3, p.annee, p.mois)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
