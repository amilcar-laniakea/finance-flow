import { db, fundTransfers } from "@repo/db";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await auth.protect();
  const { id } = await params;
  await db.update(fundTransfers).set({ deletedAt: new Date() }).where(eq(fundTransfers.id, id));
  return NextResponse.json({ ok: true });
}
