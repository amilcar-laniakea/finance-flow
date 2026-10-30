import { pgTable, uuid, varchar, text, decimal, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";
import { incomeSources } from "./income-sources";
import { users } from "./users";

export const binanceAudits = pgTable("binance_audits", {
  id:               uuid("id").primaryKey().defaultRandom(),
  householdId:      uuid("household_id").references(() => households.id).notNull(),
  binanceSpotUsdt:  decimal("binance_spot_usdt",  { precision: 18, scale: 8 }).notNull(),
  binanceFundUsdt:  decimal("binance_fund_usdt",  { precision: 18, scale: 8 }).notNull(),
  binanceTotalUsdt: decimal("binance_total_usdt", { precision: 18, scale: 8 }).notNull(),
  appTotalUsdt:     decimal("app_total_usdt",     { precision: 18, scale: 8 }).notNull(),
  discrepancyUsd:   decimal("discrepancy_usd",    { precision: 18, scale: 8 }).notNull(),
  status:           varchar("status", { length: 10 }).notNull(),     // green|yellow|orange|red
  triggeredBy:      varchar("triggered_by", { length: 10 }).notNull().default("cron"), // cron|manual
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const binanceCorrections = pgTable("binance_corrections", {
  id:            uuid("id").primaryKey().defaultRandom(),
  auditId:       uuid("audit_id").references(() => binanceAudits.id).notNull(),
  fundId:        uuid("fund_id").references(() => incomeSources.id).notNull(),
  memberId:      uuid("member_id").references(() => users.id).notNull(),
  adjustmentUsd: decimal("adjustment_usd", { precision: 18, scale: 8 }).notNull(),
  tag:           varchar("tag", { length: 50 }),
  notes:         text("notes"),
  status:        varchar("status", { length: 10 }).notNull(), // del audit
  isAutomatic:   varchar("is_automatic", { length: 5 }).notNull().default("true"),
  correctedBy:   uuid("corrected_by").references(() => users.id).notNull(),
  correctedAt:   timestamp("corrected_at", { withTimezone: true }).defaultNow(),
});
