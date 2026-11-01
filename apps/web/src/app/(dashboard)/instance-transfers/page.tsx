import { db, incomeSources, fundTransfers, households, incomes, expenses, expenseSourceSplits, users, incomeDistributions } from "@repo/db";
import { eq, and, isNull, or, inArray, desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { InstanceTransfersClient } from "./_components/InstanceTransfersClient";

async function getFundBalance(sourceId: string, householdId: string): Promise<number> {
  const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomes).where(and(eq(incomes.sourceId, sourceId), isNull(incomes.deletedAt), eq(incomes.householdId, householdId)));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [spl] = await db.select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` }).from(expenseSourceSplits).innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id)).where(and(eq(expenseSourceSplits.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toSourceId, sourceId), isNull(fundTransfers.deletedAt), or(eq(fundTransfers.householdId, householdId), eq(fundTransfers.toHouseholdId, householdId))));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromSourceId, sourceId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  return parseFloat(inc?.t ?? "0") - parseFloat(exp?.t ?? "0") - parseFloat(spl?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

async function getMemberBalance(memberId: string, householdId: string): Promise<number> {
  const [dist] = await db.select({ t: sql<string>`COALESCE(SUM(${incomeDistributions.amountUsd}),0)` }).from(incomeDistributions).innerJoin(incomes, and(eq(incomeDistributions.incomeId, incomes.id), isNull(incomes.deletedAt), eq(incomes.householdId, householdId))).where(eq(incomeDistributions.memberId, memberId));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.memberId, memberId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toMemberId, memberId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromMemberId, memberId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  return parseFloat(dist?.t ?? "0") - parseFloat(exp?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

export default async function InstanceTransfersPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/");
  if (ctx.role !== "admin" && ctx.role !== "superadmin") redirect("/");

  const hid = ctx.activeHousehold.id;
  const accessibleIds = ctx.availableInstances.map((h) => h.id);

  const [rawCurrentSources, allHouseholds, rawMembers] = await Promise.all([
    db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
      .from(incomeSources)
      .where(and(eq(incomeSources.isActive, true), eq(incomeSources.householdId, hid)))
      .orderBy(incomeSources.name),
    db.select({ id: households.id, name: households.name, isMain: households.isMain, isPersonal: households.isPersonal })
      .from(households)
      .where(inArray(households.id, accessibleIds)),
    db.select({ id: users.id, name: users.fullName })
      .from(users)
      .where(ctx.activeHousehold.isPersonal ? eq(users.personalHouseholdId, hid) : undefined)
      .orderBy(users.fullName),
  ]);

  const [currentSources, currentMembers, otherHouseholds] = await Promise.all([
    Promise.all(rawCurrentSources.map(async (s) => ({
      ...s,
      balanceUsd: await getFundBalance(s.id, hid),
    }))),
    Promise.all(rawMembers.map(async (u) => ({
      id: u.id,
      name: u.name ?? u.id.slice(0, 8),
      balanceUsd: await getMemberBalance(u.id, hid),
    }))),
    Promise.all(
      allHouseholds
        .filter((h) => h.id !== hid)
        .map(async (h) => {
          const rawSources = await db
            .select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
            .from(incomeSources)
            .where(and(eq(incomeSources.isActive, true), eq(incomeSources.householdId, h.id)))
            .orderBy(incomeSources.name);

          const sources = await Promise.all(
            rawSources.map(async (s) => ({
              ...s,
              balanceUsd: await getFundBalance(s.id, h.id),
            }))
          );

          return { ...h, sources };
        })
    ),
  ]);

  const householdMap = Object.fromEntries(allHouseholds.map((h) => [h.id, h.name]));

  const rawRows = await db
    .select({
      id: fundTransfers.id,
      fromSourceId: fundTransfers.fromSourceId,
      toSourceId: fundTransfers.toSourceId,
      householdId: fundTransfers.householdId,
      toHouseholdId: fundTransfers.toHouseholdId,
      amountUsd: fundTransfers.amountUsd,
      description: fundTransfers.description,
      period: fundTransfers.period,
    })
    .from(fundTransfers)
    .where(
      and(
        isNull(fundTransfers.deletedAt),
        eq(fundTransfers.transferType, "cross-instance"),
        or(
          inArray(fundTransfers.householdId, accessibleIds),
          inArray(fundTransfers.toHouseholdId, accessibleIds),
        ),
      )
    )
    .orderBy(desc(fundTransfers.period));

  const allSourceIds = [...new Set(rawRows.flatMap((r) => [r.fromSourceId, r.toSourceId].filter(Boolean) as string[]))];
  const sourcesInfo = allSourceIds.length > 0
    ? await db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
        .from(incomeSources).where(inArray(incomeSources.id, allSourceIds))
    : [];
  const sourceMap = Object.fromEntries(sourcesInfo.map((s) => [s.id, s]));

  const rows = rawRows.map((r) => ({
    id: r.id,
    fromSourceId: r.fromSourceId,
    toSourceId: r.toSourceId,
    fromSourceName: r.fromSourceId ? (sourceMap[r.fromSourceId]?.name ?? null) : null,
    fromSourceColor: r.fromSourceId ? (sourceMap[r.fromSourceId]?.color ?? null) : null,
    toSourceName: r.toSourceId ? (sourceMap[r.toSourceId]?.name ?? null) : null,
    toSourceColor: r.toSourceId ? (sourceMap[r.toSourceId]?.color ?? null) : null,
    fromHouseholdName: r.householdId ? (householdMap[r.householdId] ?? null) : null,
    toHouseholdName: r.toHouseholdId ? (householdMap[r.toHouseholdId] ?? null) : null,
    amountUsd: r.amountUsd,
    description: r.description,
    period: r.period ? new Date(r.period).toISOString() : null,
  }));

  const currentHousehold = allHouseholds.find((h) => h.id === hid);
  const currentHouseholdName = currentHousehold?.isMain ? "Principal" : (currentHousehold?.name ?? "Esta instancia");

  return (
    <InstanceTransfersClient
      currentSources={currentSources}
      currentMembers={currentMembers}
      currentHouseholdId={hid}
      currentHouseholdName={currentHouseholdName}
      otherHouseholds={otherHouseholds}
      rows={rows}
    />
  );
}
