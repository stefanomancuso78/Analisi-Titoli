CREATE TABLE simulation_clients (id TEXT PRIMARY KEY, principal TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE simulation_portfolios (id TEXT PRIMARY KEY, principal TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
