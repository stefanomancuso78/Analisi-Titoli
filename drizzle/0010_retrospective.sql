CREATE TABLE retro_studies (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE retro_cases (study_id TEXT NOT NULL REFERENCES retro_studies(id), symbol TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(study_id,symbol));
--> statement-breakpoint
CREATE TABLE retro_reports (study_id TEXT PRIMARY KEY REFERENCES retro_studies(id), created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER retro_studies_no_update BEFORE UPDATE ON retro_studies BEGIN SELECT RAISE(ABORT,'Retrospective protocol is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER retro_reports_no_update BEFORE UPDATE ON retro_reports BEGIN SELECT RAISE(ABORT,'Retrospective report is immutable'); END;
