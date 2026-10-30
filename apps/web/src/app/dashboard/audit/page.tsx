import { redirect } from "next/navigation";
import { db, binanceAudits, binanceCorrections, incomeSources, users } from "@repo/db";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { AuditClient } from "./_components/AuditClient";

export default async function AuditPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/dashboard");
  if (ctx.role !== "admin" && ctx.role !== "superadmin") redirect("/dashboard");
  if (!ctx.activeHousehold.isMain) redirect("/dashboard");

  const hid = ctx.activeHousehold.id;

  const audits = await db
    .select()
    .from(binanceAudits)
    .where(eq(binanceAudits.householdId, hid))
    .orderBy(desc(binanceAudits.createdAt))
    .limit(50);

  const corrections = await db
    .select({
      id: binanceCorrections.id,
      auditId: binanceCorrections.auditId,
      fundId: binanceCorrections.fundId,
      memberId: binanceCorrections.memberId,
      adjustmentUsd: binanceCorrections.adjustmentUsd,
      tag: binanceCorrections.tag,
      notes: binanceCorrections.notes,
      status: binanceCorrections.status,
      isAutomatic: binanceCorrections.isAutomatic,
      correctedAt: binanceCorrections.correctedAt,
      fundName: incomeSources.name,
      memberName: users.fullName,
    })
    .from(binanceCorrections)
    .innerJoin(binanceAudits, eq(binanceCorrections.auditId, binanceAudits.id))
    .innerJoin(incomeSources, eq(binanceCorrections.fundId, incomeSources.id))
    .innerJoin(users, eq(binanceCorrections.memberId, users.id))
    .where(eq(binanceAudits.householdId, hid))
    .orderBy(desc(binanceCorrections.correctedAt));

  const activeFunds = await db
    .select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
    .from(incomeSources)
    .where(and(eq(incomeSources.householdId, hid), eq(incomeSources.isActive, true)))
    .orderBy(incomeSources.name);

  const members = await db
    .select({ id: users.id, name: users.fullName, email: users.email })
    .from(users)
    .where(and(isNull(users.deletedAt), or(eq(users.role, "admin"), eq(users.role, "superadmin"))))
    .orderBy(users.fullName);

  const serializedAudits = audits.map((a) => ({
    ...a,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
  }));

  const serializedCorrections = corrections.map((c) => ({
    ...c,
    correctedAt: c.correctedAt ? new Date(c.correctedAt).toISOString() : null,
  }));

  return (
    <AuditClient
      audits={serializedAudits}
      corrections={serializedCorrections}
      activeFunds={activeFunds}
      members={members}
    />
  );
}
