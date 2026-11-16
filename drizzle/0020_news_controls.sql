CREATE TABLE news_control_protocols(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,digest TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_controls(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,observed_day TEXT NOT NULL,created_at TEXT NOT NULL,state TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(symbol,observed_day));
--> statement-breakpoint
CREATE TABLE news_control_links(control_id TEXT NOT NULL REFERENCES news_controls(id),news_id TEXT NOT NULL REFERENCES news_items(id),created_at TEXT NOT NULL,PRIMARY KEY(control_id,news_id));
--> statement-breakpoint
CREATE TABLE news_control_effects(control_id TEXT NOT NULL REFERENCES news_controls(id),horizon INTEGER NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(control_id,horizon));
--> statement-breakpoint
CREATE TABLE news_priority_models(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_priority_scores(news_id TEXT PRIMARY KEY REFERENCES news_items(id),created_at TEXT NOT NULL,score REAL NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER news_control_effect_fixed BEFORE UPDATE ON news_control_effects BEGIN SELECT RAISE(ABORT,'Control outcome immutable'); END;
--> statement-breakpoint
CREATE TRIGGER news_priority_model_fixed BEFORE UPDATE ON news_priority_models BEGIN SELECT RAISE(ABORT,'Priority model immutable'); END;
--> statement-breakpoint
CREATE TRIGGER news_priority_score_fixed BEFORE UPDATE ON news_priority_scores BEGIN SELECT RAISE(ABORT,'Priority assignment immutable'); END;
