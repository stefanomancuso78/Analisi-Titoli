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
