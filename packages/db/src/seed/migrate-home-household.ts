import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("1. Adding home_household_id column if not exists...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS home_household_id uuid`;
  console.log("   Done.");

  console.log("2. Backfill: users with expenses ONLY in personal instances...");
  await sql`
    UPDATE users u
    SET home_household_id = (
      SELECT e.household_id
      FROM expenses e
      JOIN households h ON e.household_id = h.id
      WHERE e.member_id = u.id AND e.deleted_at IS NULL AND h.is_personal = true
      GROUP BY e.household_id ORDER BY COUNT(*) DESC LIMIT 1
    )
    WHERE u.clerk_id IS NULL
      AND u.deleted_at IS NULL
      AND u.home_household_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM expenses e JOIN households h ON e.household_id = h.id
        WHERE e.member_id = u.id AND e.deleted_at IS NULL AND h.is_main = true
      )
  `;
  console.log("   Done.");

  console.log("3. Backfill: users with expenses in main household...");
  await sql`
    UPDATE users u
    SET home_household_id = (SELECT id FROM households WHERE is_main = true LIMIT 1)
    WHERE u.clerk_id IS NULL
      AND u.deleted_at IS NULL
      AND u.home_household_id IS NULL
      AND EXISTS (
        SELECT 1 FROM expenses e JOIN households h ON e.household_id = h.id
        WHERE e.member_id = u.id AND e.deleted_at IS NULL AND h.is_main = true
      )
  `;
  console.log("   Done.");

  console.log("4. Backfill: remaining admin-created users (no expenses) → main...");
  await sql`
    UPDATE users u
    SET home_household_id = (SELECT id FROM households WHERE is_main = true LIMIT 1)
    WHERE u.clerk_id IS NULL AND u.deleted_at IS NULL AND u.home_household_id IS NULL
  `;
  console.log("   Done.");

  console.log("\nVerifying...");
  const rows = await sql`
    SELECT email, full_name, clerk_id IS NOT NULL as has_clerk, home_household_id,
      (SELECT name FROM households WHERE id = home_household_id) as home_name
    FROM users WHERE deleted_at IS NULL ORDER BY created_at
  `;
  for (const r of rows) {
    const marker = r.has_clerk ? "(Clerk)" : "(admin-created)";
    console.log(`  ${r.full_name ?? r.email} ${marker} → ${r.home_name ?? "NULL (Clerk user)"}`);
  }
  console.log("\nMigration complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
