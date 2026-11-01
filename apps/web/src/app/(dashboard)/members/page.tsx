import { db, users, incomeDistributions, expenses, incomes, incomeSources, fundTransfers } from "@repo/db";
import { eq, isNull, ne, sql, and, or, inArray, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { MembersClient } from "./_components/MembersClient";

export default async function MembersPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/");

  const hid = ctx.activeHousehold.id;

  // Personal instance: only show the owner (future: also their sub-members when that exists)
  // Main instance: show all users
  const rows = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role, clerkId: users.clerkId })
    .from(users)
    .where(and(
      isNull(users.deletedAt),
      ne(users.role, "superadmin"),
      ctx.activeHousehold.isPersonal ? eq(users.personalHouseholdId, hid) : undefined,
    ))
    .orderBy(users.createdAt);

  const userIds = rows.map((r) => r.id);

  const memberBalances = await Promise.all(
    rows.map(async (u) => {
      const [dist] = await db
        .select({ total: sql<string>`COALESCE(SUM(${incomeDistributions.amountUsd}), 0)` })
        .from(incomeDistributions)
        .innerJoin(incomes, and(eq(incomeDistributions.incomeId, incomes.id), isNull(incomes.deletedAt), eq(incomes.householdId, hid)))
        .where(eq(incomeDistributions.memberId, u.id));

      const [exp] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(expenses)
        .where(and(eq(expenses.memberId, u.id), isNull(expenses.deletedAt), eq(expenses.householdId, hid)));

      const [tin] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(fundTransfers)
        .where(and(eq(fundTransfers.toMemberId, u.id), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, hid)));
      const [tout] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(fundTransfers)
        .where(and(eq(fundTransfers.fromMemberId, u.id), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, hid)));

      const totalReceived = parseFloat(dist?.total ?? "0");
      const totalSpent = parseFloat(exp?.total ?? "0");
      const transfersIn = parseFloat(tin?.total ?? "0");
      const transfersOut = parseFloat(tout?.total ?? "0");
      const balance = totalReceived - totalSpent + transfersIn - transfersOut;

      return { userId: u.id, fullName: u.fullName, totalReceived, totalSpent, balance };
    }),
  );

  const allMemberExpenses = userIds.length > 0
    ? await db
        .select({
          id: expenses.id,
          memberId: expenses.memberId,
          description: expenses.description,
          merchant: expenses.merchant,
          amountUsd: expenses.amountUsd,
          amountBs: expenses.amountBs,
          occurredAt: expenses.occurredAt,
        })
        .from(expenses)
        .where(and(inArray(expenses.memberId, userIds), isNull(expenses.deletedAt), eq(expenses.householdId, hid)))
        .orderBy(desc(expenses.occurredAt))
    : [];

  const allDistributions = userIds.length > 0
    ? await db
        .select({
          id: incomeDistributions.id,
          memberId: incomeDistributions.memberId,
          amountUsd: incomeDistributions.amountUsd,
          incomeDescription: incomes.description,
          incomePeriod: incomes.period,
          sourceName: incomeSources.name,
        })
        .from(incomeDistributions)
        .innerJoin(incomes, and(eq(incomeDistributions.incomeId, incomes.id), isNull(incomes.deletedAt), eq(incomes.householdId, hid)))
        .leftJoin(incomeSources, eq(incomes.sourceId, incomeSources.id))
        .where(inArray(incomeDistributions.memberId, userIds))
        .orderBy(desc(incomes.period))
    : [];

  const allMemberTransfers = userIds.length > 0
    ? await db
        .select({
          id: fundTransfers.id,
          fromMemberId: fundTransfers.fromMemberId,
          toMemberId: fundTransfers.toMemberId,
          amountUsd: fundTransfers.amountUsd,
          description: fundTransfers.description,
          period: fundTransfers.period,
        })
        .from(fundTransfers)
        .where(
          and(
            isNull(fundTransfers.deletedAt),
            eq(fundTransfers.householdId, hid),
            or(
              inArray(fundTransfers.fromMemberId, userIds),
              inArray(fundTransfers.toMemberId, userIds),
            ),
          ),
        )
        .orderBy(desc(fundTransfers.period))
    : [];

  const userNameMap = Object.fromEntries(rows.map((r) => [r.id, r.fullName ?? r.email]));

  // Convert to serialized Records with ISO string dates
  const expensesByMember: Record<string, { id: string; description: string; merchant: string | null; amountUsd: string; amountBs: string | null; occurredAt: string | null }[]> = {};
  for (const e of allMemberExpenses) {
    if (!e.memberId) continue;
    (expensesByMember[e.memberId] ??= []).push({
      id: e.id,
      description: e.description,
      merchant: e.merchant,
      amountUsd: e.amountUsd,
      amountBs: e.amountBs,
      occurredAt: e.occurredAt ? new Date(e.occurredAt).toISOString() : null,
    });
  }

  const distributionsByMember: Record<string, { id: string; amountUsd: string; incomeDescription: string | null; incomePeriod: string | null; sourceName: string | null }[]> = {};
  for (const d of allDistributions) {
    if (!d.memberId) continue;
    (distributionsByMember[d.memberId] ??= []).push({
      id: d.id,
      amountUsd: d.amountUsd,
      incomeDescription: d.incomeDescription,
      incomePeriod: d.incomePeriod ? new Date(d.incomePeriod).toISOString() : null,
      sourceName: d.sourceName,
    });
  }

  const transfersByMember: Record<string, { id: string; direction: "in" | "out"; amountUsd: string; description: string | null; period: string | null; counterpartName: string | null }[]> = {};
  for (const t of allMemberTransfers) {
    const push = (id: string, direction: "in" | "out", counterpartId: string | null) => {
      (transfersByMember[id] ??= []).push({
        id: t.id,
        direction,
        amountUsd: t.amountUsd,
        description: t.description,
        period: t.period ? new Date(t.period).toISOString() : null,
        counterpartName: counterpartId ? (userNameMap[counterpartId] ?? null) : null,
      });
    };
    if (t.fromMemberId && userIds.includes(t.fromMemberId)) push(t.fromMemberId, "out", t.toMemberId);
    if (t.toMemberId && userIds.includes(t.toMemberId)) push(t.toMemberId, "in", t.fromMemberId);
  }

  return (
    <MembersClient
      users={rows}
      balances={memberBalances}
      expensesByMember={expensesByMember}
      distributionsByMember={distributionsByMember}
      transfersByMember={transfersByMember}
    />
  );
}
