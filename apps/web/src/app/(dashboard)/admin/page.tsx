import { redirect } from "next/navigation";
import { asc, eq, isNull } from "drizzle-orm";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { db, users, households, incomeSources } from "@repo/db";
import { AdminPageClient } from "./_components/AdminPageClient";

export default async function AdminPage() {
  const ctx = await getInstanceContext();
  if (!ctx || ctx.role !== "superadmin") redirect("/");

  const [allUsers, allHouseholds] = await Promise.all([
    db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      personalHouseholdId: users.personalHouseholdId,
      clerkId: users.clerkId,
    }).from(users).where(isNull(users.deletedAt)).orderBy(asc(users.email)),
    db.select({
      id: households.id,
      name: households.name,
      isMain: households.isMain,
      isPersonal: households.isPersonal,
      ownerId: households.ownerId,
    }).from(households).orderBy(asc(households.name)),
  ]);

  const mainHousehold = allHouseholds.find((h) => h.isMain) ?? null;

  const mainSources = mainHousehold
    ? await db.select({
        id: incomeSources.id,
        name: incomeSources.name,
        color: incomeSources.color,
      }).from(incomeSources).where(eq(incomeSources.householdId, mainHousehold.id))
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Administración</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Panel exclusivo de superadmin — {allUsers.length} usuario{allUsers.length !== 1 ? "s" : ""}
        </p>
      </div>
      <AdminPageClient
        users={allUsers}
        households={allHouseholds}
        mainSources={mainSources}
        mainHouseholdId={mainHousehold?.id ?? null}
      />
    </div>
  );
}
