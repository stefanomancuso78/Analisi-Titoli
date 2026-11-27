// Operational coordination only: frozen Test 3 implementation and policy remain unchanged.
import {ensurePipelineBaseline} from './learning-pipeline.js';
import {t3Cycle} from './parallel.js';
import {lrActivate,lrCycle,lrFeatures,lrPolicy} from './learning-challenger.js';
const lcFirst=(e,q,...v)=>e.DB.prepare(q).bind(...v).first();
const lcHash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function lcPredictionStatement(env,args,now=new Date().toISOString()){
 const [id,symbol,created_at,fold,state,raw]=args,activation=await lcFirst(env,'SELECT value FROM prod_settings WHERE key=?','lr:activation:'+lrPolicy.id);
 if(!activation||created_at<activation.value||Date.parse(now)<Date.parse(created_at)||Date.parse(now)-Date.parse(created_at)>600000)throw Error('Prospective shadow registration window unavailable');
 const row=await lcFirst(env,"SELECT value FROM prod_settings WHERE key LIKE 'lr:model:%' ORDER BY json_extract(value,'$.trained_at') DESC LIMIT 1"),prior=row?JSON.parse(row.value):null;
 if(prior&&(!prior.integrity_hash||prior.integrity_hash!==await lcHash(JSON.stringify(Object.fromEntries(Object.entries(prior).filter(([k])=>k!=='integrity_hash'))))))throw Error('Shadow model integrity review');
 const p=JSON.parse(raw),features=lrFeatures(p),valid=prior&&Date.parse(prior.trained_at)<Date.parse(created_at),z=valid?prior.weights.reduce((s,w,i)=>s+w*features[i],0):null;
 const prediction={case_id:id,symbol,case_created_at:created_at,fold,predicted_at:now,input_as_of:created_at,features,model_id:valid?prior.id:'untrained-baseline',probability:valid?1/(1+Math.exp(-Math.max(-30,Math.min(30,z)))):null,reference_probability:Number.isFinite(p.reference_probability)?p.reference_probability:null,policy_id:lrPolicy.id,real_trade:false};
 return env.DB.prepare("INSERT OR IGNORE INTO prod_settings SELECT ?,? WHERE EXISTS (SELECT 1 FROM parallel_cases WHERE id=? AND symbol=? AND created_at=? AND fold=? AND payload=?) AND NOT EXISTS (SELECT 1 FROM parallel_outcomes WHERE case_id=?)").bind('lr:prediction:'+id,JSON.stringify(prediction),id,symbol,created_at,fold,raw,id);
}
export async function lcParallelCycle(env,now=new Date().toISOString()){
 await ensurePipelineBaseline(env);await lrActivate(env,now);
 // D1 batch is transactional: no newly inserted case can commit without its immutable prediction.
 const DB={prepare(sql){if(!/^INSERT OR IGNORE INTO parallel_cases VALUES/i.test(sql))return env.DB.prepare(sql);let values;return {bind(...a){values=a;return this},async run(){const prediction=await lcPredictionStatement(env,values);return (await env.DB.batch([env.DB.prepare(sql).bind(...values),prediction]))[0];}};},batch:rows=>env.DB.batch(rows)};
 const parallel=await t3Cycle({...env,DB},now),learning=await lrCycle(env);
 return {...parallel,shadow_registration:learning};
}
