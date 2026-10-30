import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { db, fundTransfers, incomeSources, households, incomes, expenses, expenseSourceSplits } from "@repo/db";

async function getSourceBalance(sourceId: string, householdId: string): Promise<number> {
  const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomes)
    .where(and(eq(incomes.sourceId, sourceId), isNull(incomes.deletedAt), eq(incomes.householdId, householdId)));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses)
    .where(and(eq(expenses.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [spl] = await db.select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` })
    .from(expenseSourceSplits).innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
    .where(and(eq(expenseSourceSplits.incomeSourceId, sourceId), isNull(expenses.deletedAt), eq(expenses.householdId, householdId)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers)
    .where(and(eq(fundTransfers.toSourceId, sourceId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers)
    .where(and(eq(fundTransfers.fromSourceId, sourceId), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, householdId)));
  return (
    parseFloat(inc?.t ?? "0") -
    parseFloat(exp?.t ?? "0") -
    parseFloat(spl?.t ?? "0") +
    parseFloat(tin?.t ?? "0") -
    parseFloat(tout?.t ?? "0")
  );
}

export async function POST(request: NextRequest) {
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const { fromSourceId, fromHouseholdId, toHouseholdId, amount, description, period } = body ?? {};

  if (!fromSourceId || !fromHouseholdId || !toHouseholdId || !amount || !period) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (fromHouseholdId === toHouseholdId) {
    return NextResponse.json({ error: "Source and destination must be different instances" }, { status: 400 });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Validate source belongs to fromHousehold
  const [source] = await db.select({ id: incomeSources.id, householdId: incomeSources.householdId })
    .from(incomeSources).where(eq(incomeSources.id, fromSourceId));
  if (!source || source.householdId !== fromHouseholdId) {
    return NextResponse.json({ error: "Income source does not belong to the source household" }, { status: 400 });
  }

  // Validate toHousehold exists
  const [toHousehold] = await db.select({ id: households.id }).from(households).where(eq(households.id, toHouseholdId));
  if (!toHousehold) return NextResponse.json({ error: "Destination household not found" }, { status: 404 });

  // Check balance
  const balance = await getSourceBalance(fromSourceId, fromHouseholdId);
  if (balance < amountNum) {
    return NextResponse.json({ error: `Saldo insuficiente en la fuente (disponible: $${balance.toFixed(2)})` }, { status: 422 });
  }

  await db.insert(fundTransfers).values({
    transferType: "cross-instance",
    fromSourceId,
    householdId: fromHouseholdId,
    toHouseholdId,
    amountUsd: String(amountNum),
    description: description ?? null,
    period: new Date(period),
  });

  return NextResponse.json({ ok: true });
}
