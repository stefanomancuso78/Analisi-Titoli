import test from 'node:test';import assert from 'node:assert/strict';import {shRefreshSelect} from '../worker/source-health.js';
const now='2026-11-16T17:00:00Z',source=(id,kind,symbol,last='2026-11-12T00:00:00Z',status='ok',next='2026-11-15T00:00:00Z')=>({id,payload:JSON.stringify({kind,symbol,enabled:true,interval:86400}),last_poll:last,last_status:status,next_poll:next});
test('overdue healthy primary coverage is served before a repeatedly failing page or a general feed',()=>{const rows=[source('news','sec-filings',null),source('bad','company','BAD',null,'error'),source('stale','sec-company','AAA')];assert.equal(shRefreshSelect(rows,0,now).next.id,'stale');assert.equal(shRefreshSelect(rows,3,now).next.id,'news')});
test('backoff and disabled sources remain ineligible even when coverage is missing',()=>{const rows=[source('blocked','company','AAA',null,'error','2026-11-17T00:00:00Z'),{...source('disabled','sec-company','BBB'),payload:JSON.stringify({kind:'sec-company',symbol:'BBB',enabled:false})}];assert.equal(shRefreshSelect(rows,0,now).next,null)});
test('coverage from another fresh primary is respected and stale sources rotate oldest first',()=>{const rows=[source('fresh','sec-company','AAA','2026-11-16T16:00:00Z','ok','2026-11-17T00:00:00Z'),source('secondary','company','AAA','2026-11-10T00:00:00Z'),source('missing','sec-company','BBB','2026-11-13T00:00:00Z')];assert.equal(shRefreshSelect(rows,0,now).next.id,'missing')});
test('empty discovery slot falls back to due primary work without forcing a future scan',()=>{const r=shRefreshSelect([source('p','sec-company','AAA')],3,now);assert.equal(r.next.id,'p');assert.equal(r.general_due,0);assert.equal(r.lane,'discovery')});

import {flBackpressure} from '../worker/flow-health.js';
test('source polling defers at queue limits without changing queue state',()=>{for(const [a,r,u] of [[30,0,0],[0,12,0],[0,0,20]])assert.equal(flBackpressure({acquisition:{pending:a,untriaged:u},reading:{pending:r}}).deferred,true);assert.equal(flBackpressure({acquisition:{pending:29,untriaged:19},reading:{pending:11}}).deferred,false);assert.equal(flBackpressure({acquisition:{pending:0},reading:{pending:0}}).deferred,false)});

import {shAssess} from '../worker/source-health.js';
test('issuer identity and financial facts do not impersonate a live issuer IR feed',()=>{const sources=[{id:'financial:issuer',config:{symbol:'ACME',kind:'issuer-index',enabled:true,interval:86400},last_status:'ok',last_poll:now},{id:'financial:facts',config:{symbol:'ACME',kind:'sec-facts',enabled:true,interval:86400},last_status:'ok',last_poll:now}];const result=shAssess([{symbol:'ACME',name:'Acme'}],sources,[],[],now);assert.equal(result.counts.primary_discovery_gaps,1);assert.equal(result.stocks[0].ir.state,'not_configured');assert.equal(result.stocks[0].financials.state,'available')});

import {readFileSync} from 'node:fs';
test('new SEC fallback identifiers agree with verified archived issuer catalog',()=>{const catalog=JSON.parse(readFileSync('research/sec-issuer-catalog.json','utf8')),production=readFileSync('worker/production.js','utf8');for(const symbol of ['CSCO','GILD','LEU','STM']){const entry=catalog.find(e=>e.symbol===symbol);assert.ok(entry,`No verified issuer for ${symbol}`);assert.ok(production.includes(`id:'sec-fallback-${symbol}'`));assert.ok(production.includes(`cik:'${entry.cik}'`));assert.ok(production.includes(entry.source))}});

