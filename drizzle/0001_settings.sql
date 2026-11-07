CREATE TABLE "billing_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"company_name" text,
	"vat_number" text,
	"cr_number" text,
	"city" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "payout_name" text;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "iban" text;--> statement-breakpoint
ALTER TABLE "billing_profile" ADD CONSTRAINT "billing_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;