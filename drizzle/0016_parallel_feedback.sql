CREATE TABLE parallel_protocols(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,digest TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE parallel_models(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE parallel_cases(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,created_at TEXT NOT NULL,fold TEXT NOT NULL,state TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE parallel_outcomes(case_id TEXT PRIMARY KEY REFERENCES parallel_cases(id),created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE manager_suggestions(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,principal TEXT NOT NULL,category TEXT NOT NULL,message TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'new');
--> statement-breakpoint
CREATE TRIGGER parallel_protocol_immutable BEFORE UPDATE ON parallel_protocols BEGIN SELECT RAISE(ABORT,'Protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER parallel_model_immutable BEFORE UPDATE ON parallel_models BEGIN SELECT RAISE(ABORT,'Model immutable'); END;
--> statement-breakpoint
CREATE TRIGGER parallel_outcome_immutable BEFORE UPDATE ON parallel_outcomes BEGIN SELECT RAISE(ABORT,'Outcome immutable'); END;
