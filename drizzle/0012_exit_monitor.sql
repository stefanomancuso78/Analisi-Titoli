CREATE TABLE exit_protocols (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload_hash TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE exit_snapshots (id TEXT PRIMARY KEY, position_key TEXT NOT NULL, policy_id TEXT NOT NULL, portfolio_id TEXT, episode_id TEXT, symbol TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX exit_snapshots_position ON exit_snapshots(position_key,policy_id,created_at);
--> statement-breakpoint
CREATE TABLE exit_signals (position_key TEXT NOT NULL, policy_id TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(position_key,policy_id));
--> statement-breakpoint
CREATE TABLE exit_shadow_fills (position_key TEXT NOT NULL, policy_id TEXT NOT NULL, trade_date TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(position_key,policy_id));
--> statement-breakpoint
CREATE TABLE exit_calendar (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, event_date TEXT NOT NULL, created_at TEXT NOT NULL, actor TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX exit_calendar_symbol ON exit_calendar(symbol,event_date);
--> statement-breakpoint
CREATE TRIGGER exit_protocols_no_update BEFORE UPDATE ON exit_protocols BEGIN SELECT RAISE(ABORT,'Exit protocol is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER exit_snapshots_no_update BEFORE UPDATE ON exit_snapshots BEGIN SELECT RAISE(ABORT,'Exit snapshots are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER exit_signals_no_update BEFORE UPDATE ON exit_signals BEGIN SELECT RAISE(ABORT,'Exit signal is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER exit_shadow_fills_no_update BEFORE UPDATE ON exit_shadow_fills BEGIN SELECT RAISE(ABORT,'Shadow exit is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER exit_calendar_no_update BEFORE UPDATE ON exit_calendar BEGIN SELECT RAISE(ABORT,'Calendar revisions are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER exit_protocols_no_delete BEFORE DELETE ON exit_protocols BEGIN SELECT RAISE(ABORT,'Exit protocol is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER exit_signals_no_delete BEFORE DELETE ON exit_signals BEGIN SELECT RAISE(ABORT,'Exit signal is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER exit_shadow_fills_no_delete BEFORE DELETE ON exit_shadow_fills BEGIN SELECT RAISE(ABORT,'Shadow exit is immutable'); END;
