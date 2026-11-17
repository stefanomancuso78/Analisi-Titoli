// Pre-release network probes: diagnostics only, never a production source mutation.
// Run: node scripts/probe-connectors.mjs
import {writeFile,mkdir} from 'node:fs/promises';
const targets=[
 {id:'ir-alt-ENR.DE-press',url:'https://www.siemens-energy.com/global/en/home/press.html',format:'html'},
 {id:'ir-alt-ENR.DE-investor',url:'https://www.siemens-energy.com/global/en/home/investor-relations.html',format:'html'},
 {id:'ir-alt-VWS.CO-media',url:'https://www.vestas.com/en/media/company-news',format:'html'},
 {id:'ir-alt-VWS.CO-inderes-distributor',url:'https://www.inderes.dk/en/companies/Vestas-Wind-Systems',format:'html'},
 {id:'ir-alt-SU.PA-regulated',url:'https://www.se.com/ww/en/about-us/investor-relations/regulatory-information/overview/',format:'html'},
 {id:'ir-alt-VWS.CO-vestas',url:'https://www.vestas.com/en/investor/announcements',format:'html'},
 {id:'ir-alt-SU.PA-schneider',url:'https://www.se.com/ww/en/about-us/investor-relations/',format:'html'},
 {id:'ema',url:'https://www.ema.europa.eu/en/documents/report/news-json-report_en.json',format:'json',path:'data',freshness:'meta.timestamp'},
 {id:'clinical',url:'https://clinicaltrials.gov/api/v2/studies?sort=LastUpdatePostDate:desc&pageSize=10&format=json',format:'json',path:'studies'},
 {id:'federal',url:'https://www.federalregister.gov/api/v1/documents.json?per_page=10&order=newest',format:'json',path:'results'},
 {id:'europepmc',url:'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=OPEN_ACCESS:y&format=json&pageSize=10',format:'json',path:'resultList.result'},
 {id:'openalex',url:'https://api.openalex.org/works?per-page=10',format:'json',path:'results'},
 {id:'crossref',url:'https://api.crossref.org/works?rows=10',format:'json',path:'message.items'},
 {id:'sec-entities',url:'https://www.sec.gov/files/company_tickers.json',format:'json',path:null},
 {id:'sec-fallback-CSCO',url:'https://data.sec.gov/submissions/CIK0000858877.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'sec-fallback-GILD',url:'https://data.sec.gov/submissions/CIK0000882095.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'sec-fallback-LEU',url:'https://data.sec.gov/submissions/CIK0001065059.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'sec-fallback-STM',url:'https://data.sec.gov/submissions/CIK0000932787.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'sec-fallback-MA',url:'https://data.sec.gov/submissions/CIK0001141391.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'sec-SNPS',url:'https://data.sec.gov/submissions/CIK0000883241.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'sec-PLTR',url:'https://data.sec.gov/submissions/CIK0001321655.json',format:'json',path:'filings.recent.accessionNumber'},
 {id:'sec-filings',url:'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&count=40&output=atom',format:'atom'},
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
 const res=await fetch(t.url,{headers:{'User-Agent':'StokIQResearch/2.0 (research-contact: https://stokiq.online)','Accept':(t.format==='rss'||t.format==='atom')?'application/rss+xml,application/atom+xml,application/xml,text/xml':t.format==='html'?'text/html,application/xhtml+xml':'application/json'},signal:AbortSignal.timeout(12000),redirect:'follow'});
 status=res.status;contentType=res.headers.get('content-type');
 if(!res.ok){classification=status===429?'rate_limited':status===403?'blocked_403':status===401?'requires_credentials':[404,410].includes(status)?'permanent_404_410':'http_error';}
 else {
 const raw=await res.text();if(raw.length>8_000_000)throw Error('Response exceeds 8MB probe safety limit');
 if(t.format==='atom'){records=(raw.match(/<entry[\s>]/gi)||[]).length;classification=records?'reachable_atom_entries_unverified':'empty_or_parser_mismatch';}
 else if(t.format==='html'){records=(raw.match(/<a\s[^>]*href=/gi)||[]).length;classification=records?'reachable_html_links_unverified':'empty_or_dynamic_html';}
 else if(t.format==='rss'){records=(raw.match(/<item[\s>]|<entry[\s>]/gi)||[]).length;classification=records?'reachable_items_unverified':'empty_or_parser_mismatch';}
 else{const data=JSON.parse(raw);const arr=get(data,t.path);records=Array.isArray(arr)?arr.length:arr&&typeof arr==='object'?Object.keys(arr).length:0;freshness=t.freshness?get(data,t.freshness):null;classification=records?'reachable_items_unverified':'empty_or_parser_mismatch';if(freshness&&Date.now()-Date.parse(freshness)>7*86400000)classification='stale_provider_dataset';}
 }
 }catch(e){error=String(e.message||e);classification=/JSON|parse|Unexpected token/.test(error)?'parser_broken':'network_or_runtime_error';}
 return {id:t.id,url:t.url,status,contentType,records,freshness,classification,error,elapsed_ms:Date.now()-started,verified_full_text:false,verified_economic_read:false};
};
const rows=[];for(const t of targets){const r=await probe(t);rows.push(r);console.log(JSON.stringify(r));}
await mkdir('reports',{recursive:true});await writeFile('reports/connector-predeploy-probe.json',JSON.stringify({checked_at:new Date().toISOString(),scope:'external probe; NOT Sites runtime or economic interpretation',rows},null,2)+'\n');
