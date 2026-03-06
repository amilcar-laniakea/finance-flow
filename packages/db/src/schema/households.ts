import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  monthlyIncomeUsd: decimal("monthly_income_usd", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  userId: uuid("user_id").references(() => users.id),
  nickname: varchar("nickname", { length: 100 }),
  isVirtual: boolean("is_virtual").default(false),
  monthlyAllocationUsd: decimal("monthly_allocation_usd", {
    precision: 12,
    scale: 2,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
