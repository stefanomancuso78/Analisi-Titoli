import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {prReturn,prReconstruct,prView} from '../worker/performance-reconstruction.js';
import {pcCapture,pcGroups,PERFORMANCE_UI} from '../worker/performance-charts.js';
const now='2026-11-20T18:00:00.000Z',source='https://api.nasdaq.com/api/quote/AAA/historical';
const c={symbol:'AAA',created_at:'2026-11-10T10:00:00.000Z',net_return:999,measurement:{entry_date:'2026-11-11',entry_price:100,entry_source:source,entry_currency:'USD'}};
const quote=(day,close)=>({symbol:'AAA',trade_date:day,close,currency:'USD',source,recorded_at:'2026-11-20T10:00:00.000Z'});
const groups=[1,2,3,4].map(i=>({id:'test-'+i,label:'Test '+i,points:[{at:'2026-11-16T10:00:00.000Z',value:1},{at:now,value:i===4?null:2}]}));
const tests=[1,2,3].map(()=>({integrity:true,cases:[c]}));
test('reconstruction fills only missing completed sessions from real archived closes and labels late acquisitions',()=>{
 const quotes=[quote('2026-11-11',100),quote('2026-11-17',110),quote('2026-11-19',120)];
 const before=JSON.stringify({groups,tests,quotes});const d=prReconstruct(groups,tests,quotes,[],now);
 assert.equal(d[0].reconstruction_points.find(p=>p.valuation_date==='2026-11-17').value,(1.1*.999/1.001-1)*100);
 const missing=d[0].reconstruction_points.find(p=>p.valuation_date==='2026-11-18');assert.equal(missing.value,null);
 assert.equal(missing.state,'insufficient_archived_quotes');
 const p=d[0].reconstruction_points.find(p=>p.valuation_date==='2026-11-19');assert.equal(p.reconstructed,true);assert.equal(p.computed_at,now);assert.equal(p.inputs[0].quote_acquired_at,'2026-11-20T10:00:00.000Z');assert.equal(p.measured,1);
 assert.deepEqual(d[0].points,groups[0].points);assert.deepEqual(d[3].reconstruction_points,[]);
 assert.equal(JSON.stringify({groups,tests,quotes}),before);assert.ok(d[0].reconstruction_points.every(p=>p.valuation_date<'2026-11-20'));
});
test('future cases, same-day entry costs and missing provider/currency data cannot create historical returns',()=>{
 const future={...c,symbol:'BBB',created_at:'2026-11-18T00:00:00.000Z'};
 const d=prReconstruct(groups,[{integrity:true,cases:[c,future]},...tests.slice(1)],[quote('2026-11-17',110)],[],now);
 assert.equal(d[0].reconstruction_points.find(p=>p.valuation_date==='2026-11-17').total,1);
 assert.equal(prReturn(c,[quote('2026-11-11',100)],[],'2026-11-11',now),null);
 assert.equal(prReturn(c,[{...quote('2026-11-17',110),currency:'EUR'}],[],'2026-11-17',now),null);
 assert.equal(prReturn(c,[{...quote('2026-11-17',110),source:'https://different.example/close'}],[],'2026-11-17',now),null);
 assert.deepEqual(prReconstruct(groups,[{integrity:false,cases:[c]},...tests.slice(1)],[],[],now)[0].reconstruction_points,[]);
});
test('historical deadline never uses a later quote to inflate the terminal return',()=>{
 const d=prReturn({...c,deadline:'2026-11-17'},[quote('2026-11-17',110),quote('2026-11-19',140)],[],'2026-11-19',now);
 assert.equal(d.quote_date,'2026-11-17');assert.equal(d.net_return,1.1*.999/1.001-1);
});
test('reconstruction view is read-only and cannot backfill stored snapshots',async()=>{
 const env={DB:{prepare(sql){assert.match(sql,/^SELECT /);return {async all(){return {results:[]}}}}}};
 const d=await prView(env,{groups},{tests},now);assert.equal(d.reconstruction.kind,'retrospective_from_archived_closes');assert.match(d.reconstruction.notice,/non.*rilevazione|Non.*rilevazione/);
});
function env(){const sqlite=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));return {sqlite,DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}}}};}
test('explicit current-time capture appends despite an older null hour; no old point is rewritten',async()=>{
 const e=env(),parallel={tests:[1,2,3].map(i=>({name:'Test '+i,integrity:true,mean_net_pct:2,cases:[],priced_titles:1,total_titles:1,missing_titles:0}))},signals={mean_return_pct:null,measured:0,total:0,waiting:0,data_review:0},t4={protocol:{integrity:true},metrics:{selected:4,paired:0,avg_net_pct:null}};
 await pcCapture(e,{tests:parallel.tests.map(t=>({...t,mean_net_pct:null}))},signals,'2026-11-20T18:01:00.000Z',t4);
 const before=e.sqlite.prepare('SELECT * FROM performance_snapshots ORDER BY id').all();
 const result=await pcCapture(e,parallel,signals,'2026-11-20T18:10:00.000Z',t4,{instant:true});assert.equal(result.inserted,5);
 for(const row of before)assert.deepEqual(e.sqlite.prepare('SELECT * FROM performance_snapshots WHERE id=?').get(row.id),row);
 const d=await pcGroups(e);assert.equal(d.groups[0].points.at(-1).value,2);assert.equal(d.groups[3].points.at(-1).value,null);
 const index=readFileSync('worker/index.js','utf8'),route=index.split("if(name==='refresh_pattern_calibration'&&a.performance_capture_only)")[1].split('\n')[0];assert.doesNotMatch(route,/pfAdvance|Cycle|fetch\(/);assert.match(route,/new Date\(\)\.toISOString/);
 assert.match(PERFORMANCE_UI,/stroke-dasharray/);assert.match(PERFORMANCE_UI,/RICOSTRUZIONE RETROSPETTIVA/);
});
