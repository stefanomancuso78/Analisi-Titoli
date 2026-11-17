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
test('75% backlog reservation: new admissions capped at 12/day in drain mode, 24/day otherwise',()=>{
 assert.deepEqual(rfPlanBudget(718,0),{mode:'backlog_drain',daily_limit:12,remaining:12,backlog_reserved_share:0.75});
 assert.equal(rfPlanBudget(718,12).remaining,0);
 assert.equal(rfPlanBudget(5,0).daily_limit,24);
 assert.equal(rfPlanBudget(100,23).remaining,1);
});
test('research planner does not delete backlog and defers routine cases while congested',async()=>{
 const env=fixture(),db=env.sqlite;
 const kinds=['financial_context','timing_execution','counter_evidence','expectations'];
 for(let i=0;i<35;i++){const a=assessment(db,i,'research_only','high');for(const kind of kinds)db.prepare('INSERT INTO research_jobs VALUES (?,?,?,?,?,?,0,?,NULL,?,?,?)').run('existing-'+i+'-'+kind,a,'SYM'+i,kind,'pending',kind==='financial_context'?70:50,'2026-10-01T00:00:00.000Z','2026-10-01T00:00:00.000Z','2026-10-01T00:00:00.000Z','{}')}
 for(let i=35;i<49;i++)assessment(db,i,'qualified','high');
 assessment(db,49,'research_only','low');
 const before=db.prepare('SELECT COUNT(*) n FROM research_jobs').get().n;
 const first=await rfPlan(env);
 assert.equal(first.mode,'backlog_drain');assert.equal(first.daily_limit,12);assert.equal(first.created,12);
 assert.equal(first.deferred,true);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM research_jobs WHERE analysis_id='a49'").get().n,0);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM research_jobs").get().n,before+12);
 const second=await rfPlan(env);
 assert.equal(second.created,0);assert.equal(second.new_today,12);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM research_jobs WHERE state='pending'").get().n,before+12);
 const protocol=await rfEnsure(env);assert.equal(protocol.integrity,true);
 db.close();
});
