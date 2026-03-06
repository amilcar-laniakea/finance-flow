import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, incomeSources } from "@repo/db";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    description?: string;
    color?: string;
  };

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const [updated] = await db
    .update(incomeSources)
    .set({
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description.trim() || null } : {}),
      ...(body.color ? { color: body.color } : {}),
    })
    .where(eq(incomeSources.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Fondo no encontrado" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [deleted] = await db
    .update(incomeSources)
    .set({ isActive: false })
    .where(eq(incomeSources.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Fondo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
