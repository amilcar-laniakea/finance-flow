"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [amountUsd, setAmountUsd] = useState("");
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [typeRows, setTypeRows] = useState<TypeRow[]>([]);
  const router = useRouter();

  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));

  function addSplitRow() {
    setSplits((prev) => [...prev, { incomeSourceId: "", amountUsd: "" }]);
  }

  function removeSplitRow(idx: number) {
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSplitRow(idx: number, field: keyof SplitRow, value: string) {
    setSplits((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  function addTypeRow() {
    setTypeRows((prev) => [...prev, { expenseTypeId: "", amount: "" }]);
  }
  function removeTypeRow(idx: number) {
    setTypeRows((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateTypeRow(idx: number, field: keyof TypeRow, value: string) {
    setTypeRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  const expenseTotal = parseFloat(amountUsd) || 0;
  const splitsTotal = splits.reduce((sum, s) => sum + (parseFloat(s.amountUsd) || 0), 0);
  const remaining = expenseTotal - splitsTotal;

  // Validation errors
  const splitsTotalMismatch =
    splits.length > 0 && Math.abs(splitsTotal - expenseTotal) > 0.01;

  const splitOverdraftIdx = splits.findIndex((s) => {
    const src = sourceMap[s.incomeSourceId];
    return src && parseFloat(s.amountUsd) > src.balance + 0.001;
  });

  const hasAtLeastOneSource = splits.some((s) => s.incomeSourceId !== "");

  const canSubmit =
    !loading &&
    hasAtLeastOneSource &&
    !splitsTotalMismatch &&
    splitOverdraftIdx === -1;


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const memberId = fd.get("memberId") as string;

    const validSplits = splits.filter(
      (s) => s.incomeSourceId && parseFloat(s.amountUsd) > 0
    );

    const validTypeAmounts = typeRows.filter(
      (t) => t.expenseTypeId && parseFloat(t.amount) > 0
    );

    const body: Record<string, unknown> = {
      description: fd.get("description") as string,
      merchant: (fd.get("merchant") as string) || undefined,
      memberId: memberId || undefined,
      amountUsd: fd.get("amountUsd") as string,
      amountBs: (fd.get("amountBs") as string) || undefined,
      exchangeRate: (fd.get("exchangeRate") as string) || undefined,
      period: fd.get("period") as string,
    };

    if (validTypeAmounts.length > 0) {
      body.typeAmounts = validTypeAmounts.map((t) => ({
        expenseTypeId: t.expenseTypeId,
        amount: t.amount,
      }));
    }

    if (validSplits.length > 0) {
      body.sourceSplits = validSplits.map((s) => ({
        incomeSourceId: s.incomeSourceId,
        amountUsd: s.amountUsd,
      }));
    }

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al guardar el gasto. Intenta de nuevo.");
      return;
    }

    handleClose();
    router.refresh();
  }

  // Sources not yet selected in other rows (avoid duplicates)
  function availableExpenseTypesFor(idx: number) {
    const selectedIds = new Set(
      typeRows.filter((_, i) => i !== idx).map((r) => r.expenseTypeId)
    );
    return expenseTypes.filter((t) => !selectedIds.has(t.id));
  }

  function handleClose() {
    setOpen(false);
    setSplits([]);
    setTypeRows([]);
    setAmountUsd("");
    setError("");
  }

  const defaultPeriod = new Date().toISOString().slice(0, 10);

  // Sources not yet selected in other rows (avoid duplicates)
  function availableSourcesFor(idx: number) {
    const selectedIds = new Set(
      splits.filter((_, i) => i !== idx).map((s) => s.incomeSourceId)
    );
    return sources.filter((s) => !selectedIds.has(s.id));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#DC2626",
          color: "#fff",
          padding: "8px 20px",
          borderRadius: "6px",
          border: "none",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + Agregar Gasto
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>
              Agregar Gasto
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Member */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  Miembro (opcional)
                </label>
                <select
                  name="memberId"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "14px",
                    background: "#fff",
                  }}
                >
                  <option value="">— Sin asignar —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname ?? m.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type amounts — optional, multiple rows */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px", background: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Clasificación por tipo</p>
                    <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>Opcional — asigna montos a tipos de gasto para el resumen</p>
                  </div>
                  <button
                    type="button"
                    onClick={addTypeRow}
                    disabled={expenseTypes.length === 0 || typeRows.length >= expenseTypes.length}
                    style={{
                      fontSize: "12px", padding: "4px 12px", borderRadius: "4px",
                      border: "1px solid #7C3AED", background: "#fff", color: "#7C3AED",
                      cursor: expenseTypes.length === 0 || typeRows.length >= expenseTypes.length ? "not-allowed" : "pointer",
                      opacity: expenseTypes.length === 0 || typeRows.length >= expenseTypes.length ? 0.5 : 1,
                    }}
                  >
                    + Agregar tipo
                  </button>
                </div>

                {expenseTypes.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>No hay tipos creados. Ve a <strong>Tipos</strong> para agregar.</p>
                )}

                {expenseTypes.length > 0 && typeRows.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>Sin clasificación — el gasto no será clasificado por tipo.</p>
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
                        {/* Keep current selection visible even if used elsewhere */}
                        {row.expenseTypeId && !avail.find((t) => t.id === row.expenseTypeId) && selected && (
                          <option value={row.expenseTypeId}>{selected.name}</option>
                        )}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Monto"
                        value={row.amount}
                        onChange={(e) => updateTypeRow(idx, "amount", e.target.value)}
                        style={{ width: "100px", padding: "7px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeTypeRow(idx)}
                        style={{ padding: "7px 10px", borderRadius: "6px", border: "none", background: "#EDE9FE", color: "#7C3AED", cursor: "pointer", fontSize: "13px", flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {typeRows.length > 0 && (
                  <div style={{ marginTop: "8px", paddingTop: "10px", borderTop: "1px solid #E2E8F0", fontSize: "12px", color: "#64748B" }}>
                    Total clasificado: <strong>${typeRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2)}</strong>
                  </div>
                )}
              </div>

              <Field
                label="Descripción / Motivo *"
                name="description"
                placeholder="Ej: Compra de alimentos, pago de internet..."
                required
              />
              <Field
                label="Comercio"
                name="merchant"
                placeholder="Ej: Central Madeirense, Provicar"
              />

              {/* Amounts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Monto USD *</label>
                  <input
                    name="amountUsd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
                <Field label="Monto Bs" name="amountBs" type="number" step="0.01" placeholder="0.00" />
              </div>

              <Field label="Tasa de cambio" name="exchangeRate" type="number" step="0.0001" placeholder="Bs/USD" />
              <Field label="Fecha *" name="period" type="date" defaultValue={defaultPeriod} required />

              {/* Source splits section */}
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "16px",
                  background: "#F8FAFC",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                      Fondos utilizados
                    </p>
                    <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>
                      Opcional — asigna el gasto a uno o más fondos
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSplitRow}
                    disabled={sources.length === 0 || splits.length >= sources.length}
                    style={{
                      fontSize: "12px",
                      padding: "4px 12px",
                      borderRadius: "4px",
                      border: "1px solid #DC2626",
                      background: "#fff",
                      color: "#DC2626",
                      cursor: sources.length === 0 || splits.length >= sources.length ? "not-allowed" : "pointer",
                      opacity: sources.length === 0 || splits.length >= sources.length ? 0.5 : 1,
                    }}
                  >
                    + Agregar fondo
                  </button>
                </div>

                {sources.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>
                    No hay fondos creados aún.
                  </p>
                )}

                {splits.length === 0 && sources.length > 0 && (
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>
                    Sin asignación — el gasto no se descuenta de ningún fondo.
                  </p>
                )}

                {splits.map((row, idx) => {
                  const src = row.incomeSourceId ? sourceMap[row.incomeSourceId] : null;
                  const splitAmt = parseFloat(row.amountUsd) || 0;
                  const overdraft = src && splitAmt > src.balance + 0.001;
                  const avail = availableSourcesFor(idx);

                  return (
                    <div key={idx} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <select
                          value={row.incomeSourceId}
                          onChange={(e) => updateSplitRow(idx, "incomeSourceId", e.target.value)}
                          style={{
                            flex: 1,
                            padding: "7px 10px",
                            borderRadius: "6px",
                            border: "1px solid #D1D5DB",
                            fontSize: "13px",
                            background: "#fff",
                          }}
                        >
                          <option value="">— Seleccionar fondo —</option>
                          {avail.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (disp. ${s.balance.toFixed(2)})
                            </option>
                          ))}
                          {/* Keep current selection visible even if "used" elsewhere */}
                          {row.incomeSourceId && !avail.find((s) => s.id === row.incomeSourceId) && src && (
                            <option value={row.incomeSourceId}>{src.name} (disp. ${src.balance.toFixed(2)})</option>
                          )}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="USD"
                          value={row.amountUsd}
                          onChange={(e) => updateSplitRow(idx, "amountUsd", e.target.value)}
                          style={{
                            width: "90px",
                            padding: "7px 10px",
                            borderRadius: "6px",
                            border: `1px solid ${overdraft ? "#FCA5A5" : "#D1D5DB"}`,
                            fontSize: "13px",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeSplitRow(idx)}
                          style={{
                            padding: "7px 10px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#FEE2E2",
                            color: "#DC2626",
                            cursor: "pointer",
                            fontSize: "13px",
                            flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      {overdraft && src && (
                        <p style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px", paddingLeft: "2px" }}>
                          ✗ Saldo insuficiente en "{src.name}". Disponible: ${src.balance.toFixed(2)}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Summary row */}
                {splits.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      paddingTop: "10px",
                      borderTop: "1px solid #E2E8F0",
                      fontSize: "12px",
                      color: splitsTotalMismatch ? "#DC2626" : "#64748B",
                    }}
                  >
                    {splitsTotalMismatch ? (
                      <span>
                        ✗ Asignado <strong>${splitsTotal.toFixed(2)}</strong> — debe ser igual al gasto{" "}
                        <strong>${expenseTotal.toFixed(2)}</strong>
                      </span>
                    ) : (
                      <span>
                        Asignado: <strong>${splitsTotal.toFixed(2)}</strong>
                        {remaining > 0.001 && (
                          <span style={{ color: "#94A3B8" }}>
                            {" · "}Restante sin asignar: <strong>${remaining.toFixed(2)}</strong>
                          </span>
                        )}
                        {Math.abs(remaining) <= 0.001 && splits.length > 0 && (
                          <span style={{ color: "#16A34A" }}> ✓</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <p style={{ color: "#DC2626", fontSize: "13px" }}>{error}</p>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    background: !canSubmit ? "#FCA5A5" : "#DC2626",
                    color: "#fff",
                    cursor: !canSubmit ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
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

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        step={step}
        defaultValue={defaultValue}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #D1D5DB",
          fontSize: "14px",
          outline: "none",
        }}
      />
    </div>
  );
}
