CREATE TABLE fundamental_snapshots(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,acquired_at TEXT NOT NULL,source TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE observation_sources(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,kind TEXT NOT NULL,url TEXT NOT NULL,created_at TEXT NOT NULL,last_poll TEXT,last_status TEXT,last_error TEXT,payload TEXT NOT NULL,UNIQUE(symbol,kind,url));
--> statement-breakpoint
CREATE TABLE capital_protocols(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,digest TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE capital_plans(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,protocol_id TEXT NOT NULL REFERENCES capital_protocols(id),payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE capital_decisions(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE financial_comparisons(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER capital_protocol_fixed BEFORE UPDATE ON capital_protocols BEGIN SELECT RAISE(ABORT,'Capital protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER capital_plan_fixed BEFORE UPDATE ON capital_plans BEGIN SELECT RAISE(ABORT,'Capital plan immutable'); END;
--> statement-breakpoint
CREATE TRIGGER fundamentals_fixed BEFORE UPDATE ON fundamental_snapshots BEGIN SELECT RAISE(ABORT,'Financial snapshot immutable'); END;
--> statement-breakpoint
CREATE TABLE capital_history(symbol TEXT NOT NULL,trade_date TEXT NOT NULL,currency TEXT NOT NULL,source TEXT NOT NULL,recorded_at TEXT NOT NULL,close REAL NOT NULL,PRIMARY KEY(symbol,trade_date,source));
--> statement-breakpoint
CREATE TABLE capital_history_jobs(symbol TEXT PRIMARY KEY,last_poll TEXT,last_status TEXT,last_error TEXT);
--> statement-breakpoint
CREATE TABLE financial_assertions(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES graph_documents(id),symbol TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER financial_assertion_fixed BEFORE UPDATE ON financial_assertions BEGIN SELECT RAISE(ABORT,'Financial assertion immutable'); END;
--> statement-breakpoint
CREATE TABLE capital_imports(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL);
