// Read-only history verification. Requires a full Git checkout.
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const expected={implementation_hash:'86a4fb6ef5ce1dd38660a3a1195ea18342f18395194c0b0e2b2c58d273cf7968',rules_hash:'f17e3fe12a364842e98d2e16ebfe04407d0dddd9ac3cccdecfaaef67f9bfac99'};
const commits=execFileSync('git',['log','--all','--format=%H','--','worker/experiment.js'],{encoding:'utf8'}).trim().split('\n');
for(const sha of commits){
 const source=execFileSync('git',['show',sha+':worker/experiment.js'],{encoding:'utf8'});
 // Return the hashes computed by the actual historical exEnsure before any DB access.
 const code=source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'').replace('let row=await exFirst','return {implementation_hash,rules_hash};let row=await exFirst');
 const context={crypto:webcrypto,TextEncoder,URL,Date,Intl,Response};vm.createContext(context);
 const hashes=await vm.runInContext(code+';exEnsure({})',context);
 console.log(JSON.stringify({sha,...hashes,match:Object.entries(expected).every(([key,value])=>hashes[key]===value)}));
}
