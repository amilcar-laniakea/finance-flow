"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = { id: string; name: string; color: string | null };
type Member = { id: string; nickname: string | null };
type DistRow = { memberId: string; amountUsd: string };

export function AddIncomeModal({ sources, members }: { sources: Source[]; members: Member[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalUsd, setTotalUsd] = useState("");
  const [distributions, setDistributions] = useState<DistRow[]>([]);
  const router = useRouter();

  function addDistRow() { setDistributions((p) => [...p, { memberId: "", amountUsd: "" }]); }
  function removeDistRow(idx: number) { setDistributions((p) => p.filter((_, i) => i !== idx)); }
  function updateDistRow(idx: number, field: keyof DistRow, value: string) {
    setDistributions((p) => p.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  const totalDistributed = distributions.reduce((sum, d) => sum + (parseFloat(d.amountUsd) || 0), 0);
  const remaining = (parseFloat(totalUsd) || 0) - totalDistributed;
  const distExceedsTotal = totalDistributed > (parseFloat(totalUsd) || 0) + 0.001;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (distExceedsTotal) return;
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      sourceId: fd.get("sourceId") as string,
      amountUsd: fd.get("amountUsd") as string,
      amountBs: (fd.get("amountBs") as string) || undefined,
      exchangeRate: (fd.get("exchangeRate") as string) || undefined,
      description: (fd.get("description") as string) || undefined,
      period: fd.get("period") as string,
      distributions: distributions
        .filter((d) => d.amountUsd && parseFloat(d.amountUsd) > 0)
        .map((d) => ({ memberId: d.memberId || undefined, amountUsd: d.amountUsd })),
    };

    const res = await fetch("/api/incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al guardar el ingreso.");
      return;
    }

    setOpen(false);
    setDistributions([]);
    setTotalUsd("");
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setDistributions([]);
    setTotalUsd("");
    setError("");
  }

  const defaultPeriod = new Date().toISOString().slice(0, 10);
  const inputCls = "px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md text-sm font-semibold cursor-pointer border-none transition-colors"
      >
        + Agregar Ingreso
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-card rounded-xl p-8 w-full max-w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-y-auto mx-4">
            <h2 className="text-lg font-bold mb-6 text-foreground">Agregar Ingreso</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Source */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Fondo de ingreso *</label>
                {sources.length === 0 ? (
                  <div className="px-3.5 py-2.5 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 text-[13px] text-red-600 dark:text-red-400">
                    No hay fondos creados. Ve a{" "}
                    <a href="/dashboard/funds" className="font-semibold underline">Fondos</a>{" "}
                    y crea uno primero.
                  </div>
                ) : (
                  <select name="sourceId" required defaultValue="" className={inputCls}>
                    <option value="" disabled>— Seleccionar fondo —</option>
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-foreground">Monto USD *</label>
                  <input name="amountUsd" type="number" step="0.01" placeholder="0.00" required value={totalUsd} onChange={(e) => setTotalUsd(e.target.value)} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-foreground">Monto Bs</label>
                  <input name="amountBs" type="number" step="0.01" placeholder="0.00" className={inputCls} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Tasa de cambio</label>
                <input name="exchangeRate" type="number" step="0.0001" placeholder="Bs/USD" className={inputCls} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Descripción</label>
                <input name="description" placeholder="Opcional" className={inputCls} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Fecha *</label>
                <input name="period" type="date" defaultValue={defaultPeriod} required className={inputCls} />
              </div>

              {/* Distribution */}
              <div className="border border-border rounded-lg p-4 bg-muted/50">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[13px] font-semibold text-foreground">Distribución por miembro</p>
                  <button
                    type="button"
                    onClick={addDistRow}
                    className="text-xs px-3 py-1 rounded border border-blue-600 bg-card text-blue-600 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    + Agregar fila
                  </button>
                </div>

                {distributions.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin distribución — el ingreso queda en el fondo del hogar.</p>
                )}

                {distributions.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <select
                      value={row.memberId}
                      onChange={(e) => updateDistRow(idx, "memberId", e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-md border border-border text-[13px] bg-background text-foreground"
                    >
                      <option value="">— Fondo hogar —</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.nickname ?? m.id.slice(0, 8)}</option>)}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="USD"
                      value={row.amountUsd}
                      onChange={(e) => updateDistRow(idx, "amountUsd", e.target.value)}
                      className="w-24 px-2.5 py-1.5 rounded-md border border-border text-[13px] bg-background text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => removeDistRow(idx)}
                      className="px-2.5 py-1.5 rounded-md border-none bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer text-[13px] hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {distributions.length > 0 && (
                  <div className={`mt-2 text-xs ${distExceedsTotal ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    Distribuido: <strong>${totalDistributed.toFixed(2)}</strong>
                    {" · "}
                    {distExceedsTotal ? (
                      <span>✗ Supera el total del ingreso</span>
                    ) : (
                      <span>Restante (fondo): <strong>${remaining.toFixed(2)}</strong></span>
                    )}
                  </div>
                )}
              </div>

              {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={handleClose} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || distExceedsTotal || sources.length === 0}
                  className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
