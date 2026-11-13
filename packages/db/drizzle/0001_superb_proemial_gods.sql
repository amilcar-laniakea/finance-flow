CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "binance_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"binance_spot_usdt" numeric(18, 8) NOT NULL,
	"binance_fund_usdt" numeric(18, 8) NOT NULL,
	"binance_total_usdt" numeric(18, 8) NOT NULL,
	"app_total_usdt" numeric(18, 8) NOT NULL,
	"discrepancy_usd" numeric(18, 8) NOT NULL,
	"status" varchar(10) NOT NULL,
	"triggered_by" varchar(10) DEFAULT 'cron' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "binance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"fund_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"adjustment_usd" numeric(18, 8) NOT NULL,
	"tag" varchar(50),
	"notes" text,
	"status" varchar(10) NOT NULL,
	"is_automatic" varchar(5) DEFAULT 'true' NOT NULL,
	"corrected_by" uuid NOT NULL,
	"corrected_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_household_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fund_transfers" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "binance_audits" ADD CONSTRAINT "binance_audits_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "binance_corrections" ADD CONSTRAINT "binance_corrections_audit_id_binance_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."binance_audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "binance_corrections" ADD CONSTRAINT "binance_corrections_fund_id_income_sources_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."income_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "binance_corrections" ADD CONSTRAINT "binance_corrections_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "binance_corrections" ADD CONSTRAINT "binance_corrections_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

-- Backfill home_household_id for admin-created users (clerk_id IS NULL).
-- Step 1: users with expenses ONLY in personal instances → assign to that personal household.
UPDATE users u
SET home_household_id = (
  SELECT e.household_id
  FROM expenses e
  JOIN households h ON e.household_id = h.id
  WHERE e.member_id = u.id AND e.deleted_at IS NULL AND h.is_personal = true
  GROUP BY e.household_id ORDER BY COUNT(*) DESC LIMIT 1
)
WHERE u.clerk_id IS NULL
  AND u.deleted_at IS NULL
  AND u.home_household_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM expenses e JOIN households h ON e.household_id = h.id
    WHERE e.member_id = u.id AND e.deleted_at IS NULL AND h.is_main = true
  );

-- Step 2: users with expenses in the main household → assign to main.
UPDATE users u
SET home_household_id = (SELECT id FROM households WHERE is_main = true LIMIT 1)
WHERE u.clerk_id IS NULL
  AND u.deleted_at IS NULL
  AND u.home_household_id IS NULL
  AND EXISTS (
    SELECT 1 FROM expenses e JOIN households h ON e.household_id = h.id
    WHERE e.member_id = u.id AND e.deleted_at IS NULL AND h.is_main = true
  );

-- Step 3: remaining admin-created users with no expenses → assign to main by default.
-- These are users with zero activity; if any are wrong they must be deleted and recreated.
UPDATE users u
SET home_household_id = (SELECT id FROM households WHERE is_main = true LIMIT 1)
WHERE u.clerk_id IS NULL AND u.deleted_at IS NULL AND u.home_household_id IS NULL;