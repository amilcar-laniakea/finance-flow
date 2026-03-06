import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, incomeSources, incomes, expenses, expenseSourceSplits } from "@repo/db";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return sources with computed balance
  const sources = await db
    .select()
    .from(incomeSources)
    .where(eq(incomeSources.isActive, true))
    .orderBy(incomeSources.createdAt);

  // Compute balance for each source
  const withBalances = await Promise.all(
    sources.map(async (s) => {
      const [inc] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(incomes)
        .where(and(eq(incomes.sourceId, s.id), isNull(incomes.deletedAt)));

      const [exp] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(expenses)
        .where(and(eq(expenses.incomeSourceId, s.id), isNull(expenses.deletedAt)));

      const [spl] = await db
        .select({ total: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}), 0)` })
        .from(expenseSourceSplits)
        .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
        .where(and(eq(expenseSourceSplits.incomeSourceId, s.id), isNull(expenses.deletedAt)));

      const totalSpent =
        parseFloat(exp?.total ?? "0") + parseFloat(spl?.total ?? "0");
      const balance = parseFloat(inc?.total ?? "0") - totalSpent;

      return { ...s, totalReceived: inc?.total ?? "0", totalSpent: totalSpent.toFixed(2), balance };
    })
  );

  return NextResponse.json(withBalances);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    name: string;
    description?: string;
    color?: string;
    householdId?: string;
  };

  if (!body.name) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const [created] = await db
    .insert(incomeSources)
    .values({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      color: body.color ?? "#16A34A",
      householdId: body.householdId ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
