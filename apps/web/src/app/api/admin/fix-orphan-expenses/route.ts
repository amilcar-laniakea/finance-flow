import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, expenses, expenseSourceSplits, incomeSources } from "@repo/db";
import { isNull, eq } from "drizzle-orm";

// One-time fix: assign householdId to expenses that were saved with null householdId
// Safe to call multiple times (idempotent)
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find all expenses with null householdId
  const orphans = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(isNull(expenses.householdId));

  if (orphans.length === 0) {
    return NextResponse.json({ fixed: 0, message: "No hay gastos huérfanos" });
  }

  let fixed = 0;
  const errors: string[] = [];

  for (const orphan of orphans) {
    // Find householdId via split → incomeSource
    const [split] = await db
      .select({ householdId: incomeSources.householdId })
      .from(expenseSourceSplits)
      .innerJoin(incomeSources, eq(expenseSourceSplits.incomeSourceId, incomeSources.id))
      .where(eq(expenseSourceSplits.expenseId, orphan.id))
      .limit(1);

    if (split?.householdId) {
      await db
        .update(expenses)
        .set({ householdId: split.householdId })
        .where(eq(expenses.id, orphan.id));
      fixed++;
    } else {
      errors.push(`Expense ${orphan.id}: no split found, skipped`);
    }
  }

  return NextResponse.json({ fixed, skipped: errors.length, errors });
}
