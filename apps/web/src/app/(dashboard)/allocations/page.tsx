import { db, allocations, householdMembers } from "@repo/db";
import { eq, gte, lte, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";

function currentPeriod() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    label: now.toLocaleString("es-VE", { month: "long", year: "numeric" }),
  };
}

export default async function AllocationsPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/");

  const hid = ctx.activeHousehold.id;
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
        eq(allocations.householdId, hid),
        gte(allocations.period, period.start),
        lte(allocations.period, period.end)
      )
    );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Asignaciones</h1>
      <p className="text-muted-foreground text-sm mb-6">{period.label}</p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No hay asignaciones para este período.</p>
        ) : (
          rows.map((a) => {
            const budgeted = parseFloat(a.budgetedUsd);
            const spent = parseFloat(a.spentUsd ?? "0");
            const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
            const overBudget = spent > budgeted;

            return (
              <div key={a.id} className="bg-card border border-border rounded-lg p-5">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[15px] text-foreground">
                    {a.purpose ?? "General"}
                  </span>
                  {a.nickname && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {a.nickname}
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-[13px] text-muted-foreground mb-3">
                  <span className={overBudget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                    ${spent.toFixed(2)} gastado
                  </span>
                  <span>${budgeted.toFixed(2)} presupuestado</span>
                </div>
                <div className="bg-muted rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-[width] duration-300 ${overBudget ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${pct}%` }}
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
