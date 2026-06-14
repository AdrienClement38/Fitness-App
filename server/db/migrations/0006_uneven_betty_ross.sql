ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verify_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verify_expires" timestamp with time zone;