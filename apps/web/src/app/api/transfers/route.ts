import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, transfers, users } from "@repo/db";
import { eq, and, isNull, desc } from "drizzle-orm";

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

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  if (!dbUser[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json() as {
    householdId: string;
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
      householdId: body.householdId,
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amountUsd: body.amountUsd,
      amountBs: body.amountBs,
      exchangeRate: body.exchangeRate,
      description: body.description,
      period: new Date(body.period),
      createdBy: dbUser[0].id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
