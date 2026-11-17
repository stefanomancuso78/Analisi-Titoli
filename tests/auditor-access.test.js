import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import worker from '../worker/index.js';

function environment(){
 const sqlite=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
 const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this},async all(){return {results:sqlite.prepare(sql).all(...values)}},async first(){return sqlite.prepare(sql).get(...values)||null},async run(){return sqlite.prepare(sql).run(...values)}}},async batch(rows){sqlite.exec('BEGIN');try{for(const r of rows)await r.run();sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 return {sqlite,env:{DB,OWNER_EMAIL:'audit-owner@example.test'}};
}
test('visitor password remains enforced on UI and diagnostic API; no public bypass',async()=>{
 const {env}=environment();
 const page=await worker.fetch(new Request('https://stokiq.online/'),env);
 assert.equal(page.status,200);
 assert.match(await page.text(),/Accesso riservato/);
 const api=await worker.fetch(new Request('https://stokiq.online/api/selection'),env);
 assert.equal(api.status,401);
 assert.match(await api.text(),/Password richiesta/);
});
test('existing valid read-only visitor session can inspect UI without changing access control',async()=>{
 const {env}=environment(),token='b'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
 await env.DB.prepare('INSERT INTO auth_sessions (token_hash,expires_at) VALUES (?,?)').bind(hash,Date.now()+3600000).run();
 const page=await worker.fetch(new Request('https://stokiq.online/',{headers:{Cookie:'stokiq_session='+token}}),env);
 assert.equal(page.status,200);
 const html=await page.text();
 assert.doesNotMatch(html,/StokIQ — Accesso riservato/);
 assert.match(html,/StokIQ/);
 const expired='c'.repeat(64),expiredHash=createHash('sha256').update(expired).digest('hex');
 await env.DB.prepare('INSERT INTO auth_sessions (token_hash,expires_at) VALUES (?,?)').bind(expiredHash,Date.now()-1000).run();
 const denied=await worker.fetch(new Request('https://stokiq.online/api/selection',{headers:{Cookie:'stokiq_session='+expired}}),env);
 assert.equal(denied.status,401);
});

test('visitor session cannot enumerate registered private client portfolios or selection snapshots',async()=>{
 const {env,sqlite}=environment(),token='d'.repeat(64),device='e'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
 sqlite.prepare('INSERT INTO auth_sessions VALUES (?,?)').run(hash,Date.now()+3600000);
 const portfolio=(name,privateDetails=false)=>JSON.stringify({
  name,amount:10000,cash:10000,risk:'low',currency:'USD',
  positions:privateDetails?[{symbol:'AAA',allocated:0,quantity:0,sector:'Software',score:0.9,selection_snapshot:{secret:'client-thesis-only'}}]:[],
  selection:privateDetails?'Confidential client selection thesis':'Shared study example'
 });
 const insert=sqlite.prepare('INSERT INTO simulation_portfolios VALUES (?,?,?,?)');
 insert.run('viewer-own','device:'+device,new Date().toISOString(),portfolio('Own simulator'));
 insert.run('client-other','user:client-private',new Date().toISOString(),portfolio('Private client portfolio',true));
 insert.run('owner-other','user:owner-private',new Date().toISOString(),portfolio('Private owner portfolio',true));
 insert.run('study-example','study:semantic-study-v2',new Date().toISOString(),portfolio('Public study simulation'));
 sqlite.prepare('INSERT INTO simulation_clients VALUES (?,?,?,?)').run('other-client','user:client-private',new Date().toISOString(),JSON.stringify({name:'Confidential client name'}));
 sqlite.prepare('INSERT INTO prod_settings VALUES (?,?)').run('admin_principal:other','user:owner-private');
 const viewer=await worker.fetch(new Request('https://stokiq.online/api/simulator',{headers:{Cookie:'stokiq_session='+token+'; stokiq_simulator='+device}}),env);
 assert.equal(viewer.status,200);
 const data=await viewer.json();
 assert.equal(data.admin,false);
 assert.equal(data.view_admin,false);
 assert.deepEqual(data.portfolios.map(x=>x.id).sort(),['study-example','viewer-own']);
 assert.equal(data.clients.length,0);
 assert.doesNotMatch(JSON.stringify(data),/Confidential|client-thesis-only/);
 // A real owner role retains management access and audit visibility.
 const admin=await worker.fetch(new Request('https://stokiq.online/api/simulator',{headers:{'oai-authenticated-user-email':'audit-owner@example.test','oai-authenticated-user-id':'owner'}}),env);
 assert.equal(admin.status,200);
 const root=await admin.json();
 assert.equal(root.admin,true);
 assert.ok(root.portfolios.some(x=>x.id==='client-other'));
 assert.ok(root.portfolios.some(x=>x.id==='owner-other'));
 assert.ok(root.clients.some(x=>x.id==='other-client'));
 sqlite.close();
});
