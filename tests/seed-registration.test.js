import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {pdEnsureSeeds} from '../worker/production.js';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
 const DB={prepare(sql){let args=[];return{bind(...a){args=a;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return sqlite.prepare(sql).run(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}}}}};
 return {sqlite,DB};
}
test('new Inderes and Business Wire catalog seeds register once without polling or overwriting existing backoffs',async()=>{
 const e=fixture(),old='2026-11-21T10:00:00.000Z';
 e.sqlite.prepare('INSERT INTO prod_sources (id,payload,next_poll,last_status,last_error) VALUES (?,?,?,?,?)').run('agg-businesswire-earnings',JSON.stringify({kind:'aggregator-rss',enabled:true,url:'https://example.org/previous-feed',symbol:null}),old,'rate_limited','HTTP 429');
 const first=await pdEnsureSeeds(e);
 assert.equal(first.state,'registered');
 const wire=e.sqlite.prepare("SELECT * FROM prod_sources WHERE id='agg-businesswire-earnings'").get();
 assert.equal(wire.next_poll,old);assert.equal(wire.last_status,'rate_limited');assert.equal(wire.last_error,'HTTP 429');
 assert.equal(JSON.parse(wire.payload).url,'https://example.org/previous-feed');
 const vestas=e.sqlite.prepare("SELECT * FROM prod_sources WHERE id='ir-alt-VWS.CO-inderes-distributor'").get();
 assert.ok(vestas);assert.equal(vestas.next_poll,'');
 assert.match(vestas.payload,/inderes\.dk/);
 assert.equal((await pdEnsureSeeds(e)).state,'unchanged');
 assert.equal(e.sqlite.prepare("SELECT COUNT(*) n FROM prod_sources WHERE id='ir-alt-VWS.CO-inderes-distributor'").get().n,1);
 e.sqlite.close();
});
