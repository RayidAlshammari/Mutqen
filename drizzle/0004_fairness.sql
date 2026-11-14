ALTER TABLE "order" ADD COLUMN "payout_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "payout_ref" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "paid_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "held_for_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "gender" text DEFAULT 'm' NOT NULL;--> statement-breakpoint
-- Sample data already loaded before this migration: set the grammar gender of the demo freelancers.
UPDATE "seller_profile" SET "gender" = 'f' WHERE "user_id" IN (SELECT "id" FROM "user" WHERE "email" IN ('seller@mutqen.demo', 'reem@mutqen.demo', 'lama@mutqen.demo', 'sara@mutqen.demo', 'pending@mutqen.demo'));--> statement-breakpoint
-- Orders completed before payouts were tracked: older ones count as paid, the last 10 days as due.
UPDATE "order" SET "payout_status" = CASE WHEN "completed_at" < now() - interval '10 days' THEN 'paid' ELSE 'due' END, "paid_out_at" = CASE WHEN "completed_at" < now() - interval '10 days' THEN "completed_at" + interval '3 days' ELSE NULL END WHERE "status" = 'completed';
