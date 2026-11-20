// Read-only retrospective valuation. Never inserts historical performance observations.
import {tiView} from './test4-interim.js';
import {exActionValue,exSplitSuspect} from './experiment.js';
const prHost=u=>{try{return new URL(u).hostname}catch{return ''}};
export function prReturn(c,quotes,actions,day,computedAt){
 const m=c.measurement||{},entry={date:m.entry_date,price:m.entry_price,source:m.entry_source,currency:m.entry_currency};
 if(!entry.date||!(entry.price>0)||!entry.source||!entry.currency||entry.date<=String(c.created_at).slice(0,10)||entry.date>=day)return null;
 const dated=new Map();
 for(const q of quotes.filter(q=>q.symbol===c.symbol&&q.trade_date<=day&&q.recorded_at<=computedAt&&q.close>0&&q.currency===entry.currency&&prHost(q.source)===prHost(entry.source)).sort((a,b)=>a.recorded_at.localeCompare(b.recorded_at)))dated.set(q.trade_date,q);
 const series=[...dated.values()].sort((a,b)=>a.trade_date.localeCompare(b.trade_date));
 const deadline=c.deadline?.slice(0,10),exit=deadline&&day>=deadline?series.find(q=>q.trade_date>=deadline):null;
 if(deadline&&day>=deadline&&!exit)return null;
 const q=exit||series.at(-1);
 // Daily reconstructions require a genuine close for that session, never a carried or interpolated price.
 if(!q||q.trade_date<=entry.date||(!exit&&q.trade_date!==day)||exit&&Date.parse(exit.trade_date)-Date.parse(deadline)>7*86400000)return null;
 const ledger=actions.filter(a=>a.symbol===c.symbol&&a.currency===entry.currency&&a.effective_date<=q.trade_date),adjusted=prHost(entry.source)==='eodhd.com';
 if(!adjusted&&exSplitSuspect(series.filter(x=>x.trade_date<=q.trade_date),entry.date,ledger))return null;
 const base=adjusted?series.find(x=>x.trade_date===entry.date)?.close:entry.price;if(!(base>0))return null;
 const action=exActionValue(1,entry.date,q.trade_date,ledger,adjusted);
 return {symbol:c.symbol,net_return:action.shares*q.close/base*.999/1.001-1,quote_date:q.trade_date,quote_acquired_at:q.recorded_at,source:q.source,currency:q.currency,entry_date:entry.date,case_published_at:c.created_at};
}
export function prReconstruct(groups,tests,quotes,actions,computedAt=new Date().toISOString()){
 const today=computedAt.slice(0,10),limit=new Date(Date.parse(today+'T00:00:00Z')-90*86400000).toISOString().slice(0,10);
 return groups.map((group,index)=>{
  if(index>2||!tests[index]?.integrity)return {...group,reconstruction_points:[]};
  const dates=group.points.map(p=>p.at.slice(0,10)).sort();if(!dates.length)return {...group,reconstruction_points:[]};
  const occupied=new Set(group.points.filter(p=>Number.isFinite(p.value)).map(p=>p.at.slice(0,10))),points=[];
  const end=dates.at(-1)<today?dates.at(-1):new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  for(let day=dates[0]>limit?dates[0]:limit;day<=end;day=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10)){
   if(occupied.has(day))continue;
   const latest=new Map();for(const c of tests[index].cases){if(c.created_at.slice(0,10)>day||!Number.isFinite(Date.parse(c.created_at)))continue;const previous=latest.get(c.symbol);if(!previous||c.created_at>previous.created_at)latest.set(c.symbol,c);}
   const values=[...latest.values()].map(c=>prReturn(c,quotes,actions,day,computedAt)).filter(Boolean);
   points.push({at:day+'T23:59:59.000Z',value:values.length?values.reduce((n,c)=>n+c.net_return,0)/values.length*100:null,measured:values.length,total:latest.size,reconstructed:true,computed_at:computedAt,valuation_date:day,state:values.length?'retrospective':'insufficient_archived_quotes',inputs:values});
  }
  return {...group,reconstruction_points:points};
 });
}
export async function prView(env,observed,parallel,computedAt=new Date().toISOString(),test4=null){
 const all=async sql=>(await env.DB.prepare(sql).all()).results||[];
 const quotes=await all('SELECT * FROM market_closes ORDER BY recorded_at'),actions=(await all('SELECT * FROM ex_actions')).map(r=>({...r,...JSON.parse(r.payload)}));
 return {...observed,test4_interim:await tiView(env,test4,quotes,actions,computedAt),groups:prReconstruct(observed.groups,parallel.tests,quotes,actions,computedAt),reconstruction:{computed_at:computedAt,kind:'retrospective_from_archived_closes',notice:'Linee continue: osservazioni registrate. Ricostruzione a tratteggio: calcolata oggi con chiusure archiviate, anche acquisite successivamente. Non è una rilevazione effettuata allora, né prova predittiva. Date, fonti e denominatori distinti; nessuna interpolazione o modifica dello storico.'}};
}
