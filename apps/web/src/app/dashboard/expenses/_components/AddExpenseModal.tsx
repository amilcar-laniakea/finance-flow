"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Button, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui";

type Member = { id: string; nickname: string | null };
type Source = { id: string; name: string; color: string | null; balance: number };
type ExpenseType = { id: string; name: string; color: string | null };
type SplitRow = { incomeSourceId: string; amountUsd: string };
type TypeRow = { expenseTypeId: string; amount: string };

export function AddExpenseModal({
  members,
  sources,
  expenseTypes,
}: {
  members: Member[];
  sources: Source[];
  expenseTypes: ExpenseType[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [memberId, setMemberId] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [typeRows, setTypeRows] = useState<TypeRow[]>([]);
  const router = useRouter();

  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));

  function addSplitRow() { setSplits((prev) => [...prev, { incomeSourceId: "", amountUsd: "" }]); }
  function removeSplitRow(idx: number) { setSplits((prev) => prev.filter((_, i) => i !== idx)); }
  function updateSplitRow(idx: number, field: keyof SplitRow, value: string) {
    setSplits((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  function addTypeRow() { setTypeRows((prev) => [...prev, { expenseTypeId: "", amount: "" }]); }
  function removeTypeRow(idx: number) { setTypeRows((prev) => prev.filter((_, i) => i !== idx)); }
  function updateTypeRow(idx: number, field: keyof TypeRow, value: string) {
    setTypeRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  const expenseTotal = parseFloat(amountUsd) || 0;
  const splitsTotal = splits.reduce((sum, s) => sum + (parseFloat(s.amountUsd) || 0), 0);
  const remaining = expenseTotal - splitsTotal;
  const splitsTotalMismatch = splits.length > 0 && Math.abs(splitsTotal - expenseTotal) > 0.01;
  const splitOverdraftIdx = splits.findIndex((s) => {
    const src = sourceMap[s.incomeSourceId];
    return src && parseFloat(s.amountUsd) > src.balance + 0.001;
  });
  const hasAtLeastOneSource = splits.some((s) => s.incomeSourceId !== "");
  const canSubmit = !loading && hasAtLeastOneSource && !splitsTotalMismatch && splitOverdraftIdx === -1;

  function availableSourcesFor(idx: number) {
    const selectedIds = new Set(splits.filter((_, i) => i !== idx).map((s) => s.incomeSourceId));
    return sources.filter((s) => !selectedIds.has(s.id));
  }

  function availableExpenseTypesFor(idx: number) {
    const selectedIds = new Set(typeRows.filter((_, i) => i !== idx).map((r) => r.expenseTypeId));
    return expenseTypes.filter((t) => !selectedIds.has(t.id));
  }

  function handleClose() {
    setOpen(false);
    setSplits([]);
    setTypeRows([]);
    setAmountUsd("");
    setMemberId("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const validSplits = splits.filter((s) => s.incomeSourceId && parseFloat(s.amountUsd) > 0);
    const validTypeAmounts = typeRows.filter((t) => t.expenseTypeId && parseFloat(t.amount) > 0);

    const body: Record<string, unknown> = {
      description: fd.get("description") as string,
      merchant: (fd.get("merchant") as string) || undefined,
      memberId: memberId || undefined,
      amountUsd: fd.get("amountUsd") as string,
      amountBs: (fd.get("amountBs") as string) || undefined,
      exchangeRate: (fd.get("exchangeRate") as string) || undefined,
      period: fd.get("period") as string,
    };
    if (validTypeAmounts.length > 0) body.typeAmounts = validTypeAmounts.map((t) => ({ expenseTypeId: t.expenseTypeId, amount: t.amount }));
    if (validSplits.length > 0) body.sourceSplits = validSplits.map((s) => ({ incomeSourceId: s.incomeSourceId, amountUsd: s.amountUsd }));

    const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al guardar el gasto. Intenta de nuevo.");
      return;
    }
    handleClose();
    router.refresh();
  }

  const defaultPeriod = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        + Agregar Gasto
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Gasto</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Member */}
            <div className="flex flex-col gap-1.5">
              <Label>Miembro (opcional)</Label>
              <Select value={memberId || "__none__"} onValueChange={(v) => setMemberId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="— Sin asignar —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sin asignar —</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nickname ?? m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type classification */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Clasificación por tipo</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Opcional — asigna montos a tipos de gasto</p>
                </div>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={addTypeRow}
                  disabled={expenseTypes.length === 0 || typeRows.length >= expenseTypes.length}
                  className="border-violet-400 text-violet-600 hover:bg-violet-50"
                >
                  + Agregar tipo
                </Button>
              </div>

              {expenseTypes.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay tipos creados. Ve a <strong>Tipos</strong> para agregar.</p>
              )}
              {expenseTypes.length > 0 && typeRows.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin clasificación — el gasto no será clasificado por tipo.</p>
              )}

              {typeRows.map((row, idx) => {
                const avail = availableExpenseTypesFor(idx);
                const selected = expenseTypes.find((t) => t.id === row.expenseTypeId);
                return (
                  <div key={idx} className="mb-2 flex items-center gap-2">
                    <select
                      value={row.expenseTypeId}
                      onChange={(e) => updateTypeRow(idx, "expenseTypeId", e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">— Seleccionar tipo —</option>
                      {avail.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      {row.expenseTypeId && !avail.find((t) => t.id === row.expenseTypeId) && selected && (
                        <option value={row.expenseTypeId}>{selected.name}</option>
                      )}
                    </select>
                    <Input
                      type="number" step="0.01" placeholder="Monto"
                      value={row.amount}
                      onChange={(e) => updateTypeRow(idx, "amount", e.target.value)}
                      className="w-24"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeTypeRow(idx)} className="shrink-0 text-violet-600 hover:bg-violet-50">✕</Button>
                  </div>
                );
              })}

              {typeRows.length > 0 && (
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  Total clasificado: <strong>${typeRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}</strong>
                </p>
              )}
            </div>

            <FormField label="Descripción / Motivo *" name="description" placeholder="Ej: Compra de alimentos, pago de internet..." required />
            <FormField label="Comercio" name="merchant" placeholder="Ej: Central Madeirense, Provicar" />

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Monto USD *</Label>
                <Input name="amountUsd" type="number" step="0.01" placeholder="0.00" required value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />
              </div>
              <FormField label="Monto Bs" name="amountBs" type="number" step="0.01" placeholder="0.00" />
            </div>

            <FormField label="Tasa de cambio" name="exchangeRate" type="number" step="0.0001" placeholder="Bs/USD" />
            <FormField label="Fecha *" name="period" type="date" defaultValue={defaultPeriod} required />

            {/* Source splits */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Fondos utilizados</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Opcional — asigna el gasto a uno o más fondos</p>
                </div>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={addSplitRow}
                  disabled={sources.length === 0 || splits.length >= sources.length}
                  className="border-red-400 text-red-600 hover:bg-red-50"
                >
                  + Agregar fondo
                </Button>
              </div>

              {sources.length === 0 && <p className="text-xs text-muted-foreground">No hay fondos creados aún.</p>}
              {splits.length === 0 && sources.length > 0 && (
                <p className="text-xs text-muted-foreground">Sin asignación — el gasto no se descuenta de ningún fondo.</p>
              )}

              {splits.map((row, idx) => {
                const src = row.incomeSourceId ? sourceMap[row.incomeSourceId] : null;
                const splitAmt = parseFloat(row.amountUsd) || 0;
                const overdraft = src && splitAmt > src.balance + 0.001;
                const avail = availableSourcesFor(idx);
                return (
                  <div key={idx} className="mb-2.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={row.incomeSourceId}
                        onChange={(e) => updateSplitRow(idx, "incomeSourceId", e.target.value)}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">— Seleccionar fondo —</option>
                        {avail.map((s) => <option key={s.id} value={s.id}>{s.name} (disp. ${s.balance.toFixed(2)})</option>)}
                        {row.incomeSourceId && !avail.find((s) => s.id === row.incomeSourceId) && src && (
                          <option value={row.incomeSourceId}>{src.name} (disp. ${src.balance.toFixed(2)})</option>
                        )}
                      </select>
                      <Input
                        type="number" step="0.01" placeholder="USD"
                        value={row.amountUsd}
                        onChange={(e) => updateSplitRow(idx, "amountUsd", e.target.value)}
                        className={`w-24 ${overdraft ? "border-red-300 focus-visible:ring-red-400" : ""}`}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeSplitRow(idx)} className="shrink-0 text-red-500 hover:bg-red-50">✕</Button>
                    </div>
                    {overdraft && src && (
                      <p className="mt-1 pl-0.5 text-xs text-red-600">✗ Saldo insuficiente en &ldquo;{src.name}&rdquo;. Disponible: ${src.balance.toFixed(2)}</p>
                    )}
                  </div>
                );
              })}

              {splits.length > 0 && (
                <p className={`mt-2 border-t pt-2 text-xs ${splitsTotalMismatch ? "text-red-600" : "text-muted-foreground"}`}>
                  {splitsTotalMismatch ? (
                    <>✗ Asignado <strong>${splitsTotal.toFixed(2)}</strong> — debe ser igual al gasto <strong>${expenseTotal.toFixed(2)}</strong></>
                  ) : (
                    <>
                      Asignado: <strong>${splitsTotal.toFixed(2)}</strong>
                      {remaining > 0.001 && <span className="text-muted-foreground"> · Restante sin asignar: <strong>${remaining.toFixed(2)}</strong></span>}
                      {Math.abs(remaining) <= 0.001 && splits.length > 0 && <span className="text-green-600"> ✓</span>}
                    </>
                  )}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" variant="destructive" disabled={!canSubmit}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormField({
  label, name, type = "text", placeholder, required, step, defaultValue,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  required?: boolean; step?: string; defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} step={step} defaultValue={defaultValue} />
    </div>
  );
}
