import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Calculator, Users, Building2, BarChart3, Settings,
  ChevronsLeft, ReceiptText, FileStack, Package, Paperclip, Eye,
  GitBranch, Sliders, Shield, ShieldCheck, Tags, Upload, ChevronDown, Layers,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { usePermissions } from "../hooks/useParametres";
import { useEtatsCessionPaginated } from "../hooks/useEtatsCession";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { label: "Tableau de bord", to: "/dashboard", icon: LayoutDashboard, permKey: "menu_dashboard" },
  { label: "Contrats",        to: "/contrats",  icon: FileText,        permKey: "menu_contrats" },
  { label: "Rapports",        to: "/rapports",  icon: BarChart3,       permKey: "menu_rapports" },
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
    { label: "Attachements", to: "/attachements", icon: Paperclip,   permKey: "menu_attachements" },
    { label: "Décomptes",    to: "/decomptes",    icon: Calculator,  permKey: "menu_decomptes" },
    { label: "Relevés",      to: "/releves",      icon: ReceiptText, permKey: "menu_releves" },
    { label: "Factures",     to: "/factures",     icon: FileStack,   permKey: "menu_factures" },
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

function SidebarLink({ to, icon: Icon, label, collapsed, indented, badge, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
          indented ? "gap-3 px-4 py-2" : "py-3",
          collapsed ? "justify-center px-3" : (indented ? "" : "gap-3 px-4"),
          isActive
            ? "bg-green-100 text-green-600"
            : "text-ink-700 hover:bg-surface-50 hover:text-ink-900"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-green-600 rounded-r-full" />
          )}
          <Icon
            className={cn(
              "shrink-0",
              indented ? "h-4 w-4" : "h-5 w-5",
              isActive ? "text-green-600" : "text-ink-400"
            )}
            strokeWidth={1.75}
          />
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0 truncate">{label}</span>
              {badge > 0 && (
                <span className="ml-auto rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                  {badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarGroup({ group, collapsed, open, active, onToggle, onNavigate, badges = {} }) {
  const Icon = group.icon;

  if (collapsed) {
    const first = group.children[0];
    return (
      <NavLink
        to={first.to}
        onClick={onNavigate}
        title={group.label}
        className={cn(
          "relative flex items-center justify-center rounded-lg px-3 py-3 text-[13px] font-medium transition-colors duration-150 hover:bg-surface-50 hover:text-ink-900",
          active ? "bg-green-100 text-green-600 hover:bg-green-100" : "text-ink-700"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active ? "text-green-600" : "text-ink-400")} strokeWidth={1.75} />
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[13px] font-medium transition-colors duration-150 hover:bg-surface-50 hover:text-ink-900",
          active ? "text-ink-900" : "text-ink-700"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active ? "text-green-600" : "text-ink-400")} strokeWidth={1.75} />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-400 transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-line-200 pl-3">
          {group.children.map(child => (
            <SidebarLink
              key={child.to}
              to={child.to}
              icon={child.icon}
              label={child.label}
              collapsed={false}
              indented
              badge={badges[child.to]}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { currentUser } = useUser();
  const userRole = currentUser?.role?.designation;
  const { data: allPerms, isLoading: permsLoading } = usePermissions();
  const { data: pretsData } = useEtatsCessionPaginated({ statut: "pret", count: 500 });
  const nbPrets = pretsData?.data?.length ?? 0;
  const location = useLocation();

  function canSeeMenu(key) {
    if (permsLoading) return true;
    if (userRole === "Admin") return true;
    const perm = (allPerms ?? []).find(p => p.cle === key);
    if (!perm) return false;
    return perm.roles.some(r => r.designation === userRole && r.actif);
  }

  const groupActive = (g) => g.children.some(c => location.pathname.startsWith(c.to));

  const visibleReferentiel = REFERENTIEL_GROUP.children.filter(c => canSeeMenu(c.permKey));
  const visibleDecompte    = DECOMPTE_GROUP.children.filter(c => canSeeMenu(c.permKey));
  const visibleController  = CONTROLLER_GROUP.children.filter(c => canSeeMenu(c.permKey));
  const visibleParam       = canSeeMenu("menu_parametrage") ? PARAMETRAGE_GROUP.children : [];

  const referentielGrp = { ...REFERENTIEL_GROUP, children: visibleReferentiel };
  const decompteGrp    = { ...DECOMPTE_GROUP,    children: visibleDecompte };
  const controllerGrp  = { ...CONTROLLER_GROUP,  children: visibleController };
  const paramGrp       = { ...PARAMETRAGE_GROUP, children: visibleParam };

  const [overrides, setOverrides] = useState({});
  const isOpen = (g) => overrides[g.label] ?? groupActive(g);
  const toggle = (g) => setOverrides(prev => ({ ...prev, [g.label]: !isOpen(g) }));

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-72 shrink-0 flex-col border-r border-line-200 bg-white transition-transform duration-200 ease-out",
        "lg:static lg:z-auto lg:translate-x-0 lg:transition-[width]",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "lg:w-[76px]" : "lg:w-72"
      )}
    >
      {/* Header + logo */}
      <div className={cn(
        "flex h-16 shrink-0 items-center gap-3 border-b border-line-200 px-5",
        collapsed && "lg:justify-center lg:px-2"
      )}>
        {collapsed ? (
          <img
            src={import.meta.env.BASE_URL + "logo-stt.svg"}
            alt="STT"
            className="h-8 w-8 shrink-0 object-contain"
          />
        ) : (
          <>
            <img
              src={import.meta.env.BASE_URL + "logo-stt.svg"}
              alt="Logo STT"
              className="h-9 w-auto shrink-0 object-contain"
            />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-none text-ink-900">STT</div>
              <div className="mt-0.5 truncate text-[11px] text-ink-500">Sous-Traitance Chantier</div>
            </div>
          </>
        )}
      </div>

      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 scrollbar-thin">
        {NAV_ITEMS.filter(i => canSeeMenu(i.permKey)).map(item => (
          <SidebarLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            onNavigate={onMobileClose}
          />
        ))}

        {visibleReferentiel.length > 0 && (
          <SidebarGroup
            group={referentielGrp}
            collapsed={collapsed}
            open={isOpen(referentielGrp)}
            active={groupActive(referentielGrp)}
            onToggle={() => toggle(referentielGrp)}
            onNavigate={onMobileClose}
          />
        )}

        {visibleDecompte.length > 0 && (
          <SidebarGroup
            group={decompteGrp}
            collapsed={collapsed}
            open={isOpen(decompteGrp)}
            active={groupActive(decompteGrp)}
            onToggle={() => toggle(decompteGrp)}
            onNavigate={onMobileClose}
          />
        )}

        {visibleController.length > 0 && (
          <SidebarGroup
            group={controllerGrp}
            collapsed={collapsed}
            open={isOpen(controllerGrp)}
            active={groupActive(controllerGrp)}
            onToggle={() => toggle(controllerGrp)}
            onNavigate={onMobileClose}
            badges={{ "/notes-debit": nbPrets }}
          />
        )}
      </nav>

      {visibleParam.length > 0 && (
        <div className="space-y-0.5 border-t border-line-200 px-3 py-3">
          <SidebarGroup
            group={paramGrp}
            collapsed={collapsed}
            open={isOpen(paramGrp)}
            active={groupActive(paramGrp)}
            onToggle={() => toggle(paramGrp)}
            onNavigate={onMobileClose}
          />
        </div>
      )}

      <div className={cn("shrink-0 px-4 pb-3 text-[11px] text-ink-400", collapsed && "lg:px-0 lg:text-center")}>
        {collapsed ? "v1" : "v1.0 — STT"}
      </div>

      <button
        onClick={onToggle}
        aria-label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
        className="absolute -right-3 top-[26px] hidden h-6 w-6 items-center justify-center rounded-full border border-line-200 bg-white text-ink-500 shadow-sm transition-all duration-200 hover:text-green-700 lg:flex"
      >
        <ChevronsLeft className={cn("h-3.5 w-3.5 transition-transform duration-200", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
