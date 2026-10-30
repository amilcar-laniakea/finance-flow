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
      className="px-2.5 py-1 rounded-md border-none bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer text-xs font-semibold disabled:cursor-not-allowed transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
    >
      {loading ? "..." : "✕"}
    </button>
  );
}
