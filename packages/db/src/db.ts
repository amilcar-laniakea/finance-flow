import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./schema";

// Load .env.local for script/seed contexts; no-op when Next.js already set the vars.
dotenv.config({ path: "../../.env.local" });

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
