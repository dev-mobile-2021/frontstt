import { useMemo } from "react";
import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { usePermissions, useUpdatePermission } from "../../hooks/useParametres";


function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087F3E] focus-visible:ring-offset-1
        ${checked ? "bg-[#087F3E]" : "bg-gray-200"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? "translate-x-4" : "translate-x-1"}`}
      />
    </button>
  );
}

export default function PermissionsPage() {
  const { data: permissions = [], isLoading } = usePermissions();
  const updateMut = useUpdatePermission();
  const { addToast } = useToast();

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

  return (
    <div className="space-y-6">
      <PageHeader title="Permissions" subtitle="Gestion des droits d'accès par rôle" />

      {/* Legend */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-blue-700">
          Activez ou désactivez les rôles autorisés pour chaque action. Le rôle <strong>Admin</strong> a toujours accès à tout et ne peut pas être modifié.
        </p>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-96 min-w-[22rem]">
                Action
              </th>
              {allRoles.map(role => (
                <th key={role} className="px-2 py-4 text-center w-16">
                  <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600 whitespace-nowrap">
                    {role}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {permissions.map((perm, idx) => {
              const roleMap = Object.fromEntries(perm.roles.map(r => [r.designation, r.actif]));
              const activeCount = perm.roles.filter(r => r.actif).length;
              return (
                <tr
                  key={perm.cle}
                  className={`transition-colors hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  {/* Action label */}
                  <td className={`sticky left-0 z-10 px-5 py-4 w-72 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 leading-snug">{perm.label}</p>
                        {perm.description && (
                          <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{perm.description}</p>
                        )}
                        <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#087F3E]" />
                          {activeCount} rôle{activeCount !== 1 ? "s" : ""} autorisé{activeCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Toggle per role */}
                  {allRoles.map(role => {
                    const isAdmin = role === "Admin";
                    const isActive = roleMap[role] ?? false;
                    return (
                      <td
                        key={role}
                        className="px-2 py-4 text-center"
                      >
                        <div className="flex justify-center">
                          <Toggle
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
            })}
          </tbody>
        </table>
      </div>

      <p className="text-right text-xs text-gray-400">
        {permissions.length} action{permissions.length !== 1 ? "s" : ""} configurée{permissions.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
