// Full acquired-text reading uses the same fenced CPU/Gemini checkpoints as research follow-ups.
import {smSave} from './semantic.js';
const pyFirst=(e,q,...v)=>e.DB.prepare(q).bind(...v).first();
const pyHash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export const primaryId=id=>'primary:'+id;
export async function primaryHash(env,id){const d=await pyFirst(env,'SELECT id,content_hash FROM graph_documents WHERE id=?',id.slice(8));if(!d)throw Error('Primary document missing');return pyHash(d.id+'|'+d.content_hash);}
export async function primaryCandidates(env){return (await env.DB.prepare("SELECT d.* FROM graph_documents d JOIN prod_entities e ON e.symbol=json_extract(d.payload,'$.issuer') WHERE json_extract(d.payload,'$.primary')=1 AND json_extract(d.payload,'$.extraction_basis')!='event_metadata' AND d.url NOT LIKE '%-index.htm%' AND length(json_extract(d.payload,'$.text'))>=700 AND NOT EXISTS(SELECT 1 FROM semantic_analyses a WHERE a.document_id=d.id) ORDER BY COALESCE(NULLIF(d.published_at,''),d.acquired_at) DESC,d.id DESC LIMIT 1000").all()).results||[];}
export async function primarySave(env,state,review,actor){
 const d=state.documents[0];if(await primaryHash(env,state.analysis_id)!==state.evidence_hash)throw Error('Primary evidence changed');
 const existing=await pyFirst(env,'SELECT id,payload FROM semantic_analyses WHERE document_id=? AND symbol=?',d.id,state.symbol);if(existing)return {id:existing.id,...JSON.parse(existing.payload),idempotent:true,kind:'primary',forecast:{state:'existing_analysis_preserved'}};
 const offsets=Array.from({length:Math.ceil(d.text_length/45000)},(_,i)=>i*45000);
 const result=await smSave(env,{...review,document_id:d.id,symbol:state.symbol,review_scope:'whole_acquired_text',reviewed_offsets:offsets,reviewed_content_hash:d.content_hash},actor);
 return {...result,idempotent:false,kind:'primary',forecast:{state:result.qualified?'semantic_engine_responsible':'research_only'}};
}
