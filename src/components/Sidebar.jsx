import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Calculator, Users, Building2, BarChart3, Settings,
  ChevronLeft, ChevronRight, ChevronsLeft, ReceiptText, FileStack, Package, Paperclip, Eye,
  GitBranch, Sliders, Shield, ShieldCheck, Tags, Upload, ChevronDown, Layers,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { usePermissions } from "../hooks/useParametres";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";

const NAV_ITEMS = [
  { label: "Tableau de bord", to: "/dashboard",      icon: LayoutDashboard, permKey: "menu_dashboard" },
  { label: "Contrats",        to: "/contrats",        icon: FileText,        permKey: "menu_contrats" },
  { label: "Attachements",    to: "/attachements",    icon: Paperclip,       permKey: "menu_attachements", badge: true },
  { label: "Rapports",        to: "/rapports",        icon: BarChart3,       permKey: "menu_rapports" },
];

const REFERENTIEL_GROUP = {
  label: "Référentiel",
  icon: Building2,
  children: [
    { label: "Sous-traitants", to: "/sous-traitants",       icon: Users,     permKey: "menu_sous_traitants" },
    { label: "Chantiers",      to: "/chantiers",             icon: Building2, permKey: "menu_chantiers" },
    { label: "Articles X3",    to: "/parametrage/articles",  icon: Package,   permKey: "menu_articles" },
  ],
};

const DECOMPTE_GROUP = {
  label: "Décompte",
  icon: Calculator,
  children: [
    { label: "Décomptes", to: "/decomptes", icon: Calculator,  permKey: "menu_decomptes" },
    { label: "Relevés",   to: "/releves",   icon: ReceiptText, permKey: "menu_releves" },
    { label: "Factures",  to: "/factures",  icon: FileStack,   permKey: "menu_factures" },
  ],
};

const CONTROLLER_GROUP = {
  label: "Controller de gestion",
  icon: Layers,
  children: [
    { label: "États de cession", to: "/etats-cession", icon: Package,  permKey: "menu_etats_cession" },
    { label: "Notes de débit",   to: "/notes-debit",   icon: FileText, permKey: "permission_voir_notes_devis" },
    { label: "Consultation",     to: "/consultation",  icon: Eye,      permKey: "permission_consulter_articles" },
  ],
};

