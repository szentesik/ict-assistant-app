CREATE TABLE IF NOT EXISTS "feedback" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"session_id" varchar(191) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"is_positive" integer NOT NULL
);
