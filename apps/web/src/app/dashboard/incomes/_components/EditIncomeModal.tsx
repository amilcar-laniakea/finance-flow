"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = { id: string; name: string; color: string | null };
type Member = { id: string; nickname: string | null };
type DistRow = { memberId: string; amountUsd: string };

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

export function EditIncomeModal({
  income,
  sources,
  members,
  initialDists,
}: {
  income: Income;
  sources: Source[];
  members: Member[];
  initialDists: { memberId: string | null; amountUsd: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalUsd, setTotalUsd] = useState(income.amountUsd);
  const [distributions, setDistributions] = useState<DistRow[]>(() =>
    initialDists
      .filter((d) => d.memberId)
      .map((d) => ({ memberId: d.memberId!, amountUsd: d.amountUsd }))
  );
  const router = useRouter();

  const defaultPeriod = income.period
    ? new Date(income.period).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  function addDistRow() { setDistributions((p) => [...p, { memberId: "", amountUsd: "" }]); }
  function removeDistRow(idx: number) { setDistributions((p) => p.filter((_, i) => i !== idx)); }
  function updateDistRow(idx: number, field: keyof DistRow, value: string) {
    setDistributions((p) => p.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  const totalDistributed = distributions.reduce((sum, d) => sum + (parseFloat(d.amountUsd) || 0), 0);
  const remaining = (parseFloat(totalUsd) || 0) - totalDistributed;
  const distExceedsTotal = totalDistributed > (parseFloat(totalUsd) || 0) + 0.001;
  const distUnderTotal = (parseFloat(totalUsd) || 0) > 0 && Math.abs(totalDistributed - (parseFloat(totalUsd) || 0)) > 0.01;
  const distMissingMember = distributions.some((d) => !d.memberId);
  const distValid =
    distributions.length > 0 &&
    !distExceedsTotal &&
    !distUnderTotal &&
    !distMissingMember;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!distValid) return;
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      sourceId: (fd.get("sourceId") as string) || null,
      amountUsd: totalUsd,
      amountBs: (fd.get("amountBs") as string) || null,
      exchangeRate: (fd.get("exchangeRate") as string) || null,
      description: (fd.get("description") as string) || null,
      period: fd.get("period") as string,
      distributions: distributions
        .filter((d) => d.memberId && parseFloat(d.amountUsd) > 0)
        .map((d) => ({ memberId: d.memberId, amountUsd: d.amountUsd })),
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
          <div className="bg-card rounded-xl p-8 w-full max-w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-y-auto mx-4">
            <h2 className="text-lg font-bold mb-6 text-foreground">Editar Ingreso</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Fondo de ingreso *</label>
                <select name="sourceId" defaultValue={income.sourceId ?? ""} className={inputCls}>
                  <option value="" disabled>— Seleccionar fondo —</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-foreground">Monto USD *</label>
                  <input
                    name="amountUsd"
                    type="number"
                    step="0.01"
                    required
                    value={totalUsd}
                    onChange={(e) => setTotalUsd(e.target.value)}
                    className={inputCls}
                  />
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

              {/* Distribution — obligatoria */}
              <div className="border border-border rounded-lg p-4 bg-muted/50">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[13px] font-semibold text-foreground">
                    Distribución por miembro <span className="text-red-500">*</span>
                  </p>
                  <button
                    type="button"
                    onClick={addDistRow}
                    className="text-xs px-3 py-1 rounded border border-blue-600 bg-card text-blue-600 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    + Agregar fila
                  </button>
                </div>

                {distributions.length === 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400">Debes asignar el ingreso a al menos un miembro.</p>
                )}

                {distributions.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <select
                      value={row.memberId}
                      onChange={(e) => updateDistRow(idx, "memberId", e.target.value)}
                      className={`flex-1 px-2.5 py-1.5 rounded-md border text-[13px] bg-background text-foreground ${!row.memberId ? "border-red-400" : "border-border"}`}
                    >
                      <option value="">— Seleccionar miembro —</option>
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
                    {distributions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDistRow(idx)}
                        className="px-2.5 py-1.5 rounded-md border-none bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer text-[13px] hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {distributions.length > 0 && (
                  <div className={`mt-2 text-xs ${distExceedsTotal ? "text-red-600 dark:text-red-400" : distUnderTotal ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                    {distExceedsTotal && `✗ Supera el total del ingreso. Exceso: $${(totalDistributed - (parseFloat(totalUsd) || 0)).toFixed(2)}`}
                    {!distExceedsTotal && distUnderTotal && `Pendiente por asignar: $${remaining.toFixed(2)}`}
                    {!distExceedsTotal && !distUnderTotal && totalDistributed > 0 && `✓ Total cubierto: $${totalDistributed.toFixed(2)}`}
                  </div>
                )}
              </div>

              {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !distValid}
                  className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none"
                >
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
