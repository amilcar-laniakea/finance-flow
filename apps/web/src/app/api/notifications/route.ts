import { db, notifications, users } from "@repo/db";
import { eq, isNull, desc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const dbUser = await getOrCreateUser(userId);
  if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const rows = await db.select().from(notifications)
    .where(and(eq(notifications.userId, dbUser.id), isNull(notifications.readAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  return NextResponse.json(rows);
}
