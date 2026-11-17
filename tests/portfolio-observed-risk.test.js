import test from 'node:test';
import assert from 'node:assert/strict';
import {pcObservedRisk} from '../worker/performance-charts.js';
const rows=values=>values.map((capital_value,i)=>({at:'2026-11-'+String(10+i).padStart(2,'0')+'T00:00:00Z',capital_value,issues:[]}));
test('descriptive portfolio drawdown uses only three or more recorded, verified marks',()=>{
 assert.equal(pcObservedRisk(rows([10000,9000])).observed_max_drawdown_pct,null);
 const risk=pcObservedRisk(rows([10000,11000,8800,9900]));
 assert.equal(risk.state,'observed_marks_only');
 assert.equal(risk.observed_max_drawdown_pct,20);
 assert.equal(risk.observations,4);
 assert.equal(risk.underestimates_true_max_drawdown,true);
 assert.equal(risk.period_start,'2026-11-10T00:00:00Z');
});
test('missing or questioned valuations never become drawdown zero or synthetic interpolated prices',()=>{
 assert.equal(pcObservedRisk([]).state,'insufficient_observations');
 assert.equal(pcObservedRisk(rows([10000,null,9000,9500])).observed_max_drawdown_pct,null);
 const points=rows([10000,9500,9900]);points[1].issues=['FX missing'];
 assert.equal(pcObservedRisk(points).state,'insufficient_observations');
 assert.equal(pcObservedRisk(points).missing,1);
 assert.equal(pcObservedRisk(rows([null,10000,9000])).observed_max_drawdown_pct,null);
});
