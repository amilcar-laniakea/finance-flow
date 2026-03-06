import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, incomeDistributions, incomes } from "@repo/db";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const income = await db.select().from(incomes).where(eq(incomes.id, id)).limit(1);
  if (!income[0]) return NextResponse.json({ error: "Ingreso no encontrado" }, { status: 404 });

  const body = await request.json() as {
    distributions: { memberId?: string; amountUsd: string; notes?: string }[];
  };

  const totalIncome = parseFloat(income[0].amountUsd);
  const totalDistributed = body.distributions.reduce(
    (sum, d) => sum + parseFloat(d.amountUsd),
    0
  );

  if (totalDistributed > totalIncome + 0.001) {
    return NextResponse.json(
      { error: `El total distribuido ($${totalDistributed.toFixed(2)}) supera el ingreso ($${totalIncome.toFixed(2)})` },
      { status: 422 }
    );
  }

  // Delete existing distributions for this income and replace
  await db.delete(incomeDistributions).where(eq(incomeDistributions.incomeId, id));

  if (body.distributions.length > 0) {
    await db.insert(incomeDistributions).values(
      body.distributions.map((d) => ({
        incomeId: id,
        memberId: d.memberId || null,
        amountUsd: d.amountUsd,
        notes: d.notes || null,
      }))
    );
  }

  const saved = await db
    .select()
    .from(incomeDistributions)
    .where(eq(incomeDistributions.incomeId, id));

  return NextResponse.json(saved);
}
