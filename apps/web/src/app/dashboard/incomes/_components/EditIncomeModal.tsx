"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = { id: string; name: string; color: string | null };
type Member = { id: string; nickname: string | null };

type Income = {
  id: string;
  source: string | null;
  sourceId: string | null;
  description: string | null;
  memberId: string | null;
  amountUsd: string;
  amountBs: string | null;
  exchangeRate: string | null;
  period: Date | null;
};

export function EditIncomeModal({ income, sources, members }: {
  income: Income; sources: Source[]; members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const defaultPeriod = income.period
    ? new Date(income.period).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      sourceId: (fd.get("sourceId") as string) || null,
      memberId: (fd.get("memberId") as string) || null,
      amountUsd: fd.get("amountUsd") as string,
      amountBs: (fd.get("amountBs") as string) || null,
      exchangeRate: (fd.get("exchangeRate") as string) || null,
      description: (fd.get("description") as string) || null,
      period: fd.get("period") as string,
    };

    const res = await fetch(`/api/incomes/${income.id}`, {
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

  const inputCls = "px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar ingreso"
        className="px-2.5 py-1 rounded border-none bg-transparent text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-[13px] transition-colors"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-card rounded-xl p-8 w-full max-w-[460px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-y-auto mx-4">
            <h2 className="text-lg font-bold mb-6 text-foreground">Editar Ingreso</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Fondo de ingreso *</label>
                <select name="sourceId" defaultValue={income.sourceId ?? ""} className={inputCls}>
                  <option value="" disabled>— Seleccionar fondo —</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Miembro</label>
                <select name="memberId" defaultValue={income.memberId ?? ""} className={inputCls}>
                  <option value="">— Sin asignar —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.nickname ?? m.id}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-foreground">Monto USD *</label>
                  <input name="amountUsd" type="number" step="0.01" defaultValue={income.amountUsd} required className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-foreground">Monto Bs</label>
                  <input name="amountBs" type="number" step="0.01" defaultValue={income.amountBs ?? ""} className={inputCls} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Tasa de cambio</label>
                <input name="exchangeRate" type="number" step="0.0001" defaultValue={income.exchangeRate ?? ""} className={inputCls} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Descripción</label>
                <input name="description" defaultValue={income.description ?? ""} className={inputCls} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Fecha *</label>
                <input name="period" type="date" defaultValue={defaultPeriod} required className={inputCls} />
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
