import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {gLinks,gCompanyEvents} from '../worker/graph.js';

function env(){
 const sqlite=new DatabaseSync(':memory:');
 for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+name,'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}}};
 return {sqlite,DB};
}
test('Inderes issuer-distribution releases include only Vestas-titled disclosures and enforce same-host URL',async()=>{
 const e=env(),prior=globalThis.fetch;
 const base='https://www.inderes.dk/en/companies/Vestas-Wind-Systems';
 const html='<html><body>'+Array.from({length:45},(_,i)=>'<a href="/en/releases/analyst-report-'+i+'">Independent analyst commentary '+i+'</a>').join('')+
 '<a href="/en/releases/vestas-interim-report-q3-2026">Vestas – Interim Report, Third Quarter 2026</a>'+
 '<a href="/en/releases/vestas-order-intake">Vestas Wind Systems A/S: Vestas receives a new order</a>'+ 
 '<a href="/en/releases/transactions-in-connection-with-share-buy-back-programme">Transactions in connection with share buy-back programme 30 July - 5 August 2026</a>'+ 
 '<a href="https://evil.example/en/releases/vestas-rumor">Vestas fake release</a></body></html>';
 let attempts=0;
 globalThis.fetch=async()=>{attempts++;return new Response(html,{status:200,headers:{'Content-Type':'text/html'}})};
 try{
  const all=gLinks(html,base,['/en/releases/'],24);
  assert.ok(all.length>=8);
  const r=await gCompanyEvents(e,{id:'ir-alt-VWS.CO-inderes-distributor',symbol:'VWS.CO',kind:'company',primary:true,url:base,discovery_paths:['/en/releases/'],required_title_terms:['Vestas'],allowed_release_title_patterns:['Transactions in connection with share buy-back programme']});
  assert.equal(r.length,3);assert.equal(attempts,1);
  assert.ok(r.every(x=>x.url.startsWith('https://www.inderes.dk/en/releases/')));
  assert.equal(e.sqlite.prepare("SELECT COUNT(*) n FROM graph_jobs").get().n,3);
 }finally{globalThis.fetch=prior;e.sqlite.close()}
});
test('unreadable or unrelated Inderes listing is not falsely counted as successful source acquisition',async()=>{
 const e=env(),old=globalThis.fetch;
 globalThis.fetch=async()=>new Response('<a href="/en/articles/vestas-outlook">Analyst speculation about Vestas</a>',{headers:{'Content-Type':'text/html'}});
 try{await assert.rejects(()=>gCompanyEvents(e,{id:'distributor',symbol:'VWS.CO',url:'https://www.inderes.dk/en/companies/Vestas-Wind-Systems',discovery_paths:['/en/releases/'],required_title_terms:['Vestas']}),/No readable release links/);assert.equal(e.sqlite.prepare('SELECT COUNT(*) n FROM graph_jobs').get().n,0)}
 finally{globalThis.fetch=old;e.sqlite.close()}
});
