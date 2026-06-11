CREATE TABLE "sync_items" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_id" text NOT NULL,
	"data" jsonb,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sync_items_user_id_kind_item_id_pk" PRIMARY KEY("user_id","kind","item_id")
);
--> statement-breakpoint
ALTER TABLE "sync_items" ADD CONSTRAINT "sync_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;