test('Mastercard SEC fallback uses verified issuer identity and submission URL',()=>{const source=readFileSync('worker/production.js','utf8');assert.match(source,/id:'sec-fallback-MA'[^\n]*symbol:'MA',cik:'0001141391'[^\n]*data\.sec\.gov\/submissions\/CIK0001141391\.json/)});

test('European issuer fallbacks are official, symbol-scoped and never silently count as already polled',()=>{const src=readFileSync('worker/production.js','utf8');for(const [symbol,id,host] of [['ENR.DE','ir-alt-ENR.DE-press','www.siemens-energy.com'],['ENR.DE','ir-alt-ENR.DE-investor','www.siemens-energy.com'],['VWS.CO','ir-alt-VWS.CO-vestas','www.vestas.com'],['SU.PA','ir-alt-SU.PA-schneider','www.se.com']]){const line=src.split('\n').find(x=>x.includes("id:'"+id+"'"));assert.ok(line,id);assert.ok(line.includes("symbol:'"+symbol+"'"),id);assert.ok(line.includes(host),id);assert.ok(line.includes("discovery_paths:"),id);assert.ok(line.includes("enabled:true"),id);assert.ok(line.includes("coverage_scope:"),id)}});


import {pdSECFallbackSeed,pdSourceDelayMs,pdCycle} from '../worker/production.js';
test('SEC discovery creates an official issuer-matched backup only for unique verified ticker-CIK pairs',()=>{
 const master=[{ticker:'ACME',title:'Acme Corporation',cik_str:12345},{ticker:'ACME2',title:'Another Company',cik_str:4}],fallback=pdSECFallbackSeed('ACME',master);
 assert.equal(fallback.id,'sec-auto-ACME');assert.equal(fallback.url,'https://data.sec.gov/submissions/CIK0000012345.json');assert.equal(fallback.kind,'sec-company');assert.equal(fallback.primary,true);assert.match(fallback.coverage_scope,/does not substitute/);
 assert.equal(pdSECFallbackSeed('ACME',master,['ACME']),null);assert.equal(pdSECFallbackSeed('ACME2',master),null);assert.equal(pdSECFallbackSeed('MA',[{ticker:'MA',cik_str:1},{ticker:'MA',cik_str:2}]),null);assert.equal(pdSECFallbackSeed('NOSEC',master),null);
});
test('source retry delay backs off temporary errors and does not retry denied or rate-limited hosts rapidly',()=>{
 assert.equal(pdSourceDelayMs('error','HTTP 503',1),3600000);assert.equal(pdSourceDelayMs('error','HTTP 503',2),14400000);
 assert.equal(pdSourceDelayMs('error','HTTP 503',3),43200000);assert.equal(pdSourceDelayMs('error','HTTP 503',9),86400000);
 assert.equal(pdSourceDelayMs('error','HTTP 403',1),86400000);assert.equal(pdSourceDelayMs('rate_limited','HTTP 429',1),86400000);
 assert.equal(pdSourceDelayMs('credentials_required','EPO missing',1),86400000);
});
test('adaptive discovery budget backs off at 24h throughput imbalance without changing experiment rules',()=>{
 const balanced={acquisition:{pending:0,untriaged:0,arrivals:20,completed:25},reading:{pending:0,arrivals:20,completed:20,oldest_wait_hours:null}};
 assert.equal(flBackpressure(balanced).source_max_per_hour,4);
 assert.equal(flBackpressure({...balanced,acquisition:{...balanced.acquisition,pending:17}}).source_max_per_hour,2);
 assert.equal(flBackpressure({...balanced,reading:{...balanced.reading,pending:3}}).source_max_per_hour,1);
 assert.equal(flBackpressure({...balanced,reading:{...balanced.reading,pending:6}}).source_max_per_hour,0);
 assert.equal(flBackpressure({...balanced,reading:{...balanced.reading,arrivals:40}}).source_max_per_hour,1);
 assert.equal(flBackpressure({...balanced,acquisition:{...balanced.acquisition,arrivals:50}}).source_max_per_hour,2);
});
