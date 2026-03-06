"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTransferButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("¿Eliminar esta transferencia? Los saldos se revertirán.")) return;
    setLoading(true);
    await fetch(`/api/fund-transfers/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        padding: "4px 10px",
        borderRadius: "6px",
        border: "none",
        background: "#FEE2E2",
        color: "#DC2626",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {loading ? "..." : "✕"}
    </button>
  );
}
