import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, expenses, expenseTypeAmounts } from "@repo/db";
import { eq, and, isNull } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json() as Partial<{
    amountUsd: string;
    amountBs: string;
    exchangeRate: string;
    description: string;
    merchant: string;
    memberId: string | null;
    incomeSourceId: string | null;
    categoryId: string;
    accountId: string;
    period: string;
    typeAmounts: { expenseTypeId: string; amount: string }[];
  }>;

  const { period, typeAmounts, ...rest } = body;

  const [updated] = await db
    .update(expenses)
    .set({ ...rest, ...(period ? { period: new Date(period) } : {}), updatedAt: new Date() })
    .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Replace type amounts: delete old, insert new
  await db.delete(expenseTypeAmounts).where(eq(expenseTypeAmounts.expenseId, id));
  if (typeAmounts && typeAmounts.length > 0) {
    await db.insert(expenseTypeAmounts).values(
      typeAmounts.map((t) => ({
        expenseId: id,
        expenseTypeId: t.expenseTypeId,
        amount: t.amount,
      }))
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .update(expenses)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
