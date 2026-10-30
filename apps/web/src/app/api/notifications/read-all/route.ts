import { db, notifications } from "@repo/db";
import { eq, isNull, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

export async function PATCH() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const dbUser = await getOrCreateUser(userId);
  if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, dbUser.id), isNull(notifications.readAt)));

  return NextResponse.json({ ok: true });
}
