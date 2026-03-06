import { pgTable, uuid, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { incomes } from "./incomes";
import { users } from "./users";

export const incomeDistributions = pgTable("income_distributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  incomeId: uuid("income_id").references(() => incomes.id).notNull(),
  memberId: uuid("member_id").references(() => users.id), // NULL = household pool
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
