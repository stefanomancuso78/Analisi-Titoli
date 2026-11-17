-- Separate prospective shadow ledger. All historical protocols/cases remain untouched.
CREATE TABLE t4_protocols(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,digest TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE t4_cases(id TEXT PRIMARY KEY,source_case_id TEXT NOT NULL UNIQUE,symbol TEXT NOT NULL,published_at TEXT NOT NULL,recorded_at TEXT NOT NULL,eligible INTEGER NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE t4_entries(case_id TEXT PRIMARY KEY REFERENCES t4_cases(id),created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE t4_outcomes(case_id TEXT PRIMARY KEY REFERENCES t4_cases(id),created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX t4_cases_pub ON t4_cases(published_at);
--> statement-breakpoint
CREATE TRIGGER t4_protocol_immutable BEFORE UPDATE ON t4_protocols BEGIN SELECT RAISE(ABORT,'Test4 protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER t4_protocol_no_delete BEFORE DELETE ON t4_protocols BEGIN SELECT RAISE(ABORT,'Test4 protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER t4_cases_immutable BEFORE UPDATE ON t4_cases BEGIN SELECT RAISE(ABORT,'Test4 case immutable'); END;
--> statement-breakpoint
CREATE TRIGGER t4_cases_no_delete BEFORE DELETE ON t4_cases BEGIN SELECT RAISE(ABORT,'Test4 case immutable'); END;
--> statement-breakpoint
CREATE TRIGGER t4_entries_immutable BEFORE UPDATE ON t4_entries BEGIN SELECT RAISE(ABORT,'Test4 entry immutable'); END;
--> statement-breakpoint
CREATE TRIGGER t4_entries_no_delete BEFORE DELETE ON t4_entries BEGIN SELECT RAISE(ABORT,'Test4 entry immutable'); END;
--> statement-breakpoint
CREATE TRIGGER t4_outcomes_immutable BEFORE UPDATE ON t4_outcomes BEGIN SELECT RAISE(ABORT,'Test4 outcome immutable'); END;
--> statement-breakpoint
CREATE TRIGGER t4_outcomes_no_delete BEFORE DELETE ON t4_outcomes BEGIN SELECT RAISE(ABORT,'Test4 outcome immutable'); END;
