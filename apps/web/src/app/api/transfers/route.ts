import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, transfers } from "@repo/db";
import { and, isNull, desc, eq } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const householdId = searchParams.get("householdId");

  const conditions = [isNull(transfers.deletedAt)];
  if (householdId) {
    conditions.push(eq(transfers.householdId, householdId));
  }

  const rows = await db
    .select()
    .from(transfers)
    .where(and(...conditions))
    .orderBy(desc(transfers.occurredAt))
    .limit(100);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    fromAccountId: string;
    toAccountId: string;
    amountUsd: string;
    amountBs?: string;
    exchangeRate?: string;
    description?: string;
    period: string;
  };

  const [created] = await db
    .insert(transfers)
    .values({
      householdId: ctx.activeHousehold.id,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amountUsd: body.amountUsd,
      amountBs: body.amountBs,
      exchangeRate: body.exchangeRate,
      description: body.description,
      period: new Date(body.period),
      createdBy: ctx.dbUserId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
