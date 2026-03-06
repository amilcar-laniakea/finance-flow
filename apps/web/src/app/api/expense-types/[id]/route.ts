import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, expenseTypes } from "@repo/db";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as { name?: string; color?: string };

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 422 });
  }

  const [updated] = await db
    .update(expenseTypes)
    .set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.color !== undefined ? { color: body.color || null } : {}),
    })
    .where(eq(expenseTypes.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(expenseTypes).where(eq(expenseTypes.id, id));
  return NextResponse.json({ success: true });
}
