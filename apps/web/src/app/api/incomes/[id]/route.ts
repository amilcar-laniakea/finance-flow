import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, incomes } from "@repo/db";
import { eq, and, isNull } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json() as Partial<{
    amountUsd: string;
    amountBs: string;
    exchangeRate: string;
    description: string;
    source: string;
    sourceId: string | null;
    memberId: string | null;
    period: string;
  }>;

  const { period, ...rest } = body;

  const [updated] = await db
    .update(incomes)
    .set({ ...rest, ...(period ? { period: new Date(period) } : {}), updatedAt: new Date() })
    .where(and(eq(incomes.id, id), isNull(incomes.deletedAt)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .update(incomes)
    .set({ deletedAt: new Date() })
    .where(and(eq(incomes.id, id), isNull(incomes.deletedAt)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
