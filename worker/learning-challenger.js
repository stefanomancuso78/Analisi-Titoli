// Separate shadow challenger for economic-information features. Never changes Test 1-4,
// frozen model weights, portfolio orders, historic forecasts or existing outcome ledgers.
// All training labels are observed *after* the original prospective event was recorded.
const lrAll=async(e,q,...args)=>(await e.DB.prepare(q).bind(...args).all()).results||[];
const lrFirst=async(e,q,...args)=>e.DB.prepare(q).bind(...args).first();
const lrHash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
export const lrPolicy=Object.freeze({id:'economic-news-shadow-v1',minimum_training:30,minimum_training_cohorts:3,minimum_issuers:5,minimum_trained_evaluation:30,training_source:'Matured immutable parallel training-fold outcomes only',evaluation_source:'Preassigned evaluation-fold outcomes excluded from fitting',target:'Positive gross price-only outcome at Test 3 frozen horizon',deployment:'Shadow predictions only, no promotion or trading',cost:'No paid inference service'});
const lrSigmoid=z=>1/(1+Math.exp(-Math.max(-30,Math.min(30,z))));
export function lrFeatures(p){
 const a=p?.selection||{},v=Array.isArray(p?.values)?p.values:[];
 const materiality=a.materiality||'unknown',direction=a.direction||'uncertain';
 return [1,direction==='positive'?1:0,direction==='negative'?1:0,materiality==='high'?1:0,materiality==='medium'?.5:0,Math.min(1,Math.max(0,Number(v[5])||0)),Math.max(-1,Math.min(1,Number(v[1])||0))];
}
export function lrFit(rows){
 if(rows.length<lrPolicy.minimum_training||new Set(rows.map(x=>x.cohort)).size<lrPolicy.minimum_training_cohorts||new Set(rows.map(x=>x.symbol)).size<lrPolicy.minimum_issuers)return null;
 let w=Array(7).fill(0);
 for(let step=0;step<120;step++){
  const grad=w.map(()=>0);
  for(const r of rows){const p=lrSigmoid(w.reduce((s,v,i)=>s+v*r.features[i],0));for(let i=0;i<w.length;i++)grad[i]+=(p-r.y)*r.features[i]/rows.length}
  w=w.map((v,i)=>Math.max(-3,Math.min(3,v-.05*(grad[i]+(i?.02*v:0)))));
 }
 return w;
}
export async function lrCycle(env,now=new Date().toISOString()){
 const activationKey='lr:activation:'+lrPolicy.id;
 await env.DB.prepare('INSERT OR IGNORE INTO prod_settings VALUES (?,?)').bind(activationKey,now).run();
 const activation=(await lrFirst(env,'SELECT value FROM prod_settings WHERE key=?',activationKey)).value;
 const priorModels=await lrAll(env,"SELECT key,value FROM prod_settings WHERE key LIKE 'lr:model:%' ORDER BY json_extract(value,'$.trained_at') DESC LIMIT 1");
 const prior=priorModels.length?JSON.parse(priorModels[0].value):null;
 // Score ONLY cases born after activation, before their first market outcome.
 // Use previously stored model, never a model trained later in this cycle.
 const cutoff=new Date(Date.parse(now)-10*60000).toISOString(),cases=await lrAll(env,"SELECT c.id,c.symbol,c.created_at,c.fold,c.payload FROM parallel_cases c WHERE c.created_at>? AND c.created_at>=? AND c.created_at<=? AND NOT EXISTS(SELECT 1 FROM parallel_outcomes o WHERE o.case_id=c.id) ORDER BY c.created_at,c.id LIMIT 300",activation,cutoff,now);
 let predicted=0,untrained=0;
 for(const c of cases){
  const p=JSON.parse(c.payload),features=lrFeatures(p);
  const valid=prior&&Date.parse(prior.trained_at)<Date.parse(c.created_at);
  const payload={case_id:c.id,symbol:c.symbol,case_created_at:c.created_at,fold:c.fold,predicted_at:now,input_as_of:c.created_at,features,model_id:valid?prior.id:'untrained-baseline',probability:valid?lrSigmoid(prior.weights.reduce((s,w,i)=>s+w*features[i],0)):null,reference_probability:Number.isFinite(p.reference_probability)?p.reference_probability:null,policy_id:lrPolicy.id,real_trade:false};
  const out=await env.DB.prepare('INSERT OR IGNORE INTO prod_settings VALUES (?,?)').bind('lr:prediction:'+c.id,JSON.stringify(payload)).run();
  if((out.meta?.changes??out.changes)===1){predicted++;if(!valid)untrained++}
 }
 const outcomes=await lrAll(env,"SELECT c.id,c.symbol,c.created_at,c.fold,c.payload,o.created_at outcome_at,o.payload outcome FROM parallel_cases c JOIN parallel_outcomes o ON o.case_id=c.id WHERE c.fold='training' AND o.created_at<=? ORDER BY o.created_at,c.id",now);
 const training=outcomes.filter(x=>Date.parse(x.created_at)<Date.parse(x.outcome_at)&&Date.parse(x.outcome_at)<=Date.parse(now)).map(x=>({case_id:x.id,symbol:x.symbol,cohort:x.created_at.slice(0,10),features:lrFeatures(JSON.parse(x.payload)),y:JSON.parse(x.outcome).y})).filter(x=>x.y===0||x.y===1);
 const weights=lrFit(training);let trained=false,modelId=prior?.id||null;
 if(weights){
  const digest=await lrHash(JSON.stringify(training)),id='economic-news-'+digest.slice(0,24),key='lr:model:'+id;
  const data={id,trained_at:now,weights,training_n:training.length,cohorts:new Set(training.map(x=>x.cohort)).size,issuers:new Set(training.map(x=>x.symbol)).size,training_digest:digest,policy:lrPolicy.id,autopromote:false};
  const insert=await env.DB.prepare('INSERT OR IGNORE INTO prod_settings VALUES (?,?)').bind(key,JSON.stringify(data)).run();
  trained=(insert.meta?.changes??insert.changes)===1;modelId=id;
 }
 return {state:'completed',activation,training_n:training.length,trained,model_id:modelId,predictions_registered:predicted,untrained_baselines:untrained,notice:'Only cases first recorded after activation and within ten minutes; training uses matured training fold only; no backfill, retrospective score or automatic promotion'};
}
export async function lrStatus(env){
 const activation=await lrFirst(env,'SELECT value FROM prod_settings WHERE key=?','lr:activation:'+lrPolicy.id);
 const models=await lrAll(env,"SELECT value FROM prod_settings WHERE key LIKE 'lr:model:%' ORDER BY json_extract(value,'$.trained_at') DESC LIMIT 12");
 const saved=await lrAll(env,"SELECT s.value,o.payload outcome FROM prod_settings s LEFT JOIN parallel_outcomes o ON o.case_id=json_extract(s.value,'$.case_id') WHERE s.key LIKE 'lr:prediction:%' ORDER BY json_extract(s.value,'$.predicted_at') DESC LIMIT 1000");
 const predictions=saved.map(r=>JSON.parse(r.value)),results=[];
 for(let i=0;i<predictions.length;i++){const p=predictions[i],o=saved[i].outcome;if(p.fold!=='evaluation'||p.probability==null||!o)continue;const y=JSON.parse(o).y;if(y===0||y===1)results.push({case_id:p.case_id,model_id:p.model_id,brier:(p.probability-y)**2,reference_brier:p.reference_probability==null?null:(p.reference_probability-y)**2})}
 return {policy:lrPolicy,activation:activation?.value||null,models:models.map(r=>JSON.parse(r.value)),predictions_registered:predictions.length,trained_predictions:predictions.filter(p=>p.probability!=null).length,matured_evaluations:results.length,trained_brier:results.length?results.reduce((a,r)=>a+r.brier,0)/results.length:null,reference_brier:results.length&&results.every(r=>r.reference_brier!=null)?results.reduce((a,r)=>a+r.reference_brier,0)/results.length:null,validated:false,automatic_promotion:false,notice:'Evaluation counts are descriptive only; prospective benchmark and independent managerial review are still required.'};
}
