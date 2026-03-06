"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterUserModal() {
  const [open, setOpen] = useState(false);
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
        style={{
          background: "#2563EB",
          color: "#fff",
          padding: "8px 20px",
          borderRadius: "6px",
          border: "none",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + Registrar Usuario
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
              Registrar Usuario
            </h2>
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>
              El usuario recibirá acceso cuando se registre en la plataforma con este email.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Field label="Email *" name="email" type="email" placeholder="usuario@ejemplo.com" required />
              <Field label="Nombre completo" name="fullName" placeholder="Ej: María García" />

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Rol</label>
                <select
                  name="role"
                  defaultValue="member"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "14px",
                    background: "#fff",
                    color: "#374151",
                  }}
                >
                  <option value="member">Miembro</option>
                  <option value="viewer">Solo lectura</option>
                  <option value="owner">Propietario</option>
                </select>
              </div>

              {error && (
                <p style={{ color: "#DC2626", fontSize: "13px" }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    background: loading ? "#93C5FD" : "#2563EB",
                    color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
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

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #D1D5DB",
          fontSize: "14px",
          outline: "none",
        }}
      />
    </div>
  );
}
