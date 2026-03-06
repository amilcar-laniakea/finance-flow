import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(resolve(__dirname, ".env.local"), "utf8");
const env = Object.fromEntries(
  raw.trim().split("\n").filter(l => l.includes("=")).map(l => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  })
);
const sql = neon(env.DATABASE_URL);
await sql`DROP TABLE IF EXISTS expense_type_amounts CASCADE`;
await sql`DELETE FROM expense_types`;
await sql`CREATE TABLE expense_type_amounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id),
  expense_type_id UUID NOT NULL REFERENCES expense_types(id),
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`;
console.log("Done — expense_type_amounts recreated with FK, expense_types cleared");
