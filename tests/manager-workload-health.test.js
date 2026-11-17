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
 db.prepare('INSERT INTO research_jobs VALUES (?,?,?,?,?,?,0,?,NULL,?,?,?)').run('research1','analysis1','AMD','counter_evidence','pending',65,'2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','{}');
 db.prepare('INSERT INTO research_jobs VALUES (?,?,?,?,?,?,0,?,NULL,?,?,?)').run('research2','analysis2','AMD','financial_context','evidence_ready',80,'2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','2026-11-11T10:00:00Z','{}');
 db.prepare('INSERT INTO simulation_portfolios VALUES (?,?,?,?)').run('portfolio-1','study:fixture','2026-11-01T12:00:00Z',JSON.stringify({amount:10000,currency:'EUR',positions:[]}));
 db.prepare('INSERT INTO prod_settings VALUES (?,?)').run('portfolio_valuation:portfolio-1',JSON.stringify({recorded_at:'2026-11-12T12:00:00Z',value:{complete:true,value:9900,return_pct:-1}}));
 const r=await managerStatus(env);
 assert.equal(r.queue.pending,0);
 assert.equal(r.research_followups.pending,1);
 assert.equal(r.research_followups.evidence_ready,1);
 assert.equal(r.portfolio_health.active,1);
 assert.equal(r.portfolio_health.stale,1);
 assert.equal(r.portfolio_health.never_valued,0);
 assert.match(MANAGER_STATUS_UI,/Approfondimenti economici in coda/);
 assert.match(MANAGER_STATUS_UI,/Portafogli da ricalcolare/);
 db.close();
});
