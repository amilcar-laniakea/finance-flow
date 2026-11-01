import { db, incomeSources, incomes, expenses, expenseSourceSplits, fundTransfers } from "@repo/db";
import { eq, and, isNull, sql, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { AddSourceModal } from "./_components/AddSourceModal";
import { EditSourceModal } from "./_components/EditSourceModal";
import { DeleteSourceButton } from "./_components/DeleteSourceButton";

export default async function FundsPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/");

  const hid = ctx.activeHousehold.id;

  const sources = await db
    .select()
    .from(incomeSources)
    .where(and(eq(incomeSources.isActive, true), eq(incomeSources.householdId, hid)))
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
        .where(and(eq(fundTransfers.toSourceId, s.id), isNull(fundTransfers.deletedAt), or(eq(fundTransfers.householdId, hid), eq(fundTransfers.toHouseholdId, hid))));
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fondos</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {sources.length} fuente{sources.length !== 1 ? "s" : ""} activa{sources.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddSourceModal />
      </div>

      {withBalances.length === 0 && (
        <div className="text-center py-16 px-6 text-muted-foreground">
          <p className="text-base mb-2">No hay fuentes de ingreso aún.</p>
          <p className="text-[13px]">Crea una fuente para comenzar a asignar ingresos y gastos.</p>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {withBalances.map((s) => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="size-3 rounded-full shrink-0 mt-0.5"
                  style={{ background: s.color ?? "#16A34A" }}
                />
                <div>
                  <p className="font-bold text-base text-foreground">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <EditSourceModal source={{ id: s.id, name: s.name, description: s.description, color: s.color }} />
                <DeleteSourceButton id={s.id} name={s.name} balance={s.balance} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <StatRow label="Total recibido" value={fmt(s.totalReceived)} positive />
              <StatRow label="Total gastado" value={fmt(s.totalSpent)} negative />
              <div className="border-t border-border/60 pt-2 mt-1">
                <StatRow
                  label="Disponible"
                  value={fmt(s.balance)}
                  positive={s.balance >= 0}
                  negative={s.balance < 0}
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
  positive,
  negative,
  bold,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  const color = positive
    ? "text-green-600 dark:text-green-400"
    : negative
      ? "text-red-600 dark:text-red-400"
      : "text-foreground";

  return (
    <div className="flex justify-between items-center">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-sm ${bold ? "font-bold" : "font-medium"} ${color}`}>{value}</span>
    </div>
  );
}
