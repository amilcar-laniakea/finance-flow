import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  jsonb,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

export const externalParties = pgTable("external_parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }),
  contactInfo: jsonb("contact_info").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const partyDebts = pgTable("party_debts", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").references(() => households.id),
  partyId: uuid("party_id").references(() => externalParties.id),
  description: text("description").notNull(),
  originalAmountUsd: decimal("original_amount_usd", {
    precision: 12,
    scale: 2,
  }).notNull(),
  remainingAmountUsd: decimal("remaining_amount_usd", {
    precision: 12,
    scale: 2,
  }).notNull(),
  direction: varchar("direction", { length: 20 }),
  status: varchar("status", { length: 20 }).default("active"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const partyPayments = pgTable("party_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  debtId: uuid("debt_id").references(() => partyDebts.id),
  expenseId: uuid("expense_id"), // optional FK to expenses
  amountUsd: decimal("amount_usd", { precision: 12, scale: 2 }).notNull(),
  amountBs: decimal("amount_bs", { precision: 18, scale: 4 }),
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 4 }),
  notes: text("notes"),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
});
