// Deterministic fair selection for the bounded, 18-hour Test 4 market sweep.
// Excludes repeats and never increases the number of quote requests.
export function quoteSweepSymbols(pending, now, limit=4, periodMs=18*3600000) {
 const cap=Math.max(1,Math.min(4,Math.floor(limit)||4));
 const eligible=[...new Set((Array.isArray(pending)?pending:[]).filter(s=>typeof s==='string'&&/^[A-Z]{1,6}$/.test(s)&&s!=='AMD'))].sort();
 if(cap===1||!eligible.length)return ['AMD'];
 if(!Number.isFinite(periodMs)||periodMs<=0)throw Error('Valid interval required');
 const slot=Math.floor(Date.parse(now)/periodMs);
 if(!Number.isFinite(slot))throw Error('Valid timestamp required');
 const start=(((slot*(cap-1))%eligible.length)+eligible.length)%eligible.length;
 return ['AMD',...Array.from({length:Math.min(cap-1,eligible.length)},(_,i)=>eligible[(start+i)%eligible.length])];
}
