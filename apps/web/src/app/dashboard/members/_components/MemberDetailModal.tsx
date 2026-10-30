"use client";

import { useState } from "react";

export type MemberExpense = {
  id: string;
  description: string;
  merchant: string | null;
  amountUsd: string;
  amountBs: string | null;
  occurredAt: Date | string | null;
};

export type MemberDistribution = {
  id: string;
  amountUsd: string;
  incomeDescription: string | null;
  incomePeriod: Date | string | null;
  sourceName: string | null;
};

export type MemberTransfer = {
  id: string;
  direction: "in" | "out";
  amountUsd: string;
  description: string | null;
  period: Date | string | null;
  counterpartName: string | null;
};

type Tab = "expenses" | "income" | "transfers";

export function MemberDetailModal({
  memberId,
  memberName,
  totalReceived,
  totalSpent,
  balance,
  expenses,
  distributions,
  transfers,
}: {
  memberId: string;
  memberName: string;
  totalReceived: number;
  totalSpent: number;
  balance: number;
  expenses: MemberExpense[];
  distributions: MemberDistribution[];
  transfers: MemberTransfer[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("expenses");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full py-1.5 rounded-md border border-border bg-muted text-muted-foreground text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
      >
        Ver transacciones →
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/45 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-card rounded-xl w-full max-w-[560px] max-h-[88vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)] mx-4">
            {/* Header */}
            <div className="px-7 pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{memberName}</h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">Detalle de movimientos</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-xl leading-none bg-transparent border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3 mt-4 mb-5">
                <div className="bg-green-50 dark:bg-green-950/40 rounded-lg px-3.5 py-3">
                  <p className="text-[11px] text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">Recibido</p>
                  <p className="text-base font-bold text-green-600 dark:text-green-400 mt-1">${totalReceived.toFixed(2)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 rounded-lg px-3.5 py-3">
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold uppercase tracking-wide">Gastado</p>
                  <p className="text-base font-bold text-red-600 dark:text-red-400 mt-1">${totalSpent.toFixed(2)}</p>
                </div>
                <div className={`rounded-lg px-3.5 py-3 ${balance >= 0 ? "bg-blue-50 dark:bg-blue-950/40" : "bg-red-50 dark:bg-red-950/40"}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>Saldo</p>
                  <p className={`text-base font-bold mt-1 ${balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                    {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                {(["expenses", "income", "transfers"] as Tab[]).map((t) => {
                  const labels: Record<Tab, string> = {
                    expenses: `Gastos (${expenses.length})`,
                    income: `Ingresos (${distributions.length})`,
                    transfers: `Transferencias (${transfers.length})`,
                  };
                  const active = tab === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2.5 text-[13px] bg-transparent border-none cursor-pointer whitespace-nowrap -mb-px border-b-2 transition-colors ${
                        active
                          ? "font-bold text-red-600 dark:text-red-400 border-red-600 dark:border-red-400"
                          : "font-normal text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-7 pb-6">
              {tab === "expenses" && (
                <div>
                  {expenses.length === 0 ? (
                    <p className="text-muted-foreground/50 text-center py-8 text-sm">Sin gastos registrados</p>
                  ) : (
                    expenses.map((e) => (
                      <div key={e.id} className="flex justify-between items-center py-3 border-b border-border/60">
                        <div>
                          <p className="text-sm font-medium text-foreground">{e.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {e.merchant ? `${e.merchant} · ` : ""}
                            {e.occurredAt ? new Date(e.occurredAt).toLocaleDateString("es-VE") : "—"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">
                            ${parseFloat(e.amountUsd).toFixed(2)}
                          </p>
                          {e.amountBs && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{e.amountBs} Bs</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "income" && (
                <div>
                  {distributions.length === 0 ? (
                    <p className="text-muted-foreground/50 text-center py-8 text-sm">Sin ingresos distribuidos</p>
                  ) : (
                    distributions.map((d) => (
                      <div key={d.id} className="flex justify-between items-center py-3 border-b border-border/60">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {d.incomeDescription ?? "Ingreso"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {d.sourceName && (
                              <span className="px-1.5 py-px rounded-full bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-semibold mr-1.5">
                                {d.sourceName}
                              </span>
                            )}
                            {d.incomePeriod
                              ? new Date(d.incomePeriod).toLocaleDateString("es-VE", { month: "long", year: "numeric" })
                              : "—"}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0 ml-4">
                          +${parseFloat(d.amountUsd).toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "transfers" && (
                <div>
                  {transfers.length === 0 ? (
                    <p className="text-muted-foreground/50 text-center py-8 text-sm">Sin transferencias registradas</p>
                  ) : (
                    transfers.map((t) => {
                      const isIn = t.direction === "in";
                      return (
                        <div key={t.id} className="flex justify-between items-center py-3 border-b border-border/60">
                          <div className="flex items-center gap-2.5">
                            <div className={`size-7 rounded-full flex items-center justify-center text-[13px] shrink-0 ${
                              isIn
                                ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"
                                : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                            }`}>
                              {isIn ? "↓" : "↑"}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {t.description ?? (isIn ? "Transferencia recibida" : "Transferencia enviada")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t.counterpartName && (
                                  <span>{isIn ? "De" : "A"}: {t.counterpartName} · </span>
                                )}
                                {t.period
                                  ? new Date(t.period).toLocaleDateString("es-VE", { month: "long", year: "numeric" })
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          <p className={`text-sm font-bold shrink-0 ml-4 ${
                            isIn ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"
                          }`}>
                            {isIn ? "+" : "−"}${parseFloat(t.amountUsd).toFixed(2)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
