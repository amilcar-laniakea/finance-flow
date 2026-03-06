"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = { id: string; name: string; color: string | null };
type Member = { id: string; nickname: string | null };
type DistRow = { memberId: string; amountUsd: string };

export function AddIncomeModal({
  sources,
  members,
}: {
  sources: Source[];
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalUsd, setTotalUsd] = useState("");
  const [distributions, setDistributions] = useState<DistRow[]>([]);
  const router = useRouter();

  function addDistRow() {
    setDistributions((prev) => [...prev, { memberId: "", amountUsd: "" }]);
  }

  function removeDistRow(idx: number) {
    setDistributions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDistRow(idx: number, field: keyof DistRow, value: string) {
    setDistributions((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  const totalDistributed = distributions.reduce(
    (sum, d) => sum + (parseFloat(d.amountUsd) || 0),
    0
  );
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
        .map((d) => ({
          memberId: d.memberId || undefined,
          amountUsd: d.amountUsd,
        })),
    };

    const res = await fetch("/api/incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al guardar el ingreso. Intenta de nuevo.");
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#16A34A",
          color: "#fff",
          padding: "8px 20px",
          borderRadius: "6px",
          border: "none",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + Agregar Ingreso
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
              maxWidth: "520px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>
              Agregar Ingreso
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Source selector — required */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  Fondo de ingreso *
                </label>
                {sources.length === 0 ? (
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1px solid #FCA5A5",
                    background: "#FEF2F2",
                    fontSize: "13px",
                    color: "#DC2626",
                  }}>
                    No hay fondos creados. Ve a{" "}
                    <a href="/dashboard/funds" style={{ fontWeight: 600, color: "#DC2626" }}>
                      Fondos
                    </a>{" "}
                    y crea uno primero.
                  </div>
                ) : (
                  <select
                    name="sourceId"
                    required
                    defaultValue=""
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      fontSize: "14px",
                      background: "#fff",
                      color: "#374151",
                    }}
                  >
                    <option value="" disabled>— Seleccionar fondo —</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                    value={totalUsd}
                    onChange={(e) => setTotalUsd(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Monto Bs</label>
                  <input
                    name="amountBs"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Tasa de cambio</label>
                <input
                  name="exchangeRate"
                  type="number"
                  step="0.0001"
                  placeholder="Bs/USD"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Descripción</label>
                <input
                  name="description"
                  placeholder="Opcional"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Fecha *</label>
                <input
                  name="period"
                  type="date"
                  defaultValue={defaultPeriod}
                  required
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Distribution rows */}
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "16px",
                  background: "#F8FAFC",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                    Distribución por miembro
                  </p>
                  <button
                    type="button"
                    onClick={addDistRow}
                    style={{
                      fontSize: "12px",
                      padding: "4px 12px",
                      borderRadius: "4px",
                      border: "1px solid #2563EB",
                      background: "#fff",
                      color: "#2563EB",
                      cursor: "pointer",
                    }}
                  >
                    + Agregar fila
                  </button>
                </div>

                {distributions.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#94A3B8" }}>
                    Sin distribución — el ingreso queda en el fondo del hogar.
                  </p>
                )}

                {distributions.map((row, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <select
                      value={row.memberId}
                      onChange={(e) => updateDistRow(idx, "memberId", e.target.value)}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #D1D5DB",
                        fontSize: "13px",
                        background: "#fff",
                      }}
                    >
                      <option value="">— Fondo hogar —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nickname ?? m.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="USD"
                      value={row.amountUsd}
                      onChange={(e) => updateDistRow(idx, "amountUsd", e.target.value)}
                      style={{
                        width: "90px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #D1D5DB",
                        fontSize: "13px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeDistRow(idx)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#FEE2E2",
                        color: "#DC2626",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {distributions.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: distExceedsTotal ? "#DC2626" : "#64748B" }}>
                    Distribuido: <strong>${totalDistributed.toFixed(2)}</strong>
                    {" · "}
                    {distExceedsTotal ? (
                      <span style={{ color: "#DC2626" }}>
                        ✗ Supera el total del ingreso
                      </span>
                    ) : (
                      <span>
                        Restante (fondo): <strong>${remaining.toFixed(2)}</strong>
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
                  disabled={loading || distExceedsTotal || sources.length === 0}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: "none",
                    background: loading || distExceedsTotal || sources.length === 0 ? "#86EFAC" : "#16A34A",
                    color: "#fff",
                    cursor: loading || distExceedsTotal || sources.length === 0 ? "not-allowed" : "pointer",
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
