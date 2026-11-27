// Bounded independent maintenance. A failed stage never turns off CPU reading or the other stages.
export async function pipelineMaintenance(env,stage,handlers,now=new Date().toISOString()){
 if(!Object.hasOwn(handlers,stage))throw Error('Unsupported maintenance stage');
 const key='pipeline:stage:'+stage,last=await env.DB.prepare('SELECT value FROM prod_settings WHERE key=?').bind(key).first();
 if(last){const p=JSON.parse(last.value);if(p.state==='completed'&&Date.parse(now)-Date.parse(p.at)<5*60000)return {state:'not_due',stage,last:p.at};}
 const token=crypto.randomUUID(),lease='pipeline:'+stage;await env.DB.prepare("INSERT OR IGNORE INTO prod_leases VALUES (?,'',0)").bind(lease).run();
 if(!await env.DB.prepare('UPDATE prod_leases SET token=?,expires_at=? WHERE key=? AND expires_at<? RETURNING token').bind(token,Date.now()+180000,lease,Date.now()).first())return {state:'busy',stage};
 let record;try{const result=await handlers[stage]();record={at:new Date().toISOString(),state:result.state==='failed'?'failed':result.state?.startsWith('deferred')?'deferred':result.state==='partial'?'partial':'completed',stage,result};return record;}catch(error){record={at:new Date().toISOString(),state:'failed',stage,error:String(error.message).slice(0,250)};throw error;}finally{if(record)await env.DB.prepare('INSERT INTO prod_settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(record)).run();await env.DB.prepare('UPDATE prod_leases SET expires_at=0 WHERE key=? AND token=?').bind(lease,token).run();}
}
