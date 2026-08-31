import { useLocation } from "react-router-dom";
import { Bell, ChevronRight } from "lucide-react";
import { alertes } from "../data/alertes";
import UserSwitcher from "./UserSwitcher";

const ROUTE_LABELS = {
  "/dashboard":       ["Tableau de bord"],
  "/contrats":        ["Contrats"],
  "/contrats/nouveau":["Contrats", "Nouveau contrat"],
  "/decomptes":       ["Décomptes"],
  "/sous-traitants":  ["Sous-traitants"],
  "/chantiers":       ["Chantiers"],
  "/rapports":        ["Rapports"],
  "/parametrage":     ["Paramétrage"],
};

export default function Header({ sidebarWidth = 260 }) {
  const { pathname } = useLocation();

  const crumbs = ROUTE_LABELS[pathname] || [pathname.replace("/", "")];
  const unreadCount = alertes.length;

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
        {/* Notifications bell */}
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors duration-200">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* User switcher (replaces static user display) */}
        <UserSwitcher />
      </div>
    </header>
  );
}