const PARAMETRAGE_GROUP = {
  label: "Paramétrage",
  icon: Settings,
  roles: ["Admin", "DG"],
  children: [
    { label: "Circuit validation", to: "/parametrage/circuit",      icon: GitBranch },
    { label: "Paramètres",        to: "/parametrage/parametres",    icon: Sliders },
    { label: "Utilisateurs",      to: "/parametrage/utilisateurs",  icon: Users },
    { label: "Rôles",             to: "/parametrage/roles",         icon: Shield },
    { label: "Permissions",       to: "/parametrage/permissions",   icon: ShieldCheck },
    { label: "Barèmes généraux",  to: "/parametrage/baremes",       icon: Tags },
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
  const { data: allPerms = [] } = usePermissions();

  function canSeeMenu(key) {
    if (userRole === "Admin") return true;
    const perm = allPerms.find(p => p.cle === key);
    if (!perm) return true;
    return perm.roles.some(r => r.designation === userRole && r.actif);
  }

  const { data: pretsData } = useEtatsCessionPaginated({ statut: "pret", count: 500 });
  const nbPrets = pretsData?.data?.length ?? 0;

  const location = useLocation();
  const paramActive = PARAMETRAGE_GROUP.children.some(c => location.pathname.startsWith(c.to));
  const controllerActive = CONTROLLER_GROUP.children.some(c => location.pathname.startsWith(c.to));
  const decompteActive = DECOMPTE_GROUP.children.some(c => location.pathname.startsWith(c.to));
  const referentielActive = REFERENTIEL_GROUP.children.some(c => location.pathname.startsWith(c.to));
  const [paramOpen, setParamOpen] = useState(paramActive);
  const [controllerOpen, setControllerOpen] = useState(controllerActive);
  const [decompteOpen, setDecompteOpen] = useState(decompteActive);
  const [referentielOpen, setReferentielOpen] = useState(referentielActive);
  return (
    <aside
      className={`fixed left-0 top-0 h-full ${collapsed ? "w-16" : "w-[260px]"} bg-white border-r border-gray-200 flex flex-col z-10 transition-all duration-300`}
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

      {/* Navigation scrollable — inclut Paramétrage en bas */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.filter(item => canSeeMenu(item.permKey)).map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} pendingCount={item.badge ? attachPending : 0} />
        ))}

        {/* Référentiel */}
        {(canSeeMenu("menu_sous_traitants") || canSeeMenu("menu_chantiers") || canSeeMenu("menu_articles")) && <div>
          <button
            onClick={() => setReferentielOpen(v => !v)}
            className={`relative flex items-center py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full ${collapsed ? "justify-center px-3" : "gap-3 px-4"} ${referentielActive ? "bg-[#E8F5EE] text-[#087F3E]" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <Building2 className={`w-5 h-5 flex-shrink-0 ${referentielActive ? "text-[#087F3E]" : "text-gray-500"}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Référentiel</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${referentielOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {!collapsed && referentielOpen && (
            <div className="ml-4 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5">
              {REFERENTIEL_GROUP.children.filter(item => canSeeMenu(item.permKey)).map(item => (
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
        </div>}

        {/* Décompte */}
        {(canSeeMenu("menu_decomptes") || canSeeMenu("menu_releves") || canSeeMenu("menu_factures")) && <div>
          <button
            onClick={() => setDecompteOpen(v => !v)}
            className={`relative flex items-center py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full ${collapsed ? "justify-center px-3" : "gap-3 px-4"} ${decompteActive ? "bg-[#E8F5EE] text-[#087F3E]" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <Calculator className={`w-5 h-5 flex-shrink-0 ${decompteActive ? "text-[#087F3E]" : "text-gray-500"}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Décompte</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${decompteOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {!collapsed && decompteOpen && (
            <div className="ml-4 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5">
              {DECOMPTE_GROUP.children.filter(item => canSeeMenu(item.permKey)).map(item => (
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
        </div>}

        {/* Controller de gestion */}
        {(canSeeMenu("menu_etats_cession") || canSeeMenu("permission_voir_notes_devis") || canSeeMenu("permission_consulter_articles")) && <div>
          <button
            onClick={() => setControllerOpen(v => !v)}
            className={`relative flex items-center py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full ${collapsed ? "justify-center px-3" : "gap-3 px-4"} ${controllerActive ? "bg-[#E8F5EE] text-[#087F3E]" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <Layers className={`w-5 h-5 flex-shrink-0 ${controllerActive ? "text-[#087F3E]" : "text-gray-500"}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Controller de gestion</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${controllerOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {!collapsed && controllerOpen && (
            <div className="ml-4 border-l border-gray-200 pl-3 space-y-0.5 mt-0.5">
              {CONTROLLER_GROUP.children.filter(item => canSeeMenu(item.permKey)).map(item => {
                const isNotesDebit = item.to === "/notes-debit";
                return (
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
                        <span className="flex-1 truncate">{item.label}</span>
                        {isNotesDebit && nbPrets > 0 && (
                          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{nbPrets}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>}

        {/* Paramétrage */}
        {canSeeMenu("menu_parametrage") && <div className="pt-2 mt-2 border-t border-gray-100">
          <button
            onClick={() => setParamOpen(v => !v)}
            className={`relative flex items-center py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full ${collapsed ? "justify-center px-3" : "gap-3 px-4"} ${paramActive ? "bg-[#E8F5EE] text-[#087F3E]" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <Settings className={`w-5 h-5 flex-shrink-0 ${paramActive ? "text-[#087F3E]" : "text-gray-500"}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Paramétrage</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${paramOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {!collapsed && paramOpen && (
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
        </div>}
      </nav>

      {/* Bouton collapse — absolu sur le bord droit, style GMAO */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
        className="absolute -right-3 top-[26px] hidden h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-all duration-200 hover:text-[#087F3E] lg:flex"
      >
        <ChevronsLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}
