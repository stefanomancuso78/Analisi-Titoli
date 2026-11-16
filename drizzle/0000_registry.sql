CREATE TABLE predictions (id TEXT PRIMARY KEY, published_at TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE observations (id TEXT PRIMARY KEY, prediction_id TEXT NOT NULL REFERENCES predictions(id), recorded_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX observations_prediction ON observations(prediction_id, recorded_at);
--> statement-breakpoint
CREATE TABLE research (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL);
