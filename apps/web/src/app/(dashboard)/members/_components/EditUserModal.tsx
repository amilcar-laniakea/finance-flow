"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/use-scroll-lock";

type User = { id: string; fullName: string | null; email: string; role: string | null };

const ROLES = [
  { value: "owner", label: "Propietario" },
  { value: "member", label: "Miembro" },
  { value: "viewer", label: "Solo lectura" },
];

export function EditUserModal({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function handleOpen() {
    setFullName(user.fullName ?? "");
    setEmail(user.email);
    setRole(user.role ?? "member");
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, role }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al guardar los cambios");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  const inputCls = "px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full";

  return (
    <>
      <button
        onClick={handleOpen}
        title="Editar usuario"
        className="px-2.5 py-1 rounded border-none bg-transparent text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-[13px] transition-colors"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-card rounded-xl p-8 w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] mx-4">
            <h2 className="text-lg font-bold mb-6 text-foreground">Editar usuario</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Nombre completo</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre y apellido" className={inputCls} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Email *</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
