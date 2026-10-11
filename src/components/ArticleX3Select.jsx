import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useArticlesX3 } from "../hooks/useArticlesX3";

/**
 * Sélecteur d'article du référentiel Sage X3.
 * value : code_article sélectionné ; onSelect(article | null).
 */
export default function ArticleX3Select({ value, onSelect, classe = "", placeholder = "Rechercher un article X3 (code ou désignation)…" }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: articles = [], isLoading } = useArticlesX3({ search: debounced, classe, limit: 15, enabled: open && debounced.length >= 2 });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50">
        <span className="font-mono text-xs text-gray-700">{value}</span>
        <button type="button" onClick={() => { onSelect(null); setSearch(""); }} className="text-gray-400 hover:text-red-500" title="Retirer l'article">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#087F3E]/30 focus:border-[#087F3E]"
      />
      {open && debounced.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {isLoading && <p className="px-3 py-2 text-xs text-gray-400">Recherche…</p>}
          {!isLoading && articles.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Aucun article. Synchronisez les articles X3.</p>}
          {articles.map((a) => (
            <button
              type="button"
              key={a.code_article}
              onClick={() => { onSelect(a); setOpen(false); setSearch(""); }}
              className="w-full text-left px-3 py-2 hover:bg-[#E8F5EE] border-b border-gray-50 last:border-0"
            >
              <span className="font-mono text-xs text-gray-500">{a.code_article}</span>
              <span className="block text-sm text-gray-800">{a.designation}</span>
              <span className="text-xs text-gray-400">{a.classe} · {a.unite}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
