import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteSweepSymbols} from '../worker/quote-rotation.js';
import {readFileSync} from 'node:fs';

test('bounded quote sweep rotates all four Test 4 pending symbols without starving VRTX',()=>{
 const pending=['VRTX','NXT','REGN','HON'];
 const seen=new Set();
 for(let i=0;i<4;i++){
  const time=new Date((1000+i)*18*3600000).toISOString();
  const result=quoteSweepSymbols(pending,time);
  assert.equal(result.length,4);
  assert.equal(result[0],'AMD');
  assert.equal(new Set(result).size,4);
  for(const symbol of result)if(symbol!=='AMD')seen.add(symbol);
 }
 assert.deepEqual([...seen].sort(),pending.slice().sort());
});

test('quote sweep deduplicates, validates and preserves bounded source usage',()=>{
 assert.deepEqual(quoteSweepSymbols(['AMD','VRTX','VRTX','SPY','invalid','HON'],'2026-11-17T10:00:00Z').sort(),['AMD','HON','SPY','VRTX'].sort());
 assert.deepEqual(quoteSweepSymbols([],'2026-11-17T10:00:00Z'),['AMD']);
 assert.deepEqual(quoteSweepSymbols(['VRTX'],'2026-11-17T10:00:00Z',1),['AMD']);
 assert.throws(()=>quoteSweepSymbols(['VRTX'],'not a date'),/timestamp/);
});

test('Test 4 quote sweep still respects existing 18-hour gate and requests only a bounded batch',()=>{
 const code=readFileSync('worker/index.js','utf8');
 assert.match(code,/18\*3600000/);
 assert.match(code,/quoteSweepSymbols\(rows\.map\(x=>x\.symbol\),now,4\)/);
 assert.match(code,/WHERE c\.eligible=1 AND o\.case_id IS NULL/);
});
