"use client";

import { Checkbox } from "@/components/ui";
import {
  PERMISSIONS,
  PERMISSION_META,
  ROLE_TEMPLATES,
  detectRoleFromPermissions,
  type Permission,
  type UserRole,
} from "@/lib/permissions";

export function PermissionEditor({
  role,
  permissions,
  onRoleChange,
  onPermissionsChange,
  collapsible = false,
}: {
  role: UserRole;
  permissions: Permission[];
  onRoleChange: (role: UserRole) => void;
  onPermissionsChange: (permissions: Permission[]) => void;
  collapsible?: boolean;
}) {
  const applyTemplate = (nextRole: UserRole) => {
    onRoleChange(nextRole);
    if (nextRole !== "custom") {
      onPermissionsChange([...ROLE_TEMPLATES[nextRole]]);
    }
  };

  const togglePermission = (perm: Permission, checked: boolean) => {
    const next = checked
      ? [...new Set([...permissions, perm])]
      : permissions.filter((p) => p !== perm);
    onPermissionsChange(next);
    onRoleChange(detectRoleFromPermissions(next));
  };

  const permissionMatrix = (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMISSIONS.map((perm) => (
        <Checkbox
          key={perm}
          label={PERMISSION_META[perm].label}
          description={PERMISSION_META[perm].description}
          checked={permissions.includes(perm)}
          onChange={(e) => togglePermission(perm, e.target.checked)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["admin", "chair", "registrar", "custom"] as const).map((template) => (
          <button
            key={template}
            type="button"
            onClick={() => applyTemplate(template)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              role === template
                ? "border-purple-700 bg-purple-700 text-white"
                : "border-purple-200 bg-white text-purple-800 hover:bg-purple-50"
            }`}
          >
            {template === "custom" ? "Custom" : template.charAt(0).toUpperCase() + template.slice(1)}
          </button>
        ))}
      </div>
      {collapsible ? (
        <details className="group rounded-md border border-purple-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-purple-900 marker:content-none [&::-webkit-details-marker]:hidden">
            <span>Permission details</span>
            <span className="text-xs font-normal text-purple-500">
              {permissions.length} of {PERMISSIONS.length} enabled
            </span>
            <span
              aria-hidden
              className="text-purple-400 transition-transform group-open:rotate-180"
            >
              ▾
            </span>
          </summary>
          <div className="border-t border-purple-100 p-3">{permissionMatrix}</div>
        </details>
      ) : (
        permissionMatrix
      )}
    </div>
  );
}
