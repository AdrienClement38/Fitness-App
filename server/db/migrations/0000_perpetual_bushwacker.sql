CREATE TABLE "equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"name_fr" text NOT NULL,
	"category" text,
	"description_fr" text
);
--> statement-breakpoint
CREATE TABLE "exercise_muscles" (
	"exercise_id" text NOT NULL,
	"muscle_id" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "exercise_muscles_exercise_id_muscle_id_role_pk" PRIMARY KEY("exercise_id","muscle_id","role")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_fr" text,
	"aliases_fr" jsonb,
	"force" text,
	"level" text NOT NULL,
	"mechanic" text,
	"category" text NOT NULL,
	"equipment_id" text,
	"movement_pattern_id" text,
	"instructions_en" jsonb,
	"instructions_fr" jsonb,
	"common_mistakes_fr" jsonb,
	"tips_fr" jsonb,
	"contraindications_fr" jsonb,
	"tempo" text,
	"images" jsonb,
	"is_enriched" boolean DEFAULT false NOT NULL,
	"source_dataset" text
);
--> statement-breakpoint
CREATE TABLE "movement_patterns" (
	"id" text PRIMARY KEY NOT NULL,
	"name_fr" text NOT NULL,
	"description_fr" text
);
--> statement-breakpoint
CREATE TABLE "muscle_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name_fr" text NOT NULL,
	"region" text,
	"description_fr" text
);
--> statement-breakpoint
CREATE TABLE "muscle_volume_landmarks" (
	"muscle_id" text PRIMARY KEY NOT NULL,
	"mv_sets" integer,
	"mev_sets" integer,
	"mav_sets_min" integer,
	"mav_sets_max" integer,
	"mrv_sets" integer,
	"notes_fr" text
);
--> statement-breakpoint
CREATE TABLE "muscles" (
	"id" text PRIMARY KEY NOT NULL,
	"name_fr" text NOT NULL,
	"name_en" text,
	"group_id" text NOT NULL,
	"antagonist_id" text,
	"function_fr" text,
	"anatomy_fr" text,
	"aliases_fr" jsonb
);
--> statement-breakpoint
CREATE TABLE "principle_sources" (
	"principle_id" text NOT NULL,
	"source_id" text NOT NULL,
	CONSTRAINT "principle_sources_principle_id_source_id_pk" PRIMARY KEY("principle_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "rep_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"goal" text NOT NULL,
	"label_fr" text NOT NULL,
	"reps_min" integer NOT NULL,
	"reps_max" integer NOT NULL,
	"sets_min" integer,
	"sets_max" integer,
	"intensity_pct_1rm_min" integer,
	"intensity_pct_1rm_max" integer,
	"rest_seconds_min" integer,
	"rest_seconds_max" integer,
	"rir_min" integer,
	"rir_max" integer,
	"notes_fr" text
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"authors" text,
	"year" integer,
	"type" text NOT NULL,
	"url" text,
	"license" text,
	"notes_fr" text
);
--> statement-breakpoint
CREATE TABLE "split_days" (
	"split_id" text NOT NULL,
	"day_order" integer NOT NULL,
	"name_fr" text NOT NULL,
	"focus_fr" text,
	CONSTRAINT "split_days_split_id_day_order_pk" PRIMARY KEY("split_id","day_order")
);
--> statement-breakpoint
CREATE TABLE "splits" (
	"id" text PRIMARY KEY NOT NULL,
	"name_fr" text NOT NULL,
	"days_per_week_min" integer,
	"days_per_week_max" integer,
	"level" text,
	"goal" text,
	"summary_fr" text,
	"pros_fr" jsonb,
	"cons_fr" jsonb
);
--> statement-breakpoint
CREATE TABLE "training_principles" (
	"id" text PRIMARY KEY NOT NULL,
	"title_fr" text NOT NULL,
	"category" text NOT NULL,
	"summary_fr" text NOT NULL,
	"detail_fr" text,
	"evidence" text,
	"practical_fr" jsonb
);
--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_id_muscles_id_fk" FOREIGN KEY ("muscle_id") REFERENCES "public"."muscles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_movement_pattern_id_movement_patterns_id_fk" FOREIGN KEY ("movement_pattern_id") REFERENCES "public"."movement_patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_source_dataset_sources_id_fk" FOREIGN KEY ("source_dataset") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muscle_volume_landmarks" ADD CONSTRAINT "muscle_volume_landmarks_muscle_id_muscles_id_fk" FOREIGN KEY ("muscle_id") REFERENCES "public"."muscles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muscles" ADD CONSTRAINT "muscles_group_id_muscle_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."muscle_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_sources" ADD CONSTRAINT "principle_sources_principle_id_training_principles_id_fk" FOREIGN KEY ("principle_id") REFERENCES "public"."training_principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_sources" ADD CONSTRAINT "principle_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_days" ADD CONSTRAINT "split_days_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_muscles_muscle_idx" ON "exercise_muscles" USING btree ("muscle_id");--> statement-breakpoint
CREATE INDEX "exercise_muscles_role_idx" ON "exercise_muscles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "exercises_category_idx" ON "exercises" USING btree ("category");--> statement-breakpoint
CREATE INDEX "exercises_equipment_idx" ON "exercises" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "exercises_level_idx" ON "exercises" USING btree ("level");--> statement-breakpoint
CREATE INDEX "exercises_enriched_idx" ON "exercises" USING btree ("is_enriched");--> statement-breakpoint
CREATE INDEX "muscles_group_idx" ON "muscles" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "training_principles_category_idx" ON "training_principles" USING btree ("category");