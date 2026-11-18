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
export function lrTrainingQuality(rows){
 const valid=rows.filter(r=>r&&(r.y===0||r.y===1)&&typeof r.cohort==='string'&&typeof r.symbol==='string'&&Array.isArray(r.features)&&r.features.length===7&&r.features.every(x=>Number.isFinite(x)&&Math.abs(x)<=10));
 const positive=valid.filter(r=>r.y===1).length,negative=valid.length-positive,cohorts=new Set(valid.map(r=>r.cohort)).size,issuers=new Set(valid.map(r=>r.symbol)).size,distinct_features=new Set(valid.map(r=>JSON.stringify(r.features))).size;
 const reasons=[...(valid.length<lrPolicy.minimum_training?['insufficient_matured_training_examples']:[]),...(positive<5||negative<5?['imbalanced_training_outcomes']:[]),...(cohorts<lrPolicy.minimum_training_cohorts?['insufficient_training_cohorts']:[]),...(issuers<lrPolicy.minimum_issuers?['insufficient_training_issuers']:[]),...(distinct_features<2?['no_feature_variation']:[]),...(valid.length!==rows.length?['invalid_training_features_or_labels']:[])];
 return {eligible:reasons.length===0,reasons,valid_n:valid.length,positive,negative,cohorts,issuers,distinct_features};
}
export function lrFit(rows){
 if(!lrTrainingQuality(rows).eligible)return null;
 let w=Array(7).fill(0);
 for(let step=0;step<120;step++){
  const grad=w.map(()=>0);
  for(const r of rows){const p=lrSigmoid(w.reduce((s,v,i)=>s+v*r.features[i],0));for(let i=0;i<w.length;i++)grad[i]+=(p-r.y)*r.features[i]/rows.length}
  w=w.map((v,i)=>Math.max(-3,Math.min(3,v-.05*(grad[i]+(i?.02*v:0)))));
 }
 return w;
}
// Run once BEFORE a parallel-study pass that might create new cases.
// Never backdate activation to resurrect old forecasts.
export async function lrActivate(env,now=new Date().toISOString()){
 if(!Number.isFinite(Date.parse(now)))throw Error('Invalid shadow activation timestamp');
 const key='lr:activation:'+lrPolicy.id;
 await env.DB.prepare('INSERT OR IGNORE INTO prod_settings VALUES (?,?)').bind(key,now).run();
 return (await lrFirst(env,'SELECT value FROM prod_settings WHERE key=?',key)).value;
}
export async function lrCycle(env,now=new Date().toISOString()){
 const activation=await lrActivate(env,now);
 const priorModels=await lrAll(env,"SELECT key,value FROM prod_settings WHERE key LIKE 'lr:model:%' ORDER BY json_extract(value,'$.trained_at') DESC LIMIT 1");
 const prior=priorModels.length?JSON.parse(priorModels[0].value):null;
 if(prior&&(!prior.integrity_hash||prior.integrity_hash!==await lrHash(JSON.stringify(Object.fromEntries(Object.entries(prior).filter(([k])=>k!=='integrity_hash'))))))return {state:'model_integrity_review',model_id:prior.id,notice:'Existing learner model changed or has no checksum; forecasting and training paused. Existing Test 1–4 untouched.'};
 // Score ONLY cases born after activation, before their first market outcome.
 // Use previously stored model, never a model trained later in this cycle.
 const cutoff=new Date(Date.parse(now)-10*60000).toISOString(),cases=await lrAll(env,"SELECT c.id,c.symbol,c.created_at,c.fold,c.payload FROM parallel_cases c WHERE c.created_at>=? AND c.created_at>=? AND c.created_at<=? AND NOT EXISTS(SELECT 1 FROM parallel_outcomes o WHERE o.case_id=c.id) ORDER BY c.created_at,c.id LIMIT 300",activation,cutoff,now);
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
 const digest=training.length?await lrHash(JSON.stringify(training)):null,id=digest?'economic-news-'+digest.slice(0,24):null,key=id?'lr:model:'+id:null,known=key?await lrFirst(env,'SELECT value FROM prod_settings WHERE key=?',key):null;
 let trained=false,modelId=known?id:prior?.id||null;
 if(known){const existing=JSON.parse(known.value);if(!existing.integrity_hash||existing.integrity_hash!==await lrHash(JSON.stringify(Object.fromEntries(Object.entries(existing).filter(([k])=>k!=='integrity_hash')))))return {state:'model_integrity_review',model_id:id,notice:'Training snapshot checksum mismatch; future learning paused.'};}
 else if(training.length){const weights=lrFit(training);
  if(weights){const data={id,trained_at:now,weights,training_n:training.length,cohorts:new Set(training.map(x=>x.cohort)).size,issuers:new Set(training.map(x=>x.symbol)).size,training_digest:digest,policy:lrPolicy.id,autopromote:false};data.integrity_hash=await lrHash(JSON.stringify(data));
   const insert=await env.DB.prepare('INSERT OR IGNORE INTO prod_settings VALUES (?,?)').bind(key,JSON.stringify(data)).run();
   trained=(insert.meta?.changes??insert.changes)===1;modelId=id;
  }
 }
 return {state:'completed',activation,training_n:training.length,training_quality:lrTrainingQuality(training),trained,model_id:modelId,predictions_registered:predicted,untrained_baselines:untrained,notice:'Only cases first recorded at or after pre-registered activation and within ten minutes; training uses matured training fold only; no backfill, retrospective score or automatic promotion'};
}
// Paired, strictly prospective challenger/reference scoring. Never merge
// different model versions into a single claim of predictive improvement.
export function lrEvaluationStats(records,modelId){
 const paired=records.filter(r=>r.model_id===modelId&&Number.isFinite(r.brier)&&Number.isFinite(r.reference_brier)&&typeof r.cohort==='string'&&typeof r.symbol==='string');
 const n=paired.length,cohorts=new Set(paired.map(r=>r.cohort)).size,issuers=new Set(paired.map(r=>r.symbol)).size;
 const mean=k=>n?paired.reduce((v,r)=>v+r[k],0)/n:null;
 const brier=mean('brier'),reference_brier=mean('reference_brier'),delta_brier=n?reference_brier-brier:null;
 const samplesReady=n>=lrPolicy.minimum_trained_evaluation&&cohorts>=5&&issuers>=5;
 return {model_id:modelId,paired_n:n,cohorts,issuers,brier,reference_brier,delta_brier,preliminary_brier_improvement:samplesReady&&delta_brier>0,review_state:!samplesReady?'insufficient_prospective_evidence':delta_brier<=0?'no_brier_improvement':'requires_independent_review',validated:false,automatic_promotion:false,comparison_basis:'Matched evaluation-fold cases for this exact model version only; positive delta means lower challenger Brier; no statistical significance, net alpha or investibility claim'};
}
export async function lrStatus(env,now=new Date().toISOString()){
 const activation=await lrFirst(env,'SELECT value FROM prod_settings WHERE key=?','lr:activation:'+lrPolicy.id);
 const overdueBefore=new Date(Date.parse(now)-10*60000).toISOString();
 const cov=activation?.value?await lrFirst(env,"SELECT COUNT(*) total,SUM(CASE WHEN p.key IS NOT NULL THEN 1 ELSE 0 END) registered,SUM(CASE WHEN p.key IS NULL AND c.created_at<? THEN 1 ELSE 0 END) overdue FROM parallel_cases c LEFT JOIN prod_settings p ON p.key='lr:prediction:'||c.id WHERE c.created_at>=? AND c.created_at<=?",overdueBefore,activation.value,now):null;
 const registration={state:!activation?'not_activated':(cov?.overdue||0)>0?'missed_forecast_window':'observing',cases_since_activation:cov?.total||0,registered:cov?.registered||0,overdue_missing:cov?.overdue||0,window_minutes:10,notice:'Only registered predictions count. Cases older than ten minutes without a saved prediction cannot be retrospectively scored; investigate the cycle schedule instead of backfilling.'};
 const models=await lrAll(env,"SELECT value FROM prod_settings WHERE key LIKE 'lr:model:%' ORDER BY json_extract(value,'$.trained_at') DESC LIMIT 12");
 // Registration counts cover the complete stored ledger. Evaluation scans the
 // matured, pre-registered subset, not merely the latest 1000 predictions.
 const [counts,evaluable]=await Promise.all([
  lrFirst(env,"SELECT COUNT(*) total,SUM(CASE WHEN json_extract(value,'$.probability') IS NOT NULL THEN 1 ELSE 0 END) trained FROM prod_settings WHERE key LIKE 'lr:prediction:%'"),
  lrAll(env,"SELECT s.value,o.payload outcome,o.created_at outcome_at FROM prod_settings s JOIN parallel_outcomes o ON o.case_id=json_extract(s.value,'$.case_id') WHERE s.key LIKE 'lr:prediction:%' AND json_extract(s.value,'$.fold')='evaluation' AND json_extract(s.value,'$.probability') IS NOT NULL ORDER BY json_extract(s.value,'$.predicted_at') DESC LIMIT 20001")
 ]);
 const evaluationLimit=20000,limited=evaluable.length>evaluationLimit,results=[];
 for(const row of evaluable.slice(0,evaluationLimit)){
  const p=JSON.parse(row.value),at=row.outcome_at;
  if(!at||!(Date.parse(p.case_created_at)<=Date.parse(p.predicted_at)&&Date.parse(p.predicted_at)<=Date.parse(p.case_created_at)+10*60000&&Date.parse(p.predicted_at)<Date.parse(at)))continue;
  const y=JSON.parse(row.outcome).y;
  if((y===0||y===1)&&Number.isFinite(p.probability)&&p.probability>=0&&p.probability<=1)
   results.push({case_id:p.case_id,model_id:p.model_id,cohort:p.case_created_at.slice(0,10),symbol:p.symbol,brier:(p.probability-y)**2,reference_brier:Number.isFinite(p.reference_probability)?(p.reference_probability-y)**2:null});
 }
 const checked=[];for(const r of models){const model=JSON.parse(r.value),base=Object.fromEntries(Object.entries(model).filter(([k])=>k!=='integrity_hash'));checked.push({...model,integrity:!!model.integrity_hash&&model.integrity_hash===await lrHash(JSON.stringify(base))});}
 const by_model=checked.map(m=>lrEvaluationStats(results,m.id)),latest=by_model[0]||null;return {policy:lrPolicy,activation:activation?.value||null,registration,models:checked,predictions_registered:counts?.total||0,trained_predictions:counts?.trained||0,matured_evaluations:results.length,trained_brier:latest?.brier??null,reference_brier:latest?.reference_brier??null,evaluation:{latest_model:latest,by_model,unpaired_or_unscorable:Math.min(evaluable.length,evaluationLimit)-results.length,history_window_limited:limited,scanned_matured_evaluations:Math.min(evaluable.length,evaluationLimit),scan_limit:evaluationLimit},validated:false,automatic_promotion:false,notice:limited?'Evaluation history exceeds scan limit; scores are incomplete. No validation or automatic promotion is allowed.':'Only matched post-forecast outcomes, grouped by exact challenger model version. Independent review, transaction-cost alpha, drift tests and sustained out-of-sample replication remain required.'};
}
