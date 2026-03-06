import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@repo/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      clerkId: users.clerkId,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    email: string;
    fullName?: string;
    role?: string;
  };

  if (!body.email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  // Check if email already registered
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase().trim()))
    .limit(1);

  if (existing[0]) {
    return NextResponse.json(
      { error: "Este email ya está registrado" },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(users)
    .values({
      email: body.email.toLowerCase().trim(),
      fullName: body.fullName?.trim() || null,
      role: body.role ?? "member",
      // clerkId is intentionally null — user hasn't signed up via Clerk yet
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
