import {
  db,
  expenses,
  users,
  incomeSources,
  incomes,
  expenseSourceSplits,
  expenseTypeAmounts,
  expenseTypes,
} from "@repo/db";
import { isNull, desc, eq, and, ne, sql, inArray, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { ExpensesClient } from "./_components/ExpensesClient";

export default async function ExpensesPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/");

  const hid = ctx.activeHousehold.id;

  const [rows, members, rawSources, rawTypes] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(and(isNull(expenses.deletedAt), eq(expenses.householdId, hid)))
      .orderBy(desc(expenses.occurredAt))
      .limit(200),
    db
      .select({ id: users.id, nickname: users.fullName })
      .from(users)
      .where(and(
        isNull(users.deletedAt),
        ne(users.role, "superadmin"),
        ctx.activeHousehold.isPersonal ? eq(users.personalHouseholdId, hid) : undefined,
      ))
      .orderBy(users.fullName),
    db
      .select({
        id: incomeSources.id,
        name: incomeSources.name,
        color: incomeSources.color,
      })
      .from(incomeSources)
      .where(and(eq(incomeSources.isActive, true), eq(incomeSources.householdId, hid)))
      .orderBy(incomeSources.name),
    db.select().from(expenseTypes)
      .where(or(isNull(expenseTypes.householdId), eq(expenseTypes.householdId, hid)))
      .orderBy(expenseTypes.name),
  ]);

  // Compute balance per source
  const sources = await Promise.all(
    rawSources.map(async (s) => {
      const [inc] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(incomes)
        .where(and(eq(incomes.sourceId, s.id), isNull(incomes.deletedAt)));
      const [exp] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(expenses)
        .where(
          and(eq(expenses.incomeSourceId, s.id), isNull(expenses.deletedAt)),
        );
      const [spl] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}), 0)`,
        })
        .from(expenseSourceSplits)
        .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
        .where(
          and(
            eq(expenseSourceSplits.incomeSourceId, s.id),
            isNull(expenses.deletedAt),
          ),
        );
      const balance =
        parseFloat(inc?.total ?? "0") -
        parseFloat(exp?.total ?? "0") -
        parseFloat(spl?.total ?? "0");
      return { ...s, balance };
    }),
  );

  const expIds = rows.map((r) => r.id);

  const [allSplits, allTypeAmounts] = await Promise.all([
    expIds.length > 0
      ? db
          .select({
            expenseId: expenseSourceSplits.expenseId,
            incomeSourceId: expenseSourceSplits.incomeSourceId,
            amountUsd: expenseSourceSplits.amountUsd,
          })
          .from(expenseSourceSplits)
          .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
          .where(
            and(
              inArray(expenseSourceSplits.expenseId, expIds),
              isNull(expenses.deletedAt),
            ),
          )
      : [],
    expIds.length > 0
      ? db
          .select({
            expenseId: expenseTypeAmounts.expenseId,
            expenseTypeId: expenseTypeAmounts.expenseTypeId,
            amount: expenseTypeAmounts.amount,
          })
          .from(expenseTypeAmounts)
          .where(inArray(expenseTypeAmounts.expenseId, expIds))
      : [],
  ]);

  const splitsByExpense: Record<string, { incomeSourceId: string; amountUsd: string }[]> = {};
  for (const s of allSplits) {
    (splitsByExpense[s.expenseId] ??= []).push({ incomeSourceId: s.incomeSourceId, amountUsd: s.amountUsd });
  }

  const typeAmountsByExpense: Record<string, { expenseTypeId: string; amount: string }[]> = {};
  for (const ta of allTypeAmounts) {
    (typeAmountsByExpense[ta.expenseId] ??= []).push({ expenseTypeId: ta.expenseTypeId, amount: ta.amount });
  }

  // Serialize Date fields for client component
  const serializedRows = rows.map((e) => ({
    id: e.id,
    description: e.description,
    merchant: e.merchant,
    memberId: e.memberId,
    incomeSourceId: e.incomeSourceId,
    amountUsd: e.amountUsd,
    amountBs: e.amountBs,
    exchangeRate: e.exchangeRate,
    period: e.period ? new Date(e.period).toISOString() : null,
    occurredAt: e.occurredAt ? new Date(e.occurredAt).toISOString() : null,
  }));

  return (
    <ExpensesClient
      householdId={hid}
      rows={serializedRows}
      members={members}
      sources={sources}
      expenseTypes={rawTypes}
      splitsByExpense={splitsByExpense}
      typeAmountsByExpense={typeAmountsByExpense}
    />
  );
}
