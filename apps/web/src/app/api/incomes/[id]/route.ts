import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, incomes, incomeDistributions } from "@repo/db";
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
    distributions: { memberId: string; amountUsd: string }[];
  }>;

  // Validate distributions if provided
  if (body.distributions !== undefined) {
    const validDists = body.distributions.filter((d) => d.memberId && parseFloat(d.amountUsd) > 0);
    if (validDists.length === 0) {
      return NextResponse.json({ error: "Debes asignar el ingreso a al menos un miembro." }, { status: 400 });
    }
    if (body.amountUsd) {
      const totalDist = validDists.reduce((sum, d) => sum + parseFloat(d.amountUsd), 0);
      if (Math.abs(totalDist - parseFloat(body.amountUsd)) > 0.01) {
        return NextResponse.json(
          { error: `La suma de las distribuciones ($${totalDist.toFixed(2)}) debe igualar el monto del ingreso ($${parseFloat(body.amountUsd).toFixed(2)}).` },
          { status: 400 }
        );
      }
    }
  }

  const { period, distributions, ...rest } = body;

  const [updated] = await db
    .update(incomes)
    .set({ ...rest, ...(period ? { period: new Date(period) } : {}), updatedAt: new Date() })
    .where(and(eq(incomes.id, id), isNull(incomes.deletedAt)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Replace distributions
  if (distributions !== undefined) {
    await db.delete(incomeDistributions).where(eq(incomeDistributions.incomeId, id));
    const validDists = distributions.filter((d) => d.memberId && parseFloat(d.amountUsd) > 0);
    if (validDists.length > 0) {
      await db.insert(incomeDistributions).values(
        validDists.map((d) => ({
          incomeId: id,
          memberId: d.memberId,
          amountUsd: d.amountUsd,
        }))
      );
    }
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
