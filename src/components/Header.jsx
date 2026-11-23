import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, AlertTriangle, XCircle, Info, X, Menu } from "lucide-react";
import { useAlertes } from "../hooks/useAlertes";
import UserSwitcher from "./UserSwitcher";
import { cn } from "../lib/utils";

const ROUTE_LABELS = {
  "/dashboard":        ["Tableau de bord"],
  "/contrats":         ["Contrats"],
  "/contrats/nouveau": ["Contrats", "Nouveau contrat"],
  "/decomptes":        ["Décomptes"],
  "/sous-traitants":   ["Sous-traitants"],
  "/chantiers":        ["Chantiers"],
  "/rapports":         ["Rapports"],
  "/parametrage":      ["Paramétrage"],
};

const TYPE_CONFIG = {
  warning: { icon: AlertTriangle, cls: "text-amber-500", border: "border-amber-400" },
  danger:  { icon: XCircle,       cls: "text-red-500",   border: "border-red-400"   },
  info:    { icon: Info,          cls: "text-green-600", border: "border-green-400" },
};

export default function Header({ onOpenMobile }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const alertes = useAlertes();
  const count   = alertes.length;

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const crumbs = ROUTE_LABELS[pathname] || [pathname.replace("/", "")];

  function handleAlerte(lien) {
    setOpen(false);
    navigate(lien);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line-200 bg-white px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenMobile}
          aria-label="Ouvrir le menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors duration-150 hover:bg-surface-50 hover:text-ink-900 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav className="hidden items-center gap-1.5 text-[13px] sm:flex">
          <span className="text-ink-400">STT</span>
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-ink-300" />
              <span className={i === crumbs.length - 1 ? "font-medium text-ink-900" : "text-ink-500"}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Alertes"
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors duration-150 hover:bg-surface-50 hover:text-ink-900"
          >
            <Bell className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-lg border border-line-200 bg-white shadow-popover z-50">
              <div className="flex items-center justify-between border-b border-line-200 px-4 py-3">
                <p className="text-[13px] font-semibold text-ink-900">
                  Alertes {count > 0 && <span className="ml-1 text-xs font-normal text-ink-400">({count})</span>}
                </p>
                <button onClick={() => setOpen(false)} className="rounded p-1 text-ink-400 hover:bg-surface-50">
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-line-100 scrollbar-thin">
                {count === 0 ? (
                  <div className="py-10 text-center text-[13px] text-ink-400">
                    <Bell className="mx-auto mb-2 h-6 w-6 opacity-30" />
                    Aucune alerte active
                  </div>
                ) : (
                  alertes.map(alerte => {
                    const cfg  = TYPE_CONFIG[alerte.type] ?? TYPE_CONFIG.info;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={alerte.id}
                        onClick={() => handleAlerte(alerte.lien)}
                        className={cn(
                          "w-full border-l-2 px-4 py-3 text-left flex gap-3 items-start hover:bg-surface-50 transition-colors",
                          cfg.border
                        )}
                      >
                        <Icon size={15} className={cn("mt-0.5 shrink-0", cfg.cls)} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink-900">{alerte.titre}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-500 leading-relaxed">{alerte.message}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {count > 0 && (
                <div className="border-t border-line-200 bg-surface-50 px-4 py-2.5">
                  <button
                    onClick={() => { setOpen(false); navigate("/decomptes"); }}
                    className="text-xs font-medium text-green-600 hover:underline"
                  >
                    Voir tous les décomptes →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <UserSwitcher />
      </div>
    </header>
  );
}
