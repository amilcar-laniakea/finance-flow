"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  personalHouseholdId: string | null;
}

export function InstanceActivationPanel({ users }: { users: User[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function toggle(user: User) {
    const hasInstance = user.personalHouseholdId !== null;
    setLoading(user.id);
    setErrors((prev) => { const n = { ...prev }; delete n[user.id]; return n; });

    try {
      const res = await fetch(`/api/admin/users/${user.id}/activate-instance`, {
        method: hasInstance ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al actualizar instancia");
      }
      router.refresh();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [user.id]: err instanceof Error ? err.message : "Error desconocido",
      }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="hidden md:grid grid-cols-[1fr_1fr_160px] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Usuario</span>
        <span>Email</span>
        <span>Instancia personal</span>
      </div>

      {users.map((u, idx) => {
        const active = u.personalHouseholdId !== null;
        const isLoading = loading === u.id;
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

            {/* Toggle */}
            <div className="pl-10 md:pl-0 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted ${
                    active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${active ? "bg-green-500" : "bg-muted-foreground/40"}`}
                  />
                  {active ? "Activa" : "Inactiva"}
                </span>
                <Button
                  size="sm"
                  variant={active ? "outline" : "default"}
                  className="h-7 text-xs"
                  disabled={isLoading}
                  onClick={() => toggle(u)}
                >
                  {isLoading ? "..." : active ? "Desactivar" : "Activar"}
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
