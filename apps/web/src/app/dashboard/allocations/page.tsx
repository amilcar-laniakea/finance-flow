import { db, allocations, householdMembers } from "@repo/db";
import { eq, gte, lte, and } from "drizzle-orm";

function currentPeriod() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    label: now.toLocaleString("es-VE", { month: "long", year: "numeric" }),
  };
}

export default async function AllocationsPage() {
  const period = currentPeriod();

  const rows = await db
    .select({
      id: allocations.id,
      purpose: allocations.purpose,
      budgetedUsd: allocations.budgetedUsd,
      spentUsd: allocations.spentUsd,
      notes: allocations.notes,
      nickname: householdMembers.nickname,
    })
    .from(allocations)
    .leftJoin(householdMembers, eq(allocations.memberId, householdMembers.id))
    .where(
      and(
        gte(allocations.period, period.start),
        lte(allocations.period, period.end)
      )
    );

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
        Asignaciones
      </h1>
      <p style={{ color: "#64748B", marginBottom: "24px" }}>{period.label}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {rows.length === 0 ? (
          <p style={{ color: "#94A3B8" }}>No hay asignaciones para este período.</p>
        ) : (
          rows.map((a) => {
            const budgeted = parseFloat(a.budgetedUsd);
            const spent = parseFloat(a.spentUsd ?? "0");
            const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
            const overBudget = spent > budgeted;

            return (
              <div
                key={a.id}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  padding: "20px",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>
                    {a.purpose ?? "General"}{/* purpose viene de la base de datos, ya en español */}
                  </span>
                  {a.nickname && (
                    <span style={{ fontSize: "12px", color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: "99px" }}>
                      {a.nickname}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#64748B", marginBottom: "12px" }}>
                  <span style={{ color: overBudget ? "#DC2626" : "#16A34A" }}>
                    ${spent.toFixed(2)} gastado
                  </span>
                  <span>${budgeted.toFixed(2)} presupuestado</span>
                </div>
                {/* Progress bar */}
                <div style={{ background: "#F1F5F9", borderRadius: "99px", height: "6px" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      background: overBudget ? "#DC2626" : "#16A34A",
                      borderRadius: "99px",
                      height: "6px",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
