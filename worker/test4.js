// Test 4: independently preregistered prospective shadow measurement. No real orders.
// Does not mutate Tests 1–3, capital plans, training models, or historical records.
import {exActionValue,exSplitSuspect} from './experiment.js';
import {pdPredict} from './production.js';
const all=async(env,sql,...p)=>(await env.DB.prepare(sql).bind(...p).all()).results||[];
const first=async(env,sql,...p)=>env.DB.prepare(sql).bind(...p).first();
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(c=>c.toString(16).padStart(2,'0')).join('');
const day=s=>s.slice(0,10);
const later=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const host=s=>{try{return new URL(s).hostname}catch{return ''}};
const avg=rows=>rows.length?rows.reduce((v,x)=>v+x,0)/rows.length:null;
const NET_GROSS_FACTOR=.999*.999;
// No training on Test 4 outcomes; all thresholds and controls are frozen at protocol creation.
export const t4Rules=Object.freeze({
 id:'prospective-decision-v1',type:'prospective-shadow',parent:'adaptive-study-v3',
 source:'New, time-stamped qualified semantic cases from parallel_cases, only AFTER this protocol starts',
 aim:'Find out whether the economic signal adds net risk-free and broad-market value; not a claim of outperformance',
 currency:'USD',source_host:'api.nasdaq.com',benchmark:'SPY',direction:'positive',
 decision_probability_min:.55,price_only_weights:[0,.25,.2,0,0,0],
 selection:'Reference economic probability fixed at publication; all eligible cases measured, selected cases contrasted with same-date SPY and cash',
 entry:'First FULL daily close after publication UTC date, captured before that close; benchmark SAME session, no substitution',
 horizon_days:30,exit_grace_days:7,entry_gap_days:7,
 cost_entry_bps:10,cost_exit_bps:10,return_basis:'USD raw close + documented corporate actions, no taxes, no cash interest; dividends partial',
 split_policy:'Suspected undocumented split => needs_review; no synthetic prices or silent rescaling',
 minimum_paired:30,minimum_selected:20,minimum_cohorts:5,minimum_symbols:5,minimum_coverage:.9,
 decision_gate:'Paired net alpha over SPY positive with lower indicative 95pct cohort interval >0, net absolute positive and Brier economic lower than price-only',
 promotion:'NEVER automatic; no real orders; manual independent review after sample matures',
 data_limits:'Nasdaq access/licensing and corporate action coverage unverified commercially; missing dates are recorded as gaps'
});
export async function t4Ensure(env,now=new Date().toISOString()){
 const implementation=await hash([t4Decide.toString(),t4Assess.toString(),t4Series.toString()].join('\n'));
 const payload=JSON.stringify({...t4Rules,implementation_hash:implementation}),digest=await hash(payload);
 await env.DB.prepare('INSERT OR IGNORE INTO t4_protocols (id,created_at,digest,payload) VALUES (?,?,?,?)').bind(t4Rules.id,now,digest,payload).run();
 const r=await first(env,'SELECT * FROM t4_protocols WHERE id=?',t4Rules.id);
 return {...JSON.parse(r.payload),created_at:r.created_at,payload_integrity:r.digest===await hash(r.payload),implementation_compatible:r.digest===digest,integrity:r.digest===await hash(r.payload)&&r.digest===digest};
}
export function t4Decide(src,p,now,firstFutureCloseExists=false){
 const sourceDate=day(src.created_at),pScore=Number(p.reference_probability),features=p.features||{},v=p.selection||{};
 const priceScore=Array.isArray(p.values)&&p.values.length===6&&p.values.every(Number.isFinite)?pdPredict(t4Rules.price_only_weights,p.values):null;
 let exclusion=null;
 if(src.created_at>now||p.published_at!==src.created_at)exclusion='inconsistent_publication_timestamp';
 else if(v.issuer_attribution_confirmed!==true||!Array.isArray(v.citations)||!v.citations.length||v.direction!=='positive')exclusion='unqualified_economic_evidence';
 else if(host(features.quote_source)!==t4Rules.source_host||!Number.isFinite(features.baseline)||features.baseline<=0)exclusion='unverified_price_source';
 else if(!Number.isFinite(pScore)||priceScore===null||pScore<0||pScore>1)exclusion='invalid_prediction';
 else if(!features.quote_date||features.quote_date>sourceDate||Date.parse(sourceDate)-Date.parse(features.quote_date)>4*86400000)exclusion='stale_decision_quote';
 else if(firstFutureCloseExists)exclusion='late_shadow_registration';
 return {source_case_id:src.id,symbol:src.symbol,published_at:src.created_at,source_id:p.source_id||null,
  eligible:!exclusion,excluded_reason:exclusion,selected:!exclusion&&pScore>=t4Rules.decision_probability_min,
  reference_probability:Number.isFinite(pScore)?pScore:null,price_only_probability:priceScore,
  source_host:t4Rules.source_host,benchmark:t4Rules.benchmark,quote_source:features.quote_source||null,
  source_quote_date:features.quote_date||null,source_quote_close:features.baseline||null,
  cohort:sourceDate,protocol:t4Rules.id,training_fold:p.fold||src.fold||null,
  record_notice:'Selection and predictions frozen before entry; not retroactively updated by Test 3 training'};
}
export function t4Series(quotes,symbol,sourceHost,now){
 const seen=new Map();
 for(const q of [...quotes].sort((a,b)=>a.recorded_at.localeCompare(b.recorded_at))){
  if(q.symbol!==symbol||q.currency!=='USD'||!(q.close>0)||q.trade_date>=day(now)||q.recorded_at>now||host(q.source)!==sourceHost)continue;
  if(!seen.has(q.trade_date))seen.set(q.trade_date,q);
 }
 return [...seen.values()].sort((a,b)=>a.trade_date.localeCompare(b.trade_date));
}
export function t4Assess(p,entry,quotes,actions,now){
 if(!p.eligible)return {state:'excluded'};
 const symbolQuotes=t4Series(quotes,p.symbol,p.source_host,now);
 const benchmarkQuotes=t4Series(quotes,t4Rules.benchmark,p.source_host,now);
 if(!entry){
  const initial=symbolQuotes.find(q=>q.trade_date>day(p.published_at));
  if(!initial)return {state:day(now)>later(day(p.published_at),t4Rules.entry_gap_days)?'entry_price_gap':'waiting_entry'};
  const baseline=benchmarkQuotes.find(q=>q.trade_date===initial.trade_date);
  if(!baseline)return {state:day(now)>later(initial.trade_date,t4Rules.entry_gap_days)?'entry_benchmark_gap':'waiting_benchmark'};
  return {state:'entered',entry:{date:initial.trade_date,asset_close:initial.close,asset_source:initial.source,
   benchmark_close:baseline.close,benchmark_source:baseline.source,benchmark_symbol:t4Rules.benchmark,
   deadline:later(initial.trade_date,t4Rules.horizon_days),publication:p.published_at}};
 }
 const assetSeries=t4Series(quotes,p.symbol,host(entry.asset_source),now);
 const benchSeries=t4Series(quotes,t4Rules.benchmark,host(entry.benchmark_source),now);
 const candidate=assetSeries.find(q=>q.trade_date>=entry.deadline);
 if(!candidate)return {state:day(now)>later(entry.deadline,t4Rules.exit_grace_days)?'exit_price_gap':'open'};
 if(candidate.trade_date>later(entry.deadline,t4Rules.exit_grace_days))return {state:'exit_price_gap'};
 const benchmark=benchSeries.find(q=>q.trade_date===candidate.trade_date);
 if(!benchmark)return {state:day(now)>later(entry.deadline,t4Rules.exit_grace_days)?'exit_benchmark_gap':'waiting_benchmark_exit'};
 const assetActions=actions.filter(a=>a.symbol===p.symbol&&a.currency==='USD');
 const benchActions=actions.filter(a=>a.symbol===t4Rules.benchmark&&a.currency==='USD');
 if(exSplitSuspect(assetSeries.filter(q=>q.trade_date<=candidate.trade_date),entry.date,assetActions)||
    exSplitSuspect(benchSeries.filter(q=>q.trade_date<=candidate.trade_date),entry.date,benchActions))return {state:'corporate_action_review'};
 const assetAction=exActionValue(1,entry.date,candidate.trade_date,assetActions);
 const benchAction=exActionValue(1,entry.date,candidate.trade_date,benchActions);
 const assetGross=(assetAction.shares*candidate.close+assetAction.dividends)/entry.asset_close;
 const benchGross=(benchAction.shares*benchmark.close+benchAction.dividends)/entry.benchmark_close;
 if(![assetGross,benchGross].every(v=>Number.isFinite(v)&&v>0))return {state:'invalid_prices'};
 const net=assetGross*NET_GROSS_FACTOR-1,bnet=benchGross*NET_GROSS_FACTOR-1;
 return {state:'settled',outcome:{kind:'settled',entry_date:entry.date,exit_date:candidate.trade_date,
  asset_close:candidate.close,asset_source:candidate.source,benchmark_close:benchmark.close,benchmark_source:benchmark.source,
  asset_gross_return:assetGross-1,benchmark_gross_return:benchGross-1,net_return:net,benchmark_net_return:bnet,alpha:net-bnet,
  y:net>0?1:0,reference_probability:p.reference_probability,price_only_probability:p.price_only_probability,
  selected:p.selected,cohort:p.cohort,symbol:p.symbol,actions_asset:assetAction.applied,actions_benchmark:benchAction.applied,
  note:'Matched SAME-session USD returns, symmetrical conventional entry and exit costs; documented actions only'}};
}
export async function t4Cycle(env,now=new Date().toISOString()){
 const protocol=await t4Ensure(env,now);if(!protocol.integrity)return {state:'protocol_review',reason:'Frozen Test 4 rule/implementation digest mismatch'};
 const token=crypto.randomUUID();
 await env.DB.prepare("INSERT OR IGNORE INTO prod_leases (key,token,expires_at) VALUES ('test4-prospective','',0)").run();
 if(!await first(env,"UPDATE prod_leases SET token=?,expires_at=? WHERE key='test4-prospective' AND expires_at<? RETURNING token",token,Date.now()+90000,Date.now()))return {state:'busy'};
 try{
  let enrolled=0,excluded=0,entered=0,settled=0,gaps=0,review=0;
  const quotes=await all(env,'SELECT * FROM market_closes ORDER BY recorded_at');
  const cases=await all(env,"SELECT c.* FROM parallel_cases c LEFT JOIN t4_cases t ON t.source_case_id=c.id WHERE t.id IS NULL AND c.created_at>? ORDER BY c.created_at,id LIMIT 50",protocol.created_at);
  for(const src of cases){
   const p=JSON.parse(src.payload),firstFutureCloseExists=quotes.some(q=>q.symbol===src.symbol&&q.trade_date>day(src.created_at)&&q.trade_date<day(now)&&q.recorded_at<=now);
   const decision=t4Decide(src,p,now,firstFutureCloseExists);
   const id=await hash(t4Rules.id+'|'+src.id);
   await env.DB.prepare('INSERT OR IGNORE INTO t4_cases (id,source_case_id,symbol,published_at,recorded_at,eligible,payload) VALUES (?,?,?,?,?,?,?)').bind(id,src.id,src.symbol,src.created_at,now,decision.eligible?1:0,JSON.stringify(decision)).run();
   enrolled++;if(!decision.eligible)excluded++;
  }
  const pending=await all(env,'SELECT c.*,e.payload entry FROM t4_cases c LEFT JOIN t4_entries e ON e.case_id=c.id LEFT JOIN t4_outcomes o ON o.case_id=c.id WHERE c.eligible=1 AND o.case_id IS NULL ORDER BY c.published_at LIMIT 200');
  const actions=(await all(env,'SELECT * FROM ex_actions')).map(a=>({...a,...JSON.parse(a.payload)}));
  for(const r of pending){
   const p=JSON.parse(r.payload),entry=r.entry?JSON.parse(r.entry):null,assessment=t4Assess(p,entry,quotes,actions,now);
   if(assessment.entry){
    await env.DB.prepare('INSERT OR IGNORE INTO t4_entries (case_id,created_at,payload) VALUES (?,?,?)').bind(r.id,now,JSON.stringify(assessment.entry)).run();entered++;
   }else if(assessment.outcome){
    await env.DB.prepare('INSERT OR IGNORE INTO t4_outcomes (case_id,created_at,payload) VALUES (?,?,?)').bind(r.id,now,JSON.stringify(assessment.outcome)).run();settled++;
   }else if(assessment.state.endsWith('_gap')||assessment.state==='invalid_prices'){
    await env.DB.prepare('INSERT OR IGNORE INTO t4_outcomes (case_id,created_at,payload) VALUES (?,?,?)').bind(r.id,now,JSON.stringify({kind:'data_gap',reason:assessment.state,cohort:p.cohort,symbol:p.symbol,selected:p.selected})).run();gaps++;
   }else if(assessment.state==='corporate_action_review'){review++}
  }
  return {state:'completed',as_of:now,enrolled,excluded,entered,settled,gaps,review,protocol_integrity:true};
 }finally{await env.DB.prepare("UPDATE prod_leases SET expires_at=0 WHERE key='test4-prospective' AND token=?").bind(token).run()}
}
export function t4Metrics(cases){
 const eligible=cases.filter(c=>c.p.eligible),selected=eligible.filter(c=>c.p.selected),matured=eligible.filter(c=>c.outcome?.kind==='settled'),
  paired=matured.filter(c=>c.p.selected),gaps=eligible.filter(c=>c.outcome?.kind==='data_gap'),
  alphas=paired.map(c=>c.outcome.alpha),cohorts=new Map();
 for(const c of paired){const arr=cohorts.get(c.p.cohort)||[];arr.push(c.outcome.alpha);cohorts.set(c.p.cohort,arr)}
 const cohortMeans=[...cohorts.values()].map(avg),meanCohort=avg(cohortMeans);
 const variance=cohortMeans.length>=2?cohortMeans.reduce((s,x)=>s+(x-meanCohort)**2,0)/(cohortMeans.length-1):null;
 const lower=variance===null?null:meanCohort-1.96*Math.sqrt(variance/cohortMeans.length);
 const brier=x=>avg(matured.map(c=>(c.p[x]-c.outcome.y)**2));
 const economicBrier=brier('reference_probability'),priceOnlyBrier=brier('price_only_probability');
 const pairedCoverage=selected.length?paired.length/(paired.length+gaps.filter(c=>c.p.selected).length):null;
 const avgNet=avg(paired.map(c=>c.outcome.net_return)),avgBench=avg(paired.map(c=>c.outcome.benchmark_net_return));
 const symbols=new Set(paired.map(c=>c.p.symbol)).size;
 const minimums=paired.length>=t4Rules.minimum_paired&&matured.length>=t4Rules.minimum_paired&&
  cohorts.size>=t4Rules.minimum_cohorts&&symbols>=t4Rules.minimum_symbols&&
  (pairedCoverage??0)>=t4Rules.minimum_coverage;
 const positive=minimums&&lower!==null&&lower>0&&avgNet>0&&economicBrier!==null&&economicBrier<priceOnlyBrier;
 return {source_cases:cases.length,eligible:eligible.length,selected:selected.length,entered:eligible.filter(c=>!!c.entry).length,
  matured:matured.length,paired:paired.length,gaps:gaps.length,excluded:cases.length-eligible.length,
  cohorts:cohorts.size,symbols,paired_coverage:pairedCoverage,avg_net_pct:avgNet===null?null:100*avgNet,
  avg_benchmark_pct:avgBench===null?null:100*avgBench,avg_alpha_pp:alphas.length?100*avg(alphas):null,
  cohort_ci_lower_pp:lower===null?null:100*lower,reference_brier:economicBrier,price_only_brier:priceOnlyBrier,
  decision:positive?'preliminary_positive_requires_independent_review':minimums?'no_demonstrated_advantage':'insufficient_prospective_evidence',
  automatic_promotion:false,statistics_note:'Cohort-normal approximation is indicative; same-day and overlapping events may be correlated. No trading claim.'};
}
export async function t4Status(env){
 const row=await first(env,'SELECT * FROM t4_protocols WHERE id=?',t4Rules.id);
 if(!row)return {state:'not_started',protocol:null,metrics:t4Metrics([]),notice:'Avviare Test 4 solo tramite ciclo autenticato; nessun dato retrodatato'};
 const expected=await hash(JSON.stringify({...t4Rules,implementation_hash:await hash([t4Decide.toString(),t4Assess.toString(),t4Series.toString()].join('\n'))}));
 const integrity=row.digest===await hash(row.payload)&&row.digest===expected;
 const result=await all(env,'SELECT c.*,e.payload entry,o.payload outcome FROM t4_cases c LEFT JOIN t4_entries e ON e.case_id=c.id LEFT JOIN t4_outcomes o ON o.case_id=c.id ORDER BY c.published_at DESC LIMIT 1000');
 const cases=result.map(r=>({id:r.id,symbol:r.symbol,p:JSON.parse(r.payload),entry:r.entry?JSON.parse(r.entry):null,outcome:r.outcome?JSON.parse(r.outcome):null}));
 return {state:integrity?'running':'protocol_review',protocol:{...JSON.parse(row.payload),created_at:row.created_at,integrity,payload_integrity:row.digest===await hash(row.payload),implementation_compatible:row.digest===expected},
  metrics:t4Metrics(cases),recent:cases.slice(0,20).map(c=>({id:c.id,symbol:c.symbol,published_at:c.p.published_at,selected:c.p.selected,
   eligible:c.p.eligible,excluded_reason:c.p.excluded_reason,entry_date:c.entry?.date||null,
   exit_date:c.outcome?.exit_date||null,net_return:c.outcome?.net_return??null,alpha:c.outcome?.alpha??null,
   outcome:c.outcome?.kind||null})),notice:'Nuove decisioni prospettiche, controllo SPY sulle stesse date; nessuna modifica ai test storici. Nessuna conclusione finché le coorti non maturano.'};
}
