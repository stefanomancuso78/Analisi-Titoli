import test from 'node:test';
import assert from 'node:assert/strict';
import {bkPutWithRetry} from '../worker/backup-pages.js';

test('transient R2 put failure retries the same key and payload',async()=>{let calls=0;const values=[];const archive={async put(key,payload){calls++;values.push([key,payload]);if(calls<3)throw Error('put: internal error (10001)');return {ok:true}}};assert.deepEqual(await bkPutWithRetry(archive,'backup/page','encrypted'),{ok:true});assert.equal(calls,3);assert.deepEqual(values,[['backup/page','encrypted'],['backup/page','encrypted'],['backup/page','encrypted']])});
test('persistent R2 failure is not concealed',async()=>{let calls=0;const archive={async put(){calls++;throw Error('persistent R2 outage')}};await assert.rejects(bkPutWithRetry(archive,'backup/page','encrypted'),/persistent R2 outage/);assert.equal(calls,3)});
