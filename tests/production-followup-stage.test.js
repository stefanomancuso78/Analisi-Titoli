import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function stages(context){const source=readFileSync('worker/index.js','utf8'),start=source.indexOf('const steps={acquire:'),end=source.indexOf(';if(!steps[',start);return vm.runInNewContext(source.slice(start,end)+';steps',context);}
test('scheduled follow-up runs real research once, keeps production separately resumable and does not mark reviews automatically',async()=>{
 const calls=[],steps=stages({env:{},req:{},a:{},rfCycle:async(_env,options)=>{assert.equal(options.maintenance_limit,5);calls.push('research');return {state:'completed',results:[{state:'evidence_ready'}]}},pdCycle:async(_env,options)=>{assert.equal(options.followup_only,true);calls.push('production');return {state:'completed'}}});
 const followup=await steps.production_followup();assert.deepEqual(calls,['research']);assert.equal(followup.research_followup.results[0].state,'evidence_ready');assert.equal(followup.production.operational_step,'production_reconcile');
 await steps.production_reconcile();assert.deepEqual(calls,['research','production']);
});
test('busy research worker is visible and does not start the second stage',async()=>{let production=0;const steps=stages({env:{},req:{},a:{},rfCycle:async()=>({state:'busy'}),pdCycle:async()=>{production++}});const result=await steps.production_followup();assert.equal(result.research_followup.state,'busy');assert.equal(result.state,'partial');assert.equal(production,0)});
