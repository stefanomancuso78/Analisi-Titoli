-- Preserve every forecast, but quarantine recursive re-imports of the same legacy document.
UPDATE prod_events SET status='duplicate_excluded' WHERE id IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER (PARTITION BY symbol,json_extract(payload,'$.url'),json_extract(payload,'$.title') ORDER BY first_seen,id) AS n FROM prod_events WHERE source_id='verified-research') WHERE n>1);
--> statement-breakpoint
UPDATE prod_episodes SET state='duplicate_excluded' WHERE event_id IN (SELECT id FROM prod_events WHERE status='duplicate_excluded');
--> statement-breakpoint
INSERT INTO research_changes (id,research_id,recorded_at,payload) SELECT 'dedup-'||r.id,r.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('previous',json_extract(r.payload,'$.kind'),'kind','case','reason','Re-importazione ricorsiva dello stesso documento esclusa dal protocollo; forecast originale conservato') FROM research r WHERE json_extract(r.payload,'$.event_id') IN (SELECT id FROM prod_events WHERE status='duplicate_excluded');
--> statement-breakpoint
UPDATE research SET payload=json_set(payload,'$.kind','case','$.verified',json('false'),'$.summary','Duplicato escluso dal protocollo A/B; conservato per audit. '||json_extract(payload,'$.summary')) WHERE json_extract(payload,'$.event_id') IN (SELECT id FROM prod_events WHERE status='duplicate_excluded');
--> statement-breakpoint
INSERT INTO prod_decisions (id,created_at,kind,payload) VALUES ('deduplicate-legacy-v1',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'data_correction',json_object('reason','Esclusione di re-importazioni ricorsive dello stesso documento; nessun esito o forecast riscritto','excluded_events',(SELECT COUNT(*) FROM prod_events WHERE status='duplicate_excluded')));
