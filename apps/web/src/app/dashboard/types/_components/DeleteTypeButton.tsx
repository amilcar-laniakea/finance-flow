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
      className="px-2.5 py-1 rounded border-none bg-transparent text-muted-foreground hover:text-red-600 dark:hover:text-red-400 cursor-pointer text-sm transition-colors disabled:cursor-not-allowed"
    >
      ✕
    </button>
  );
}
