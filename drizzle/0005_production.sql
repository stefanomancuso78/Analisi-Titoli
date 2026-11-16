CREATE TABLE prod_sources (id TEXT PRIMARY KEY, payload TEXT NOT NULL, last_poll TEXT, next_poll TEXT NOT NULL DEFAULT '', last_status TEXT NOT NULL DEFAULT 'never', last_error TEXT, last_source_date TEXT);
--> statement-breakpoint
CREATE TABLE prod_events (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, published_at TEXT, first_seen TEXT NOT NULL, symbol TEXT, status TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX prod_events_symbol ON prod_events(symbol,first_seen);
--> statement-breakpoint
CREATE TABLE prod_entities (symbol TEXT PRIMARY KEY, name TEXT NOT NULL, sector TEXT NOT NULL, aliases TEXT NOT NULL, proof_url TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_models (id TEXT PRIMARY KEY, family TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_episodes (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, symbol TEXT NOT NULL, created_at TEXT NOT NULL, fold TEXT NOT NULL, entry_date TEXT, entry_price REAL, deadline TEXT, state TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_forecasts (id TEXT PRIMARY KEY, episode_id TEXT NOT NULL, model_id TEXT NOT NULL, created_at TEXT NOT NULL, probability REAL NOT NULL, predicted_return REAL NOT NULL, payload TEXT NOT NULL, UNIQUE(episode_id,model_id));
--> statement-breakpoint
CREATE TABLE prod_outcomes (episode_id TEXT PRIMARY KEY, settled_at TEXT NOT NULL, exit_date TEXT NOT NULL, actual_return REAL NOT NULL, positive INTEGER NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_decisions (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_runs (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, ended_at TEXT, trigger TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_leases (key TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_credentials (provider TEXT PRIMARY KEY, encrypted TEXT NOT NULL, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_staff (email TEXT PRIMARY KEY, role TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE prod_portfolio_marks (id TEXT PRIMARY KEY, portfolio_id TEXT NOT NULL, marked_at TEXT NOT NULL, payload TEXT NOT NULL);
