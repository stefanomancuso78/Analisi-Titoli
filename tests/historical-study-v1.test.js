import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {historicalStudyV1} from '../worker/historical-study-v1.js';
import {exEnsure,exStatus,exValue,exValueForProtocol,exPrepare,exActionValue} from '../worker/experiment.js';
// Real read-only snapshots are local-only; CI uses explicitly synthetic fixtures.
function syntheticFrozen(){
 const day='2020-01-06',created_at='2020-01-03T10:00:00.000Z',implementation_hash='86a4fb6ef5ce1dd38660a3a1195ea18342f18395194c0b0e2b2c58d273cf7968';
 const payload=JSON.stringify({...historicalStudyV1.rules,implementation_hash,created_at,enrollment_until:null,reference_weights:[0,.6,.3,.2],baseline_models:[]});
 const protocol={id:'study-v1',created_at,rules_hash:'f17e3fe12a364842e98d2e16ebfe04407d0dddd9ac3cccdecfaaef67f9bfac99',payload_hash:createHash('sha256').update(payload).digest('hex'),payload};
 const samples=['low','medium','high'].map(risk=>({id:'synthetic-'+risk,created_at,amount:10000,currency:'EUR',risk,symbols:['AAA','BBB','CCC','DDD']}));
 const fills=samples.flatMap(s=>s.symbols.map((symbol,i)=>({portfolio_id:s.id,symbol,trade_date:day,created_at:'2020-01-07T01:00:00.000Z',payload:JSON.stringify({symbol,allocated:500,quantity:499.5/((100+i*10)/1.1),entry_base_price:(100+i*10)/1.1,entry_close:100+i*10,source:'https://api.nasdaq.com/api/quote/'+symbol+'/historical',currency:'USD',fx:{rate:1.1,date:day,source:'https://api.frankfurter.dev/v1/'+day},fee:.5,price_basis:'raw_close'})})));
 return {protocol,samples,fills,marks:[]};
}
const frozen=process.env.STUDY_V1_PRIVATE_FIXTURE?JSON.parse(readFileSync(process.env.STUDY_V1_PRIVATE_FIXTURE,'utf8')):syntheticFrozen();
function env(){
 const sqlite=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
 const DB={prepare(sql){let args=[];return {
  bind(...a){args=a;return this},
  async first(){return sqlite.prepare(sql).get(...args)||null},
  async all(){return {results:sqlite.prepare(sql).all(...args)}},
  async run(){return sqlite.prepare(sql).run(...args)}
 };}};
 return {sqlite,DB};
}
function protocol(e,row=frozen.protocol){e.sqlite.prepare('INSERT INTO ex_protocols VALUES (?,?,?,?,?)').run(row.id,row.created_at,row.rules_hash,row.payload_hash,row.payload);}
const rows=e=>JSON.stringify(e.sqlite.prepare('SELECT * FROM ex_protocols').all());
test('recovered function text and exact exEnsure newline algorithm reproduce both frozen SHA256 hashes',async()=>{
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const implementation_hash=hash([historicalStudyV1.prepare,historicalStudyV1.value,historicalStudyV1.advance,historicalStudyV1.actionValue].map(f=>f.toString()).join('\n'));
 assert.equal(implementation_hash,'86a4fb6ef5ce1dd38660a3a1195ea18342f18395194c0b0e2b2c58d273cf7968');
 assert.deepEqual(await historicalStudyV1.hashes(),{implementation_hash,rules_hash:frozen.protocol.rules_hash});
 assert.equal(hash(JSON.stringify(historicalStudyV1.rules)+'|'+implementation_hash),frozen.protocol.rules_hash);
 assert.equal(hash(frozen.protocol.payload),frozen.protocol.payload_hash);
 assert.notEqual(historicalStudyV1.value.toString(),exValue.toString());
 assert.equal(historicalStudyV1.prepare.toString(),exPrepare.toString());
 assert.equal(historicalStudyV1.actionValue.toString(),exActionValue.toString());
});
test('frozen protocol selects verified historical engine without rewriting bytes or reopening enrollment',async()=>{
 const e=env();protocol(e);const before=rows(e),p=await exEnsure(e),status=(await exStatus(e,true)).protocol;
 assert.equal(p.payload_integrity,true);assert.equal(p.implementation_compatible,false);
 assert.equal(p.historical_engine_compatible,true);assert.equal(p.integrity,true);assert.equal(p.enrolling,false);
 assert.equal(status.active_engine,'study-v1@70d87846');assert.equal(rows(e),before);
});
test('bad frozen payload or mismatched portfolio hash cannot select the historical engine',async()=>{
 const e=env();protocol(e,{...frozen.protocol,payload_hash:'0'.repeat(64)});const before=rows(e),p=await exEnsure(e);
 assert.equal(p.payload_integrity,false);assert.equal(p.historical_engine_compatible,false);assert.equal(p.integrity,false);
 await assert.rejects(()=>exValueForProtocol(e,{protocol_id:'study-v1',protocol_hash:frozen.protocol.rules_hash},()=>{}),/non verificato/);
 assert.equal(rows(e),before);
 const good=env();protocol(good);await assert.rejects(()=>exValueForProtocol(good,{protocol_id:'study-v1',protocol_hash:'changed'},()=>{}),/non verificato/);
});
test('isolated replay uses twelve saved fills across three samples, keeping current flow behavior separate',async()=>{
 for(const sample of frozen.samples){
  const e=env();protocol(e);const fills=frozen.fills.filter(x=>x.portfolio_id===sample.id);assert.equal(fills.length,4);
  for(const f of fills){e.sqlite.prepare('INSERT INTO ex_fills VALUES (?,?,?,?,?)').run(f.portfolio_id,f.symbol,f.trade_date,f.created_at,f.payload);const x=JSON.parse(f.payload);e.sqlite.prepare('INSERT INTO market_closes VALUES (?,?,?,?,?,?,?)').run(f.symbol+f.trade_date,f.symbol,f.trade_date,x.entry_close,x.currency,x.source,f.created_at);}
  const originalMarks=frozen.marks.filter(m=>m.portfolio_id===sample.id);for(const m of originalMarks)e.sqlite.prepare('INSERT INTO ex_marks VALUES (?,?,?,?,?)').run(m.id,m.portfolio_id,m.as_of,m.created_at,m.payload);
  const first=fills[0],f=JSON.parse(first.payload),day=first.trade_date;
  const p={...sample,protocol_id:'study-v1',protocol_hash:frozen.protocol.rules_hash,positions:sample.symbols.map(symbol=>({symbol})),execution_rules:{horizon_days:30,entry_bps:10,exit_bps:10},market_benchmark:{symbol:'SPY',currency:'USD'}};
  const now=new Date(Date.parse(day+'T00:00:00Z')+2*86400000).toISOString(),fx=async()=>({...f.fx,date:day});
  const beforeFills=JSON.stringify(e.sqlite.prepare('SELECT * FROM ex_fills ORDER BY symbol').all()),beforeProtocol=rows(e);
  const old=await exValueForProtocol(e,p,fx,now),current=await exValue(e,{...p,protocol_id:'semantic-study-v2'},fx,now),routed=await exValueForProtocol(e,{...p,protocol_id:'semantic-study-v2'},fx,now);
  assert.equal(old.execution_state,'invested');assert.equal(old.as_of,day);assert.ok(Number.isFinite(old.return_pct));
  assert.equal(current.execution_state,'waiting_post_entry_close');assert.equal(current.return_pct,null);assert.deepEqual(routed,current);
  assert.equal(JSON.stringify(e.sqlite.prepare('SELECT * FROM ex_fills ORDER BY symbol').all()),beforeFills);assert.equal(rows(e),beforeProtocol);for(const m of originalMarks)assert.deepEqual({...e.sqlite.prepare('SELECT * FROM ex_marks WHERE id=?').get(m.id)},m);
 }
});
