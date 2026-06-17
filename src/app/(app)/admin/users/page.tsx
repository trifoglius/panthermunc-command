"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PermissionEditor } from "@/components/admin/PermissionEditor";
import { Header } from "@/components/layout/Header";
import { Button, Card, Input, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import {
  permissionsForRole,
  ROLE_LABELS,
  type Permission,
  type UserRole,
} from "@/lib/permissions";

interface UserRow {
  id: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  committeeId: string | null;
  displayName: string;
}

function needsCommitteeAssignment(role: UserRole, permissions: Permission[]) {
  return (
    role === "chair" ||
    (permissions.includes("committee:operate") &&
      !permissions.includes("committee:access_all"))
  );
}

function roleBadgeClass(role: UserRole) {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800";
    case "chair":
      return "bg-blue-100 text-blue-800";
    case "registrar":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { allowed, loading: authLoading } = useRequirePermission("users:manage");
  const { conference, loading: confLoading } = useConference();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("chair");
  const [newPermissions, setNewPermissions] = useState<Permission[]>(
    permissionsForRole("chair")
  );
  const [newCommitteeId, setNewCommitteeId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editPasswords, setEditPasswords] = useState<Record<string, string>>({});
  const [editCommittees, setEditCommittees] = useState<Record<string, string>>({});
  const [editRoles, setEditRoles] = useState<Record<string, UserRole>>({});
  const [editPermissions, setEditPermissions] = useState<
    Record<string, Permission[]>
  >({});
  const [savingPermissions, setSavingPermissions] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: UserRow[]) => {
        setUsers(data);
        const initPass: Record<string, string> = {};
        const initComm: Record<string, string> = {};
        const initRoles: Record<string, UserRole> = {};
        const initPerms: Record<string, Permission[]> = {};
        data.forEach((u) => {
          initPass[u.id] = "";
          initComm[u.id] = u.committeeId ?? "";
          initRoles[u.id] = u.role;
          initPerms[u.id] = u.permissions;
        });
        setEditPasswords(initPass);
        setEditCommittees(initComm);
        setEditRoles(initRoles);
        setEditPermissions(initPerms);
      })
      .finally(() => setLoadingUsers(false));
  }, [allowed]);

  const handleCreate = async () => {
    setCreateError("");
    if (!newUsername.trim() || !newPassword) return;
    if (needsCommitteeAssignment(newRole, newPermissions) && !newCommitteeId) {
      setCreateError("Committee-scoped users must be assigned to a committee.");
      return;
    }
    if (newPermissions.length === 0) {
      setCreateError("Select at least one permission.");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          displayName: newDisplayName.trim() || newUsername.trim(),
          role: newRole,
          permissions: newPermissions,
          committeeId:
            needsCommitteeAssignment(newRole, newPermissions)
              ? newCommitteeId || null
              : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setCreateError(data.error ?? "Failed to create user");
        return;
      }
      const created = data as UserRow;
      setUsers((prev) => [...prev, created]);
      setEditPasswords((prev) => ({ ...prev, [created.id]: "" }));
      setEditCommittees((prev) => ({
        ...prev,
        [created.id]: created.committeeId ?? "",
      }));
      setEditRoles((prev) => ({ ...prev, [created.id]: created.role }));
      setEditPermissions((prev) => ({
        ...prev,
        [created.id]: created.permissions,
      }));
      setNewUsername("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("chair");
      setNewPermissions(permissionsForRole("chair"));
      setNewCommitteeId("");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateCommittee = async (uid: string) => {
    const committeeId = editCommittees[uid] || null;
    const r = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ committeeId }),
    });
    if (r.ok) {
      const updated: UserRow = await r.json();
      setUsers((prev) => prev.map((u) => (u.id === uid ? updated : u)));
    }
  };

  const handleSavePermissions = async (uid: string) => {
    setSavingPermissions(uid);
    try {
      const r = await fetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRoles[uid],
          permissions: editPermissions[uid],
        }),
      });
      if (r.ok) {
        const updated: UserRow = await r.json();
        setUsers((prev) => prev.map((u) => (u.id === uid ? updated : u)));
        setEditRoles((prev) => ({ ...prev, [uid]: updated.role }));
        setEditPermissions((prev) => ({ ...prev, [uid]: updated.permissions }));
      }
    } finally {
      setSavingPermissions(null);
    }
  };

  const handleResetPassword = async (uid: string) => {
    const password = editPasswords[uid];
    if (!password) return;
    const r = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) {
      setEditPasswords((prev) => ({ ...prev, [uid]: "" }));
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Delete this user? They will lose access immediately.")) return;
    const r = await fetch(`/api/admin/users/${uid}`, { method: "DELETE" });
    if (r.ok) setUsers((prev) => prev.filter((u) => u.id !== uid));
  };

  const committeeOptions = [
    { value: "", label: "— select committee —" },
    ...(conference?.committees.map((c) => ({
      value: c.id,
      label: c.name,
    })) ?? []),
  ];

  if (authLoading || confLoading || loadingUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center text-purple-800">
        Loading...
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen bg-purple-50">
      <Header />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-purple-900">User Management</h2>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Back to Conference
          </Button>
        </div>

        <Card title="Add User">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. who_chair"
            />
            <Input
              label="Display Name"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="e.g. WHO Chair"
            />
            <Input
              label="Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {needsCommitteeAssignment(newRole, newPermissions) && (
              <Select
                label="Committee"
                value={newCommitteeId}
                onChange={(e) => setNewCommitteeId(e.target.value)}
                options={committeeOptions}
              />
            )}
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-purple-900">
              User class &amp; permissions
            </p>
            <PermissionEditor
              role={newRole}
              permissions={newPermissions}
              onRoleChange={setNewRole}
              onPermissionsChange={setNewPermissions}
            />
          </div>
          {createError && (
            <p className="mt-2 text-sm text-red-600">{createError}</p>
          )}
          <div className="mt-3">
            <Button
              onClick={handleCreate}
              disabled={creating || !newUsername.trim() || !newPassword}
            >
              {creating ? "Creating..." : "Create User"}
            </Button>
          </div>
        </Card>

        <Card title="Users">
          {users.length === 0 ? (
            <p className="text-sm text-purple-600">No users yet.</p>
          ) : (
            <ul className="divide-y divide-purple-100">
              {users.map((u) => {
                const perms = editPermissions[u.id] ?? u.permissions;
                const role = editRoles[u.id] ?? u.role;
                const showCommittee = needsCommitteeAssignment(role, perms);
                return (
                  <li key={u.id} className="py-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-purple-900">
                        {u.displayName}
                      </span>
                      <span className="text-sm text-purple-500">
                        @{u.username}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${roleBadgeClass(role)}`}
                      >
                        {ROLE_LABELS[role] ?? role}
                      </span>
                      {u.committeeId && (
                        <span className="text-xs text-gray-500">
                          {conference?.committees.find(
                            (c) => c.id === u.committeeId
                          )?.name ?? u.committeeId}
                        </span>
                      )}
                    </div>

                    <div className="mb-3 rounded-md border border-purple-100 bg-purple-50/50 p-3">
                      <PermissionEditor
                        role={role}
                        permissions={perms}
                        onRoleChange={(nextRole) =>
                          setEditRoles((prev) => ({ ...prev, [u.id]: nextRole }))
                        }
                        onPermissionsChange={(nextPerms) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            [u.id]: nextPerms,
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        disabled={savingPermissions === u.id}
                        onClick={() => handleSavePermissions(u.id)}
                      >
                        {savingPermissions === u.id
                          ? "Saving..."
                          : "Save Permissions"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {showCommittee && (
                        <div className="flex items-end gap-1">
                          <Select
                            label=""
                            value={editCommittees[u.id] ?? u.committeeId ?? ""}
                            onChange={(e) =>
                              setEditCommittees((prev) => ({
                                ...prev,
                                [u.id]: e.target.value,
                              }))
                            }
                            options={committeeOptions}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUpdateCommittee(u.id)}
                          >
                            Reassign
                          </Button>
                        </div>
                      )}
                      <div className="flex items-end gap-1">
                        <Input
                          placeholder="New password"
                          type="password"
                          value={editPasswords[u.id] ?? ""}
                          onChange={(e) =>
                            setEditPasswords((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!editPasswords[u.id]}
                          onClick={() => handleResetPassword(u.id)}
                        >
                          Reset PW
                        </Button>
                      </div>
                      {u.id !== user?.userId && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(u.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
