import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { db, users } from "@repo/db";

const VALID_ROLES = ["limited", "regular", "admin", "superadmin"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const role = body?.role;

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning({ id: users.id });
  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
