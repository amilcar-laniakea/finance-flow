import { clerkClient } from "@clerk/nextjs/server";
import { db, users } from "@repo/db";
import { eq } from "drizzle-orm";

/**
 * Returns the DB user for the given Clerk userId, or null if the user
 * has not been pre-registered (access is denied).
 *
 * Resolution order:
 * 1. Find by clerk_id (fast path — already linked)
 * 2. Find by email (pre-registered user) → link clerk_id automatically
 * 3. Return null — user is not authorized
 */
export async function getOrCreateUser(clerkUserId: string) {
  // 1. Already linked
  const byClerkId = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (byClerkId[0]) return byClerkId[0];

  // Fetch details from Clerk to check pre-registration by email
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  // 2. Pre-registered user found by email → link clerk_id
  if (email) {
    const byEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (byEmail[0]) {
      const [linked] = await db
        .update(users)
        .set({
          clerkId: clerkUserId,
          avatarUrl: clerkUser.imageUrl ?? byEmail[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, byEmail[0].id))
        .returning();

      if (!linked) throw new Error("Failed to link user");
      return linked;
    }
  }

  // 3. Not pre-registered — access denied
  return null;
}
