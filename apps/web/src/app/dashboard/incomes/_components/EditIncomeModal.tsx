"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = { id: string; name: string; color: string | null };
type Member = { id: string; nickname: string | null };

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
}: {
  income: Income;
  sources: Source[];
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const defaultPeriod = income.period
    ? new Date(income.period).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const sourceId = fd.get("sourceId") as string;
    const memberId = fd.get("memberId") as string;

    const body = {
      sourceId: sourceId || null,
      memberId: memberId || null,
      amountUsd: fd.get("amountUsd") as string,
      amountBs: (fd.get("amountBs") as string) || null,
      exchangeRate: (fd.get("exchangeRate") as string) || null,
      description: (fd.get("description") as string) || null,
      period: fd.get("period") as string,
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar ingreso"
        style={{
          padding: "4px 10px",
          borderRadius: "4px",
          border: "none",
          background: "transparent",
          color: "#94A3B8",
          cursor: "pointer",
          fontSize: "13px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#2563EB")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
      >
        ✎
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
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>
              Editar Ingreso
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              <SelectField label="Fondo de ingreso *" name="sourceId" defaultValue={income.sourceId ?? ""}>
                <option value="" disabled>— Seleccionar fondo —</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </SelectField>

              <SelectField label="Miembro" name="memberId" defaultValue={income.memberId ?? ""}>
                <option value="">— Sin asignar —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.nickname ?? m.id}</option>
                ))}
              </SelectField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Field label="Monto USD *" name="amountUsd" type="number" step="0.01" defaultValue={income.amountUsd} required />
                <Field label="Monto Bs" name="amountBs" type="number" step="0.01" defaultValue={income.amountBs ?? ""} />
              </div>

              <Field label="Tasa de cambio" name="exchangeRate" type="number" step="0.0001" defaultValue={income.exchangeRate ?? ""} />
              <Field label="Descripción" name="description" defaultValue={income.description ?? ""} />
              <Field label="Fecha *" name="period" type="date" defaultValue={defaultPeriod} required />

              {error && <p style={{ color: "#DC2626", fontSize: "13px" }}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ padding: "8px 20px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: "14px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: loading ? "#93C5FD" : "#2563EB", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 600 }}
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

function Field({
  label, name, type = "text", defaultValue, required, step,
}: {
  label: string; name: string; type?: string; defaultValue?: string; required?: boolean; step?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</label>
      <input
        name={name} type={type} defaultValue={defaultValue} required={required} step={step}
        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", outline: "none" }}
      />
    </div>
  );
}

function SelectField({
  label, name, defaultValue, children,
}: {
  label: string; name: string; defaultValue?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</label>
      <select
        name={name} defaultValue={defaultValue}
        style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "14px", background: "#fff" }}
      >
        {children}
      </select>
    </div>
  );
}
