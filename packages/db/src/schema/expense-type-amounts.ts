import { pgTable, uuid, decimal, timestamp } from "drizzle-orm/pg-core";
import { expenses } from "./expenses";
import { expenseTypes } from "./expense-types";

export const expenseTypeAmounts = pgTable("expense_type_amounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id").references(() => expenses.id).notNull(),
  expenseTypeId: uuid("expense_type_id").references(() => expenseTypes.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
