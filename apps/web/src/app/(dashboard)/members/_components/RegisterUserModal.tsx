"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/use-scroll-lock";

export function RegisterUserModal() {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      email: fd.get("email") as string,
      fullName: (fd.get("fullName") as string) || undefined,
      role: fd.get("role") as string,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.status === 409) {
      setError("Este email ya está registrado.");
      return;
    }
    if (!res.ok) {
      setError("Error al registrar el usuario. Intenta de nuevo.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-semibold cursor-pointer border-none transition-colors"
      >
        + Registrar Usuario
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-card rounded-xl p-8 w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] mx-4">
            <h2 className="text-lg font-bold mb-2 text-foreground">Registrar Usuario</h2>
            <p className="text-[13px] text-muted-foreground mb-6">
              El usuario recibirá acceso cuando se registre en la plataforma con este email.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Email *" name="email" type="email" placeholder="usuario@ejemplo.com" required />
              <Field label="Nombre completo" name="fullName" placeholder="Ej: María García" />

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Rol</label>
                <select
                  name="role"
                  defaultValue="member"
                  className="px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground w-full"
                >
                  <option value="member">Miembro</option>
                  <option value="viewer">Solo lectura</option>
                  <option value="owner">Propietario</option>
                </select>
              </div>

              {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none">
                  {loading ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, name, type = "text", placeholder, required }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[13px] font-medium text-foreground">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full"
      />
    </div>
  );
}
