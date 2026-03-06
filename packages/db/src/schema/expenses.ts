import {
  pgTable,
  uuid,
  varchar,
  decimal,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { categories } from "./categories";
import { accounts } from "./accounts";
import { users } from "./users";
import { incomeSources } from "./income-sources";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  memberId: uuid("member_id").references(() => users.id),
  categoryId: uuid("category_id").references(() => categories.id),
  accountId: uuid("account_id").references(() => accounts.id),
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  amountBs: decimal("amount_bs", { precision: 18, scale: 4 }),
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 4 }),
  incomeSourceId: uuid("income_source_id").references(() => incomeSources.id),
  description: text("description").notNull(),
  merchant: varchar("merchant", { length: 255 }),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: varchar("recurrence_rule", { length: 100 }),
  period: timestamp("period", { withTimezone: true }).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  receiptUrl: text("receipt_url"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
