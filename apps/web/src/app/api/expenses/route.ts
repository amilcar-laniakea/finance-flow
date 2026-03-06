import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, expenses, incomes, incomeSources, expenseSourceSplits, expenseTypeAmounts } from "@repo/db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

/** Compute available balance for a single income source */
async function getSourceBalance(sourceId: string): Promise<number> {
  const [inc] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
    .from(incomes)
    .where(and(eq(incomes.sourceId, sourceId), isNull(incomes.deletedAt)));

  const [exp] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
    .from(expenses)
    .where(and(eq(expenses.incomeSourceId, sourceId), isNull(expenses.deletedAt)));

  const [spl] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}), 0)` })
    .from(expenseSourceSplits)
    .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
    .where(and(eq(expenseSourceSplits.incomeSourceId, sourceId), isNull(expenses.deletedAt)));

  return (
    parseFloat(inc?.total ?? "0") -
    parseFloat(exp?.total ?? "0") -
    parseFloat(spl?.total ?? "0")
  );
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const householdId = searchParams.get("householdId");
  const period = searchParams.get("period"); // YYYY-MM-DD

  const conditions = [isNull(expenses.deletedAt)];

  if (householdId) {
    conditions.push(eq(expenses.householdId, householdId));
  }

  if (period) {
    const start = new Date(period);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    conditions.push(
      and(
        eq(expenses.period, start),
      ) as ReturnType<typeof eq>
    );
    void end; // period filter handled by exact date match
  }

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.occurredAt))
    .limit(100);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getOrCreateUser(userId);
  if (!dbUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    householdId: string;
    memberId?: string;
    categoryId?: string;
    accountId?: string;
    amountUsd: string;
    amountBs?: string;
    exchangeRate?: string;
    description: string;
    merchant?: string;
    isRecurring?: boolean;
    incomeSourceId?: string;
    period: string;
    sourceSplits?: { incomeSourceId: string; amountUsd: string }[];
    typeAmounts?: { expenseTypeId: string; amount: string }[];
  };

  const expenseAmount = parseFloat(body.amountUsd);

  // --- Multi-source split path ---
  if (body.sourceSplits && body.sourceSplits.length > 0) {
    const splitsTotal = body.sourceSplits.reduce(
      (sum, s) => sum + parseFloat(s.amountUsd),
      0
    );

    // Splits must sum to expense total
    if (Math.abs(splitsTotal - expenseAmount) > 0.01) {
      return NextResponse.json(
        {
          error: `El total de los fondos ($${splitsTotal.toFixed(2)}) no coincide con el monto del gasto ($${expenseAmount.toFixed(2)})`,
        },
        { status: 422 }
      );
    }

    // Validate balance per split
    for (const split of body.sourceSplits) {
      const balance = await getSourceBalance(split.incomeSourceId);
      const splitAmount = parseFloat(split.amountUsd);

      if (splitAmount > balance + 0.001) {
        // Get source name for a friendly error message
        const [src] = await db
          .select({ name: incomeSources.name })
          .from(incomeSources)
          .where(eq(incomeSources.id, split.incomeSourceId))
          .limit(1);

        return NextResponse.json(
          {
            error: `Saldo insuficiente en "${src?.name ?? split.incomeSourceId}". Disponible: $${balance.toFixed(2)}`,
          },
          { status: 422 }
        );
      }
    }

    // All checks passed — insert expense then splits
    const [created] = await db
      .insert(expenses)
      .values({
        householdId: body.householdId,
        memberId: body.memberId,
        categoryId: body.categoryId,
        accountId: body.accountId,
        amountUsd: body.amountUsd,
        amountBs: body.amountBs,
        exchangeRate: body.exchangeRate,
        description: body.description,
        merchant: body.merchant,
        isRecurring: body.isRecurring ?? false,
        incomeSourceId: null,
        period: new Date(body.period),
        createdBy: dbUser.id,
      })
      .returning();

    await db.insert(expenseSourceSplits).values(
      body.sourceSplits.map((s) => ({
        expenseId: created!.id,
        incomeSourceId: s.incomeSourceId,
        amountUsd: s.amountUsd,
      }))
    );

    if (body.typeAmounts && body.typeAmounts.length > 0) {
      await db.insert(expenseTypeAmounts).values(
        body.typeAmounts.map((t) => ({
          expenseId: created!.id,
          expenseTypeId: t.expenseTypeId,
          amount: t.amount,
        }))
      );
    }

    return NextResponse.json(created, { status: 201 });
  }

  // --- Single source path (backward compat) ---
  if (body.incomeSourceId) {
    const balance = await getSourceBalance(body.incomeSourceId);
    if (expenseAmount > balance + 0.001) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Disponible: $${balance.toFixed(2)}` },
        { status: 422 }
      );
    }
  }

  const [created] = await db
    .insert(expenses)
    .values({
      householdId: body.householdId,
      memberId: body.memberId,
      categoryId: body.categoryId,
      accountId: body.accountId,
      amountUsd: body.amountUsd,
      amountBs: body.amountBs,
      exchangeRate: body.exchangeRate,
      description: body.description,
      merchant: body.merchant,
      isRecurring: body.isRecurring ?? false,
      incomeSourceId: body.incomeSourceId || null,
      period: new Date(body.period),
      createdBy: dbUser.id,
    })
    .returning();

  if (body.typeAmounts && body.typeAmounts.length > 0) {
    await db.insert(expenseTypeAmounts).values(
      body.typeAmounts.map((t) => ({
        expenseId: created!.id,
        expenseTypeId: t.expenseTypeId,
        amount: t.amount,
      }))
    );
  }

  return NextResponse.json(created, { status: 201 });
}
