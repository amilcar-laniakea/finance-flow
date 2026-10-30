import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { db, users, households } from "@repo/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [targetUser] = await db.select({ id: users.id, email: users.email, fullName: users.fullName, personalHouseholdId: users.personalHouseholdId })
    .from(users).where(eq(users.id, id));
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (targetUser.personalHouseholdId) {
    return NextResponse.json({ error: "User already has a personal instance" }, { status: 409 });
  }

  const householdName = targetUser.fullName
    ? `${targetUser.fullName} (Personal)`
    : `${targetUser.email} (Personal)`;

  const [newHousehold] = await db.insert(households).values({
    name: householdName,
    ownerId: id,
    isPersonal: true,
    isMain: false,
  }).returning({ id: households.id });

  if (!newHousehold) return NextResponse.json({ error: "Failed to create household" }, { status: 500 });

  await db.update(users)
    .set({ personalHouseholdId: newHousehold.id })
    .where(eq(users.id, id));

  return NextResponse.json({ ok: true, householdId: newHousehold.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.update(users).set({ personalHouseholdId: null }).where(eq(users.id, id));

  return NextResponse.json({ ok: true });
}
