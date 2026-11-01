"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/use-scroll-lock";

const PRESET_COLORS = [
  "#7C3AED", "#DC2626", "#D97706", "#16A34A",
  "#2563EB", "#0EA5E9", "#DB2777", "#9CA3AF",
];

export function AddTypeModal() {
  const [open, setOpen] = useState(false);
  useScrollLock(open);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7C3AED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/expense-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al crear el tipo");
      return;
    }

    setOpen(false);
    setName("");
    setColor("#7C3AED");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-md text-sm font-semibold cursor-pointer border-none transition-colors"
      >
        + Nuevo tipo
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-card rounded-xl p-8 w-full max-w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] mx-4">
            <h2 className="text-lg font-bold mb-6 text-foreground">Nuevo tipo de gasto</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Nombre *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Alimentación, Transporte, Salud..."
                  required
                  className="px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-foreground">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="size-7 rounded-full cursor-pointer border-2 transition-all"
                      style={{
                        background: c,
                        borderColor: color === c ? "#111827" : "transparent",
                        borderWidth: color === c ? "3px" : "2px",
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-7 border-none rounded cursor-pointer"
                  />
                  <span
                    className="text-xs px-3 py-0.5 rounded-full font-semibold"
                    style={{ background: `${color}22`, color }}
                  >
                    {name || "Vista previa"}
                  </span>
                </div>
              </div>

              {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-5 py-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none"
                >
                  {loading ? "Creando..." : "Crear tipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
