import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {tiCalculate,tiView} from '../worker/test4-interim.js';
import {t4Ensure,t4Status} from '../worker/test4.js';
import {PERFORMANCE_HTML,PERFORMANCE_UI} from '../worker/performance-charts.js';
import {prView} from '../worker/performance-reconstruction.js';
const now='2026-11-20T19:00:00.000Z',source='https://api.nasdaq.com/api/quote/AAA/historical';
const makeCase=(symbol='AAA')=>({id:symbol,registered_at:'2026-11-17T10:00:00.000Z',entry_recorded_at:'2026-11-20T14:00:00.000Z',p:{symbol,eligible:true,selected:true,published_at:'2026-11-17T09:00:00.000Z'},entry:{date:'2026-11-18',asset_close:100,asset_source:source,benchmark_close:200,benchmark_source:source,deadline:'2026-12-18'},outcome:null});
const q=(symbol,day,close,extra={})=>({symbol,trade_date:day,close,currency:'USD',source,recorded_at:'2026-11-20T10:00:00.000Z',...extra});
const quotes=[q('AAA','2026-11-18',100),q('SPY','2026-11-18',200),q('AAA','2026-11-19',110),q('SPY','2026-11-19',204)];
test('interim is paired, post-entry, provisional and uses Test 4 symmetrical costs without changing inputs',()=>{
 const cases=[makeCase(),{...makeCase('WAIT'),entry:null,entry_recorded_at:null}],before=JSON.stringify({cases,quotes});
 const d=tiCalculate(cases,quotes,[],now);assert.equal(d.selected,2);assert.equal(d.entered,1);assert.equal(d.points.length,1);
 const p=d.points[0];assert.equal(p.valuation_date,'2026-11-19');assert.ok(Math.abs(p.value-(1.1*.999*.999-1)*100)<1e-10);assert.ok(Math.abs(p.benchmark_value-(1.02*.999*.999-1)*100)<1e-10);assert.equal(p.provisional,true);assert.equal(p.computed_at,now);assert.equal(p.measured,1);assert.equal(p.total,2);assert.equal(p.inputs[0].asset_acquired_at,'2026-11-20T10:00:00.000Z');assert.equal(JSON.stringify({cases,quotes}),before);
});
test('no carry-forward, same-day cost-only return, future acquisition or provider/currency substitution',()=>{
 assert.equal(tiCalculate([makeCase()],quotes.slice(0,2),[],now).points.length,0);
 const missing=tiCalculate([makeCase()],quotes.filter(q=>!(q.symbol==='SPY'&&q.trade_date==='2026-11-19')),[],now).points[0];assert.equal(missing.value,null);assert.equal(missing.benchmark_value,null);
 for(const extra of [{currency:'EUR'},{source:'https://wrong.example/price'},{recorded_at:'2026-11-21T10:00:00Z'}]){
  const d=tiCalculate([makeCase()],quotes.map(q=>q.symbol==='AAA'&&q.trade_date==='2026-11-19'?{...q,...extra}:q),[],now);assert.equal(d.points[0].value,null);
 }
 const today=tiCalculate([makeCase()],[...quotes,q('AAA','2026-11-20',120),q('SPY','2026-11-20',210)],[],now);assert.equal(today.points.length,1);
});
test('excludes unselected, excluded, not-yet-registered, settled and gap cases and never extends into maturity',()=>{
 for(const c of [{...makeCase(),p:{...makeCase().p,selected:false}},{...makeCase(),p:{...makeCase().p,eligible:false}},{...makeCase(),registered_at:'2026-11-21T00:00:00Z'},{...makeCase(),outcome:{kind:'settled'}},{...makeCase(),outcome:{kind:'data_gap'}}])assert.equal(tiCalculate([c],quotes,[],now).selected,0);
 const d=tiCalculate([makeCase()],[q('AAA','2026-12-18',120),q('SPY','2026-12-18',210)],[],'2026-12-19T10:00:00Z');assert.equal(d.points[0].value,null);
});
test('suspicious split cannot produce a provisional result; documented actions are applied',()=>{
 const suspicious=[q('AAA','2026-11-18',100),q('AAA','2026-11-19',50),...quotes.filter(q=>q.symbol==='SPY')];assert.equal(tiCalculate([makeCase()],suspicious,[],now).points[0].value,null);
 const actions=[{id:'split',symbol:'AAA',currency:'USD',kind:'split',effective_date:'2026-11-19',ratio:2}];
 // The frozen action schema uses numerator / denominator, not an inferred ratio.
 actions[0].numerator=2;actions[0].denominator=1;
 const applied=tiCalculate([makeCase()],suspicious,actions,now).points[0];assert.ok(Math.abs(applied.value-(.999*.999-1)*100)<1e-9);
});
function env(){const sqlite=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));return {sqlite,DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this},async all(){return {results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return sqlite.prepare(sql).run(...args)}}}}};}
test('view is read-only: frozen protocol, cases, entries, outcomes, snapshots and portfolios are identical',async()=>{
 const e=env();await t4Ensure(e,'2026-11-17T08:00:00.000Z');const c=makeCase();
 e.sqlite.prepare('INSERT INTO t4_cases VALUES (?,?,?,?,?,?,?)').run(c.id,'source',c.p.symbol,c.p.published_at,c.registered_at,1,JSON.stringify(c.p));e.sqlite.prepare('INSERT INTO t4_entries VALUES (?,?,?)').run(c.id,c.entry_recorded_at,JSON.stringify(c.entry));
 for(const [i,r] of quotes.entries())e.sqlite.prepare('INSERT INTO market_closes VALUES (?,?,?,?,?,?,?)').run(String(i),r.symbol,r.trade_date,r.close,r.currency,r.source,r.recorded_at);
 const tables=e.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name),snapshot=()=>JSON.stringify(tables.map(t=>[t,e.sqlite.prepare('SELECT * FROM "'+t+'"').all()]));
 const status=await t4Status(e),before=snapshot(),v=await tiView(e,status,quotes,[],now);assert.equal(v.state,'provisional');assert.equal(v.learning_eligible,false);assert.equal(v.official_metrics_changed,false);assert.equal(status.metrics.avg_net_pct,null);assert.equal((await t4Status(e)).metrics.paired,0);assert.equal(snapshot(),before);
 const api=await prView(e,{groups:[]},{tests:[]},now,status);assert.equal(api.test4_interim.points.length,1);assert.equal(snapshot(),before);
 const blocked=await tiView(e,{protocol:{integrity:false}},quotes,[],now);assert.equal(blocked.state,'protocol_review');assert.deepEqual(blocked.points,[]);
});
test('UI presents a separate provisional panel and readout, never relabels official Test 4 as interim',()=>{
 assert.match(PERFORMANCE_HTML,/id="performance-test4-interim"/);assert.match(PERFORMANCE_HTML,/escluso dai risultati finali e dall’addestramento/);assert.match(PERFORMANCE_UI,/PROVVISORIO CALCOLATO ORA/);assert.match(PERFORMANCE_UI,/d\.test4_interim/);assert.match(PERFORMANCE_UI,/SPY · stesse date e stessi casi/);
});
