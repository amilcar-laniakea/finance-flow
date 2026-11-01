"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

const ROLES = [
  { value: "limited", label: "Limitado" },
  { value: "regular", label: "Regular" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

const ROLE_COLORS: Record<string, string> = {
  limited: "text-muted-foreground",
  regular: "text-sky-600 dark:text-sky-400",
  admin: "text-violet-600 dark:text-violet-400",
  superadmin: "text-amber-600 dark:text-amber-400",
};

interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: string | null;
}

export function RoleManagementTable({ users }: { users: User[] }) {
  const [roles, setRoles] = useState<Record<string, string>>(
    Object.fromEntries(users.map((u) => [u.id, u.role ?? "regular"]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  async function handleRoleChange(userId: string, newRole: string) {
    setSaving(userId);
    setErrors((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      startTransition(() => setRoles((prev) => ({ ...prev, [userId]: newRole })));
    } catch {
      setErrors((prev) => ({ ...prev, [userId]: "Error al guardar" }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="hidden md:grid grid-cols-[1fr_1fr_160px] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Usuario</span>
        <span>Email</span>
        <span>Rol</span>
      </div>

      {users.map((u, idx) => {
        const currentRole = roles[u.id] ?? "regular";
        const isSaving = saving === u.id;
        const error = errors[u.id];
        const initials = (u.fullName ?? u.email)
          .split(" ")
          .map((n) => n[0]?.toUpperCase() ?? "")
          .slice(0, 2)
          .join("");

        return (
          <div
            key={u.id}
            className={`flex flex-col gap-2 px-5 py-3.5 md:grid md:grid-cols-[1fr_1fr_160px] md:items-center md:gap-4 ${idx < users.length - 1 ? "border-b border-border/60" : ""}`}
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                {initials || "?"}
              </div>
              <span className="truncate text-sm font-medium text-foreground">
                {u.fullName ?? "—"}
              </span>
            </div>

            {/* Email */}
            <span className="truncate text-sm text-muted-foreground pl-10 md:pl-0">
              {u.email}
            </span>

            {/* Role select */}
            <div className="pl-10 md:pl-0">
              <Select
                value={currentRole}
                onValueChange={(v) => handleRoleChange(u.id, v)}
                disabled={isSaving}
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue>
                    <span className={`font-semibold ${ROLE_COLORS[currentRole] ?? ""}`}>
                      {ROLES.find((r) => r.value === currentRole)?.label ?? currentRole}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className={ROLE_COLORS[r.value] ?? ""}>{r.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
