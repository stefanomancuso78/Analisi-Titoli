/* Run only in the developer console of your authenticated StokIQ site. No token is required or exported. */
(()=>{
  if(location.protocol!=='https:'||!['stokiq.online','segnale-aperto-sm78.stefano-mancuso.chatgpt.site'].includes(location.hostname))throw Error('Aprire il sito StokIQ ufficiale prima di eseguire questo file.');
  let busy=false;
  async function read(path){const r=await fetch(path,{credentials:'same-origin'}),v=await r.json();if(!r.ok)throw Error(v.error||'HTTP '+r.status);return v;}
  async function action(args){if(busy)throw Error('Un’operazione è già in corso.');busy=true;try{const r=await fetch('/api/action',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'refresh_pattern_calibration',arguments:args})}),v=await r.json();if(!r.ok)throw Error(v.error||'HTTP '+r.status);return v;}finally{busy=false;}}
  window.StokIQMaintenance=Object.freeze({
    status:()=>read('/api/manager-status'),
    tests:()=>read('/api/parallel'),
    performance:()=>action({performance_cycle:true}),
    sourceRefresh:()=>action({source_refresh_cycle:true,operation_id:'manual:sources:'+crypto.randomUUID()}),
    operations:()=>action({operational_step:'operations',operation_id:'manual:'+crypto.randomUUID()}),
    backupStep:()=>action({operational_step:'backup',operation_id:'manual:backup:'+crypto.randomUUID()}),
    async downloadStatus(){const payload={at:new Date().toISOString(),manager:await read('/api/manager-status'),tests:await read('/api/parallel'),performance:await read('/api/performance')};const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='stokiq-status-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);return {download_started:true};}
  });
  console.info('StokIQMaintenance pronto. status(), tests(), downloadStatus() leggono dati. performance(), operations(), backupStep() richiedono accesso proprietario. Nessun comando pubblica codice o esegue analisi AI.');
})();
