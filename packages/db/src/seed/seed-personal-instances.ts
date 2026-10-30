import { db } from "../db";
import { households, users } from "../schema";
import { eq, inArray } from "drizzle-orm";

const TARGET_EMAILS = [
  "amilcar.laniakea@gmail.com",
  "fabidyan92@gmail.com",
  "carlineryie2018@gmail.com",
  "carrillomil@gmail.com",
];

async function main() {
  console.log("=== seed-personal-instances: start ===\n");

  const targets = await db.select({
    id: users.id,
    email: users.email,
    fullName: users.fullName,
    personalHouseholdId: users.personalHouseholdId,
  }).from(users).where(inArray(users.email, TARGET_EMAILS));

  console.log(`Found ${targets.length} of ${TARGET_EMAILS.length} target users\n`);

  for (const u of targets) {
    if (u.personalHouseholdId) {
      console.log(`  SKIP  ${u.email} — already has instance ${u.personalHouseholdId}`);
      continue;
    }

    const householdName = u.fullName
      ? `${u.fullName} (Personal)`
      : `${u.email} (Personal)`;

    const [newHousehold] = await db.insert(households).values({
      name: householdName,
      ownerId: u.id,
      isPersonal: true,
      isMain: false,
    }).returning({ id: households.id });

    if (!newHousehold) {
      console.log(`  ERROR ${u.email} — failed to create household`);
      continue;
    }

    await db.update(users)
      .set({ personalHouseholdId: newHousehold.id })
      .where(eq(users.id, u.id));

    console.log(`  OK    ${u.email} → household ${newHousehold.id}  (${householdName})`);
  }

  const missing = TARGET_EMAILS.filter((e) => !targets.find((u) => u.email === e));
  if (missing.length > 0) {
    console.log(`\n  NOTE: these emails were not found in the DB (not registered yet):`);
    for (const e of missing) console.log(`        ${e}`);
  }

  console.log("\n=== seed-personal-instances: done ===");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
