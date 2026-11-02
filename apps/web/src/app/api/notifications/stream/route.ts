import { db, notifications } from "@repo/db";
import { eq, isNull, desc, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const dbUser = await getOrCreateUser(userId);
  if (!dbUser) return new Response("Not found", { status: 404 });

  const dbUserId = dbUser.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPayload: string | null = null;

      const sendInitial = async () => {
        try {
          const rows = await db.select().from(notifications)
            .where(and(eq(notifications.userId, dbUserId), isNull(notifications.readAt)))
            .orderBy(desc(notifications.createdAt))
            .limit(20);
          const payload = JSON.stringify(rows);
          lastPayload = payload;
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // Send empty payload so connection stays alive; poll will retry
          controller.enqueue(encoder.encode(`data: []\n\n`));
        }
      };

      await sendInitial();

      const interval = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(interval);
          controller.close();
          return;
        }
        try {
          const rows = await db.select().from(notifications)
            .where(and(eq(notifications.userId, dbUserId), isNull(notifications.readAt)))
            .orderBy(desc(notifications.createdAt))
            .limit(20);
          const payload = JSON.stringify(rows);
          if (payload !== lastPayload) {
            lastPayload = payload;
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 3000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
