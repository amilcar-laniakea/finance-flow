import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, expenseTypes } from "@repo/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(expenseTypes).orderBy(expenseTypes.name);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { name: string; color?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 422 });
  }

  // Auto-generate code as MAX + 1
  const [maxRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(code), 0)` })
    .from(expenseTypes);
  const nextCode = (maxRow?.max ?? 0) + 1;

  const [created] = await db
    .insert(expenseTypes)
    .values({ code: nextCode, name: body.name.trim(), color: body.color || null })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
