import { NextRequest, NextResponse } from "next/server";
import { db, expenses, users } from "@repo/db";
import { eq } from "drizzle-orm";

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
    description: string;
    merchant?: string;
    categoryId?: string;
    memberNickname?: string;
    period?: string;
  };

  let memberId: string | undefined;
  if (body.memberNickname) {
    const member = await db
      .select()
      .from(users)
      .where(eq(users.fullName, body.memberNickname))
      .limit(1);
    memberId = member[0]?.id;
  }

  const [created] = await db
    .insert(expenses)
    .values({
      householdId: body.householdId,
      amountUsd: body.amountUsd,
      description: body.description,
      merchant: body.merchant,
      categoryId: body.categoryId,
      memberId,
      period: body.period ? new Date(body.period) : new Date(),
      metadata: { source: "n8n_agent" },
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
