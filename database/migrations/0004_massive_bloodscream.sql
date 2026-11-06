CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE TABLE "audit"."auth_attempt" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit"."auth_attempt_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"identifier_hash" text NOT NULL,
	"event" text NOT NULL,
	"outcome" text NOT NULL,
	"reason" text,
	"request_id" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit"."auth_event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit"."auth_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"event" text NOT NULL,
	"outcome" text NOT NULL,
	"reason" text,
	"request_id" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."login_throttle" (
	"identifier_hash" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_attempt_identifier_idx" ON "audit"."auth_attempt" USING btree ("identifier_hash");--> statement-breakpoint
CREATE INDEX "auth_attempt_created_at_idx" ON "audit"."auth_attempt" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_event_user_id_idx" ON "audit"."auth_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_event_created_at_idx" ON "audit"."auth_event" USING btree ("created_at");