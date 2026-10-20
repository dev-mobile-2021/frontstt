import { useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { usePermissions, useUpdatePermission } from "../../hooks/useParametres";

function Dot({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      title={checked ? "Autorisé — cliquer pour retirer" : "Non autorisé — cliquer pour activer"}
      className={`w-5 h-5 rounded-full border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087F3E] focus-visible:ring-offset-1 flex items-center justify-center
        ${checked
          ? "bg-[#087F3E] border-[#087F3E]"
          : "bg-white border-gray-300 hover:border-gray-400"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </button>
  );
}

function PermRow({ perm, idx, allRoles, updateMut, toggleRole, hoveredRole, setHoveredRole }) {
  const [hovered, setHovered] = useState(false);
  const roleMap = Object.fromEntries(perm.roles.map(r => [r.designation, r.actif]));
  const activeCount = perm.roles.filter(r => r.actif).length;

  const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50/60";

  return (
    <tr
      className={`transition-colors ${hovered ? "bg-[#E8F5EE]/60" : bg}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className={`sticky left-0 z-10 pl-4 pr-3 py-2.5 ${hovered ? "bg-[#E8F5EE]/60" : bg}`} style={{ minWidth: 260, maxWidth: 260 }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-800 leading-snug truncate" title={perm.description || perm.label}>
            {perm.label}
          </span>
          <span className="shrink-0 text-[10px] text-gray-400 tabular-nums">{activeCount}</span>
        </div>
      </td>
      {allRoles.map(role => {
        const isAdmin  = role === "Admin";
        const isActive = roleMap[role] ?? false;
        const isColHovered = hoveredRole === role;
        return (
          <td
            key={role}
            className={`py-2.5 text-center transition-colors ${isColHovered ? "bg-[#E8F5EE]/40" : ""}`}
            style={{ width: 36 }}
            onMouseEnter={() => setHoveredRole(role)}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="flex justify-center">
              <Dot
                checked={isAdmin ? true : isActive}
                disabled={isAdmin || updateMut.isPending}
                onChange={val => toggleRole(perm.cle, role, val)}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

export default function PermissionsPage() {
  const { data: permissions = [], isLoading } = usePermissions();
  const updateMut = useUpdatePermission();
  const { addToast } = useToast();
  const [hoveredRole, setHoveredRole] = useState(null);

  const allRoles = useMemo(() => {
    if (!permissions.length) return [];
    const seen = new Set();
    const result = [];
    permissions.forEach(p =>
      p.roles.forEach(r => {
        if (!seen.has(r.designation)) {
          seen.add(r.designation);
          result.push(r.designation);
        }
      })
    );
    return result;
  }, [permissions]);

  const actionPerms = useMemo(() => permissions.filter(p => p.cle.startsWith("permission_")), [permissions]);
  const menuPerms   = useMemo(() => permissions.filter(p => p.cle.startsWith("menu_")),       [permissions]);

  async function toggleRole(cle, designation, actif) {
    const perm = permissions.find(p => p.cle === cle);
    if (!perm) return;
    const currentRoles = perm.roles.filter(r => r.actif).map(r => r.designation);
    const newRoles = actif
      ? [...currentRoles, designation]
      : currentRoles.filter(d => d !== designation);
    try {
      await updateMut.mutateAsync({ cle, roles: newRoles });
      addToast("Permission mise à jour.", "success");
    } catch {
      addToast("Erreur lors de la mise à jour.", "error");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Permissions" subtitle="Gestion des droits d'accès par rôle" />
        <div className="py-16 text-center text-sm text-gray-400">Chargement…</div>
      </div>
    );
  }

  // Hauteur de la zone d'en-tête pivotée
  const HEADER_H = 130;

  return (
    <div className="space-y-6">
      <PageHeader title="Permissions" subtitle="Gestion des droits d'accès par rôle" />

      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-blue-700">
          Cliquez sur un cercle pour activer / désactiver. <strong>Admin</strong> a toujours accès à tout. Le chiffre à droite du libellé = nombre de rôles autorisés.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {/* Colonne libellé */}
              <th className="sticky left-0 z-20 bg-gray-50 pl-4 pr-3 text-left align-bottom" style={{ width: 260, minWidth: 260, height: HEADER_H }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Élément</span>
              </th>
              {allRoles.map(role => (
                <th
                  key={role}
                  className="px-0 align-bottom text-center"
                  style={{ width: 36, height: HEADER_H }}
                  onMouseEnter={() => setHoveredRole(role)}
                  onMouseLeave={() => setHoveredRole(null)}
                >
                  <div className="flex justify-center pb-2">
                    <span
                      style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", transformOrigin: "center" }}
                      className={`text-[11px] font-semibold whitespace-nowrap transition-colors ${
                        hoveredRole === role ? "text-[#087F3E]" : role === "Admin" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {role}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Section Actions */}
            <tr className="bg-gray-100/80">
              <td colSpan={allRoles.length + 1} className="px-4 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Actions</span>
              </td>
            </tr>
            {actionPerms.map((perm, idx) => (
              <PermRow
                key={perm.cle} perm={perm} idx={idx}
                allRoles={allRoles} updateMut={updateMut} toggleRole={toggleRole}
                hoveredRole={hoveredRole} setHoveredRole={setHoveredRole}
              />
            ))}

            {/* Section Menus */}
            <tr className="bg-gray-100/80">
              <td colSpan={allRoles.length + 1} className="px-4 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Visibilité des menus</span>
              </td>
            </tr>
            {menuPerms.map((perm, idx) => (
              <PermRow
                key={perm.cle} perm={perm} idx={idx}
                allRoles={allRoles} updateMut={updateMut} toggleRole={toggleRole}
                hoveredRole={hoveredRole} setHoveredRole={setHoveredRole}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-right text-xs text-gray-400">
        {permissions.length} élément{permissions.length !== 1 ? "s" : ""} configuré{permissions.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
