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
type SplitInfo = { incomeSourceId: string; amountUsd: string; sourceName: string; sourceColor: string | null };
type TypeRow = { expenseTypeId: string; amount: string };

type Expense = {
  id: string;
  description: string;
  merchant: string | null;
  memberId: string | null;
  amountUsd: string;
  amountBs: string | null;
  exchangeRate: string | null;
  period: Date | null;
};

function toDateStr(d: Date | null) {
  if (!d) return new Date().toISOString().slice(0, 10);
  return new Date(d).toISOString().slice(0, 10);
}

export function EditExpenseModal({
  expense, expenseSplits, initialTypeAmounts, members, sources, expenseTypes,
}: {
  expense: Expense;
  expenseSplits: SplitInfo[];
  initialTypeAmounts: TypeRow[];
  members: Member[];
  sources: Source[];
  expenseTypes: ExpenseType[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [memberId, setMemberId] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountBs, setAmountBs] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [period, setPeriod] = useState("");
  const [typeRows, setTypeRows] = useState<TypeRow[]>([]);
  const router = useRouter();

  function handleOpen() {
    setDescription(expense.description ?? "");
    setMerchant(expense.merchant ?? "");
    setMemberId(expense.memberId ?? "");
    setAmountUsd(expense.amountUsd ?? "");
    setAmountBs(expense.amountBs ?? "");
    setExchangeRate(expense.exchangeRate ?? "");
    setPeriod(toDateStr(expense.period));
    setTypeRows(initialTypeAmounts.map((t) => ({ expenseTypeId: t.expenseTypeId, amount: t.amount })));
    setError("");
    setOpen(true);
  }

  function addTypeRow() { setTypeRows((prev) => [...prev, { expenseTypeId: "", amount: "" }]); }
  function removeTypeRow(idx: number) { setTypeRows((prev) => prev.filter((_, i) => i !== idx)); }
  function updateTypeRow(idx: number, field: keyof TypeRow, value: string) {
    setTypeRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  function availableExpenseTypesFor(idx: number) {
    const selectedIds = new Set(typeRows.filter((_, i) => i !== idx).map((r) => r.expenseTypeId));
    return expenseTypes.filter((t) => !selectedIds.has(t.id));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validTypeAmounts = typeRows.filter((t) => t.expenseTypeId && parseFloat(t.amount) > 0);
    const body = {
      description, merchant: merchant || null, memberId: memberId || null,
      amountUsd, amountBs: amountBs || null, exchangeRate: exchangeRate || null, period,
      typeAmounts: validTypeAmounts.map((t) => ({ expenseTypeId: t.expenseTypeId, amount: t.amount })),
    };

    const res = await fetch(`/api/expenses/${expense.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
      <Button variant="ghost" size="sm" onClick={handleOpen} title="Editar gasto" className="text-muted-foreground hover:text-blue-600">
        ✎
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Member */}
            <div className="flex flex-col gap-1.5">
              <Label>Miembro</Label>
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

            {/* Funds — read-only */}
            <div className="flex flex-col gap-1.5">
              <Label>Fondos utilizados</Label>
              {expenseSplits.length === 0 ? (
                <span className="text-sm text-muted-foreground/40">Sin asignación de fondo</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {expenseSplits.map((s) => (
                    <span key={s.incomeSourceId} className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-sm font-medium text-green-700">
                      <span className="inline-block size-1.5 shrink-0 rounded-full" style={{ background: s.sourceColor ?? "#16A34A" }} />
                      {s.sourceName}
                      <span className="font-bold text-green-400">${parseFloat(s.amountUsd).toFixed(2)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Type classification */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Clasificación por tipo</p>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={addTypeRow}
                  disabled={expenseTypes.length === 0 || typeRows.length >= expenseTypes.length}
                  className="border-violet-400 text-violet-600 hover:bg-violet-50"
                >
                  + Tipo
                </Button>
              </div>

              {expenseTypes.length === 0 && <p className="text-xs text-muted-foreground">No hay tipos creados aún.</p>}
              {expenseTypes.length > 0 && typeRows.length === 0 && <p className="text-xs text-muted-foreground">Sin clasificación.</p>}

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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descripción / Motivo *</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="merchant">Comercio</Label>
              <Input id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amountUsd">Monto USD *</Label>
                <Input id="amountUsd" type="number" step="0.01" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amountBs">Monto Bs</Label>
                <Input id="amountBs" type="number" step="0.01" value={amountBs} onChange={(e) => setAmountBs(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exchangeRate">Tasa de cambio</Label>
              <Input id="exchangeRate" type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period">Fecha *</Label>
              <Input id="period" type="date" value={period} onChange={(e) => setPeriod(e.target.value)} required />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
