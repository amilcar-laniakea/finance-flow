"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = { id: string; name: string; color: string | null; balance: number };
type Member = { id: string; name: string; balance: number };

export function AddTransferModal({
  sources,
  members,
}: {
  sources: Source[];
  members: Member[];
}) {
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

  const canSubmit =
    !loading &&
    !!fromId &&
    !!toId &&
    fromId !== toId &&
    amountNum > 0 &&
    !overdraft;

  function handleClose() {
    setOpen(false);
    setFromId("");
    setToId("");
    setAmount("");
    setError("");
    setTransferType("fund");
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
        transferType,
        fromId,
        toId,
        amountUsd: amount,
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#2563EB",
          color: "#fff",
          padding: "8px 20px",
          borderRadius: "6px",
          border: "none",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + Nueva transferencia
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
              maxWidth: "460px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>
              Nueva Transferencia
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Type selector */}
              <div style={{ display: "flex", gap: "0", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
                {(["fund", "member"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTransferType(t); setFromId(""); setToId(""); }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: transferType === t ? "#2563EB" : "#F8FAFC",
                      color: transferType === t ? "#fff" : "#64748B",
                    }}
                  >
                    {t === "fund" ? "Entre fondos" : "Entre miembros"}
                  </button>
                ))}
              </div>

              {/* From */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  {transferType === "fund" ? "Fondo origen" : "Miembro origen"} *
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", background: "#fff" }}
                >
                  <option value="">— Seleccionar —</option>
                  {list
                    .filter((x) => x.id !== toId)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} (disp. ${x.balance.toFixed(2)})
                      </option>
                    ))}
                </select>
                {fromItem && (
                  <span style={{ fontSize: "12px", color: "#64748B" }}>
                    Saldo disponible: <strong>${fromItem.balance.toFixed(2)}</strong>
                  </span>
                )}
              </div>

              {/* Arrow */}
              <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "20px", margin: "-6px 0" }}>↓</div>

              {/* To */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  {transferType === "fund" ? "Fondo destino" : "Miembro destino"} *
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", background: "#fff" }}
                >
                  <option value="">— Seleccionar —</option>
                  {list
                    .filter((x) => x.id !== fromId)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} (saldo ${x.balance.toFixed(2)})
                      </option>
                    ))}
                </select>
                {toItem && (
                  <span style={{ fontSize: "12px", color: "#16A34A" }}>
                    Saldo actual: <strong>${toItem.balance.toFixed(2)}</strong>
                    {amountNum > 0 && (
                      <span style={{ color: "#2563EB" }}>
                        {" → "}${(toItem.balance + amountNum).toFixed(2)}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Amount */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Monto USD *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${overdraft ? "#FCA5A5" : "#D1D5DB"}`,
                    fontSize: "14px",
                  }}
                />
                {overdraft && fromItem && (
                  <span style={{ fontSize: "12px", color: "#DC2626" }}>
                    ✗ Saldo insuficiente. Disponible: ${fromItem.balance.toFixed(2)}
                  </span>
                )}
                {fromItem && toItem && amountNum > 0 && !overdraft && (
                  <div style={{ fontSize: "12px", color: "#64748B", background: "#F0FDF4", padding: "8px 12px", borderRadius: "6px", marginTop: "2px" }}>
                    <strong>{fromItem.name}</strong>: ${fromItem.balance.toFixed(2)} →{" "}
                    <span style={{ color: "#DC2626" }}>${(fromItem.balance - amountNum).toFixed(2)}</span>
                    {"  ·  "}
                    <strong>{toItem.name}</strong>: ${toItem.balance.toFixed(2)} →{" "}
                    <span style={{ color: "#16A34A" }}>${(toItem.balance + amountNum).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Descripción (opcional)</label>
                <input
                  name="description"
                  type="text"
                  placeholder="Ej: Recarga de fondo vacaciones"
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px" }}
                />
              </div>

              {/* Date */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Fecha *</label>
                <input
                  name="period"
                  type="date"
                  defaultValue={today}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px" }}
                />
              </div>

              {error && <p style={{ color: "#DC2626", fontSize: "13px" }}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "14px" }}
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
                    background: !canSubmit ? "#93C5FD" : "#2563EB",
                    color: "#fff",
                    cursor: !canSubmit ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
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
