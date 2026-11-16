CREATE TABLE analyst_reviews (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, created_at TEXT NOT NULL, actor TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX analyst_reviews_symbol ON analyst_reviews(symbol,created_at);
--> statement-breakpoint
CREATE TABLE analyst_checks (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, created_at TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX analyst_checks_symbol ON analyst_checks(symbol,created_at);
--> statement-breakpoint
CREATE TRIGGER analyst_reviews_no_update BEFORE UPDATE ON analyst_reviews BEGIN SELECT RAISE(ABORT,'Analyst reviews are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER analyst_reviews_no_delete BEFORE DELETE ON analyst_reviews BEGIN SELECT RAISE(ABORT,'Analyst reviews are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER analyst_checks_no_update BEFORE UPDATE ON analyst_checks BEGIN SELECT RAISE(ABORT,'Challenge evidence is append-only'); END;
