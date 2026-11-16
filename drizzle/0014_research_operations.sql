CREATE TABLE research_jobs (id TEXT PRIMARY KEY, analysis_id TEXT NOT NULL REFERENCES semantic_analyses(id), symbol TEXT NOT NULL, kind TEXT NOT NULL, state TEXT NOT NULL, priority INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt TEXT NOT NULL, lease_until TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(analysis_id,kind));
--> statement-breakpoint
CREATE INDEX research_job_due ON research_jobs(state,next_attempt,priority);
--> statement-breakpoint
CREATE TABLE research_evidence (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES research_jobs(id), document_id TEXT NOT NULL REFERENCES graph_documents(id), created_at TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(job_id,document_id));
--> statement-breakpoint
CREATE TABLE research_revisions (id TEXT PRIMARY KEY, analysis_id TEXT NOT NULL REFERENCES semantic_analyses(id), symbol TEXT NOT NULL, created_at TEXT NOT NULL, actor TEXT NOT NULL, decision TEXT NOT NULL, evidence_hash TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(analysis_id,evidence_hash));
--> statement-breakpoint
CREATE TABLE research_protocols (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, digest TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE operational_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER research_evidence_immutable BEFORE UPDATE ON research_evidence BEGIN SELECT RAISE(ABORT,'Research evidence immutable'); END;
--> statement-breakpoint
CREATE TRIGGER research_revision_immutable BEFORE UPDATE ON research_revisions BEGIN SELECT RAISE(ABORT,'Research revision immutable'); END;
--> statement-breakpoint
CREATE TRIGGER research_revision_no_delete BEFORE DELETE ON research_revisions BEGIN SELECT RAISE(ABORT,'Research revision immutable'); END;
--> statement-breakpoint
CREATE TRIGGER research_protocol_immutable BEFORE UPDATE ON research_protocols BEGIN SELECT RAISE(ABORT,'Research protocol immutable'); END;
--> statement-breakpoint
CREATE TRIGGER research_protocol_no_delete BEFORE DELETE ON research_protocols BEGIN SELECT RAISE(ABORT,'Research protocol immutable'); END;

--> statement-breakpoint
CREATE UNIQUE INDEX semantic_episode_once ON prod_episodes(json_extract(payload,'$.semantic_analysis_id')) WHERE json_extract(payload,'$.protocol_id')='semantic-study-v2' AND json_extract(payload,'$.semantic_analysis_id') IS NOT NULL;
