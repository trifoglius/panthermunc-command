"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button, Card, Input, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";

interface UserRow {
  id: string;
  username: string;
  role: "admin" | "chair";
  committeeId: string | null;
  displayName: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { conference, loading: confLoading } = useConference();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "chair">("chair");
  const [newCommitteeId, setNewCommitteeId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state: per-user temp password field
  const [editPasswords, setEditPasswords] = useState<Record<string, string>>({});
  const [editCommittees, setEditCommittees] = useState<Record<string, string>>({});

  // Guard: admin only
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") router.replace("/");
  }, [user, authLoading, router]);

  // Load users
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data: UserRow[]) => {
        setUsers(data);
        const initPass: Record<string, string> = {};
        const initComm: Record<string, string> = {};
        data.forEach((u) => {
          initPass[u.id] = "";
          initComm[u.id] = u.committeeId ?? "";
        });
        setEditPasswords(initPass);
        setEditCommittees(initComm);
      })
      .finally(() => setLoadingUsers(false));
  }, [user]);

  const handleCreate = async () => {
    setCreateError("");
    if (!newUsername.trim() || !newPassword) return;
    if (newRole === "chair" && !newCommitteeId) {
      setCreateError("Chairs must be assigned to a committee.");
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
          committeeId: newRole === "admin" ? null : newCommitteeId || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setCreateError(data.error ?? "Failed to create user");
        return;
      }
      setUsers((prev) => [...prev, data as UserRow]);
      setEditPasswords((prev) => ({ ...prev, [data.id]: "" }));
      setEditCommittees((prev) => ({ ...prev, [data.id]: data.committeeId ?? "" }));
      setNewUsername("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("chair");
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

  if (!user || user.role !== "admin") return null;

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

        {/* Create user */}
        <Card title="Add User">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. sc_chair"
            />
            <Input
              label="Display Name"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="e.g. Security Council Chair"
            />
            <Input
              label="Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Select
              label="Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "admin" | "chair")}
              options={[
                { value: "chair", label: "Chair" },
                { value: "admin", label: "Admin" },
              ]}
            />
            {newRole === "chair" && (
              <Select
                label="Committee"
                value={newCommitteeId}
                onChange={(e) => setNewCommitteeId(e.target.value)}
                options={committeeOptions}
              />
            )}
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

        {/* User list */}
        <Card title="Users">
          {users.length === 0 ? (
            <p className="text-sm text-purple-600">No users yet.</p>
          ) : (
            <ul className="divide-y divide-purple-100">
              {users.map((u) => (
                <li key={u.id} className="py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium text-purple-900">
                      {u.displayName}
                    </span>
                    <span className="text-sm text-purple-500">@{u.username}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.committeeId && (
                      <span className="text-xs text-gray-500">
                        {conference?.committees.find(
                          (c) => c.id === u.committeeId
                        )?.name ?? u.committeeId}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {u.role === "chair" && (
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
                    {u.id !== user.userId && (
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
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
