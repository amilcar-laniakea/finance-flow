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
      className="px-2.5 py-1 rounded border-none bg-transparent text-muted-foreground hover:text-red-600 dark:hover:text-red-400 cursor-pointer text-[13px] transition-colors disabled:cursor-not-allowed"
    >
      ✕
    </button>
  );
}
