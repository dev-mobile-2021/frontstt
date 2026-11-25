import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import SearchSelect from "../../components/SearchSelect";
import SyncBadge from "../../components/SyncBadge";
import { useArticlesX3 } from "../../hooks/useArticlesX3";
import { usePeutFaire } from "../../hooks/useParametres";
import { Spinner } from "./shared";

const CLASSES_X3 = ["TCE", "EHA", "MTX", "PVC", "BAS", "PRP"];

export default function ArticlesX3Page() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [classe, setClasse] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: peutSynchro = false } = usePeutFaire("synchro_x3");
  const { data: articles = [], isLoading } = useArticlesX3({ search: debounced, classe, limit: 200 });

  return (
    <div className="space-y-6">
      <PageHeader title="Articles X3" subtitle="Articles Sage X3 synchronisés avec la plateforme" />

      <div className="bg-white rounded-xl border border-line-200 px-6 pb-8">
        <div className="space-y-5 pt-4">
          <SyncBadge module="articles" label="Articles" invalidate={["articles-x3"]} canSync={peutSynchro} />

          <div className="flex flex-wrap gap-3 items-center">
            <input
              placeholder="Code ou désignation…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-line-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[green-600]/30 focus:border-[green-600] w-64"
            />
            <SearchSelect
              value={classe}
              onChange={e => setClasse(e.target.value)}
              className="border border-line-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[green-600]/30 focus:border-[green-600]"
            >
              <option value="">Toutes les classes</option>
              {CLASSES_X3.map(c => <option key={c} value={c}>{c}</option>)}
            </SearchSelect>
            <span className="text-xs text-ink-400 ml-auto">
              {isLoading ? "Chargement…" : `${articles.length} article${articles.length > 1 ? "s" : ""} affiché${articles.length > 1 ? "s" : ""} (200 max — affinez la recherche)`}
            </span>
          </div>

          <div className="border border-line-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-line-200">
                  {["Code article", "Désignation", "Classe", "Unité"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-100">
                {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center"><Spinner /></td></tr>}
                {!isLoading && articles.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-400 text-sm">Aucun article. Lancez une synchronisation depuis Sage X3.</td></tr>
                )}
                {articles.map(a => (
                  <tr key={a.code_article} className="hover:bg-surface-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-500">{a.code_article}</td>
                    <td className="px-4 py-2.5 text-ink-900">{a.designation}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-500">{a.classe ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-500">{a.unite ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
