import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";

export const expenseTypes = pgTable("expense_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: integer("code").notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }),
});
