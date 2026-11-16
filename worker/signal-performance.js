// Read-only descriptive view. Does not change selection, forecasts or study rules.
import {exActionValue,exSplitSuspect} from './experiment.js';
const spHost=s=>{try{return new URL(s).hostname.replace(/^www\./,'')}catch{return null}};
export function spCalculate(research,quotes,actions=[],now=new Date().toISOString()){
 const day=now.slice(0,10),signals=new Map();
 for(const r of research){if(r.kind!=='signal'||!r.verified||/tecnico sperimentale|M1D-v0|esperimento meccanico/i.test(r.summary||''))continue;const date=Number.isFinite(Date.parse(r.created_at))&&r.created_at<=now?r.created_at:null;const old=signals.get(r.symbol);if(!old||date&&(!old.registered_at||date<old.registered_at))signals.set(r.symbol,{symbol:r.symbol,registered_at:date});}
 const items=[...signals.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)).map(s=>{
  const base={...s,return_pct:null,state:'waiting',reason:'In attesa di due chiusure successive al segnale.'};
  if(!s.registered_at)return {...base,state:'data_review',reason:'Data di registrazione non verificabile.'};
  const rows=quotes.filter(q=>q.symbol===s.symbol&&q.trade_date>s.registered_at.slice(0,10)&&q.trade_date<day&&q.recorded_at<=now&&q.close>0&&Number.isFinite(q.close)&&spHost(q.source)).sort((a,b)=>a.trade_date.localeCompare(b.trade_date)||a.recorded_at.localeCompare(b.recorded_at)||(a.id||'').localeCompare(b.id||''));
  const first=rows[0];if(!first)return base;
  const provider=spHost(first.source),adjusted=provider==='eodhd.com',series=new Map();
  for(const q of rows.filter(q=>spHost(q.source)===provider&&q.currency===first.currency)){
   // Raw observations stay at their first recorded value; adjusted history must share one acquisition vintage.
   if(adjusted&&q.recorded_at!==first.recorded_at)continue;
   if(!series.has(q.trade_date))series.set(q.trade_date,q);
  }
  const prices=[...series.values()],last=prices.at(-1),context={...base,entry_date:first.trade_date,entry_price:first.close,currency:first.currency,source:first.source,as_of:last.trade_date,last_price:last.close,days_observed:prices.length};
  if(prices.length<2)return context;
  const ledger=actions.filter(a=>a.symbol===s.symbol&&a.currency===first.currency&&a.created_at<=now);
  if(!adjusted&&exSplitSuspect(prices,first.trade_date,ledger))return {...context,state:'data_review',reason:'Possibile operazione societaria da verificare.'};
  if(Date.parse(day)-Date.parse(last.trade_date)>4*86400000)return {...context,state:'data_review',reason:'Ultima chiusura non recente; escluso dalla media.'};
  const split=exActionValue(1,first.trade_date,last.trade_date,ledger,adjusted),value=100*(last.close*split.shares/first.close-1);
  return {...context,state:'measured',reason:null,return_pct:value,holding_days:(Date.parse(last.trade_date)-Date.parse(first.trade_date))/86400000,adjustment:split.coverage};
 });
 const measured=items.filter(r=>r.state==='measured'),values=measured.map(r=>r.return_pct).sort((a,b)=>a-b),n=values.length;
 return {method:'signal-equal-weight-price-v1',as_of:now,total:items.length,measured:n,waiting:items.filter(r=>r.state==='waiting').length,data_review:items.filter(r=>r.state==='data_review').length,mean_return_pct:n?values.reduce((a,b)=>a+b,0)/n:null,median_return_pct:n?(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2:null,positive:values.filter(x=>x>0).length,positive_pct:n?100*values.filter(x=>x>0).length/n:null,valuation_dates:[...new Set(measured.map(r=>r.as_of))].sort(),items,notice:'Una volta per titolo, stesso peso: media delle variazioni percentuali nella valuta del titolo, dalla prima chiusura successiva alla registrazione del segnale all’ultima chiusura completa disponibile. Durate e date possono differire. Non è rendimento di portafoglio né accuratezza predittiva; costi, dividendi, tasse e cambio esclusi. Anche le perdite restano nel campione; dati insufficienti o da verificare esclusi con motivazione. Il campione cresce con i nuovi segnali: variazioni della media possono dipendere dalla composizione.'};
}
export async function spStatus(env){const all=async sql=>(await env.DB.prepare(sql).all()).results||[];const research=(await all('SELECT id,created_at,payload FROM research')).map(r=>({...JSON.parse(r.payload),id:r.id,created_at:r.created_at}));return spCalculate(research,await all('SELECT * FROM market_closes'),(await all('SELECT * FROM ex_actions')).map(a=>({...a,...JSON.parse(a.payload),id:a.id,symbol:a.symbol,effective_date:a.effective_date,created_at:a.created_at})));}
export const SIGNAL_PERFORMANCE_UI=String.raw`
function signalPerformanceHTML(d){const pct=v=>v==null?'—':(v>0?'+':'')+number(v)+'%';return '<div class="eyebrow">Segnali documentali · stesso peso</div>'+'<h3>Rendimento medio dei titoli da segnali</h3><div class="coverage-metrics">'+productionMetric('Rendimento medio',pct(d.mean_return_pct))+productionMetric('Mediana',pct(d.median_return_pct))+productionMetric('Titoli misurabili',d.measured+' / '+d.total)+productionMetric('Titoli positivi',d.measured?d.positive+' / '+d.measured+' · '+number(d.positive_pct)+'%':'—')+'</div><p class="small">'+(d.measured?'Date di valorizzazione: '+d.valuation_dates.map(esc).join(' · ')+'.':'In attesa di quotazioni successive ai segnali: nessuno zero artificiale nella media.')+' In attesa: '+d.waiting+' · Da verificare: '+d.data_review+'. Aggiornato '+fmt(d.as_of)+'.</p><details><summary>Come si calcola · dettaglio dei titoli</summary><p class="small">'+esc(d.notice)+'</p><div class="stock-grid">'+d.items.map(r=>'<article class="research-card"><button class="tile-link" type="button" data-stock-kind="symbol" data-stock-id="'+esc(r.symbol)+'">'+esc(r.symbol)+' →</button><strong>'+pct(r.return_pct)+'</strong><p class="small">Segnale registrato '+(r.registered_at?fmt(r.registered_at):'da verificare')+'<br>'+(r.entry_date?'Riferimento '+esc(r.entry_date)+' · '+number(r.entry_price)+' '+esc(r.currency)+'<br>Ultima '+esc(r.as_of)+' · '+number(r.last_price)+' '+esc(r.currency):'')+'</p>'+(r.reason?'<p class="small">'+esc(r.reason)+'</p>':'<p class="small">'+r.holding_days+' giorni · '+r.days_observed+' chiusure</p>')+(r.source?'<p>'+dossierLink(r.source)+'</p>':'')+'</article>').join('')+'</div></details>'}
async function signalPerformanceLoad(){try{const r=await fetch('/api/signal-performance'),d=await r.json();if(!r.ok)throw Error(d.error||'Sintesi non disponibile');document.querySelectorAll('.signal-performance-summary').forEach(el=>el.innerHTML=signalPerformanceHTML(d))}catch(e){document.querySelectorAll('.signal-performance-summary').forEach(el=>el.textContent=e.message)}}
signalPerformanceLoad();
`;
