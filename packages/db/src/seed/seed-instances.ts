import { db } from "../db";
import {
  households,
  users,
  incomes,
  expenses,
  incomeSources,
  fundTransfers,
  transfers,
  allocations,
} from "../schema";
import { eq, inArray, isNull } from "drizzle-orm";

async function main() {
  console.log("=== seed-instances: start ===\n");

  // 1. Establish main household
  console.log("1. Establishing main household...");
  let [main] = await db.select().from(households).where(eq(households.isMain, true)).limit(1);

  if (!main) {
    const [existing] = await db.select().from(households).limit(1);
    if (existing) {
      [main] = await db.update(households).set({ isMain: true }).where(eq(households.id, existing.id)).returning();
      console.log(`   Updated existing household ${existing.id} → isMain=true`);
    } else {
      [main] = await db.insert(households).values({ name: "FinanceFlow Principal", isMain: true, isPersonal: false }).returning();
      console.log(`   Created new main household ${main!.id}`);
    }
  } else {
    console.log(`   Main household already exists: ${main.id}`);
  }

  const mainId = main!.id;

  // 2. Backfill householdId on existing records
  console.log("\n2. Backfilling householdId on unscoped records...");

  const [incomeCount] = await db.update(incomes).set({ householdId: mainId }).where(isNull(incomes.householdId)).returning({ id: incomes.id }).then(r => [r.length]);
  console.log(`   incomes: ${incomeCount} rows updated`);

  const [expenseCount] = await db.update(expenses).set({ householdId: mainId }).where(isNull(expenses.householdId)).returning({ id: expenses.id }).then(r => [r.length]);
  console.log(`   expenses: ${expenseCount} rows updated`);

  const [sourceCount] = await db.update(incomeSources).set({ householdId: mainId }).where(isNull(incomeSources.householdId)).returning({ id: incomeSources.id }).then(r => [r.length]);
  console.log(`   income_sources: ${sourceCount} rows updated`);

  const [ftCount] = await db.update(fundTransfers).set({ householdId: mainId }).where(isNull(fundTransfers.householdId)).returning({ id: fundTransfers.id }).then(r => [r.length]);
  console.log(`   fund_transfers: ${ftCount} rows updated`);

  const [tCount] = await db.update(transfers).set({ householdId: mainId }).where(isNull(transfers.householdId)).returning({ id: transfers.id }).then(r => [r.length]);
  console.log(`   transfers: ${tCount} rows updated`);

  const [allocCount] = await db.update(allocations).set({ householdId: mainId }).where(isNull(allocations.householdId)).returning({ id: allocations.id }).then(r => [r.length]);
  console.log(`   allocations: ${allocCount} rows updated`);

  // 3. Migrate role values
  console.log("\n3. Migrating legacy role values...");
  const ownerRows = await db.update(users).set({ role: "admin" }).where(eq(users.role, "owner")).returning({ email: users.email });
  console.log(`   owner → admin: ${ownerRows.map(r => r.email).join(", ") || "none"}`);

  const memberRows = await db.update(users).set({ role: "regular" }).where(eq(users.role, "member")).returning({ email: users.email });
  console.log(`   member → regular: ${memberRows.map(r => r.email).join(", ") || "none"}`);

  const viewerRows = await db.update(users).set({ role: "limited" }).where(eq(users.role, "viewer")).returning({ email: users.email });
  console.log(`   viewer → limited: ${viewerRows.map(r => r.email).join(", ") || "none"}`);

  // 4. Set admin role for specified users
  console.log("\n4. Setting admin role for specified users...");
  const adminEmails = [
    "amilcar.laniakea@gmail.com",
    "fabidyan92@gmail.com",
    "carlineryie2018@gmail.com",
    "carrillomil@gmail.com",
  ];
  const adminRows = await db.update(users).set({ role: "admin" }).where(inArray(users.email, adminEmails)).returning({ email: users.email });
  console.log(`   admin: ${adminRows.map(r => r.email).join(", ") || "none found"}`);

  // 5. Pre-register superadmin
  console.log("\n5. Pre-registering superadmin (arkhalem@gmail.com)...");
  await db
    .insert(users)
    .values({ email: "arkhalem@gmail.com", fullName: "Arkhalem", role: "superadmin" })
    .onConflictDoUpdate({ target: users.email, set: { role: "superadmin" } });
  console.log("   Done.");

  console.log("\n=== seed-instances: complete ===");
}

main().catch(console.error).finally(() => process.exit(0));
