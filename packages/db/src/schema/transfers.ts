import { pgTable, uuid, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { accounts } from "./accounts";
import { users } from "./users";

export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  fromAccountId: uuid("from_account_id").references(() => accounts.id),
  toAccountId: uuid("to_account_id").references(() => accounts.id),
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  amountBs: decimal("amount_bs", { precision: 18, scale: 4 }),
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 4 }),
  description: text("description"),
  period: timestamp("period", { withTimezone: true }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
