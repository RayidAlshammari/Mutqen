CREATE TABLE "brief" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"owner_key" text,
	"input" text NOT NULL,
	"category" text NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"service_id" text,
	"tier" text,
	"structured" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managed_request" (
	"id" text PRIMARY KEY NOT NULL,
	"brief_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"budget" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"offered_service_id" text,
	"offered_tier" text,
	"note" text,
	"order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'awaiting_acceptance';--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "due_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "stage" text DEFAULT 'sample' NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "sample_changes_left" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "delivery_days" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "accept_by" timestamp;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "sample_due_at" timestamp;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "sample_delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "brief_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "parent_order_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "managed_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "dispute_reason" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "dispute_prev_status" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "refund_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_event" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "national_id" text;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "identity_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "conduct_score" integer;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "verification_url" text;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD COLUMN "verification_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "brief" ADD CONSTRAINT "brief_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_request" ADD CONSTRAINT "managed_request_brief_id_brief_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."brief"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_request" ADD CONSTRAINT "managed_request_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_request" ADD CONSTRAINT "managed_request_offered_service_id_service_id_fk" FOREIGN KEY ("offered_service_id") REFERENCES "public"."service"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brief_owner_idx" ON "brief" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "managed_status_idx" ON "managed_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("user_id","created_at");