"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ExpenseType = { id: string; name: string; color: string | null };

const PRESET_COLORS = [
  "#7C3AED", "#DC2626", "#D97706", "#16A34A",
  "#2563EB", "#0EA5E9", "#DB2777", "#9CA3AF",
];

export function EditTypeModal({ type }: { type: ExpenseType }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function handleOpen() {
    setName(type.name);
    setColor(type.color ?? "#7C3AED");
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/expense-types/${type.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
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

  return (
    <>
      <button
        onClick={handleOpen}
        title="Editar tipo"
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
          <div style={{ background: "#fff", borderRadius: "12px", padding: "32px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>Editar tipo de gasto</h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Nombre *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Color</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: "28px", height: "28px", borderRadius: "50%", background: c,
                        border: color === c ? "3px solid #111827" : "2px solid transparent",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: "40px", height: "28px", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  />
                  <span style={{
                    fontSize: "12px", padding: "3px 12px", borderRadius: "99px",
                    background: `${color}22`, color, fontWeight: 600,
                  }}>
                    {name || "Vista previa"}
                  </span>
                </div>
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
                  disabled={loading || !name.trim()}
                  style={{
                    padding: "8px 20px", borderRadius: "6px", border: "none",
                    background: loading || !name.trim() ? "#C4B5FD" : "#7C3AED",
                    color: "#fff", cursor: loading || !name.trim() ? "not-allowed" : "pointer",
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
