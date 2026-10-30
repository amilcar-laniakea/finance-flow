import { NextResponse } from "next/server";
import { db, binanceAudits, binanceCorrections } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { applyBinanceAdjustment } from "@/lib/applyBinanceAdjustment";

export async function POST(req: Request) {
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "admin" && ctx.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!ctx.activeHousehold.isMain) {
    return NextResponse.json({ error: "Solo disponible para la instancia principal" }, { status: 403 });
  }

  const body = await req.json() as {
    auditId: string;
    fundId: string;
    memberId: string;
    adjustmentUsd: string;
    tag?: string;
    notes?: string;
  };

  const { auditId, fundId, memberId, adjustmentUsd, tag, notes } = body;
  if (!auditId || !fundId || !memberId || !adjustmentUsd) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const [audit] = await db
    .select()
    .from(binanceAudits)
    .where(and(eq(binanceAudits.id, auditId), eq(binanceAudits.householdId, ctx.activeHousehold.id)));

  if (!audit) {
    return NextResponse.json({ error: "Auditoría no encontrada" }, { status: 404 });
  }

  const adjNum = parseFloat(adjustmentUsd);

  const [correction] = await db.insert(binanceCorrections).values({
    auditId,
    fundId,
    memberId,
    adjustmentUsd: String(adjNum),
    tag: tag ?? null,
    notes: notes ?? null,
    status: audit.status,
    isAutomatic: "false",
    correctedBy: ctx.dbUserId,
  }).returning();

  // Apply the adjustment to real fund/member balances
  await applyBinanceAdjustment({
    householdId: ctx.activeHousehold.id,
    fundId,
    memberId,
    adjustmentUsd: adjNum,
    tag,
  });

  return NextResponse.json(correction, { status: 201 });
}
