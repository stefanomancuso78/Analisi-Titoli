import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {lrCycle,lrFit,lrFeatures,lrStatus,lrPolicy} from '../worker/learning-challenger.js';
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+name,'utf8'));
 const DB={prepare(sql){let args=[];return{bind(...a){args=a;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return{results:db.prepare(sql).all(...args)}},async run(){return db.prepare(sql).run(...args)}}}};
 return {db,DB};
}
const sample=(i,materiality='medium')=>({selection:{direction:'positive',materiality},values:[1,0.15,-0.02,1,materiality==='high'?1:0.5,0.5],reference_probability:0.55});
function addCase(db,id,date,fold,issuer,materiality='medium'){
 db.prepare('INSERT INTO parallel_cases VALUES (?,?,?,?,?,?)').run(id,issuer,date,fold,'open',JSON.stringify(sample(id,materiality)));
}
function mature(db,id,date,y){db.prepare('INSERT INTO parallel_outcomes VALUES (?,?,?)').run(id,date,JSON.stringify({y,gross_return:y?0.1:-0.05,net_return:y?0.098:-0.052,exit_date:date.slice(0,10)}))}
test('shadow feature learner requires real matured samples, cohorts and distinct issuers',()=>{
 const rows=Array.from({length:30},(_,i)=>({cohort:'2026-09-0'+(1+i%3),symbol:'ISS'+i%5,y:i%2,features:lrFeatures(sample(i,i%2?'high':'medium'))}));
 assert.equal(lrFit(rows.slice(0,29)),null);
 assert.equal(lrFit(rows.map(r=>({...r,cohort:'2026-09-01'}))),null);
 assert.equal(lrFit(rows.map(r=>({...r,symbol:'ONLY'}))),null);
 const weights=lrFit(rows);assert.equal(weights.length,7);
 assert.ok(weights.every(Number.isFinite));
});

test('existing historic evidence may train, but no past predictions are backfilled or promoted',async()=>{
 const e=fixture();for(let i=0;i<30;i++){
  const id='history'+i,day='2026-09-0'+(1+i%3);
  addCase(e.db,id,day+'T09:00:00.000Z','training','ISS'+(i%5),i%2?'high':'medium');
  mature(e.db,id,'2026-10-15T12:00:00.000Z',i%2);
 }
 const original=e.db.prepare('SELECT COUNT(*) n FROM parallel_cases').get().n;
 const run=await lrCycle(e,'2026-11-17T12:00:00.000Z');
 assert.equal(run.training_n,30);assert.equal(run.trained,true);
 assert.equal(run.predictions_registered,0);
 assert.equal(e.db.prepare('SELECT COUNT(*) n FROM parallel_cases').get().n,original);
 assert.equal(e.db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key LIKE 'lr:model:%'").get().n,1);
 assert.equal(e.db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key LIKE 'lr:prediction:%'").get().n,0);
 const repeat=await lrCycle(e,'2026-11-17T12:01:00.000Z');
 assert.equal(repeat.trained,false);
 assert.equal(e.db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key LIKE 'lr:model:%'").get().n,1);
 e.db.close();
});
test('new shadow forecast is pre-registered promptly with prior model, immutable after later market outcome',async()=>{
 const e=fixture();
 for(let i=0;i<30;i++){const id='hist'+i,day='2026-09-0'+(1+i%3);addCase(e.db,id,day+'T10:00:00.000Z','training','SYM'+(i%5),i%2?'high':'medium');mature(e.db,id,'2026-10-15T10:00:00.000Z',i%2)}
 await lrCycle(e,'2026-11-17T12:00:00.000Z');
 addCase(e.db,'eval-prospective','2026-11-18T12:00:00.000Z','evaluation','VWS.CO','high');
 addCase(e.db,'too-old','2026-11-17T12:05:00.000Z','evaluation','SU.PA','high');
 const run=await lrCycle(e,'2026-11-18T12:01:00.000Z');
 assert.equal(run.predictions_registered,1);
 const saved=JSON.parse(e.db.prepare("SELECT value FROM prod_settings WHERE key='lr:prediction:eval-prospective'").get().value);
 assert.ok(saved.probability>0&&saved.probability<1);
 assert.equal(saved.fold,'evaluation');assert.equal(saved.real_trade,false);
 assert.ok(saved.model_id.startsWith('economic-news-'));
 assert.equal(e.db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key='lr:prediction:too-old'").get().n,0);
 mature(e.db,'eval-prospective','2026-12-21T12:00:00.000Z',1);
 const status=await lrStatus(e);
 assert.equal(status.matured_evaluations,1);assert.ok(Number.isFinite(status.trained_brier));
 assert.equal(status.automatic_promotion,false);assert.equal(status.validated,false);
 assert.equal((await lrCycle(e,'2026-12-22T12:00:00.000Z')).predictions_registered,0);
 assert.equal(e.db.prepare("SELECT value FROM prod_settings WHERE key='lr:prediction:eval-prospective'").get().value,JSON.stringify(saved));
 e.db.close();
});
test('evaluation outcomes never train shadow challenger and future outcomes are excluded',async()=>{
 const e=fixture();for(let i=0;i<35;i++){const id='e'+i;addCase(e.db,id,'2026-09-0'+(1+i%3)+'T09:00:00.000Z','evaluation','SYM'+(i%7));mature(e.db,id,'2026-10-15T12:00:00.000Z',i%2)}
 assert.equal((await lrCycle(e,'2026-11-17T12:00:00.000Z')).training_n,0);
 assert.equal(e.db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key LIKE 'lr:model:%'").get().n,0);
 assert.equal((await lrStatus(e)).models.length,0);
 e.db.close();
});
