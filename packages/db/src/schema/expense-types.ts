import { pgTable, uuid, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { households } from "./households";

export const expenseTypes = pgTable("expense_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Unique only among global types (householdId IS NULL). Personal types share no code uniqueness.
  code: integer("code").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }),
  // NULL = global (visible to all instances); non-null = personal type for that household only
  householdId: uuid("household_id").references(() => households.id),
}, (table) => [
  uniqueIndex("expense_types_global_code_unique")
    .on(table.code)
    .where(sql`${table.householdId} IS NULL`),
]);
