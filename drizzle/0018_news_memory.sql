CREATE TABLE news_items(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,url TEXT NOT NULL UNIQUE,publisher TEXT NOT NULL,title TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_documents(news_id TEXT NOT NULL REFERENCES news_items(id),document_id TEXT NOT NULL REFERENCES graph_documents(id),created_at TEXT NOT NULL,PRIMARY KEY(news_id,document_id));
--> statement-breakpoint
CREATE TABLE news_assessments(id TEXT PRIMARY KEY,news_id TEXT NOT NULL REFERENCES news_items(id),created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_forecasts(id TEXT PRIMARY KEY,news_id TEXT NOT NULL REFERENCES news_items(id),symbol TEXT NOT NULL,created_at TEXT NOT NULL,fold TEXT NOT NULL,state TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(news_id,symbol));
--> statement-breakpoint
CREATE TABLE news_effects(forecast_id TEXT NOT NULL REFERENCES news_forecasts(id),horizon INTEGER NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(forecast_id,horizon));
--> statement-breakpoint
CREATE TABLE news_models(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_policies(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_alerts(id TEXT PRIMARY KEY,news_id TEXT NOT NULL REFERENCES news_items(id),symbol TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_sources(id TEXT PRIMARY KEY,last_poll TEXT,last_status TEXT,last_error TEXT,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER news_item_fixed BEFORE UPDATE ON news_items BEGIN SELECT RAISE(ABORT,'News history immutable'); END;
--> statement-breakpoint
CREATE TRIGGER news_assessment_fixed BEFORE UPDATE ON news_assessments BEGIN SELECT RAISE(ABORT,'News assessment immutable'); END;
--> statement-breakpoint
CREATE TRIGGER news_effect_fixed BEFORE UPDATE ON news_effects BEGIN SELECT RAISE(ABORT,'News effect immutable'); END;
--> statement-breakpoint
CREATE TRIGGER news_model_fixed BEFORE UPDATE ON news_models BEGIN SELECT RAISE(ABORT,'News model immutable'); END;
--> statement-breakpoint
CREATE TRIGGER news_policy_fixed BEFORE UPDATE ON news_policies BEGIN SELECT RAISE(ABORT,'News policy immutable'); END;
--> statement-breakpoint
CREATE TABLE news_financial_flags(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE news_protocols(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,digest TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER news_protocol_fixed BEFORE UPDATE ON news_protocols BEGIN SELECT RAISE(ABORT,'News protocol immutable'); END;
--> statement-breakpoint
CREATE TABLE news_item_versions(id TEXT PRIMARY KEY,news_id TEXT NOT NULL REFERENCES news_items(id),created_at TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER news_item_version_fixed BEFORE UPDATE ON news_item_versions BEGIN SELECT RAISE(ABORT,'Headline history immutable'); END;
