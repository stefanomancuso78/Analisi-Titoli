import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {managerStatus,MANAGER_STATUS_UI} from '../worker/manager-status.js';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
 const DB={prepare(sql){let a=[];return{bind(...v){a=v;return this},async all(){return{results:sqlite.prepare(sql).all(...a)}},async first(){return sqlite.prepare(sql).get(...a)||null},async run(){return sqlite.prepare(sql).run(...a)}}}};
 return{sqlite,DB};
}

test('manager panel separates ready semantic queue from pending research evidence and stale valuations',async()=>{
 const env=fixture(),db=env.sqlite;
 for(const id of ['analysis1','analysis2']){db.prepare('INSERT INTO graph_documents VALUES (?,?,?,?,?,?,?)').run('doc-'+id,'https://issuer.org/'+id,'hash-'+id,'Test disclosure',null,'2026-11-11T10:00:00Z',JSON.stringify({text:'complete source document '.repeat(40),issuer:'AMD',primary:true}));db.prepare('INSERT INTO semantic_analyses VALUES (?,?,?,?,?,?,?)').run(id,'doc-'+id,'AMD','2026-11-11T10:00:00Z','test','research_only','{}')}
 db.prepare('INSERT INTO research_jobs VALUES (?,?,?,?,?,?,0,?,NULL,?,?,?)').run('research1','analysis1','AMD','counter_evidence','pending',65,'2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','{}');
 db.prepare('INSERT INTO research_jobs VALUES (?,?,?,?,?,?,0,?,NULL,?,?,?)').run('research2','analysis2','AMD','financial_context','evidence_ready',80,'2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','{}');
 db.prepare('INSERT INTO simulation_portfolios VALUES (?,?,?,?)').run('portfolio-1','study:fixture','2026-11-01T12:00:00Z',JSON.stringify({amount:10000,currency:'EUR',positions:[]}));
 db.prepare('INSERT INTO prod_settings VALUES (?,?)').run('portfolio_valuation:portfolio-1',JSON.stringify({recorded_at:'2026-11-12T12:00:00Z',value:{complete:true,value:9900,return_pct:-1}}));
 const r=await managerStatus(env);
 assert.equal(r.queue.pending,0);
 assert.equal(r.research_followups.pending,1);
 assert.equal(r.research_followups.evidence_ready,1);
 assert.equal(r.research_workload.active,1);
 assert.equal(r.research_workload.minimum_fetch_cycles_without_arrivals,1);
 assert.equal(r.research_workload.assumed_max_jobs_per_cycle,2);
 assert.ok(r.research_workload.notice.includes('not independently measured processing speed'));
 assert.equal(r.research_workload.new_requests_last_24h,0);
 assert.equal(r.portfolio_health.active,1);
 assert.equal(r.portfolio_health.stale,1);
 assert.equal(r.portfolio_health.never_valued,0);
 assert.match(MANAGER_STATUS_UI,/Approfondimenti economici in coda/);
 assert.match(MANAGER_STATUS_UI,/Portafogli da ricalcolare/);
 db.close();
});


test('manager reports an expired semantic reader lease as recoverable instead of running',async()=>{
 const env=fixture(),db=env.sqlite,runId='reader:2026-11-20T12:45';
 db.prepare('INSERT INTO prod_settings VALUES (?,?)').run('semantic_reader_last',JSON.stringify({run_id:runId,state:'running',started_at:'2026-11-20T12:44:24.898Z'}));
 db.prepare('INSERT INTO prod_leases VALUES (?,?,?)').run('semantic_reader',runId,Date.now()-1);
 let r=await managerStatus(env);
 assert.equal(r.semantic_reader.state,'expired');
 assert.equal(r.semantic_reader.lease_active,false);
 assert.equal(r.semantic_reader.recovery,'safe_to_reacquire');
 db.prepare("UPDATE prod_leases SET expires_at=? WHERE key='semantic_reader'").run(Date.now()+60000);
 r=await managerStatus(env);
 assert.equal(r.semantic_reader.state,'running');
 assert.equal(r.semantic_reader.lease_active,true);
 assert.equal(r.semantic_reader.recovery,undefined);
 db.close();
});
