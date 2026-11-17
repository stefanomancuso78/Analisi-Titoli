import test from 'node:test';
import assert from 'node:assert/strict';
import {osPortfolioSnapshot} from '../worker/operational-steps.js';
import {readFileSync} from 'node:fs';

const snap=(recorded_at,override={})=>({recorded_at,value:{
 id:'p',currency:'EUR',value:10120,gain:120,return_pct:1.2,gross_return_pct:1.5,
 complete:true,as_of:'2026-11-16',benchmarks:{equal_weight:{return_pct:0.9},market:{return_pct:0.2}},
 ...override
}});
const now=Date.parse('2026-11-17T12:00:00Z');

test('recent complete valuation retains recorded close and its provenance',()=>{
 const x=osPortfolioSnapshot(snap('2026-11-16T17:00:00Z'),now);
 assert.equal(x.value,10120);
 assert.equal(x.return_pct,1.2);
 assert.equal(x.as_of,'2026-11-16');
 assert.equal(x.valuation_stale,false);
 assert.equal(x.valuation_recorded_at,'2026-11-16T17:00:00Z');
});

test('old portfolio snapshot never masquerades as current but preserves separately dated last value',()=>{
 const x=osPortfolioSnapshot(snap('2026-11-14T12:00:00Z'),now);
 assert.equal(x.valuation_stale,true);
 assert.equal(x.execution_state,'valuation_stale');
 assert.equal(x.value,null);
 assert.equal(x.return_pct,null);
 assert.equal(x.gross_return_pct,null);
 assert.equal(x.benchmarks,null);
 assert.equal(x.last_observed.value,10120);
 assert.equal(x.last_observed.return_pct,1.2);
 assert.equal(x.last_observed.as_of,'2026-11-16');
 assert.equal(x.last_observed.recorded_at,'2026-11-14T12:00:00Z');
});

test('incomplete, unverified and missing snapshots cannot receive last observed performance',()=>{
 assert.equal(osPortfolioSnapshot(null,now),null);
 assert.equal(osPortfolioSnapshot(snap('2026-11-10T12:00:00Z',{complete:false}),now).last_observed,null);
 assert.equal(osPortfolioSnapshot(snap('invalid'),now).valuation_stale,true);
 assert.equal(osPortfolioSnapshot(snap('2026-11-10T12:00:00Z',{value:null}),now).last_observed,null);
});

test('portfolio UI labels stale observations, dates, and withheld current values separately',()=>{
 const code=readFileSync('worker/index.js','utf8');
 assert.match(code,/Ultima valorizzazione verificata \(NON corrente\)/);
 assert.match(code,/Rilevazione di background scaduta/);
 assert.match(code,/Non utilizzare come segnale di trading/);
});
