import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { households } from "./households";

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  currentBalance: decimal("current_balance", {
    precision: 15,
    scale: 4,
  }).default("0"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
