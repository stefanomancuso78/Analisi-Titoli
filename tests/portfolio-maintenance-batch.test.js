import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {osPortfolio,osPortfolioBatch} from '../worker/operational-steps.js';

function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
 const env={DB:{prepare(sql){let v=[];return{bind(...x){v=x;return this},async all(){return{results:db.prepare(sql).all(...v)}},async first(){return db.prepare(sql).get(...v)||null},async run(){return db.prepare(sql).run(...v)}}}}};
 for(const id of ['a','b','c','d','e'])db.prepare('INSERT INTO simulation_portfolios VALUES (?,?,?,?)').run(id,'study:fixture','2026-11-12T12:00:00Z',JSON.stringify({amount:10000,cash:10000,currency:'EUR',positions:[]}));
 return{db,env};
}
const value=async p=>({...p,value:p.cash,gain:0,return_pct:0,complete:true,execution_state:'legacy_cash'});
test('a portfolio batch is bounded to three and never revisits the same portfolio within a call',async()=>{
 const {env,db}=fixture();
 const r=await osPortfolioBatch(env,async()=>null,value,10);
 assert.equal(r.state,'completed');
 assert.equal(r.processed,3);
 assert.deepEqual(r.results.map(x=>x.portfolio_id),['a','b','c']);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key LIKE 'portfolio_valuation:%'").get().n,3);
 const r2=await osPortfolioBatch(env,async()=>null,value,3);
 assert.deepEqual(r2.results.map(x=>x.portfolio_id),['d','e','a']);
 db.close();
});
test('a held lease prevents concurrent valuation writes and retains cursor',async()=>{
 const {env,db}=fixture();
 db.prepare('INSERT INTO prod_leases VALUES (?,?,?)').run('portfolio-valuations','another-writer',Date.now()+120000);
 const r=await osPortfolio(env,async()=>null,value);
 assert.equal(r.state,'busy');
 assert.equal(r.busy,true);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key LIKE 'portfolio_valuation:%'").get().n,0);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM prod_settings WHERE key='bounded_portfolio_cursor'").get().n,0);
 db.close();
});
