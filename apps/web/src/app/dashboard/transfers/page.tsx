import { db, fundTransfers, incomeSources, users, incomes, expenses, expenseSourceSplits, incomeDistributions } from "@repo/db";
import { eq, isNull, ne, sql, and, desc, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { TransfersClient } from "./_components/TransfersClient";

async function getFundBalance(sourceId: string, householdId: string) {
  const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomes).where(and(eq(incomes.sourceId, sourceId), isNull(incomes.deletedAt), eq(incomes.householdId, householdId)));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [spl] = await db.select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` }).from(expenseSourceSplits).innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id)).where(and(eq(expenseSourceSplits.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toSourceId, sourceId), isNull(fundTransfers.deletedAt), or(eq(fundTransfers.householdId, householdId), eq(fundTransfers.toHouseholdId, householdId))));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromSourceId, sourceId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  return parseFloat(inc?.t ?? "0") - parseFloat(exp?.t ?? "0") - parseFloat(spl?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

async function getMemberBalance(memberId: string, householdId: string) {
  const [dist] = await db.select({ t: sql<string>`COALESCE(SUM(${incomeDistributions.amountUsd}),0)` }).from(incomeDistributions).innerJoin(incomes, and(eq(incomeDistributions.incomeId, incomes.id), isNull(incomes.deletedAt), eq(incomes.householdId, householdId))).where(eq(incomeDistributions.memberId, memberId));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.memberId, memberId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toMemberId, memberId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromMemberId, memberId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  return parseFloat(dist?.t ?? "0") - parseFloat(exp?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

export default async function TransfersPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/dashboard");

  const hid = ctx.activeHousehold.id;

  const [rawSources, rawUsers] = await Promise.all([
    db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
      .from(incomeSources).where(and(eq(incomeSources.isActive, true), eq(incomeSources.householdId, hid))).orderBy(incomeSources.name),
    db.select({ id: users.id, name: users.fullName }).from(users)
      .where(and(
        isNull(users.deletedAt),
        ne(users.role, "superadmin"),
        ctx.activeHousehold.isPersonal ? eq(users.personalHouseholdId, hid) : undefined,
      ))
      .orderBy(users.fullName),
  ]);

  const [sources, members] = await Promise.all([
    Promise.all(rawSources.map(async (s) => ({ ...s, balance: await getFundBalance(s.id, hid) }))),
    Promise.all(rawUsers.map(async (u) => ({ id: u.id, name: u.name ?? u.id.slice(0, 8), balance: await getMemberBalance(u.id, hid) }))),
  ]);

  const rawRows = await db
    .select({
      id: fundTransfers.id,
      transferType: fundTransfers.transferType,
      fromSourceId: fundTransfers.fromSourceId,
      toSourceId: fundTransfers.toSourceId,
      fromMemberId: fundTransfers.fromMemberId,
      toMemberId: fundTransfers.toMemberId,
      amountUsd: fundTransfers.amountUsd,
      description: fundTransfers.description,
      period: fundTransfers.period,
      groupId: fundTransfers.groupId,
    })
    .from(fundTransfers)
    .where(and(isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, hid)))
    .orderBy(desc(fundTransfers.period));

  const rows = rawRows.map((r) => ({
    ...r,
    period: r.period ? new Date(r.period).toISOString() : null,
    groupId: r.groupId ?? null,
  }));

  return <TransfersClient sources={sources} members={members} rows={rows} />;
}
