import { NextRequest, NextResponse } from "next/server";
import { db, incomes } from "@repo/db";

function verifyMcpKey(request: NextRequest) {
  return request.headers.get("x-mcp-api-key") === process.env.MCP_SECRET_KEY;
}

export async function POST(request: NextRequest) {
  if (!verifyMcpKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    householdId: string;
    amountUsd: string;
    source: string;
    description?: string;
    period?: string;
  };

  const [created] = await db
    .insert(incomes)
    .values({
      householdId: body.householdId,
      amountUsd: body.amountUsd,
      source: body.source,
      description: body.description,
      period: body.period ? new Date(body.period) : new Date(),
      metadata: { source: "n8n_agent" },
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
