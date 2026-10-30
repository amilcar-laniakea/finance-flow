import { db, incomeSources, incomes, expenses, expenseSourceSplits, fundTransfers } from "@repo/db";
import { eq, and, isNull, or, sql } from "drizzle-orm";

async function getFundBalance(sourceId: string, householdId: string): Promise<number> {
  const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomes).where(and(eq(incomes.sourceId, sourceId), isNull(incomes.deletedAt), eq(incomes.householdId, householdId)));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [spl] = await db.select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` }).from(expenseSourceSplits).innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id)).where(and(eq(expenseSourceSplits.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toSourceId, sourceId), isNull(fundTransfers.deletedAt), or(eq(fundTransfers.householdId, householdId), eq(fundTransfers.toHouseholdId, householdId))));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromSourceId, sourceId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  return parseFloat(inc?.t ?? "0") - parseFloat(exp?.t ?? "0") - parseFloat(spl?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

export async function getAppFundTotal(householdId: string): Promise<number> {
  const sources = await db
    .select({ id: incomeSources.id })
    .from(incomeSources)
    .where(and(eq(incomeSources.householdId, householdId), eq(incomeSources.isActive, true)));

  const balances = await Promise.all(sources.map((s) => getFundBalance(s.id, householdId)));
  return balances.reduce((sum, b) => sum + b, 0);
}
