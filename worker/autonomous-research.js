// Independent bounded service worker. Frozen research validation/publishing remain unchanged.
import {rfCycle,rfPacket,rfEvidenceHash,rfSave} from './research.js';
const haNow=()=>new Date().toISOString(),haAll=async(e,s,...v)=>(await e.DB.prepare(s).bind(...v).all()).results||[],haFirst=(e,s,...v)=>e.DB.prepare(s).bind(...v).first();
const haHash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,'0')).join('');
const haGet=async(e,k)=>{const r=await haFirst(e,'SELECT value FROM prod_settings WHERE key=?',k);return r?JSON.parse(r.value):null};
const haPut=(e,k,v)=>e.DB.prepare('INSERT INTO prod_settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,JSON.stringify(v)).run();
const haEvent=(e,kind,p)=>e.DB.prepare('INSERT INTO operational_events VALUES (?,?,?,?)').bind(crypto.randomUUID(),haNow(),'h24_'+kind,JSON.stringify(p)).run();
export const haTransportFailure=message=>/Local model HTTP (?:429|5[0-9]{2})|fetch failed|timeout|timed out|memory pressure/i.test(String(message||''));
const haKey=(id,hash,engine='legacy')=>'h24_dossier:'+id+':'+hash+(engine==='cpu-stream-v3'?':cpu-stream-v3':'');
export function haPolicy(counts,created,reviewed){const active=['pending','retry','waiting_source','evidence_ready','running'].reduce((n,s)=>n+(counts[s]||0),0);return {mode:active>=100?'BACKLOG_RECOVERY':'STEADY_STATE',active,intake_allowed:active<100&&created<=reviewed,chunk_chars:4000,max_review_retries:3,model:'Qwen3-4B-Q4_K_M',paid_inference:false};}
export async function haStatus(e){
 const counts=Object.fromEntries((await haAll(e,'SELECT state,COUNT(*) n FROM research_jobs GROUP BY state')).map(r=>[r.state,r.n]));
 const since=new Date(Date.now()-86400000).toISOString(),hour=new Date(Date.now()-3600000).toISOString();
 const additions=await haFirst(e,'SELECT COUNT(*) n FROM research_jobs WHERE created_at>=?',since),reviews=await haFirst(e,'SELECT COUNT(*) n FROM research_revisions WHERE created_at>=?',since),h=await haFirst(e,'SELECT COUNT(*) n FROM research_revisions WHERE created_at>=?',hour);
 const oldest=await haFirst(e,"SELECT MIN(created_at) at FROM research_jobs WHERE state IN ('pending','retry','waiting_source','evidence_ready','running')");
 const runs=await haAll(e,"SELECT created_at,kind,payload FROM operational_events WHERE kind LIKE 'h24_%' ORDER BY created_at DESC LIMIT 80"),last=await haGet(e,'h24_heartbeat'),provider=await haGet(e,'h24_provider');
 const completed=(await haAll(e,"SELECT payload FROM operational_events WHERE kind='h24_review' AND created_at>=?",since)).map(r=>JSON.parse(r.payload)),closed=completed.reduce((n,r)=>n+(r.closed||0),0),first=(await haFirst(e,"SELECT MIN(created_at) at FROM operational_events WHERE kind='h24_heartbeat' AND created_at>=?",since)).at,elapsed=first?Math.max(1/60,(Date.now()-Date.parse(first))/3600000):null,rate=elapsed?closed/elapsed:0,stable=elapsed>=1&&completed.length>=3;
 const p=haPolicy(counts,additions.n,reviews.n),alerts=[];
 if(!last||Date.now()-Date.parse(last.at)>40*60000)alerts.push('worker_heartbeat_missing');
 if(p.active&&!(h.n))alerts.push('reviews_stalled_last_hour');if(additions.n>closed&&p.active>=100)alerts.push('intake_exceeds_completions');if(provider?.next_attempt>haNow()&&(provider.worker_engine||'legacy')===(last?.worker_engine||'legacy')&&(provider.transport_failures||0)>=3&&haTransportFailure(provider.last_error))alerts.push('provider_backoff');
 return {as_of:haNow(),counts,review_checkpoints:await haAll(e,"SELECT json_extract(value,'$.state') state,COUNT(*) dossiers,SUM(json_array_length(json_extract(value,'$.notes'))) chunks FROM prod_settings WHERE key LIKE 'h24_dossier:%' GROUP BY state"),policy:p,created_24h:additions.n,revisions_24h:reviews.n,revisions_hour:h.n,h24_closed_24h:closed,measured_closed_per_hour:rate,estimated_hours_to_below_100:stable&&rate?Math.max(0,(p.active-99)/rate):null,measurement_window_hours:elapsed,eta_basis:'Estimate withheld until at least one hour and three actual revisions; observed H24 closures only; excludes future provider availability and new intake',oldest_active_at:oldest.at,oldest_age_hours:oldest.at?(Date.now()-Date.parse(oldest.at))/3600000:null,heartbeat:last,provider,provider_errors:await haAll(e,"SELECT json_extract(payload,'$.last_source') provider,COUNT(*) jobs,SUM(attempts) attempts FROM research_jobs WHERE attempts>0 GROUP BY provider ORDER BY attempts DESC LIMIT 20"),alerts,runs:runs.map(r=>({...r,payload:JSON.parse(r.payload)}))};
}
async function haFence(e,a){const row=await haFirst(e,"SELECT * FROM prod_leases WHERE key='h24-review'");if(!row||row.token!==a.lease||row.expires_at<=Date.now())throw Error('Lease expired or superseded');const state=await haGet(e,haKey(a.analysis_id,a.evidence_hash,a.worker_engine));if(!state||state.lease!==a.lease)throw Error('Dossier lease mismatch');if(await rfEvidenceHash(e,a.analysis_id)!==a.evidence_hash)throw Error('Evidence changed; new complete review required');return state;}
async function haNext(e,state){for(const d of state.documents){const done=state.notes.filter(n=>n.document_id===d.id).sort((a,b)=>a.offset-b.offset);let offset=0;for(const n of done){if(n.offset!==offset)break;offset=n.end}if(offset<d.text_length){const row=await haFirst(e,'SELECT payload FROM graph_documents WHERE id=?',d.id),text=JSON.parse(row.payload).text.slice(offset,offset+(state.chunk_chars||10000));return {document_id:d.id,title:d.title,offset,end:offset+text.length,text,text_hash:await haHash(text)};}}return null;}
async function haClaim(e,a){
 const provider=await haGet(e,'h24_provider');if(provider?.next_attempt>haNow()&&(provider.worker_engine||'legacy')===(a.worker_engine||'legacy')&&(provider.transport_failures||0)>=3&&haTransportFailure(provider.last_error))return {state:'provider_backoff',next_attempt:provider.next_attempt};
 const lease=crypto.randomUUID();await e.DB.prepare("INSERT OR IGNORE INTO prod_leases VALUES ('h24-review','',0)").run();
 if(!await haFirst(e,"UPDATE prod_leases SET token=?,expires_at=? WHERE key='h24-review' AND expires_at<? RETURNING token",lease,Date.now()+20*60000,Date.now()))return {state:'busy'};
 try{
  const roots=await haAll(e,"SELECT a.id,a.symbol,MIN(j.created_at) oldest,MAX(j.priority) priority FROM semantic_analyses a JOIN research_jobs j ON j.analysis_id=a.id WHERE j.state IN ('evidence_ready','pending','retry','waiting_source') AND EXISTS (SELECT 1 FROM research_evidence x JOIN research_jobs z ON z.id=x.job_id WHERE z.analysis_id=a.id) GROUP BY a.id ORDER BY oldest,priority DESC LIMIT 1000");
  const progress=await haAll(e,"SELECT json_extract(value,'$.analysis_id') id FROM prod_settings WHERE key LIKE 'h24_dossier:%' AND json_extract(value,'$.state') IN ('reading','retry') AND json_array_length(json_extract(value,'$.notes'))>0 AND (json_extract(value,'$.next_attempt') IS NULL OR json_extract(value,'$.next_attempt')<=?) ORDER BY json_array_length(json_extract(value,'$.notes')) DESC LIMIT 20",haNow());
  const cursor=(Number(await haGet(e,'h24_review_cursor'))||0)%(roots.length||1);
  const ordered=[...new Map([...progress.map(p=>roots.find(r=>r.id===p.id)).filter(Boolean),...roots.slice(cursor),...roots.slice(0,cursor)].map(r=>[r.id,r])).values()];
  for(let i=0;i<Math.min(20,ordered.length);i++){const root=ordered[i];await haPut(e,'h24_review_cursor',(cursor+i+1)%roots.length);
   const hash=await rfEvidenceHash(e,root.id);if(await haFirst(e,'SELECT id FROM research_revisions WHERE analysis_id=? AND evidence_hash=?',root.id,hash))continue;
   const key=haKey(root.id,hash,a.worker_engine),old=await haGet(e,key);if(old?.next_attempt>haNow()||old?.state==='blocked')continue;
   const packet=await rfPacket(e,root.id);if(packet.documents.length<2)continue;
   const state={...(old||{}),analysis_id:root.id,symbol:root.symbol,evidence_hash:hash,documents:packet.documents.map(({id,title,text_length,content_hash})=>({id,title,text_length,content_hash})),notes:old?.notes||[],worker_engine:a.worker_engine||'legacy',chunk_chars:a.worker_engine==='cpu-stream-v3'?4000:10000,attempts:old?.attempts||0,state:'reading',lease,claimed_at:haNow(),run_id:String(a.run_id||'unknown').slice(0,120)};
   await haPut(e,key,state);return {state:'claimed',worker_engine:a.worker_engine||'legacy',analysis_id:root.id,symbol:root.symbol,evidence_hash:hash,lease,documents:state.documents,next:await haNext(e,state),notes:state.notes};
  }
  await e.DB.prepare("UPDATE prod_leases SET expires_at=0 WHERE key='h24-review' AND token=?").bind(lease).run();return {state:'no_reviewable_evidence'};
 }catch(error){await e.DB.prepare("UPDATE prod_leases SET expires_at=0 WHERE key='h24-review' AND token=?").bind(lease).run();throw error;}
}
export async function haOperation(e,a){
 if(a.worker_engine&&!['legacy','cpu-stream-v3'].includes(a.worker_engine))throw Error('Unsupported worker engine');
 if(a.operation==='status')return haStatus(e);
 if(a.operation==='heartbeat'){const record={at:haNow(),worker_engine:a.worker_engine||'legacy',run_id:String(a.run_id||'').slice(0,120),phase:String(a.phase||'').slice(0,80),duration_ms:Math.max(0,Number(a.duration_ms)||0),resources:a.resources||null};const previous=await haGet(e,'h24_heartbeat');if(previous?.run_id===record.run_id){record.duration_ms=Math.max(record.duration_ms,previous.duration_ms||0);if((previous.resources?.inference_usage?.calls||0)>(record.resources?.inference_usage?.calls||0))record.resources={...record.resources,inference_usage:previous.resources.inference_usage};}await haPut(e,'h24_heartbeat',record);const capacity=await haStatus(e);await haPut(e,'h24_capacity',{at:record.at,created_24h:capacity.created_24h,closed_24h:capacity.h24_closed_24h});await haEvent(e,'heartbeat',record);return {state:'recorded'};}
 if(a.operation==='claim')return haClaim(e,a);
 if(a.operation==='acquire'){
  const status=await haStatus(e);if(status.counts.evidence_ready>=8)return {state:'review_priority',ready:status.counts.evidence_ready};
  const circuit=await haGet(e,'h24_acquisition');if(circuit?.next_attempt>haNow())return {state:'backoff',next_attempt:circuit.next_attempt};
  const last=await haGet(e,'h24_acquisition');if(last?.at&&Date.now()-Date.parse(last.at)<60000)return {state:'not_due'};
  const at=haNow();await haPut(e,'h24_acquisition',{at});
  const result=await rfCycle(e,{maintenance_limit:2});const errors=(result.results||[]).filter(r=>['retry','blocked'].includes(r.state));
  await haPut(e,'h24_acquisition',{at,errors:errors.length,next_attempt:errors.length?new Date(Date.now()+15*60000).toISOString():null});await haEvent(e,'acquire',{at,result});return result;
 }
 const state=await haFence(e,a),key=haKey(a.analysis_id,a.evidence_hash,a.worker_engine);
 await e.DB.prepare("UPDATE prod_leases SET expires_at=? WHERE key='h24-review' AND token=?").bind(Date.now()+20*60000,a.lease).run();
 if(a.operation==='chunk'){
  const already=state.notes.find(n=>n.document_id===a.document_id&&n.offset===a.offset&&n.text_hash===a.text_hash);if(already)return {state:'chunk_saved',idempotent:true,next:await haNext(e,state),notes:state.notes};
  const chunk=await haNext(e,state);if(!chunk||chunk.text_hash!==a.text_hash||chunk.document_id!==a.document_id||chunk.offset!==a.offset)throw Error('Chunk coverage/hash mismatch');
  const note=a.note;if(!note||typeof note.summary!=='string'||note.summary.length<40||note.summary.length>3500||!Array.isArray(note.citations)||note.citations.length>3)throw Error('Invalid chunk review');
  const normalized=t=>String(t).replace(/\s+/g,' ').trim();for(const c of note.citations)if(typeof c.quote!=='string'||c.quote.length<30||c.quote.length>1200||!normalized(chunk.text).includes(normalized(c.quote))||!['fact','attribution','economic','risk'].includes(c.kind))throw Error('Unverified chunk citation');
  state.notes.push({document_id:chunk.document_id,offset:chunk.offset,end:chunk.end,text_hash:chunk.text_hash,summary:note.summary,citations:note.citations.map(c=>({...c,document_id:chunk.document_id})),reviewed_at:haNow(),model:String(a.model||'').slice(0,100)});await haPut(e,key,state);return {state:'chunk_saved',next:await haNext(e,state),notes:state.notes};
 }
 if(a.operation==='review'){
  if(await haNext(e,state))throw Error('Full document coverage not complete');
  if(!state.notes.every(n=>n.model==='Qwen3-4B-Q4_K_M'))throw Error('Unverified model receipt');
  const before=await haFirst(e,"SELECT COUNT(*) n FROM research_jobs WHERE analysis_id=? AND state='evidence_ready'",a.analysis_id);
  const result=await rfSave(e,{...a.review,analysis_id:a.analysis_id,evidence_hash:a.evidence_hash,review_scope:'whole_acquired_text'},'h24:Qwen3-4B:github-actions');
  state.state='reviewed';state.completed_at=haNow();state.revision_id=result.id;await haPut(e,key,state);await haPut(e,'h24_provider',{state:'ok',at:haNow()});await haEvent(e,'review',{at:haNow(),analysis_id:a.analysis_id,revision_id:result.id,qualified:result.qualified,closed:result.idempotent?0:before.n,run_id:state.run_id,model:'Qwen3-4B-Q4_K_M',chunks:state.notes.length});
  await e.DB.prepare("UPDATE prod_leases SET expires_at=0 WHERE key='h24-review' AND token=?").bind(a.lease).run();return result;
 }
 if(a.operation==='release'){
  if(a.error){const previous=await haGet(e,'h24_provider'),failures=((previous?.worker_engine||'legacy')===(a.worker_engine||'legacy')?previous?.transport_failures||0:0)+(haTransportFailure(a.error)?1:0);await haPut(e,'h24_provider',{state:failures>=3?'circuit_open':'degraded',provider:'local_Qwen3_CPU',worker_engine:a.worker_engine||'legacy',failures,transport_failures:failures,at:haNow(),last_error:String(a.error).slice(0,200),next_attempt:failures>=3?new Date(Date.now()+15*60000).toISOString():null});state.attempts++;state.last_error=String(a.error).slice(0,300);state.state=state.attempts>=3?'blocked':'retry';state.next_attempt=new Date(Date.now()+Math.min(86400000,15*60000*2**state.attempts)).toISOString();await haEvent(e,'error',{at:haNow(),analysis_id:a.analysis_id,error:state.last_error,attempts:state.attempts});}
  await haPut(e,key,state);await e.DB.prepare("UPDATE prod_leases SET expires_at=0 WHERE key='h24-review' AND token=?").bind(a.lease).run();return {state:'released'};
 }
 throw Error('Unsupported bounded worker operation');
}
let haJwks=null,haJwksAt=0;
export async function haVerifyIdentity(token,fetcher=fetch){
 try{
  if(typeof token!=='string'||token.length>12000)return false;
  const parts=token.split('.');if(parts.length!==3)return false;
  const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),parse=s=>JSON.parse(new TextDecoder().decode(decode(s)));
  const head=parse(parts[0]),p=parse(parts[1]),now=Math.floor(Date.now()/1000);
  if(head.alg!=='RS256'||!head.kid||p.iss!=='https://token.actions.githubusercontent.com'||p.aud!=='https://stokiq.online'||!['repo:stefanomancuso78/Analisi-Titoli:ref:refs/heads/main','repo:stefanomancuso78@354685197/Analisi-Titoli@1452043120:ref:refs/heads/main'].includes(p.sub)||p.repository!=='stefanomancuso78/Analisi-Titoli'||p.ref!=='refs/heads/main'||p.workflow_ref!=='stefanomancuso78/Analisi-Titoli/.github/workflows/autonomous-research.yml@refs/heads/main'||!['schedule','workflow_dispatch'].includes(p.event_name)||!Number.isFinite(p.exp)||p.exp<=now||!Number.isFinite(p.iat)||p.iat>now+30||p.iat<now-600||p.nbf>now+30)return false;
  if(!haJwks||Date.now()-haJwksAt>3600000||!haJwks.keys.some(k=>k.kid===head.kid)){
   const r=await fetcher('https://token.actions.githubusercontent.com/.well-known/jwks',{redirect:'manual',signal:AbortSignal.timeout(15000)});if(!r.ok){console.error('H24 identity JWKS HTTP',r.status);return false;}const keys=await r.json();if(!Array.isArray(keys.keys)||keys.keys.length>20)return false;haJwks=keys;haJwksAt=Date.now();
  }
  const jwk=haJwks.keys.find(k=>k.kid===head.kid&&k.kty==='RSA');if(!jwk){console.error('H24 identity signing key unavailable');return false;}
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));if(!verified)console.error('H24 identity signature rejected');return verified;
 }catch(error){console.error('H24 identity verification error',String(error.message).slice(0,180));return false;}
}
export async function haApi(req,e){
 const fail=(error,status)=>new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return fail('Unauthorized GitHub workflow identity',401);
 if(Number(req.headers.get('Content-Length'))>1000000)return fail('Body too large',413);
 try{
  const body=await req.text();if(body.length>1000000)return fail('Body too large',413);const a=JSON.parse(body);
  const token=a.worker_identity||req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  if(!await haVerifyIdentity(token))return fail('Unauthorized GitHub workflow identity',401);
  delete a.worker_identity;
  return new Response(JSON.stringify(await haOperation(e,a)),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch(error){return fail(String(error.message).slice(0,300),400)}
}
