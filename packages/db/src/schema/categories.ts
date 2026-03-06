import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { households } from "./households";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }),
  parentId: uuid("parent_id"), // self-reference added manually after table creation
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
