CREATE TABLE intelligence_deltas (id TEXT PRIMARY KEY,symbol TEXT NOT NULL,previous_document_id TEXT NOT NULL REFERENCES graph_documents(id),current_document_id TEXT NOT NULL REFERENCES graph_documents(id),created_at TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(previous_document_id,current_document_id));
--> statement-breakpoint
CREATE TABLE investment_theses (id TEXT PRIMARY KEY,symbol TEXT NOT NULL,created_at TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(source_kind,source_id));
--> statement-breakpoint
CREATE TABLE thesis_reviews (id TEXT PRIMARY KEY,thesis_id TEXT NOT NULL REFERENCES investment_theses(id),created_at TEXT NOT NULL,actor TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX thesis_review_latest ON thesis_reviews(thesis_id,created_at);
--> statement-breakpoint
CREATE TABLE method_protocols (id TEXT PRIMARY KEY,created_at TEXT NOT NULL,digest TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE method_cases (id TEXT PRIMARY KEY,protocol_id TEXT NOT NULL REFERENCES method_protocols(id),created_at TEXT NOT NULL,input_hash TEXT NOT NULL,payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE method_runs (id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES method_cases(id),arm TEXT NOT NULL,replicate INTEGER NOT NULL,created_at TEXT NOT NULL,actor TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(case_id,arm,replicate));
--> statement-breakpoint
CREATE TABLE method_reviews (id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES method_runs(id),created_at TEXT NOT NULL,actor TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(run_id,actor));
--> statement-breakpoint
CREATE TRIGGER investment_thesis_immutable BEFORE UPDATE ON investment_theses BEGIN SELECT RAISE(ABORT,'Thesis history immutable'); END;
--> statement-breakpoint
CREATE TRIGGER thesis_review_immutable BEFORE UPDATE ON thesis_reviews BEGIN SELECT RAISE(ABORT,'Review immutable'); END;
--> statement-breakpoint
CREATE TRIGGER method_protocol_immutable BEFORE UPDATE ON method_protocols BEGIN SELECT RAISE(ABORT,'Method protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER method_case_immutable BEFORE UPDATE ON method_cases BEGIN SELECT RAISE(ABORT,'Method case immutable'); END;
--> statement-breakpoint
CREATE TRIGGER method_run_immutable BEFORE UPDATE ON method_runs BEGIN SELECT RAISE(ABORT,'Method run immutable'); END;
--> statement-breakpoint
CREATE TRIGGER method_review_immutable BEFORE UPDATE ON method_reviews BEGIN SELECT RAISE(ABORT,'Method review immutable'); END;
--> statement-breakpoint
CREATE TABLE intelligence_reviews (id TEXT PRIMARY KEY,delta_id TEXT NOT NULL REFERENCES intelligence_deltas(id),created_at TEXT NOT NULL,actor TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(delta_id));
--> statement-breakpoint
CREATE TRIGGER intelligence_review_immutable BEFORE UPDATE ON intelligence_reviews BEGIN SELECT RAISE(ABORT,'Change review immutable'); END;
