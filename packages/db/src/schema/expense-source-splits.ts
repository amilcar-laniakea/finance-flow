import { pgTable, uuid, decimal, timestamp } from "drizzle-orm/pg-core";
import { expenses } from "./expenses";
import { incomeSources } from "./income-sources";

export const expenseSourceSplits = pgTable("expense_source_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id").references(() => expenses.id).notNull(),
  incomeSourceId: uuid("income_source_id").references(() => incomeSources.id).notNull(),
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
