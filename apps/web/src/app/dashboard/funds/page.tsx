import { db, incomeSources, incomes, expenses, expenseSourceSplits, fundTransfers } from "@repo/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { AddSourceModal } from "./_components/AddSourceModal";
import { EditSourceModal } from "./_components/EditSourceModal";
import { DeleteSourceButton } from "./_components/DeleteSourceButton";

export default async function FundsPage() {
  const sources = await db
    .select()
    .from(incomeSources)
    .where(eq(incomeSources.isActive, true))
    .orderBy(incomeSources.createdAt);

  const withBalances = await Promise.all(
    sources.map(async (s) => {
      const [inc] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(incomes)
        .where(and(eq(incomes.sourceId, s.id), isNull(incomes.deletedAt)));

      const [exp] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(expenses)
        .where(and(eq(expenses.incomeSourceId, s.id), isNull(expenses.deletedAt)));

      const [spl] = await db
        .select({ total: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}), 0)` })
        .from(expenseSourceSplits)
        .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
        .where(and(eq(expenseSourceSplits.incomeSourceId, s.id), isNull(expenses.deletedAt)));

      const [tin] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(fundTransfers)
        .where(and(eq(fundTransfers.toSourceId, s.id), isNull(fundTransfers.deletedAt)));
      const [tout] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(fundTransfers)
        .where(and(eq(fundTransfers.fromSourceId, s.id), isNull(fundTransfers.deletedAt)));

      const totalReceived = parseFloat(inc?.total ?? "0");
      const totalSpent = parseFloat(exp?.total ?? "0") + parseFloat(spl?.total ?? "0");
      const transfersIn = parseFloat(tin?.total ?? "0");
      const transfersOut = parseFloat(tout?.total ?? "0");
      const balance = totalReceived - totalSpent + transfersIn - transfersOut;

      return { ...s, totalReceived, totalSpent, balance };
    })
  );

  const fmt = (n: number) =>
    n.toLocaleString("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Fondos</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {sources.length} fuente{sources.length !== 1 ? "s" : ""} activa{sources.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddSourceModal />
      </div>

      {withBalances.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "64px 24px",
            color: "#94A3B8",
          }}
        >
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No hay fuentes de ingreso aún.</p>
          <p style={{ fontSize: "13px" }}>
            Crea una fuente para comenzar a asignar ingresos y gastos.
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {withBalances.map((s) => (
          <div
            key={s.id}
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: s.color ?? "#16A34A",
                    flexShrink: 0,
                    marginTop: "3px",
                  }}
                />
                <div>
                  <p style={{ fontWeight: 700, fontSize: "16px" }}>{s.name}</p>
                  {s.description && (
                    <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                      {s.description}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                <EditSourceModal source={{ id: s.id, name: s.name, description: s.description, color: s.color }} />
                <DeleteSourceButton id={s.id} name={s.name} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <StatRow label="Total recibido" value={fmt(s.totalReceived)} color="#16A34A" />
              <StatRow label="Total gastado" value={fmt(s.totalSpent)} color="#DC2626" />
              <div
                style={{
                  borderTop: "1px solid #F1F5F9",
                  paddingTop: "8px",
                  marginTop: "4px",
                }}
              >
                <StatRow
                  label="Disponible"
                  value={fmt(s.balance)}
                  color={s.balance >= 0 ? "#1D4ED8" : "#DC2626"}
                  bold
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "13px", color: "#64748B" }}>{label}</span>
      <span style={{ fontSize: "14px", fontWeight: bold ? 700 : 500, color }}>{value}</span>
    </div>
  );
}
