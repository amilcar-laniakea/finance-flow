"use client";

import { useState } from "react";

export type MemberExpense = {
  id: string;
  description: string;
  merchant: string | null;
  amountUsd: string;
  amountBs: string | null;
  occurredAt: Date | null;
};

export type MemberDistribution = {
  id: string;
  amountUsd: string;
  incomeDescription: string | null;
  incomePeriod: Date | null;
  sourceName: string | null;
};

type Tab = "expenses" | "income";

export function MemberDetailModal({
  memberId,
  memberName,
  totalReceived,
  totalSpent,
  balance,
  expenses,
  distributions,
}: {
  memberId: string;
  memberName: string;
  totalReceived: number;
  totalSpent: number;
  balance: number;
  expenses: MemberExpense[];
  distributions: MemberDistribution[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("expenses");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: "12px",
          width: "100%",
          padding: "6px 0",
          borderRadius: "6px",
          border: "1px solid #E2E8F0",
          background: "#F8FAFC",
          color: "#64748B",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Ver transacciones →
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "24px 28px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{memberName}</h2>
                  <p style={{ fontSize: "13px", color: "#94A3B8", marginTop: "2px" }}>Detalle de movimientos</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: "none", border: "none", fontSize: "20px", color: "#94A3B8", cursor: "pointer", lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              {/* Summary row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "16px", marginBottom: "20px" }}>
                <div style={{ background: "#F0FDF4", borderRadius: "8px", padding: "12px 14px" }}>
                  <p style={{ fontSize: "11px", color: "#16A34A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Recibido</p>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#16A34A", marginTop: "4px" }}>${totalReceived.toFixed(2)}</p>
                </div>
                <div style={{ background: "#FEF2F2", borderRadius: "8px", padding: "12px 14px" }}>
                  <p style={{ fontSize: "11px", color: "#DC2626", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Gastado</p>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#DC2626", marginTop: "4px" }}>${totalSpent.toFixed(2)}</p>
                </div>
                <div style={{ background: balance >= 0 ? "#EFF6FF" : "#FEF2F2", borderRadius: "8px", padding: "12px 14px" }}>
                  <p style={{ fontSize: "11px", color: balance >= 0 ? "#1D4ED8" : "#DC2626", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Saldo</p>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: balance >= 0 ? "#1D4ED8" : "#DC2626", marginTop: "4px" }}>
                    {balance >= 0 ? "+" : ""}${balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", gap: "0" }}>
                {(["expenses", "income"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: tab === t ? 700 : 400,
                      color: tab === t ? "#DC2626" : "#64748B",
                      borderBottom: tab === t ? "2px solid #DC2626" : "2px solid transparent",
                      marginBottom: "-1px",
                    }}
                  >
                    {t === "expenses"
                      ? `Gastos (${expenses.length})`
                      : `Ingresos recibidos (${distributions.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 28px 24px" }}>
              {tab === "expenses" && (
                <div>
                  {expenses.length === 0 ? (
                    <p style={{ color: "#CBD5E1", textAlign: "center", padding: "32px 0", fontSize: "14px" }}>
                      Sin gastos registrados
                    </p>
                  ) : (
                    expenses.map((e) => (
                      <div
                        key={e.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 0",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                      >
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{e.description}</p>
                          <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                            {e.merchant ? `${e.merchant} · ` : ""}
                            {e.occurredAt
                              ? new Date(e.occurredAt).toLocaleDateString("es-VE")
                              : "—"}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
                          <p style={{ fontSize: "14px", fontWeight: 700, color: "#DC2626" }}>
                            ${parseFloat(e.amountUsd).toFixed(2)}
                          </p>
                          {e.amountBs && (
                            <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                              {e.amountBs} Bs
                            </p>
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
                    <p style={{ color: "#CBD5E1", textAlign: "center", padding: "32px 0", fontSize: "14px" }}>
                      Sin ingresos distribuidos
                    </p>
                  ) : (
                    distributions.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 0",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                      >
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                            {d.incomeDescription ?? "Ingreso"}
                          </p>
                          <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                            {d.sourceName ? (
                              <span style={{
                                padding: "1px 6px",
                                borderRadius: "99px",
                                background: "#F0FDF4",
                                color: "#16A34A",
                                fontWeight: 600,
                                marginRight: "6px",
                              }}>
                                {d.sourceName}
                              </span>
                            ) : null}
                            {d.incomePeriod
                              ? new Date(d.incomePeriod).toLocaleDateString("es-VE", { month: "long", year: "numeric" })
                              : "—"}
                          </p>
                        </div>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#16A34A", flexShrink: 0, marginLeft: "16px" }}>
                          +${parseFloat(d.amountUsd).toFixed(2)}
                        </p>
                      </div>
                    ))
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
