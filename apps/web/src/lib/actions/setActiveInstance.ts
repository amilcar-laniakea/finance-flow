"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getInstanceContext } from "@/lib/getInstanceContext";

export async function setActiveInstance(householdId: string): Promise<void> {
  const ctx = await getInstanceContext();
  if (!ctx) throw new Error("Unauthorized");

  const accessible = ctx.availableInstances.some(h => h.id === householdId);
  if (!accessible) throw new Error("Forbidden: instance not accessible");

  const store = await cookies();
  store.set("activeHouseholdId", householdId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/dashboard", "layout");
}
