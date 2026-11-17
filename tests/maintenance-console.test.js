import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('optional owner self-service covers four tests and bounded portfolio valuation without bypassing site origin',()=>{
 const s=readFileSync('scripts/maintenance-console.js','utf8');
 assert.match(s,/location\.protocol!=='https:'/);
 assert.match(s,/stokiq\.online/);
 assert.match(s,/tests:async\(\)=>\(\{parallel:await read\('\/api\/parallel'\),test4:await read\('\/api\/test4'\)\}\)/);
 assert.match(s,/portfolioStep:\(\)=>action/);
 assert.match(s,/portfolioBatch:\(\)=>action\(\{operational_step:'portfolio_batch',limit:3/);
 assert.doesNotMatch(s,/CREDENTIAL_MASTER_KEY|OWNER_EMAIL|localStorage/);
 assert.match(s,/Un’operazione è già in corso/);
});
