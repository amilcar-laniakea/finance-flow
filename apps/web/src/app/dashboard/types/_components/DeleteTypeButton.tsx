"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTypeButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`¿Eliminar el tipo "${name}"? Los gastos clasificados con este tipo perderán su clasificación.`)) return;
    setLoading(true);
    await fetch(`/api/expense-types/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar tipo"
      style={{ padding: "4px 10px", borderRadius: "4px", border: "none", background: "transparent", color: "#94A3B8", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
    >
      ✕
    </button>
  );
}
