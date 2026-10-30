import { pgTable, uuid, varchar, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { incomeSources } from "./income-sources";
import { users } from "./users";
import { households } from "./households";

export const fundTransfers = pgTable("fund_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 'fund' | 'member' | 'cross-instance'
  transferType: varchar("transfer_type", { length: 20 }).notNull(),
  fromSourceId: uuid("from_source_id").references(() => incomeSources.id),
  toSourceId: uuid("to_source_id").references(() => incomeSources.id),
  fromMemberId: uuid("from_member_id").references(() => users.id),
  toMemberId: uuid("to_member_id").references(() => users.id),
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  period: timestamp("period", { withTimezone: true }).notNull(),
  // Source household (required for scoping; backfilled to main for existing rows)
  householdId: uuid("household_id").references(() => households.id),
  // Destination household — only set for transferType = 'cross-instance'
  toHouseholdId: uuid("to_household_id").references(() => households.id),
  groupId: uuid("group_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
