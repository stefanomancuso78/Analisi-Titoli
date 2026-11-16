CREATE TABLE auth_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE auth_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL);
