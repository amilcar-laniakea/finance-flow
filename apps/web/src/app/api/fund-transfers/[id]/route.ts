import { db, fundTransfers } from "@repo/db";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await auth.protect();
  const { id } = await params;

  const [row] = await db
    .select({ id: fundTransfers.id, groupId: fundTransfers.groupId })
    .from(fundTransfers)
    .where(eq(fundTransfers.id, id));

  if (!row) return NextResponse.json({ ok: true });

  if (row.groupId) {
    // Soft-delete all rows in the same group
    await db
      .update(fundTransfers)
      .set({ deletedAt: new Date() })
      .where(and(eq(fundTransfers.groupId, row.groupId), isNull(fundTransfers.deletedAt)));
  } else {
    await db
      .update(fundTransfers)
      .set({ deletedAt: new Date() })
      .where(eq(fundTransfers.id, id));
  }

  return NextResponse.json({ ok: true });
}
