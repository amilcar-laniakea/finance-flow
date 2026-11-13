import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env.local" });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Find personal households for fabidyan and carlineryie
  const [fabidyan] = await sql`
    SELECT u.email, u.personal_household_id,
      (SELECT name FROM households WHERE id = u.personal_household_id) AS personal_name
    FROM users u WHERE u.email = 'fabidyan92@gmail.com'
  `;
  const [carlineryie] = await sql`
    SELECT u.email, u.personal_household_id,
      (SELECT name FROM households WHERE id = u.personal_household_id) AS personal_name
    FROM users u WHERE u.email = 'carlineryie2018@gmail.com'
  `;

  console.log("fabidyan personal household:", fabidyan?.personal_name, fabidyan?.personal_household_id);
  console.log("carlineryie personal household:", carlineryie?.personal_name, carlineryie?.personal_household_id);

  if (!fabidyan?.personal_household_id) {
    console.error("fabidyan has no personal household — cannot fix valeriabarahona@valeria.com");
  } else {
    await sql`
      UPDATE users SET home_household_id = ${fabidyan.personal_household_id}
      WHERE email = 'valeriabarahona@valeria.com'
    `;
    console.log("valeriabarahona@valeria.com → fabidyan personal household ✓");
  }

  if (!carlineryie?.personal_household_id) {
    console.error("carlineryie has no personal household — cannot fix alimentos@alimentos.com");
  } else {
    await sql`
      UPDATE users SET home_household_id = ${carlineryie.personal_household_id}
      WHERE email = 'alimentos@alimentos.com'
    `;
    console.log("alimentos@alimentos.com → carlineryie personal household ✓");
  }

  // Verify final state
  const rows = await sql`
    SELECT email, full_name,
      (SELECT name FROM households WHERE id = home_household_id) AS home_name,
      (SELECT is_main FROM households WHERE id = home_household_id) AS is_main_instance
    FROM users WHERE clerk_id IS NULL AND deleted_at IS NULL ORDER BY created_at
  `;
  console.log("\n=== Final state of admin-created users ===");
  for (const r of rows) {
    const tag = r.is_main_instance ? "[PRINCIPAL]" : "[PERSONAL]";
    console.log(`  ${tag} ${r.full_name ?? r.email} (${r.email}) → ${r.home_name}`);
  }
}
main().catch(console.error);
