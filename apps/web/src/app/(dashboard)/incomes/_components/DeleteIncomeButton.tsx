"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/use-scroll-lock";

export function DeleteIncomeButton({ id, label }: { id: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  useScrollLock(confirming);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/incomes/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setConfirming(false);
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        onClick={() => !loading && setConfirming(false)}
      >
        <div
          className="bg-card rounded-xl px-8 py-7 max-w-[400px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.15)] mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold mb-2 text-foreground">¿Eliminar ingreso?</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Se eliminará el ingreso <strong>&ldquo;{label}&rdquo;</strong>. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirming(false)} disabled={loading} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={loading} className="px-5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none">
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
      title="Eliminar ingreso"
      className="px-2.5 py-1 rounded border-none bg-transparent text-muted-foreground hover:text-red-600 dark:hover:text-red-400 cursor-pointer text-[13px] leading-none transition-colors"
    >
      ✕
    </button>
  );
}
