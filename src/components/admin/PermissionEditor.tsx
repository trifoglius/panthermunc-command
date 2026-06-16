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
}: {
  role: UserRole;
  permissions: Permission[];
  onRoleChange: (role: UserRole) => void;
  onPermissionsChange: (permissions: Permission[]) => void;
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
    </div>
  );
}
