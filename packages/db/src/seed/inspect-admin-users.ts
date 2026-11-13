import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env.local" });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Show all admin-created users and their activity per household
  const rows = await sql`
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.home_household_id,
      (SELECT name FROM households WHERE id = u.home_household_id) AS home_name,
      (
        SELECT json_agg(json_build_object('household', h.name, 'is_main', h.is_main, 'is_personal', h.is_personal, 'expenses', cnt))
        FROM (
          SELECT household_id, COUNT(*) as cnt FROM expenses WHERE member_id = u.id AND deleted_at IS NULL GROUP BY household_id
        ) e JOIN households h ON h.id = e.household_id
      ) AS expense_activity,
      (
        SELECT json_agg(json_build_object('household', h.name, 'is_main', h.is_main, 'is_personal', h.is_personal))
        FROM household_members hm JOIN households h ON h.id = hm.household_id
        WHERE hm.user_id = u.id
      ) AS hm_entries,
      (
        SELECT json_agg(json_build_object('household', h.name, 'is_main', h.is_main))
        FROM income_distributions id2
        JOIN incomes i ON id2.income_id = i.id AND i.deleted_at IS NULL
        JOIN households h ON h.id = i.household_id
        WHERE id2.member_id = u.id
      ) AS dist_activity
    FROM users u
    WHERE u.clerk_id IS NULL AND u.deleted_at IS NULL
    ORDER BY u.created_at
  `;

  console.log("\n=== Admin-created users ===\n");
  for (const r of rows) {
    console.log(`Name: ${r.full_name ?? "(no name)"}`);
    console.log(`Email: ${r.email}`);
    console.log(`ID: ${r.id}`);
    console.log(`Current homeHouseholdId → ${r.home_name ?? "NULL"}`);
    console.log(`Expenses:`, JSON.stringify(r.expense_activity));
    console.log(`HM entries:`, JSON.stringify(r.hm_entries));
    console.log(`Dist activity:`, JSON.stringify(r.dist_activity));
    console.log("---");
  }
}
main().catch(console.error);
