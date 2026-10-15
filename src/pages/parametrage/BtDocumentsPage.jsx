import { useState, useRef } from "react";
import { Upload, Loader2, FileText, Trash2, Download, FolderOpen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";

const API_BASE = import.meta.env.VITE_API_BASE + "/api";
function getToken() { return localStorage.getItem("stt_token"); }

export default function BtDocumentsPage() {
  const { addToast }  = useToast();
  const qc            = useQueryClient();
  const inputRef      = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["bt_documents"],
    queryFn: () => axios.get(`${API_BASE}/bt-documents`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => axios.delete(`${API_BASE}/bt-documents/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),
    onSuccess: () => { qc.invalidateQueries(["bt_documents"]); addToast("Fichier supprimé.", "success"); },
    onError:   () => addToast("Erreur lors de la suppression.", "error"),
  });

  async function handleUpload(files) {
    const pdfs = Array.from(files).filter(f => f.type === "application/pdf");
    if (!pdfs.length) return addToast("Seuls les fichiers PDF sont acceptés.", "error");
    setUploading(true);
    let ok = 0;
    for (const file of pdfs) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        await axios.post(`${API_BASE}/bt-documents`, fd, {
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "multipart/form-data" },
        });
        ok++;
      } catch (e) {
        const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? "Erreur";
        addToast(`${file.name} : ${msg}`, "error");
      }
    }
    setUploading(false);
    if (ok) { qc.invalidateQueries(["bt_documents"]); addToast(`${ok} fichier(s) uploadé(s).`, "success"); }
  }

  async function handleDownload(doc) {
    const resp = await fetch(`${API_BASE}/bt-documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const blob = await resp.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = doc.filename; a.click();
  }

  const grouped = (data ?? []).reduce((acc, d) => {
    const key = `${d.chantier_code} · ${d.soustraitant_code}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader title="BT Documents" subtitle="Bons de Transfert — upload et gestion des fichiers PDF" />

      <div className="bg-white rounded-xl border border-gray-200 px-6 pb-8">
        <div className="py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Bons de Transfert</h3>
              <p className="text-xs text-gray-400 mt-0.5">Format attendu : <span className="font-mono bg-gray-100 px-1 rounded">CODE_CHANTIER_CODE_SOUSTRAITANT_YYYY-MM.pdf</span></p>
            </div>
            <button onClick={() => inputRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 bg-[#087F3E] hover:bg-[#065A2C] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Uploader des BT
            </button>
            <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden"
              onChange={e => { handleUpload(e.target.files); e.target.value = ""; }} />
          </div>

          {/* Zone drag & drop */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? "border-[#087F3E] bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <FolderOpen size={28} className={`mx-auto mb-2 ${dragOver ? "text-[#087F3E]" : "text-gray-300"}`} />
            <p className="text-sm text-gray-400">Glissez-déposez vos fichiers PDF ici</p>
          </div>

          {isLoading && <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>}

          {!isLoading && (data ?? []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Aucun bon de transfert uploadé.</p>
          )}

          {Object.entries(grouped).map(([key, docs]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{key}</p>
              <div className="space-y-2">
                {docs.sort((a,b) => a.periode.localeCompare(b.periode)).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-red-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{doc.filename}</p>
                        <p className="text-xs text-gray-400">{doc.periode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownload(doc)}
                        className="p-1.5 text-gray-400 hover:text-[#087F3E] hover:bg-green-50 rounded-lg transition-colors">
                        <Download size={14} />
                      </button>
                      <button onClick={() => deleteMut.mutate(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
