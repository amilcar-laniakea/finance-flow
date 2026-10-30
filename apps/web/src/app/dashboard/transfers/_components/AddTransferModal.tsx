"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";

type Source = { id: string; name: string; color: string | null; balance: number };
type Member = { id: string; name: string; balance: number };

export function AddTransferModal({ sources, members }: { sources: Source[]; members: Member[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transferType, setTransferType] = useState<"fund" | "member">("fund");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const router = useRouter();

  const list = transferType === "fund" ? sources : members;
  const fromItem = list.find((x) => x.id === fromId);
  const toItem = list.find((x) => x.id === toId);
  const amountNum = parseFloat(amount) || 0;
  const overdraft = fromItem && amountNum > fromItem.balance + 0.001;
  const canSubmit = !loading && !!fromId && !!toId && fromId !== toId && amountNum > 0 && !overdraft;

  function handleClose() {
    setOpen(false);
    setFromId(""); setToId(""); setAmount(""); setError(""); setTransferType("fund");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/fund-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transferType, fromId, toId, amountUsd: amount,
        description: (fd.get("description") as string) || undefined,
        period: fd.get("period") as string,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al crear la transferencia.");
      return;
    }
    handleClose();
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);
  const inputCls = "px-3 py-2 rounded-md border border-border text-sm bg-background text-foreground outline-none w-full";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold cursor-pointer border-none transition-colors"
      >
        <ArrowLeftRight size={15} />
        Transferir
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="bg-card rounded-xl p-8 w-full max-w-[460px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[92vh] overflow-y-auto mx-4">
            <h2 className="text-lg font-bold mb-6 text-foreground">Nueva Transferencia</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Type toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border">
                {(["fund", "member"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTransferType(t); setFromId(""); setToId(""); }}
                    className={`flex-1 py-2.5 border-none cursor-pointer text-[13px] font-semibold transition-colors ${
                      transferType === t
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t === "fund" ? "Entre fondos" : "Entre miembros"}
                  </button>
                ))}
              </div>

              {/* From */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">
                  {transferType === "fund" ? "Fondo origen" : "Miembro origen"} *
                </label>
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} required className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {list.filter((x) => x.id !== toId).map((x) => (
                    <option key={x.id} value={x.id}>{x.name} (disp. ${x.balance.toFixed(2)})</option>
                  ))}
                </select>
                {fromItem && (
                  <span className="text-xs text-muted-foreground">
                    Saldo disponible: <strong>${fromItem.balance.toFixed(2)}</strong>
                  </span>
                )}
              </div>

              <div className="text-center text-muted-foreground text-xl -my-1.5">↓</div>

              {/* To */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">
                  {transferType === "fund" ? "Fondo destino" : "Miembro destino"} *
                </label>
                <select value={toId} onChange={(e) => setToId(e.target.value)} required className={inputCls}>
                  <option value="">— Seleccionar —</option>
                  {list.filter((x) => x.id !== fromId).map((x) => (
                    <option key={x.id} value={x.id}>{x.name} (saldo ${x.balance.toFixed(2)})</option>
                  ))}
                </select>
                {toItem && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Saldo actual: <strong>${toItem.balance.toFixed(2)}</strong>
                    {amountNum > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {" → "}${(toItem.balance + amountNum).toFixed(2)}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Monto USD *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className={`${inputCls} ${overdraft ? "border-red-400" : ""}`}
                />
                {overdraft && fromItem && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    ✗ Saldo insuficiente. Disponible: ${fromItem.balance.toFixed(2)}
                  </span>
                )}
                {fromItem && toItem && amountNum > 0 && !overdraft && (
                  <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/40 px-3 py-2 rounded-md mt-0.5">
                    <strong>{fromItem.name}</strong>: ${fromItem.balance.toFixed(2)} →{" "}
                    <span className="text-red-600 dark:text-red-400">${(fromItem.balance - amountNum).toFixed(2)}</span>
                    {"  ·  "}
                    <strong>{toItem.name}</strong>: ${toItem.balance.toFixed(2)} →{" "}
                    <span className="text-green-600 dark:text-green-400">${(toItem.balance + amountNum).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Descripción (opcional)</label>
                <input name="description" type="text" placeholder="Ej: Recarga de fondo vacaciones" className={inputCls} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-foreground">Fecha *</label>
                <input name="period" type="date" defaultValue={today} required className={inputCls} />
              </div>

              {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3 justify-end mt-2">
                <button type="button" onClick={handleClose} className="px-5 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-muted transition-colors text-foreground">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border-none"
                >
                  {loading ? "Transfiriendo..." : "Transferir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
