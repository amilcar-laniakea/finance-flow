import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, incomeSources, incomes, expenses, expenseSourceSplits, fundTransfers } from "@repo/db";
import { eq, and, isNull, sql, or } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    description?: string;
    color?: string;
  };

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const [updated] = await db
    .update(incomeSources)
    .set({
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description.trim() || null } : {}),
      ...(body.color ? { color: body.color } : {}),
    })
    .where(eq(incomeSources.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Fondo no encontrado" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify source exists and belongs to an accessible household
  const [source] = await db
    .select({ id: incomeSources.id, householdId: incomeSources.householdId })
    .from(incomeSources)
    .where(eq(incomeSources.id, id));

  if (!source) {
    return NextResponse.json({ error: "Fondo no encontrado" }, { status: 404 });
  }

  const accessibleIds = ctx.availableInstances.map((h) => h.id);
  if (!source.householdId || !accessibleIds.includes(source.householdId)) {
    return NextResponse.json({ error: "Sin acceso a este fondo" }, { status: 403 });
  }

  const hid = source.householdId;

  // Calculate current balance — same formula as funds/page.tsx
  const [inc] = await db
    .select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` })
    .from(incomes)
    .where(and(eq(incomes.sourceId, id), isNull(incomes.deletedAt), eq(incomes.householdId, hid)));

  const [exp] = await db
    .select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` })
    .from(expenses)
    .where(and(eq(expenses.incomeSourceId, id), isNull(expenses.deletedAt), eq(expenses.householdId, hid)));

  const [spl] = await db
    .select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` })
    .from(expenseSourceSplits)
    .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
    .where(and(eq(expenseSourceSplits.incomeSourceId, id), isNull(expenses.deletedAt), eq(expenses.householdId, hid)));

  const [tin] = await db
    .select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` })
    .from(fundTransfers)
    .where(and(eq(fundTransfers.toSourceId, id), isNull(fundTransfers.deletedAt), or(eq(fundTransfers.householdId, hid), eq(fundTransfers.toHouseholdId, hid))));

  const [tout] = await db
    .select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` })
    .from(fundTransfers)
    .where(and(eq(fundTransfers.fromSourceId, id), isNull(fundTransfers.deletedAt), eq(fundTransfers.householdId, hid)));

  const balance =
    parseFloat(inc?.t ?? "0") -
    parseFloat(exp?.t ?? "0") -
    parseFloat(spl?.t ?? "0") +
    parseFloat(tin?.t ?? "0") -
    parseFloat(tout?.t ?? "0");

  if (Math.abs(balance) > 0.001) {
    return NextResponse.json(
      { error: `No se puede eliminar: el fondo tiene un saldo de $${balance.toFixed(2)}. Lleva el saldo a $0.00 antes de eliminarlo.` },
      { status: 422 }
    );
  }

  const [deleted] = await db
    .update(incomeSources)
    .set({ isActive: false })
    .where(eq(incomeSources.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Fondo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
