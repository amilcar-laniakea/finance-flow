import { db, fundTransfers, incomeSources, users, incomes, expenses, expenseSourceSplits, incomeDistributions, notifications, households } from "@repo/db";
import { eq, isNull, sql, and, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getInstanceContext } from "@/lib/getInstanceContext";

async function fundBalance(sourceId: string, householdId: string): Promise<number> {
  const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomes).where(and(eq(incomes.sourceId, sourceId), isNull(incomes.deletedAt)));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.incomeSourceId, sourceId), isNull(expenses.deletedAt)));
  const [spl] = await db.select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` }).from(expenseSourceSplits).innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id)).where(and(eq(expenseSourceSplits.incomeSourceId, sourceId), isNull(expenses.deletedAt)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toSourceId, sourceId), isNull(fundTransfers.deletedAt), or(eq(fundTransfers.householdId, householdId), eq(fundTransfers.toHouseholdId, householdId))));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromSourceId, sourceId), isNull(fundTransfers.deletedAt)));
  return parseFloat(inc?.t ?? "0") - parseFloat(exp?.t ?? "0") - parseFloat(spl?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

async function memberBalance(memberId: string): Promise<number> {
  const [dist] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomeDistributions).where(eq(incomeDistributions.memberId, memberId));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.memberId, memberId), isNull(expenses.deletedAt)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toMemberId, memberId), isNull(fundTransfers.deletedAt)));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromMemberId, memberId), isNull(fundTransfers.deletedAt)));
  return parseFloat(dist?.t ?? "0") - parseFloat(exp?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

export async function GET() {
  const rows = await db
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
      createdAt: fundTransfers.createdAt,
    })
    .from(fundTransfers)
    .where(isNull(fundTransfers.deletedAt))
    .orderBy(fundTransfers.period);

  const allSources = await db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color }).from(incomeSources);
  const allUsers = await db.select({ id: users.id, name: users.fullName }).from(users);
  const srcMap = Object.fromEntries(allSources.map((s) => [s.id, s]));
  const usrMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  return NextResponse.json(rows.map((r) => ({
    ...r,
    fromSourceName: r.fromSourceId ? srcMap[r.fromSourceId]?.name : null,
    toSourceName: r.toSourceId ? srcMap[r.toSourceId]?.name : null,
    fromSourceColor: r.fromSourceId ? srcMap[r.fromSourceId]?.color : null,
    toSourceColor: r.toSourceId ? srcMap[r.toSourceId]?.color : null,
    fromMemberName: r.fromMemberId ? usrMap[r.fromMemberId]?.name : null,
    toMemberName: r.toMemberId ? usrMap[r.toMemberId]?.name : null,
  })));
}

export async function POST(req: Request) {
  await auth.protect();
  const body = await req.json() as {
    transferType: "fund" | "member" | "cross-instance";
    fromId?: string;
    toId?: string;
    fromSourceId?: string;
    toSourceId?: string;
    amountUsd: string;
    description?: string;
    period?: string;
  };

  const { transferType, amountUsd, description, period } = body;
  if (!transferType || !amountUsd) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const amount = parseFloat(amountUsd);
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  // ── Cross-instance transfer ─────────────────────────────────────────
  if (transferType === "cross-instance") {
    const ctx = await getInstanceContext();
    if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (ctx.role !== "admin" && ctx.role !== "superadmin") {
      return NextResponse.json({ error: "Sin permisos para transferencias entre instancias" }, { status: 403 });
    }

    const { fromSourceId, toSourceId } = body;
    if (!fromSourceId || !toSourceId) {
      return NextResponse.json({ error: "Se requieren fromSourceId y toSourceId" }, { status: 400 });
    }
    if (fromSourceId === toSourceId) {
      return NextResponse.json({ error: "El origen y destino deben ser diferentes" }, { status: 400 });
    }

    const [fromSource, toSource] = await Promise.all([
      db.select({ id: incomeSources.id, name: incomeSources.name, householdId: incomeSources.householdId }).from(incomeSources).where(eq(incomeSources.id, fromSourceId)).then(r => r[0]),
      db.select({ id: incomeSources.id, name: incomeSources.name, householdId: incomeSources.householdId }).from(incomeSources).where(eq(incomeSources.id, toSourceId)).then(r => r[0]),
    ]);

    if (!fromSource?.householdId || !toSource?.householdId) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }
    if (fromSource.householdId === toSource.householdId) {
      return NextResponse.json({ error: "Las fuentes deben pertenecer a instancias diferentes" }, { status: 400 });
    }

    const fromHouseholdId = fromSource.householdId;
    const toHouseholdId = toSource.householdId;

    const bal = await fundBalance(fromSourceId, fromHouseholdId);
    if (amount > bal + 0.001) {
      return NextResponse.json({ error: `Saldo insuficiente en el fondo origen. Disponible: $${bal.toFixed(2)}` }, { status: 422 });
    }

    const [created] = await db.insert(fundTransfers).values({
      transferType: "cross-instance",
      fromSourceId,
      toSourceId,
      amountUsd,
      description: description || null,
      period: period ? new Date(period) : new Date(),
      householdId: fromHouseholdId,
      toHouseholdId,
    }).returning();

    // Notify the owner of the destination household
    const [toHousehold] = await db.select({ id: households.id, name: households.name, ownerId: households.ownerId })
      .from(households).where(eq(households.id, toHouseholdId));
    const [fromHousehold] = await db.select({ name: households.name }).from(households).where(eq(households.id, fromHouseholdId));

    if (toHousehold?.ownerId) {
      await db.insert(notifications).values({
        userId: toHousehold.ownerId,
        type: "cross-instance-transfer",
        title: "Transferencia recibida",
        body: `$${parseFloat(amountUsd).toFixed(2)} de ${fromHousehold?.name ?? "otra instancia"} · ${fromSource.name}`,
        data: {
          transferId: created?.id,
          amountUsd,
          fromHouseholdName: fromHousehold?.name ?? null,
          fromSourceName: fromSource.name,
          toSourceName: toSource.name,
        },
      });
    }

    return NextResponse.json(created, { status: 201 });
  }

  // ── fund / member transfer ──────────────────────────────────────────
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { fromId, toId } = body;
  if (!fromId || !toId) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (fromId === toId) {
    return NextResponse.json({ error: "El origen y destino deben ser diferentes" }, { status: 400 });
  }

  if (transferType === "fund") {
    const bal = await fundBalance(fromId, ctx.activeHousehold.id);
    if (amount > bal + 0.001) {
      return NextResponse.json({ error: `Saldo insuficiente en el fondo. Disponible: $${bal.toFixed(2)}` }, { status: 422 });
    }
  } else {
    const bal = await memberBalance(fromId);
    if (amount > bal + 0.001) {
      return NextResponse.json({ error: `Saldo insuficiente del miembro. Disponible: $${bal.toFixed(2)}` }, { status: 422 });
    }
  }

  const [created] = await db.insert(fundTransfers).values({
    transferType,
    fromSourceId: transferType === "fund" ? fromId : null,
    toSourceId: transferType === "fund" ? toId : null,
    fromMemberId: transferType === "member" ? fromId : null,
    toMemberId: transferType === "member" ? toId : null,
    amountUsd,
    description: description || null,
    period: period ? new Date(period) : new Date(),
    householdId: ctx.activeHousehold.id,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
