CREATE TABLE ex_protocols (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, rules_hash TEXT NOT NULL, payload_hash TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER ex_protocol_no_update BEFORE UPDATE ON ex_protocols BEGIN SELECT RAISE(ABORT,'Protocollo immutabile: creare una nuova versione'); END;
--> statement-breakpoint
CREATE TRIGGER ex_protocol_no_delete BEFORE DELETE ON ex_protocols BEGIN SELECT RAISE(ABORT,'Protocollo immutabile'); END;
--> statement-breakpoint
CREATE TRIGGER ex_reference_payload_immutable BEFORE UPDATE OF payload ON prod_models WHEN OLD.family='reference' BEGIN SELECT RAISE(ABORT,'Pesi del riferimento congelati'); END;
--> statement-breakpoint
CREATE TABLE ex_fills (portfolio_id TEXT NOT NULL, symbol TEXT NOT NULL, trade_date TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(portfolio_id,symbol));
--> statement-breakpoint
CREATE TABLE ex_actions (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, kind TEXT NOT NULL, effective_date TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(symbol,kind,effective_date));
--> statement-breakpoint
CREATE TABLE ex_marks (id TEXT PRIMARY KEY, portfolio_id TEXT NOT NULL, as_of TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE ex_alerts (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, state TEXT NOT NULL, severity TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE ex_reports (id TEXT PRIMARY KEY, day TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE ex_backups (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL);

--> statement-breakpoint
CREATE TRIGGER ex_reference_no_delete BEFORE DELETE ON prod_models WHEN OLD.family='reference' BEGIN SELECT RAISE(ABORT,'Riferimento immutabile'); END;

--> statement-breakpoint
CREATE TABLE ex_benchmark_entries (portfolio_id TEXT PRIMARY KEY, trade_date TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);

--> statement-breakpoint
CREATE TABLE ex_closures (portfolio_id TEXT PRIMARY KEY, as_of TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);
