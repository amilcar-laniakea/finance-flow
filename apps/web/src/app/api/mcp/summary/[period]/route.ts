import { NextRequest, NextResponse } from "next/server";
import { db, expenses, incomes, allocations } from "@repo/db";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";

function verifyMcpKey(request: NextRequest) {
  return request.headers.get("x-mcp-api-key") === process.env.MCP_SECRET_KEY;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  if (!verifyMcpKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { period } = await params;
  const householdId = request.nextUrl.searchParams.get("householdId");

  const start = new Date(period);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

  const expenseConditions = [
    isNull(expenses.deletedAt),
    gte(expenses.occurredAt, start),
    lte(expenses.occurredAt, end),
  ];
  const incomeConditions = [
    isNull(incomes.deletedAt),
    gte(incomes.occurredAt, start),
    lte(incomes.occurredAt, end),
  ];

  if (householdId) {
    expenseConditions.push(eq(expenses.householdId, householdId));
    incomeConditions.push(eq(incomes.householdId, householdId));
  }

  const [expenseSum] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
    .from(expenses)
    .where(and(...expenseConditions));

  const [incomeSum] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
    .from(incomes)
    .where(and(...incomeConditions));

  const allocationRows = householdId
    ? await db
        .select()
        .from(allocations)
        .where(
          and(
            eq(allocations.householdId, householdId),
            gte(allocations.period, start),
            lte(allocations.period, end)
          )
        )
    : [];

  return NextResponse.json({
    period,
    totalIncome: incomeSum?.total ?? "0",
    totalExpenses: expenseSum?.total ?? "0",
    balance: String(
      parseFloat(incomeSum?.total ?? "0") - parseFloat(expenseSum?.total ?? "0")
    ),
    allocations: allocationRows,
  });
}
