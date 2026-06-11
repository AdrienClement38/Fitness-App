CREATE TABLE "program_exercises" (
	"program_id" text NOT NULL,
	"day_order" integer NOT NULL,
	"position" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"sets" integer,
	"reps_min" integer,
	"reps_max" integer,
	"rest_seconds" integer,
	"notes_fr" text,
	CONSTRAINT "program_exercises_program_id_day_order_position_pk" PRIMARY KEY("program_id","day_order","position")
);
--> statement-breakpoint
CREATE TABLE "program_sessions" (
	"program_id" text NOT NULL,
	"day_order" integer NOT NULL,
	"name_fr" text NOT NULL,
	"focus_fr" text,
	CONSTRAINT "program_sessions_program_id_day_order_pk" PRIMARY KEY("program_id","day_order")
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"name_fr" text NOT NULL,
	"theme" text,
	"level" text,
	"goal" text,
	"days_per_week" integer,
	"summary_fr" text,
	"description_fr" text
);
--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_exercises_exercise_idx" ON "program_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "programs_theme_idx" ON "programs" USING btree ("theme");--> statement-breakpoint
CREATE INDEX "programs_level_idx" ON "programs" USING btree ("level");