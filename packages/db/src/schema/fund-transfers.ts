import { pgTable, uuid, varchar, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { incomeSources } from "./income-sources";
import { users } from "./users";

export const fundTransfers = pgTable("fund_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferType: varchar("transfer_type", { length: 20 }).notNull(), // 'fund' | 'member'
  fromSourceId: uuid("from_source_id").references(() => incomeSources.id),
  toSourceId: uuid("to_source_id").references(() => incomeSources.id),
  fromMemberId: uuid("from_member_id").references(() => users.id),
  toMemberId: uuid("to_member_id").references(() => users.id),
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  period: timestamp("period", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
