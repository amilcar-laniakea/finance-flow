import {
  pgTable,
  uuid,
  varchar,
  decimal,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { householdMembers } from "./households";

export const allocations = pgTable("allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  memberId: uuid("member_id").references(() => householdMembers.id),
  period: timestamp("period", { withTimezone: true }).notNull(),
  purpose: varchar("purpose", { length: 255 }),
  budgetedUsd: decimal("budgeted_usd", { precision: 12, scale: 2 }).notNull(),
  spentUsd: decimal("spent_usd", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
