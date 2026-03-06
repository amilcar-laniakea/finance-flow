"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteUserButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`¿Eliminar al usuario "${name}"?\n\nSus gastos e ingresos asociados se mantendrán, pero el usuario no podrá acceder a la aplicación.`)) return;
    setLoading(true);
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar usuario"
      style={{
        padding: "4px 10px", borderRadius: "4px", border: "none",
        background: "transparent", color: "#94A3B8",
        cursor: loading ? "not-allowed" : "pointer", fontSize: "13px",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
    >
      ✕
    </button>
  );
}
