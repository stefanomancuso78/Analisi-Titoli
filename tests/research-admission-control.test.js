import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {rfPlanBudget,rfPlan,rfEnsure} from '../worker/research.js';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+name,'utf8'));
 const DB={prepare(sql){let a=[];return{bind(...v){a=v;return this},async all(){return{results:sqlite.prepare(sql).all(...a)}},async first(){return sqlite.prepare(sql).get(...a)||null},async run(){return sqlite.prepare(sql).run(...a)}}}};
 return {sqlite,DB};
}
function assessment(db,n,decision='research_only',kind='high'){
 const id='a'+n,doc='doc'+n,at='2026-09-01T00:00:00.000Z';
 db.prepare('INSERT INTO graph_documents VALUES (?,?,?,?,?,?,?)').run(doc,'https://example.org/'+doc,'hash'+n,'Issuer disclosure',at,at,JSON.stringify({text:'Company announcement '.repeat(50),issuer:'SYM'+n,primary:true,extraction_basis:'document_text'}));
 const data={event_summary:'Company disclosure '+n,document_url:'https://example.org/'+doc,direction:kind==='high'?'positive':'neutral',materiality:kind==='high'?'high':'low',timeframe:'unknown',issuer_attribution_confirmed:true};
 db.prepare('INSERT INTO semantic_analyses VALUES (?,?,?,?,?,?,?)').run(id,doc,'SYM'+n,at,'test',decision,JSON.stringify(data));
 return id;
}
test('live-load intake keeps the ordinary budget even with backlog and preserves daily provider-independent caps',()=>{
 assert.deepEqual(rfPlanBudget(718,0),{mode:'backlog_drain',daily_limit:24,remaining:24,backlog_reserved_share:0.75});
 assert.equal(rfPlanBudget(718,12).remaining,12);
 assert.equal(rfPlanBudget(5,0).daily_limit,24);
 assert.equal(rfPlanBudget(99,0).daily_limit,24);
 assert.equal(rfPlanBudget(60,5).remaining,19);
 assert.equal(rfPlanBudget(59,24).remaining,0);
 assert.equal(rfPlanBudget(100,23).remaining,1);
});
test('research planner does not delete backlog and defers routine cases while congested',async()=>{
 const env=fixture(),db=env.sqlite;
 const kinds=['financial_context','timing_execution','counter_evidence','expectations'];
 for(let i=0;i<35;i++){const a=assessment(db,i,'research_only','high');for(const kind of kinds)db.prepare('INSERT INTO research_jobs VALUES (?,?,?,?,?,?,0,?,NULL,?,?,?)').run('existing-'+i+'-'+kind,a,'SYM'+i,kind,'pending',kind==='financial_context'?70:50,'2026-10-01T00:00:00.000Z','2026-10-01T00:00:00.000Z','2026-10-01T00:00:00.000Z','{}')}
 for(let i=35;i<49;i++)assessment(db,i,'qualified','high');
 assessment(db,49,'research_only','low');
 const before=db.prepare('SELECT COUNT(*) n FROM research_jobs').get().n;
 db.prepare('INSERT INTO prod_settings VALUES (?,?)').run('h24_capacity',JSON.stringify({at:new Date().toISOString(),created_24h:100,closed_24h:0}));
 const first=await rfPlan(env);
 assert.equal(first.mode,'backlog_drain');assert.equal(first.daily_limit,24);assert.equal(first.created,24);
 assert.equal(first.deferred,true);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM research_jobs WHERE analysis_id='a49'").get().n,0);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM research_jobs").get().n,before+24);
 const second=await rfPlan(env);
 assert.equal(second.created,0);assert.equal(second.new_today,24);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM research_jobs WHERE state='pending'").get().n,before+24);
 const protocol=await rfEnsure(env);assert.equal(protocol.integrity,true);
 db.close();
});

test('new source publication outranks old qualified assessments even when the old file was just acquired',async()=>{
 const e=fixture();assessment(e.sqlite,1,'qualified');assessment(e.sqlite,2);
 e.sqlite.prepare("UPDATE graph_documents SET published_at='2026-11-20T00:00:00Z',acquired_at='2026-11-20T00:00:00Z' WHERE id='doc2'").run();
 e.sqlite.prepare("UPDATE graph_documents SET acquired_at='2026-11-21T00:00:00Z' WHERE id='doc1'").run();
 await rfPlan(e);
 assert.equal(e.sqlite.prepare('SELECT analysis_id FROM research_jobs ORDER BY rowid LIMIT 1').get().analysis_id,'a2');
 assert.equal((await rfEnsure(e)).integrity,true);
});
