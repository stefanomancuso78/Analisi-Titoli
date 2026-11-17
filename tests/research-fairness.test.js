import test from 'node:test';
import assert from 'node:assert/strict';
import {rfSelectDue} from '../worker/research.js';
import {readFileSync} from 'node:fs';

const high=[{id:'priority-1',priority:100},{id:'priority-2',priority:90}];
test('research acquisition preserves highest priority and reserves second slot for oldest due case',()=>{
 assert.deepEqual(rfSelectDue(high,[{id:'oldest',priority:65}]).map(j=>j.id),['priority-1','oldest']);
 assert.deepEqual(rfSelectDue(high,[high[0]]).map(j=>j.id),['priority-1','priority-2']);
 assert.deepEqual(rfSelectDue([],[]),[]);
 assert.deepEqual(rfSelectDue([high[0]],[{id:'oldest',priority:65}]).map(j=>j.id),['priority-1','oldest']);
});

test('research acquisition retains two-request cycle budget and due-time backoff guard',()=>{
 const code=readFileSync('worker/research.js','utf8');
 assert.match(code,/max_jobs_per_cycle:2/);
 assert.match(code,/next_attempt<=\?/);
 assert.match(code,/rfSelectDue\(high,oldest\)/);
 assert.match(code,/await rfFirst\(env,"UPDATE research_jobs SET state='running'/);
});
