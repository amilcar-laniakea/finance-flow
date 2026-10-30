import { NextResponse } from "next/server";
import { db, binanceAudits, binanceCorrections, incomeSources, users } from "@repo/db";
import { eq, desc } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { runBinanceAudit } from "@/lib/runBinanceAudit";

export async function GET() {
  if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
    return NextResponse.json({ error: "Binance no configurado" }, { status: 503 });
  }
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "admin" && ctx.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!ctx.activeHousehold.isMain) {
    return NextResponse.json({ error: "Solo disponible para la instancia principal" }, { status: 403 });
  }

  const audits = await db
    .select()
    .from(binanceAudits)
    .where(eq(binanceAudits.householdId, ctx.activeHousehold.id))
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
    .where(eq(binanceAudits.householdId, ctx.activeHousehold.id))
    .orderBy(desc(binanceCorrections.correctedAt));

  return NextResponse.json({ audits, corrections });
}

export async function POST() {
  if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
    return NextResponse.json({ error: "Binance no configurado" }, { status: 503 });
  }
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "admin" && ctx.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!ctx.activeHousehold.isMain) {
    return NextResponse.json({ error: "Solo disponible para la instancia principal" }, { status: 403 });
  }

  const result = await runBinanceAudit("manual");
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, auditId: result.auditId, status: result.status, discrepancyUsd: result.discrepancyUsd });
}
