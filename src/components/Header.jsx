import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useAlertes } from "../hooks/useAlertes";
import UserSwitcher from "./UserSwitcher";

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
  warning: { icon: AlertTriangle, cls: "text-amber-500",  bg: "bg-amber-50 border-amber-100"  },
  danger:  { icon: XCircle,       cls: "text-red-500",    bg: "bg-red-50 border-red-100"       },
  info:    { icon: Info,          cls: "text-blue-500",   bg: "bg-blue-50 border-blue-100"     },
};

export default function Header({ sidebarWidth = 260 }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const alertes = useAlertes();
  const count   = alertes.length;

  // Close panel on outside click
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
    <header
      className="fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10 transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-400">STT</span>
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className={i === crumbs.length - 1 ? "text-gray-900 font-medium" : "text-gray-500"}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-3">

        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors duration-200"
          >
            <Bell className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">
                  Alertes {count > 0 && <span className="ml-1 text-xs font-normal text-gray-400">({count})</span>}
                </p>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                  <X size={14} />
                </button>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {count === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
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
                        className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-gray-50 transition-colors border-l-2 ${alerte.type === "danger" ? "border-red-400" : alerte.type === "warning" ? "border-amber-400" : "border-blue-400"}`}
                      >
                        <Icon size={15} className={`${cfg.cls} flex-shrink-0 mt-0.5`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{alerte.titre}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{alerte.message}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {count > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => { setOpen(false); navigate("/decomptes"); }}
                    className="text-xs text-[#087F3E] hover:underline font-medium"
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
