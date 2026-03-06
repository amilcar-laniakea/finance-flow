import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, incomes, incomeDistributions } from "@repo/db";
import { and, isNull, desc, eq } from "drizzle-orm";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const householdId = searchParams.get("householdId");

  const conditions = [isNull(incomes.deletedAt)];
  if (householdId) {
    conditions.push(eq(incomes.householdId, householdId));
  }

  const rows = await db
    .select()
    .from(incomes)
    .where(and(...conditions))
    .orderBy(desc(incomes.occurredAt))
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
    description?: string;
    source?: string;
    sourceId?: string;
    period: string;
    distributions?: { memberId?: string; amountUsd: string; notes?: string }[];
  };

  const [created] = await db
    .insert(incomes)
    .values({
      householdId: body.householdId,
      memberId: body.memberId,
      categoryId: body.categoryId,
      accountId: body.accountId,
      amountUsd: body.amountUsd,
      amountBs: body.amountBs,
      exchangeRate: body.exchangeRate,
      description: body.description,
      source: body.source,
      sourceId: body.sourceId || null,
      period: new Date(body.period),
      createdBy: dbUser.id,
    })
    .returning();

  if (body.distributions && body.distributions.length > 0) {
    await db.insert(incomeDistributions).values(
      body.distributions.map((d) => ({
        incomeId: created!.id,
        memberId: d.memberId || null,
        amountUsd: d.amountUsd,
        notes: d.notes || null,
      }))
    );
  }

  return NextResponse.json(created, { status: 201 });
}
