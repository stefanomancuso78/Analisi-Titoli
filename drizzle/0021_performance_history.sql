CREATE TABLE performance_snapshots (id TEXT PRIMARY KEY, series_id TEXT NOT NULL, bucket TEXT NOT NULL, recorded_at TEXT NOT NULL, value REAL, payload TEXT NOT NULL, UNIQUE(series_id,bucket));
--> statement-breakpoint
CREATE INDEX performance_series_time ON performance_snapshots(series_id,recorded_at);
--> statement-breakpoint
CREATE TRIGGER performance_no_update BEFORE UPDATE ON performance_snapshots BEGIN SELECT RAISE(ABORT,'Performance observations are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER performance_no_delete BEFORE DELETE ON performance_snapshots BEGIN SELECT RAISE(ABORT,'Performance observations are immutable'); END;
