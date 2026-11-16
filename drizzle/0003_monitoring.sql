CREATE TABLE research_changes (id TEXT PRIMARY KEY, research_id TEXT NOT NULL, recorded_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE market_closes (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, trade_date TEXT NOT NULL, close REAL NOT NULL, currency TEXT NOT NULL, source TEXT NOT NULL, recorded_at TEXT NOT NULL, UNIQUE(symbol,trade_date,close,currency));
--> statement-breakpoint
CREATE TABLE monitoring_runs (id TEXT PRIMARY KEY, recorded_at TEXT NOT NULL, payload TEXT NOT NULL);
