import { NextRequest, NextResponse } from "next/server";
import { db, allocations } from "@repo/db";
import { eq, and, gte, lte } from "drizzle-orm";

function verifyMcpKey(request: NextRequest) {
  return request.headers.get("x-mcp-api-key") === process.env.MCP_SECRET_KEY;
}

export async function GET(request: NextRequest) {
  if (!verifyMcpKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const householdId = searchParams.get("householdId");
  const period = searchParams.get("period");

  if (!householdId || !period) {
    return NextResponse.json(
      { error: "householdId and period are required" },
      { status: 400 }
    );
  }

  const start = new Date(period);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

  const rows = await db
    .select()
    .from(allocations)
    .where(
      and(
        eq(allocations.householdId, householdId),
        gte(allocations.period, start),
        lte(allocations.period, end)
      )
    );

  return NextResponse.json(rows);
}
