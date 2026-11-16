CREATE TABLE semantic_protocols (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE semantic_analyses (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES graph_documents(id), symbol TEXT NOT NULL, created_at TEXT NOT NULL, actor TEXT NOT NULL, decision TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(document_id,symbol));
--> statement-breakpoint
CREATE INDEX semantic_analysis_symbol ON semantic_analyses(symbol,created_at);
--> statement-breakpoint
CREATE TRIGGER semantic_protocol_immutable BEFORE UPDATE ON semantic_protocols BEGIN SELECT RAISE(ABORT,'Semantic protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER semantic_protocol_no_delete BEFORE DELETE ON semantic_protocols BEGIN SELECT RAISE(ABORT,'Semantic protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER semantic_analysis_immutable BEFORE UPDATE ON semantic_analyses BEGIN SELECT RAISE(ABORT,'Semantic analysis immutable'); END;
--> statement-breakpoint
CREATE TRIGGER semantic_analysis_no_delete BEFORE DELETE ON semantic_analyses BEGIN SELECT RAISE(ABORT,'Semantic analysis immutable'); END;
--> statement-breakpoint
CREATE TRIGGER semantic_models_immutable BEFORE UPDATE ON prod_models WHEN OLD.id IN ('semantic-A-v2','semantic-B-v2') BEGIN SELECT RAISE(ABORT,'Semantic model immutable'); END;
