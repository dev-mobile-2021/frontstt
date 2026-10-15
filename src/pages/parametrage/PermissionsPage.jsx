import PageHeader from "../../components/PageHeader";
import { useToast } from "../../context/ToastContext";
import { usePermissions, useUpdatePermission } from "../../hooks/useParametres";

export default function PermissionsPage() {
  const { data: permissions = [], isLoading } = usePermissions();
  const updateMut = useUpdatePermission();
  const { addToast } = useToast();

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
        <div className="py-10 text-center text-sm text-gray-400">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Permissions" subtitle="Gestion des droits d'accès par rôle" />

      <div className="bg-white rounded-xl border border-gray-200 px-6 pb-8">
        <div className="space-y-6 pt-6">
          <p className="text-sm text-gray-500">
            Définissez quels rôles peuvent effectuer chaque action. Par défaut : <strong>Assistant DEX</strong> et <strong>Assistant DACC</strong>.
            L'Admin a toujours accès.
          </p>
          {permissions.map(perm => (
            <div key={perm.cle} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{perm.label}</p>
                {perm.description && <p className="text-xs text-gray-400 mt-0.5">{perm.description}</p>}
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-3">
                {perm.roles.map(role => (
                  <label key={role.designation} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={role.actif}
                      disabled={role.designation === "Admin" || updateMut.isPending}
                      onChange={e => toggleRole(perm.cle, role.designation, e.target.checked)}
                      className="w-4 h-4 accent-[#087F3E] cursor-pointer"
                    />
                    <span className={`text-sm ${role.actif ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                      {role.designation}
                      {role.designation === "Admin" && <span className="ml-1 text-[11px] text-gray-400">(toujours)</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
