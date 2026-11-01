"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/use-scroll-lock";

type Source = { id: string; name: string; description: string | null; color: string | null };

export function EditSourceModal({ source }: { source: Source }) {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
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
        className="px-2 py-1 rounded border-none bg-transparent text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-sm leading-none transition-colors"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-card rounded-xl p-8 w-full max-w-[420px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] mx-4">
            <h2 className="text-lg font-bold mb-6 text-foreground">Editar Fondo</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Nombre *</label>
                <input name="name" required defaultValue={source.name} className="px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Descripción</label>
                <input name="description" defaultValue={source.description ?? ""} placeholder="Opcional" className="px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Color</label>
                <input name="color" type="color" defaultValue={source.color ?? "#16A34A"} className="p-0.5 rounded-md border border-border h-9 w-20 cursor-pointer bg-background" />
              </div>

              {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none">
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
