"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  fullName: string | null;
  email: string;
  role: string | null;
};

const ROLES = [
  { value: "owner", label: "Propietario" },
  { value: "member", label: "Miembro" },
  { value: "viewer", label: "Solo lectura" },
];

export function EditUserModal({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
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

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    width: "100%",
  };

  return (
    <>
      <button
        onClick={handleOpen}
        title="Editar usuario"
        style={{
          padding: "4px 10px", borderRadius: "4px", border: "none",
          background: "transparent", color: "#94A3B8", cursor: "pointer", fontSize: "13px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#2563EB")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
      >
        ✎
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div style={{ background: "#fff", borderRadius: "12px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>Editar usuario</h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Nombre completo</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y apellido"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ ...inputStyle, background: "#fff" }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {error && <p style={{ color: "#DC2626", fontSize: "13px" }}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "14px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  style={{
                    padding: "8px 20px", borderRadius: "6px", border: "none",
                    background: loading || !email.trim() ? "#93C5FD" : "#2563EB",
                    color: "#fff", cursor: loading || !email.trim() ? "not-allowed" : "pointer",
                    fontSize: "14px", fontWeight: 600,
                  }}
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
