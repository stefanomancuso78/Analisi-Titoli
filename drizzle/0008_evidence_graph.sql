CREATE TABLE graph_documents (id TEXT PRIMARY KEY, url TEXT NOT NULL, content_hash TEXT NOT NULL, title TEXT NOT NULL, published_at TEXT, acquired_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX graph_documents_url ON graph_documents(url);
--> statement-breakpoint
CREATE TABLE graph_nodes (id TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL, symbol TEXT, created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX graph_nodes_symbol ON graph_nodes(symbol);
--> statement-breakpoint
CREATE TABLE graph_edges (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES graph_nodes(id), target_id TEXT NOT NULL REFERENCES graph_nodes(id), relation TEXT NOT NULL, document_id TEXT NOT NULL REFERENCES graph_documents(id), created_at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX graph_edges_source ON graph_edges(source_id,relation);
--> statement-breakpoint
CREATE INDEX graph_edges_target ON graph_edges(target_id,relation);
--> statement-breakpoint
CREATE TABLE graph_jobs (id TEXT PRIMARY KEY, url TEXT NOT NULL, created_at TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX graph_jobs_state ON graph_jobs(state,created_at);
--> statement-breakpoint
CREATE TABLE graph_hypotheses (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, symbol TEXT NOT NULL, rule_version TEXT NOT NULL, prior_edge_id TEXT NOT NULL REFERENCES graph_edges(id), trigger_document_id TEXT NOT NULL REFERENCES graph_documents(id), payload TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX graph_hypotheses_symbol ON graph_hypotheses(symbol,created_at);
--> statement-breakpoint
CREATE TRIGGER graph_hypotheses_no_update BEFORE UPDATE ON graph_hypotheses BEGIN SELECT RAISE(ABORT,'Hypothesis snapshots are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER graph_hypotheses_no_delete BEFORE DELETE ON graph_hypotheses BEGIN SELECT RAISE(ABORT,'Hypothesis snapshots are immutable'); END;
