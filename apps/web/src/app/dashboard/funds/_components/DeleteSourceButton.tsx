"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteSourceButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/income-sources/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setConfirming(false);
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => !loading && setConfirming(false)}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "28px 32px",
            maxWidth: "420px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>¿Eliminar fondo?</h3>
          <p style={{ fontSize: "14px", color: "#64748B", marginBottom: "8px" }}>
            Se eliminará el fondo <strong>&ldquo;{name}&rdquo;</strong>.
          </p>
          <p style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "24px" }}>
            Los ingresos y gastos asociados a este fondo no se eliminarán, pero el fondo dejará de aparecer en las listas.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "14px" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: loading ? "#FCA5A5" : "#DC2626", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600 }}
            >
              {loading ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Eliminar fondo"
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
      onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
    >
      ✕
    </button>
  );
}
