import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FileText, Calculator, Users, Building2, BarChart3, Settings,
  ChevronLeft, ChevronRight, ReceiptText, FileStack, Package, Paperclip,
} from "lucide-react";
import { useAttachements } from "../context/AttachementsContext";
import { useUser } from "../context/UserContext";

const NAV_ITEMS = [
  { label: "Tableau de bord", to: "/dashboard",      icon: LayoutDashboard },
  { label: "Contrats",        to: "/contrats",        icon: FileText },
  { label: "Décomptes",       to: "/decomptes",       icon: Calculator },
  { label: "États de cession", to: "/etats-cession",  icon: Package },
  { label: "Attachements",    to: "/attachements",    icon: Paperclip, badge: true },
  { label: "Relevés",         to: "/releves",         icon: ReceiptText },
  { label: "Factures",        to: "/factures",        icon: FileStack },
  { label: "Sous-traitants",  to: "/sous-traitants",  icon: Users },
  { label: "Chantiers",       to: "/chantiers",       icon: Building2 },
  { label: "Rapports",        to: "/rapports",        icon: BarChart3 },
];

const SECONDARY_ITEMS = [
  { label: "Paramétrage", to: "/parametrage", icon: Settings },
];

function NavItem({ to, icon: Icon, label, collapsed, pendingCount }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
          collapsed ? "justify-center px-3" : "gap-3 px-4"
        } ${
          isActive ? "bg-[#E8F5EE] text-[#087F3E]" : "text-gray-700 hover:bg-gray-50"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#087F3E] rounded-r-full" />
          )}
          <div className="relative flex-shrink-0">
            <Icon className={`w-5 h-5 ${isActive ? "text-[#087F3E]" : "text-gray-500"}`} />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">{pendingCount}</span>
            )}
          </div>
          {!collapsed && <span className="flex-1 min-w-0 truncate">{label}</span>}
          {!collapsed && pendingCount > 0 && (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">{pendingCount}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { getPendingCount } = useAttachements();
  const { currentUser } = useUser();
  const attachPending = getPendingCount(currentUser?.roleId);
  return (
    <aside
      className={`fixed left-0 top-0 h-full ${collapsed ? "w-16" : "w-[260px]"} bg-white border-r border-gray-200 flex flex-col z-10 transition-all duration-300 overflow-hidden`}
    >
      {/* Logo + Brand */}
      <div className={`flex items-center border-b border-gray-100 ${collapsed ? "justify-center px-2 py-4" : "gap-3 px-5 py-5"}`}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-[#087F3E] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
        ) : (
          <>
            <img src={import.meta.env.BASE_URL + "logo-stt.svg"} alt="Logo STT" className="h-9 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-gray-900 text-sm leading-none block truncate">STT</span>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Sous-Traitance Chantier</p>
            </div>
          </>
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400 px-2 mb-2">Navigation</p>
        )}
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} pendingCount={item.badge ? attachPending : 0} />
        ))}
      </nav>

      {/* Secondary navigation */}
      <div className="px-2 py-3 border-t border-gray-100">
        {!collapsed && (
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400 px-2 mb-2">Administration</p>
        )}
        {SECONDARY_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </div>

      {/* Toggle button */}
      <div className="px-2 pb-4">
        <button
          onClick={onToggle}
          title={collapsed ? "Développer le menu" : "Réduire le menu"}
          className={`w-full flex items-center py-2.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors ${collapsed ? "justify-center" : "gap-2 px-3"}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
