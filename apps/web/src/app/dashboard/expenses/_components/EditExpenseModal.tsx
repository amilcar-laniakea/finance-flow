"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  expense,
  expenseSplits,
  initialTypeAmounts,
  members,
  sources,
  expenseTypes,
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

  function addTypeRow() {
    setTypeRows((prev) => [...prev, { expenseTypeId: "", amount: "" }]);
  }
  function removeTypeRow(idx: number) {
    setTypeRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateTypeRow(idx: number, field: keyof TypeRow, value: string) {
    setTypeRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  function availableExpenseTypesFor(idx: number) {
    const selectedIds = new Set(
      typeRows.filter((_, i) => i !== idx).map((r) => r.expenseTypeId)
    );
    return expenseTypes.filter((t) => !selectedIds.has(t.id));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validTypeAmounts = typeRows.filter((t) => t.expenseTypeId && parseFloat(t.amount) > 0);

    const body = {
      description,
      merchant: merchant || null,
      memberId: memberId || null,
      amountUsd,
      amountBs: amountBs || null,
      exchangeRate: exchangeRate || null,
      period,
      typeAmounts: validTypeAmounts.map((t) => ({ expenseTypeId: t.expenseTypeId, amount: t.amount })),
    };

    const res = await fetch(`/api/expenses/${expense.id}`, {
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

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    outline: "none",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "#374151",
  };

  return (
    <>
      <button
        onClick={handleOpen}
        title="Editar gasto"
        style={{ padding: "4px 10px", borderRadius: "4px", border: "none", background: "transparent", color: "#94A3B8", cursor: "pointer", fontSize: "13px" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#2563EB")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
      >
        ✎
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div style={{ background: "#fff", borderRadius: "12px", padding: "32px", width: "100%", maxWidth: "460px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>Editar Gasto</h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Miembro</label>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", background: "#fff" }}>
                  <option value="">— Sin asignar —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.nickname ?? m.id}</option>)}
                </select>
              </div>

              {/* Fondo — read-only, shows the splits */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={labelStyle}>Fondos utilizados</label>
                {expenseSplits.length === 0 ? (
                  <span style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin asignación de fondo</span>
                ) : (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {expenseSplits.map((s) => (
                      <span
                        key={s.incomeSourceId}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "13px",
                          padding: "4px 10px",
                          borderRadius: "99px",
                          background: "#F0FDF4",
                          color: "#15803D",
                          fontWeight: 500,
                          border: "1px solid #BBF7D0",
                        }}
                      >
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: s.sourceColor ?? "#16A34A", flexShrink: 0, display: "inline-block" }} />
                        {s.sourceName}
                        <span style={{ color: "#86EFAC", fontWeight: 700 }}>${parseFloat(s.amountUsd).toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Type amounts — editable rows */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px", background: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Clasificación por tipo</p>
                  <button
                    type="button"
                    onClick={addTypeRow}
                    disabled={expenseTypes.length === 0 || typeRows.length >= expenseTypes.length}
                    style={{
                      fontSize: "12px", padding: "3px 10px", borderRadius: "4px",
                      border: "1px solid #7C3AED", background: "#fff", color: "#7C3AED",
                      cursor: expenseTypes.length === 0 || typeRows.length >= expenseTypes.length ? "not-allowed" : "pointer",
                      opacity: expenseTypes.length === 0 || typeRows.length >= expenseTypes.length ? 0.5 : 1,
                    }}
                  >
                    + Tipo
                  </button>
                </div>

                {expenseTypes.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>No hay tipos creados aún.</p>
                )}

                {expenseTypes.length > 0 && typeRows.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>Sin clasificación.</p>
                )}

                {typeRows.map((row, idx) => {
                  const avail = availableExpenseTypesFor(idx);
                  const selected = expenseTypes.find((t) => t.id === row.expenseTypeId);
                  return (
                    <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                      <select
                        value={row.expenseTypeId}
                        onChange={(e) => updateTypeRow(idx, "expenseTypeId", e.target.value)}
                        style={{ flex: 1, padding: "7px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px", background: "#fff" }}
                      >
                        <option value="">— Seleccionar tipo —</option>
                        {avail.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        {row.expenseTypeId && !avail.find((t) => t.id === row.expenseTypeId) && selected && (
                          <option value={row.expenseTypeId}>{selected.name}</option>
                        )}
                      </select>
                      <input
                        type="number" step="0.01" placeholder="Monto"
                        value={row.amount}
                        onChange={(e) => updateTypeRow(idx, "amount", e.target.value)}
                        style={{ width: "100px", padding: "7px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                      />
                      <button
                        type="button" onClick={() => removeTypeRow(idx)}
                        style={{ padding: "7px 10px", borderRadius: "6px", border: "none", background: "#EDE9FE", color: "#7C3AED", cursor: "pointer", fontSize: "13px", flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {typeRows.length > 0 && (
                  <div style={{ marginTop: "6px", paddingTop: "8px", borderTop: "1px solid #E2E8F0", fontSize: "12px", color: "#64748B" }}>
                    Total clasificado: <strong>${typeRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Descripción / Motivo *</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} required style={inputStyle} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Comercio</label>
                <input value={merchant} onChange={(e) => setMerchant(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={labelStyle}>Monto USD *</label>
                  <input type="number" step="0.01" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} required style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={labelStyle}>Monto Bs</label>
                  <input type="number" step="0.01" value={amountBs} onChange={(e) => setAmountBs(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Tasa de cambio</label>
                <input type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" value={period} onChange={(e) => setPeriod(e.target.value)} required style={inputStyle} />
              </div>

              {error && <p style={{ color: "#DC2626", fontSize: "13px" }}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button type="button" onClick={() => setOpen(false)} style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "14px" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading} style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: loading ? "#93C5FD" : "#2563EB", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600 }}>
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
