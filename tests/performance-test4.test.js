import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {pcCapture,pcGroups,PERFORMANCE_HTML,PERFORMANCE_UI} from '../worker/performance-charts.js';

function env(){
 const sqlite=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
 return {sqlite,DB:{prepare(sql){let args=[];return{bind(...values){args=values;return this},async all(){return{results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return sqlite.prepare(sql).run(...args)}}}}};
}
const parallel={tests:[1,2,3].map(i=>({name:'Test '+i,integrity:true,mean_net_pct:null,priced_titles:0,total_titles:0,missing_titles:0,cases:[],return_basis:'No measured cases'}))};
const signals={mean_return_pct:null,measured:0,total:0,waiting:0,data_review:0,valuation_dates:[],notice:'No measured cases'};
test('Test 4 is visible as separate historical series with null until paired selected outcomes mature',async()=>{
 const e=env(),now='2026-11-17T11:00:00Z';
 let t4={protocol:{integrity:true},metrics:{selected:4,paired:0,avg_net_pct:null,cohorts:0}};
 assert.equal((await pcCapture(e,parallel,signals,now,t4)).inserted,5);
 let group=(await pcGroups(e)).groups.find(x=>x.id==='test-4');
 assert.ok(group);
 assert.equal(group.points.length,1);
 assert.equal(group.points[0].value,null);
 assert.equal(group.points[0].measured,0);
 assert.equal(group.points[0].total,4);
 assert.equal(group.points[0].metric,'selected_paired_net_return');
 assert.equal((await pcCapture(e,parallel,signals,'2026-11-17T11:35:00Z',{protocol:{integrity:true},metrics:{selected:4,paired:2,avg_net_pct:2.5,cohorts:1}})).inserted,0);
 assert.equal((await pcGroups(e)).groups.find(x=>x.id==='test-4').points[0].value,null);
 assert.equal((await pcCapture(e,parallel,signals,'2026-11-17T12:00:00Z',{protocol:{integrity:true},metrics:{selected:4,paired:2,avg_net_pct:2.5,cohorts:1}})).inserted,5);
 group=(await pcGroups(e)).groups.find(x=>x.id==='test-4');
 assert.equal(group.points[1].value,2.5);
 assert.equal(group.points[1].measured,2);
 assert.equal(group.points[1].total,4);
 assert.equal(group.points[1].benchmark,'SPY');
 assert.equal((await pcGroups(e)).groups.filter(x=>x.id.startsWith('test-')).length,4);
 assert.match(PERFORMANCE_HTML,/Come evolvono i quattro test/);
 assert.match(PERFORMANCE_UI,/quattro test/);
});
test('Unverified Test 4 protocol does not display a numerical return',async()=>{
 const e=env();
 await pcCapture(e,parallel,signals,'2026-11-17T11:00:00Z',{protocol:{integrity:false},metrics:{selected:4,paired:2,avg_net_pct:5}});
 const p=(await pcGroups(e)).groups.find(x=>x.id==='test-4').points[0];
 assert.equal(p.value,null);
 assert.equal(p.integrity,false);
});

test('cost-only same-day entry snapshots remain immutable but are not plotted as observed returns',async()=>{
 const e=env(),at='2026-11-16T16:13:50Z',entry='2026-11-13',costOnly=.999/1.001-1,details=['BWXT','ANET'].map(symbol=>({symbol,net_return:costOnly,measurement:{entry_date:entry,latest_available_date:entry,code:'measured'}}));
 e.sqlite.prepare('INSERT INTO performance_snapshots VALUES (?,?,?,?,?,?)').run('test-2|2026-11-16T16','test-2','2026-11-16T16',at,costOnly*100,JSON.stringify({label:'Test 2',integrity:true,measured:2,total:19,measurement_details:details}));
 const row=(await pcGroups(e)).groups.find(g=>g.id==='test-2').points[0];
 assert.equal(row.value,null);
 assert.equal(row.recorded_value,costOnly*100);
 assert.equal(row.excluded_cost_only_entry,true);
 assert.equal(row.state,'awaiting_post_entry_close');
 assert.equal(e.sqlite.prepare("SELECT value FROM performance_snapshots WHERE series_id='test-2'").get().value,costOnly*100);
});
