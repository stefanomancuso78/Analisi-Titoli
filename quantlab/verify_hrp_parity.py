"""Regenerate and compare native HRP fixtures with Riskfolio-Lib 7.4.1. No network calls."""
import argparse,json,subprocess,importlib.metadata
from pathlib import Path
import numpy as np,pandas as pd,riskfolio as rp
root=Path(__file__).resolve().parents[1]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,default=root/'reports/hrp-parity-v1.json');a=ap.parse_args();rng=np.random.default_rng(55);fixtures=[]
 for n in [1,2,4,7]:
  r=rng.normal(0,.01,size=(80,n))*np.arange(1,n+1)[None,:]
  if n>2:r[:,1]=r[:,0]*.6+r[:,1]*.4
  df=pd.DataFrame(r,columns=['S'+str(i) for i in range(n)])
  w=[1.] if n==1 else rp.HCPortfolio(returns=df).optimization(model='HRP',rm='MV',linkage='single',leaf_order=False).reindex(df.columns).iloc[:,0].tolist()
  fixtures.append(dict(returns=r.tolist(),expected=w))
 js="import {cpHRP} from './worker/capital.js';let s='';for await(const x of process.stdin)s+=x;console.log(JSON.stringify(JSON.parse(s).map(f=>cpHRP(f.returns))));"
 actual=json.loads(subprocess.run(['node','--input-type=module','-e',js],input=json.dumps(fixtures),capture_output=True,text=True,cwd=root,check=True).stdout)
 errors=[max(abs(v-e) for v,e in zip(got,f['expected'])) for got,f in zip(actual,fixtures)]
 report=dict(kind='numerical_parity_not_financial_validation',library='Riskfolio-Lib',version=importlib.metadata.version('Riskfolio-Lib'),seed=55,configuration={'model':'HRP','rm':'MV','linkage':'single','leaf_order':False},assets=[1,2,4,7],maximum_absolute_errors=errors,passed=max(errors)<1e-12,limitation='Controlled synthetic matrices verify this configured calculation; not all market inputs or investment efficacy.')
 (root/'tests/fixtures/hrp-riskfolio-7.4.1.json').write_text(json.dumps(fixtures));a.output.write_text(json.dumps(report,indent=2));assert report['passed'];print(json.dumps(report))
if __name__=='__main__':main()
