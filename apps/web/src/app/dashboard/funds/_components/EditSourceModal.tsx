"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
};

export function EditSourceModal({ source }: { source: Source }) {
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
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || "",
      color: fd.get("color") as string,
    };

    const res = await fetch(`/api/income-sources/${source.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al guardar los cambios.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar fondo"
        style={{
          padding: "4px 8px",
          borderRadius: "4px",
          border: "none",
          background: "transparent",
          color: "#94A3B8",
          cursor: "pointer",
          fontSize: "13px",
          lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#2563EB")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
      >
        ✎
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
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>
              Editar Fondo
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Nombre *</label>
                <input
                  name="name"
                  required
                  defaultValue={source.name}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Descripción</label>
                <input
                  name="description"
                  defaultValue={source.description ?? ""}
                  placeholder="Opcional"
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Color</label>
                <input
                  name="color"
                  type="color"
                  defaultValue={source.color ?? "#16A34A"}
                  style={{ padding: "2px", borderRadius: "6px", border: "1px solid #D1D5DB", height: "38px", width: "80px", cursor: "pointer" }}
                />
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
                  disabled={loading}
                  style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: loading ? "#93C5FD" : "#2563EB", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600 }}
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
