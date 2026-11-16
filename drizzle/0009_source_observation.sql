CREATE TABLE scout_protocols (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE scout_observations (id TEXT PRIMARY KEY, event_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, source_id TEXT NOT NULL, symbol TEXT, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX scout_observations_source ON scout_observations(source_id,created_at);
--> statement-breakpoint
CREATE TRIGGER scout_protocols_no_update BEFORE UPDATE ON scout_protocols BEGIN SELECT RAISE(ABORT,'Source observation protocol is frozen'); END;
--> statement-breakpoint
CREATE TRIGGER scout_protocols_no_delete BEFORE DELETE ON scout_protocols BEGIN SELECT RAISE(ABORT,'Source observation protocol is frozen'); END;
--> statement-breakpoint
CREATE TRIGGER scout_observations_no_update BEFORE UPDATE ON scout_observations BEGIN SELECT RAISE(ABORT,'Source snapshots are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER scout_observations_no_delete BEFORE DELETE ON scout_observations BEGIN SELECT RAISE(ABORT,'Source snapshots are immutable'); END;
