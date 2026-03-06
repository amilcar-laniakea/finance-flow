import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@repo/db";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as {
    fullName?: string;
    email?: string;
    role?: string;
  };

  // If email is changing, check it's not already taken by another user
  if (body.email) {
    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase().trim()))
      .limit(1);

    if (conflict[0] && conflict[0].id !== id) {
      return NextResponse.json(
        { error: "Ese email ya está en uso por otro usuario" },
        { status: 409 }
      );
    }
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(body.fullName !== undefined ? { fullName: body.fullName.trim() || null } : {}),
      ...(body.email !== undefined ? { email: body.email.toLowerCase().trim() } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
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
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
