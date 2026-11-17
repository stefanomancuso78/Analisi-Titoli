// Pre-release network probes: diagnostics only, never a production source mutation.
// Run: node scripts/probe-connectors.mjs
import {writeFile,mkdir} from 'node:fs/promises';
const targets=[
 {id:'ema',url:'https://www.ema.europa.eu/en/documents/report/news-json-report_en.json',format:'json',path:'data',freshness:'meta.timestamp'},
 {id:'clinical',url:'https://clinicaltrials.gov/api/v2/studies?sort=LastUpdatePostDate:desc&pageSize=10&format=json',format:'json',path:'studies'},
 {id:'federal',url:'https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest',format:'json',path:'results'},
 {id:'europepmc',url:'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=OPEN_ACCESS:y&format=json&pageSize=10',format:'json',path:'resultList.result'},
 {id:'openalex',url:'https://api.openalex.org/works?per-page=10',format:'json',path:'results'},
 {id:'crossref',url:'https://api.crossref.org/works?rows=10',format:'json',path:'message.items'},
 {id:'sec-entities',url:'https://www.sec.gov/files/company_tickers.json',format:'json',path:null},
 {id:'sec-PLTR',url:'https://data.sec.gov/submissions/CIK0001321655.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'fda',url:'https://api.fda.gov/drug/drugsfda.json?limit=10',format:'json',path:'results'},
 {id:'agg-nasdaq-nordic-news',url:'https://api.news.eu.nasdaq.com/news/rss/nasdaqNordicNews',format:'rss'},
 {id:'agg-businesswire-earnings',url:'https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEF9YXA==',format:'rss'},
 {id:'agg-globenewswire-alternative',url:'https://www.globenewswire.com/rss/list',format:'rss'},
 {id:'agg-globenewswire-public',url:'https://www.globenewswire.com/RssFeed/orgclass/1/feedTitle/GlobeNewswire%20-%20News%20about%20Public%20Companies',format:'rss'}
];
const get=(x,path)=>path?path.split('.').reduce((v,k)=>v?.[k],x):x;
const probe=async t=>{
 const started=Date.now();let status=null,contentType=null,records=0,freshness=null,classification='unverified',error=null;
 try{
 const res=await fetch(t.url,{headers:{'User-Agent':'StokIQResearch/2.0 (research-contact: https://stokiq.online)','Accept':t.format==='rss'?'application/rss+xml,application/atom+xml,application/xml,text/xml':'application/json'},signal:AbortSignal.timeout(12000),redirect:'follow'});
 status=res.status;contentType=res.headers.get('content-type');
 if(!res.ok){classification=status===429?'rate_limited':status===403?'blocked_403':status===401?'requires_credentials':[404,410].includes(status)?'permanent_404_410':'http_error';}
 else {
 const raw=await res.text();if(raw.length>8_000_000)throw Error('Response exceeds 8MB probe safety limit');
 if(t.format==='rss'){records=(raw.match(/<item[\s>]|<entry[\s>]/gi)||[]).length;classification=records?'reachable_items_unverified':'empty_or_parser_mismatch';}
 else{const data=JSON.parse(raw);const arr=get(data,t.path);records=Array.isArray(arr)?arr.length:arr&&typeof arr==='object'?Object.keys(arr).length:0;freshness=t.freshness?get(data,t.freshness):null;classification=records?'reachable_items_unverified':'empty_or_parser_mismatch';if(freshness&&Date.now()-Date.parse(freshness)>7*86400000)classification='stale_provider_dataset';}
 }
 }catch(e){error=String(e.message||e);classification=/JSON|parse|Unexpected token/.test(error)?'parser_broken':'network_or_runtime_error';}
 return {id:t.id,url:t.url,status,contentType,records,freshness,classification,error,elapsed_ms:Date.now()-started,verified_full_text:false,verified_economic_read:false};
};
const rows=[];for(const t of targets){const r=await probe(t);rows.push(r);console.log(JSON.stringify(r));}
await mkdir('reports',{recursive:true});await writeFile('reports/connector-predeploy-probe.json',JSON.stringify({checked_at:new Date().toISOString(),scope:'external probe; NOT Sites runtime or economic interpretation',rows},null,2)+'\n');
