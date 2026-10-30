import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { db, households, users } from "@repo/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "./getOrCreateUser";

export type InstanceRole = "limited" | "regular" | "admin" | "superadmin";

export type HouseholdSummary = {
  id: string;
  name: string;
  isMain: boolean;
  isPersonal: boolean;
  ownerId: string | null;
};

export type SerializedInstanceContext = {
  role: InstanceRole;
  activeHouseholdId: string;
  activeHouseholdName: string;
  isMainInstance: boolean;
  isPersonalInstance: boolean;
  canRead: boolean;
  canWrite: boolean;
  availableInstances: Array<{ id: string; name: string; isMain: boolean; isPersonal: boolean }>;
};

export type InstanceContext = {
  dbUserId: string;
  role: InstanceRole;
  activeHousehold: HouseholdSummary;
  canRead: boolean;
  canWrite: boolean;
  availableInstances: HouseholdSummary[];
  serialized: SerializedInstanceContext;
};

function canWrite(role: InstanceRole, h: HouseholdSummary, personalHouseholdId: string | null): boolean {
  if (role === "superadmin") return true;
  if (h.isPersonal && h.id === personalHouseholdId) return true;
  if (h.isMain && role === "admin") return true;
  return false;
}

function canRead(role: InstanceRole, h: HouseholdSummary, personalHouseholdId: string | null): boolean {
  if (role === "superadmin") return true;
  if (h.isPersonal && h.id === personalHouseholdId) return true;
  if (h.isMain && (role === "admin" || role === "regular")) return true;
  return false;
}

export async function getInstanceContext(): Promise<InstanceContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const dbUser = await getOrCreateUser(userId);
  if (!dbUser) return null;

  const role = (dbUser.role ?? "regular") as InstanceRole;
  const personalHouseholdId = dbUser.personalHouseholdId ?? null;

  const allHouseholds = await db.select({
    id: households.id,
    name: households.name,
    isMain: households.isMain,
    isPersonal: households.isPersonal,
    ownerId: households.ownerId,
  }).from(households);

  const mainHousehold = allHouseholds.find(h => h.isMain) ?? null;
  const personalHousehold = personalHouseholdId
    ? allHouseholds.find(h => h.id === personalHouseholdId) ?? null
    : null;

  const available: HouseholdSummary[] = [];

  if (role !== "limited" && mainHousehold) available.push(mainHousehold);
  if (personalHousehold) available.push(personalHousehold);
  if (role === "superadmin") {
    for (const h of allHouseholds) {
      if (!available.find(a => a.id === h.id)) available.push(h);
    }
  }

  if (available.length === 0) return null;

  const cookieStore = await cookies();
  const requestedId = cookieStore.get("activeHouseholdId")?.value;
  let active = available.find(h => h.id === requestedId);

  if (!active) {
    active = role === "limited" && personalHousehold
      ? personalHousehold
      : (mainHousehold ?? available[0]!);
  }

  const write = canWrite(role, active, personalHouseholdId);
  const read = canRead(role, active, personalHouseholdId);

  const serialized: SerializedInstanceContext = {
    role,
    canRead: read,
    canWrite: write,
    activeHouseholdId: active.id,
    activeHouseholdName: active.name,
    isMainInstance: active.isMain,
    isPersonalInstance: active.isPersonal,
    availableInstances: available.map(({ id, name, isMain, isPersonal }) => ({ id, name, isMain, isPersonal })),
  };

  return {
    dbUserId: dbUser.id,
    role,
    activeHousehold: active,
    canRead: read,
    canWrite: write,
    availableInstances: available,
    serialized,
  };
}
