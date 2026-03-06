"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
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
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>¿Eliminar gasto?</h3>
          <p style={{ fontSize: "14px", color: "#64748B", marginBottom: "24px" }}>
            Se eliminará <strong>&ldquo;{label}&rdquo;</strong>. Esta acción no se puede deshacer.
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
      title="Eliminar gasto"
      style={{ padding: "4px 10px", borderRadius: "4px", border: "none", background: "transparent", color: "#94A3B8", cursor: "pointer", fontSize: "13px" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
    >
      ✕
    </button>
  );
}
