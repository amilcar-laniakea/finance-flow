import { db, incomes, incomeSources, users, incomeDistributions } from "@repo/db";
import { isNull, desc, eq, inArray, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { IncomesClient } from "./_components/IncomesClient";

export default async function IncomesPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/dashboard");

  const hid = ctx.activeHousehold.id;

  const [rows, sources, members] = await Promise.all([
    db.select().from(incomes).where(and(isNull(incomes.deletedAt), eq(incomes.householdId, hid))).orderBy(desc(incomes.occurredAt)).limit(200),
    db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
      .from(incomeSources).where(and(eq(incomeSources.isActive, true), eq(incomeSources.householdId, hid))).orderBy(incomeSources.name),
    db.select({ id: users.id, nickname: users.fullName }).from(users).orderBy(users.fullName),
  ]);

  const incomeIds = rows.map((r) => r.id);
  const allDists = incomeIds.length > 0
    ? await db
        .select({
          incomeId: incomeDistributions.incomeId,
          memberId: incomeDistributions.memberId,
          amountUsd: incomeDistributions.amountUsd,
          fullName: users.fullName,
        })
        .from(incomeDistributions)
        .leftJoin(users, eq(incomeDistributions.memberId, users.id))
        .where(inArray(incomeDistributions.incomeId, incomeIds))
    : [];

  const distsByIncome: Record<string, { memberId: string | null; fullName: string | null; amountUsd: string }[]> = {};
  for (const d of allDists) {
    (distsByIncome[d.incomeId] ??= []).push({ memberId: d.memberId, fullName: d.fullName, amountUsd: d.amountUsd });
  }

  const serializedRows = rows.map((i) => ({
    id: i.id,
    sourceId: i.sourceId,
    source: i.source,
    description: i.description,
    memberId: i.memberId,
    amountUsd: i.amountUsd,
    amountBs: i.amountBs,
    exchangeRate: i.exchangeRate,
    period: i.period ? new Date(i.period).toISOString() : null,
    occurredAt: i.occurredAt ? new Date(i.occurredAt).toISOString() : null,
  }));

  return (
    <IncomesClient
      rows={serializedRows}
      sources={sources}
      members={members}
      distsByIncome={distsByIncome}
    />
  );
}
