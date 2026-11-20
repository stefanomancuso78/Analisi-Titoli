// Display-only valuation of open Test 4 cases. No ledger writes or learning inputs.
import {t4Rules,t4Series} from './test4.js';
import {exActionValue,exSplitSuspect} from './experiment.js';
const tiHost=u=>{try{return new URL(u).hostname}catch{return ''}};
export function tiCalculate(cases,quotes,actions,now){
 const today=now.slice(0,10),start=new Date(Date.parse(today+'T00:00:00Z')-90*86400000).toISOString().slice(0,10);
 const selected=cases.filter(c=>c.p.eligible&&c.p.selected&&c.p.published_at<=now&&c.registered_at<=now&&!c.outcome);
 const dates=[...new Set(quotes.filter(q=>q.trade_date>=start&&q.trade_date<today&&q.recorded_at<=now).map(q=>q.trade_date))].sort();
 const factor=(1-t4Rules.cost_entry_bps/10000)*(1-t4Rules.cost_exit_bps/10000),points=[];
 for(const day of dates){
  const known=selected.filter(c=>c.p.published_at.slice(0,10)<day),inputs=[];
  for(const c of known){
   const e=c.entry,p=c.p;
   if(!e||c.entry_recorded_at>now||!e.date||e.date<=p.published_at.slice(0,10)||day<=e.date||!e.deadline||day>=e.deadline||!(e.asset_close>0)||!(e.benchmark_close>0)||tiHost(e.asset_source)!==t4Rules.source_host||tiHost(e.benchmark_source)!==t4Rules.source_host)continue;
   const asset=t4Series(quotes,p.symbol,t4Rules.source_host,now).filter(q=>q.trade_date<=day),bench=t4Series(quotes,'SPY',t4Rules.source_host,now).filter(q=>q.trade_date<=day);
   const a=asset.find(q=>q.trade_date===day),b=bench.find(q=>q.trade_date===day);
   if(!a||!b)continue; // Never carry forward or substitute a different benchmark session.
   const aa=actions.filter(x=>x.symbol===p.symbol&&x.currency==='USD'),ba=actions.filter(x=>x.symbol==='SPY'&&x.currency==='USD');
   if(exSplitSuspect(asset,e.date,aa)||exSplitSuspect(bench,e.date,ba))continue;
   const av=exActionValue(1,e.date,day,aa),bv=exActionValue(1,e.date,day,ba);
   const net=(av.shares*a.close+av.dividends)/e.asset_close*factor-1,benchmark=(bv.shares*b.close+bv.dividends)/e.benchmark_close*factor-1;
   if(![net,benchmark].every(Number.isFinite))continue;
   inputs.push({case_id:c.id,symbol:p.symbol,entry_date:e.date,deadline:e.deadline,quote_date:day,asset_close:a.close,benchmark_close:b.close,asset_source:a.source,benchmark_source:b.source,asset_acquired_at:a.recorded_at,benchmark_acquired_at:b.recorded_at,net_pct:net*100,benchmark_pct:benchmark*100});
  }
  if(!known.some(c=>c.entry&&day>c.entry.date))continue;
  const mean=key=>inputs.length?inputs.reduce((sum,p)=>sum+p[key],0)/inputs.length:null;
  points.push({at:day+'T23:59:59.000Z',valuation_date:day,value:mean('net_pct'),benchmark_value:mean('benchmark_pct'),measured:inputs.length,total:known.length,provisional:true,computed_at:now,inputs});
 }
 return {selected:selected.length,entered:selected.filter(c=>!!c.entry).length,points};
}
export async function tiView(env,status,quotes,actions,now){
 const base={kind:'test4_open_cases_provisional',computed_at:now,provisional:true,learning_eligible:false,official_metrics_changed:false,currency:'USD',notice:'Andamento PROVVISORIO dei soli casi selezionati ancora aperti, calcolato ora dalle chiusure archiviate. Titolo e SPY sulla stessa seduta, dopo quella di ingresso; costi convenzionali di ingresso e uscita ipotetica inclusi. Nessuna interpolazione. Non è un esito maturato, una rilevazione registrata allora o un rendimento di portafoglio. Non alimenta metriche finali o addestramento. La composizione può cambiare; gli esiti maturati restano nel grafico ufficiale.'};
 if(!status?.protocol?.integrity)return {...base,state:status?.protocol?'protocol_review':'not_started',selected:0,entered:0,points:[]};
 const rows=(await env.DB.prepare('SELECT c.id,c.recorded_at,c.payload,e.created_at entry_recorded_at,e.payload entry,o.payload outcome FROM t4_cases c LEFT JOIN t4_entries e ON e.case_id=c.id LEFT JOIN t4_outcomes o ON o.case_id=c.id ORDER BY c.published_at').all()).results||[];
 const cases=rows.map(r=>({id:r.id,registered_at:r.recorded_at,p:JSON.parse(r.payload),entry_recorded_at:r.entry_recorded_at,entry:r.entry?JSON.parse(r.entry):null,outcome:r.outcome?JSON.parse(r.outcome):null}));
 const data=tiCalculate(cases,quotes,actions,now);
 return {...base,state:data.points.some(p=>Number.isFinite(p.value))?'provisional':'awaiting_post_entry_matched_close',...data};
}
