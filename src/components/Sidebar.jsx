import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Calculator, Users, Building2, BarChart3, Settings,
  ChevronLeft, ChevronRight, ReceiptText, FileStack, Package, Paperclip, Eye,
  GitBranch, Sliders, Shield, ShieldCheck, Tags, Upload, ChevronDown,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { usePeutFaire } from "../hooks/useParametres";

const NAV_ITEMS = [
  { label: "Tableau de bord", to: "/dashboard",      icon: LayoutDashboard },
  { label: "Contrats",        to: "/contrats",        icon: FileText },
  { label: "Décomptes",       to: "/decomptes",       icon: Calculator },
  { label: "États de cession", to: "/etats-cession",  icon: Package },
  { label: "Attachements",    to: "/attachements",    icon: Paperclip, badge: true },
  { label: "Consultation",    to: "/consultation", icon: Eye, roles: ["DCG", "Assistant DCG", "Admin"] },
  { label: "Relevés",         to: "/releves",         icon: ReceiptText },
  { label: "Factures",        to: "/factures",        icon: FileStack },
  { label: "Sous-traitants",  to: "/sous-traitants",  icon: Users },
  { label: "Chantiers",       to: "/chantiers",       icon: Building2 },
  { label: "Rapports",        to: "/rapports",        icon: BarChart3 },
];

const PARAMETRAGE_GROUP = {
  label: "Paramétrage",
  icon: Settings,
  children: [
    { label: "Circuit validation", to: "/parametrage/circuit",      icon: GitBranch },
    { label: "Paramètres",        to: "/parametrage/parametres",    icon: Sliders },
    { label: "Utilisateurs",      to: "/parametrage/utilisateurs",  icon: Users },
    { label: "Rôles",             to: "/parametrage/roles",         icon: Shield },
    { label: "Permissions",       to: "/parametrage/permissions",   icon: ShieldCheck },
    { label: "Barèmes généraux",  to: "/parametrage/baremes",       icon: Tags },
    { label: "Articles X3",       to: "/parametrage/articles",      icon: Package },
    { label: "Upload MTX",        to: "/parametrage/mtx",           icon: Upload },
    { label: "BT Documents",      to: "/parametrage/bt",            icon: FileText },
  ],
};

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
  const { currentUser } = useUser();
  const attachPending = 0;
  const userRole = currentUser?.role?.designation;
  const location = useLocation();
  const [paramOpen, setParamOpen] = useState(false);
  const paramActive = PARAMETRAGE_GROUP.children.some(c => location.pathname.startsWith(c.to));
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
        {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(userRole)).map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} pendingCount={item.badge ? attachPending : 0} />
        ))}
      </nav>

      {/* Secondary navigation — Paramétrage accordion */}
      <div className="px-2 py-3 border-t border-gray-100">
        {!collapsed && (
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400 px-2 mb-2">Administration</p>
        )}
        {/* Group header */}
        <button
          onClick={() => setParamOpen(v => !v)}
          className={`relative flex items-center py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full ${collapsed ? "justify-center px-3" : "gap-3 px-4"} ${paramActive ? "text-[#087F3E]" : "text-gray-700 hover:bg-gray-50"}`}
        >
          <Settings className={`w-5 h-5 flex-shrink-0 ${paramActive ? "text-[#087F3E]" : "text-gray-500"}`} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Paramétrage</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${(paramOpen || paramActive) ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
        {/* Children */}
        {!collapsed && (paramOpen || paramActive) && (
          <div className="ml-4 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5">
            {PARAMETRAGE_GROUP.children.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? "bg-[#E8F5EE] text-[#087F3E]" : "text-gray-600 hover:bg-gray-50"}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#087F3E] rounded-r-full" />}
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#087F3E]" : "text-gray-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
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
