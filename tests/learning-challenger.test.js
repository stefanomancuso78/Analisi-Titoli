import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {lrCycle,lrFit,lrFeatures,lrStatus,lrPolicy,lrEvaluationStats,lrTrainingQuality} from '../worker/learning-challenger.js';
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
 assert.equal((await lrStatus(e)).models[0].integrity,true);
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

test('a changed model version is detected before it can be used for prospective signals',async()=>{
 const e=fixture();
 for(let i=0;i<30;i++){const id='verify'+i,day='2026-09-0'+(1+i%3);addCase(e.db,id,day+'T09:00:00.000Z','training','SYM'+i%5,i%2?'high':'medium');mature(e.db,id,'2026-10-15T12:00:00.000Z',i%2)}
 const trained=await lrCycle(e,'2026-11-17T12:00:00.000Z');
 assert.equal(trained.trained,true);
 const item=e.db.prepare("SELECT key,value FROM prod_settings WHERE key LIKE 'lr:model:%' LIMIT 1").get(),bad=JSON.parse(item.value);
 bad.weights[0]=2.99;
 e.db.prepare('UPDATE prod_settings SET value=? WHERE key=?').run(JSON.stringify(bad),item.key);
 assert.equal((await lrStatus(e)).models[0].integrity,false);
 addCase(e.db,'new-case','2026-11-18T12:00:00.000Z','evaluation','VWS.CO');
 const next=await lrCycle(e,'2026-11-18T12:01:00.000Z');
 assert.equal(next.state,'model_integrity_review');
 assert.equal(e.db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key='lr:prediction:new-case'").get().n,0);
 e.db.close();
});

test('paired evaluation evidence is model-specific, cohort-diverse, and never an automatic validation',()=>{
 const records=Array.from({length:30},(_,i)=>({model_id:'model-A',case_id:'case-'+i,cohort:'2026-11-'+String(1+(i%6)).padStart(2,'0'),symbol:'ISS-'+(i%5),brier:.10,reference_brier:.22}));
 records.push(...Array.from({length:15},(_,i)=>({model_id:'model-B',cohort:'2026-11-'+String(1+(i%6)).padStart(2,'0'),symbol:'ISS-'+(i%5),brier:.03,reference_brier:.20})));
 const first=lrEvaluationStats(records,'model-A'),second=lrEvaluationStats(records,'model-B');
 assert.equal(first.paired_n,30);
 assert.equal(first.cohorts,6);
 assert.equal(first.issuers,5);
 assert.equal(first.review_state,'requires_independent_review');
 assert.ok(first.delta_brier>0);
 assert.equal(first.validated,false);
 assert.equal(first.automatic_promotion,false);
 assert.equal(second.paired_n,15);
 assert.equal(second.review_state,'insufficient_prospective_evidence');
 assert.equal(lrEvaluationStats(records,'not-present').brier,null);
});
test('multiple predictions from only one cohort or issuer remain statistically insufficient',()=>{
 const rows=Array.from({length:40},(_,i)=>({model_id:'single-cohort',cohort:'2026-11-17',symbol:'VWS.CO',brier:.02,reference_brier:.23}));
 const res=lrEvaluationStats(rows,'single-cohort');
 assert.equal(res.paired_n,40);
 assert.equal(res.cohorts,1);
 assert.equal(res.issuers,1);
 assert.equal(res.preliminary_brier_improvement,false);
 assert.equal(res.review_state,'insufficient_prospective_evidence');
});
test('a forecast recorded on or after its alleged outcome cannot be scored',async()=>{
 const e=fixture();
 const record={case_id:'late',symbol:'VRTX',fold:'evaluation',case_created_at:'2026-11-17T10:00:00.000Z',predicted_at:'2026-11-17T12:00:00.000Z',model_id:'economic-news-late',probability:.75,reference_probability:.60};
 e.db.prepare('INSERT INTO parallel_cases VALUES (?,?,?,?,?,?)').run('late','VRTX',record.case_created_at,'evaluation','settled','{}');
 mature(e.db,'late','2026-11-17T11:00:00.000Z',1);
 e.db.prepare('INSERT INTO prod_settings (key,value) VALUES (?,?)').run('lr:prediction:late',JSON.stringify(record));
 const status=await lrStatus(e);
 assert.equal(status.matured_evaluations,0);
 assert.equal(status.evaluation.unpaired_or_unscorable,1);
 e.db.close();
});

test('shadow learning blocks one-sided outcomes, identical features and nonfinite evidence',()=>{
 const rows=Array.from({length:35},(_,i)=>({symbol:'ISS'+i%5,cohort:'2026-11-'+String(1+i%4).padStart(2,'0'),y:i%2,features:lrFeatures(sample(i,i%2?'high':'medium'))}));
 assert.equal(lrTrainingQuality(rows).eligible,true);
 assert.equal(lrTrainingQuality(rows.map(x=>({...x,y:1}))).eligible,false);
 assert.ok(lrTrainingQuality(rows.map(x=>({...x,y:1}))).reasons.includes('imbalanced_training_outcomes'));
 assert.equal(lrFit(rows.map(x=>({...x,features:[1,0,0,0,0,0,0]}))),null);
 assert.ok(lrTrainingQuality(rows.map((x,i)=>i===0?{...x,features:[1,0,NaN,0,0,0,0]}:x)).reasons.includes('invalid_training_features_or_labels'));
});
