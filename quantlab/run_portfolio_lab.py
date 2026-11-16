"""Reproducible quarantined allocation experiment. Never writes live models.
Riskfolio-Lib BSD-3-Clause: https://github.com/dcajasn/Riskfolio-Lib
Uses source files already collected for retrospective-pilot-v1; no future data.
"""
import argparse,hashlib,json,math,re,sys,importlib.metadata
from pathlib import Path
import numpy as np
import pandas as pd
import riskfolio as rp
PROFILES={'low':(.30,.05,.20),'medium':(.60,.10,.35),'high':(.90,.15,.50)}
def cap_weights(raw,sectors,risk):
 exposure,namecap,sectorcap=PROFILES[risk];raw=np.clip(np.asarray(raw,float),0,None);w=np.zeros(len(raw));left=exposure
 for _ in range(100):
  sector_totals={s:sum(w[i] for i,x in enumerate(sectors) if x==s) for s in set(sectors)}
  eligible=[i for i in range(len(raw)) if raw[i]>1e-12 and w[i]<namecap-1e-10 and sector_totals[sectors[i]]<sectorcap-1e-10]
  if not eligible or left<1e-10:break
  den=sum(raw[i] for i in eligible);added=0
  for i in eligible:
   n=max(0,min(left*raw[i]/den,namecap-w[i],sectorcap-sector_totals[sectors[i]]));w[i]+=n;sector_totals[sectors[i]]+=n;added+=n
  left-=added
  if added<1e-12:break
 return w

def model_weights(train,model):
 if model=='equal_weight':return np.ones(train.shape[1])/train.shape[1]
 if model=='inverse_vol':return (1/train.std(ddof=1).clip(lower=1e-8)).to_numpy()
 if model=='riskfolio_hrp':
  w=rp.HCPortfolio(returns=train).optimization(model='HRP',rm='MV',linkage='single');return w.reindex(train.columns).iloc[:,0].to_numpy()
 if model=='riskfolio_min_cvar':
  p=rp.Portfolio(returns=train);p.assets_stats(method_mu='hist',method_cov='hist');w=p.optimization(model='Classic',rm='CVaR',obj='MinRisk',hist=True)
  if w is None:raise ValueError('CVaR optimizer did not return weights')
  return w.reindex(train.columns).iloc[:,0].to_numpy()
 raise ValueError('Unknown model')

def simulate(prices,sectors,model,risk,lookback=60,step=20,cost_bps=10):
 """Decide after close t, execute close t+1, earn only subsequent returns."""
 returns=prices.pct_change(fill_method=None).dropna();value=1.;holdings=np.zeros(prices.shape[1]);cash=1.;records=[];orders=[];pending=None;fees=0.;first=lookback+1
 for t in range(first,len(prices)):
  # Mark existing positions, then execute previously committed plan at this close.
  ratio=(prices.iloc[t]/prices.iloc[t-1]).to_numpy();holdings*=ratio;value=cash+holdings.sum()
  if pending is not None:
   target=pending['weights'];desired=value*target;turnover=float(np.abs(desired-holdings).sum());fee=turnover*cost_bps/10000;fees+=fee
   investable=value-fee;holdings=investable*target;cash=investable-holdings.sum();value=investable
   orders.append({'decision_date':pending['decision_date'],'execution_date':str(prices.index[t].date()),'exposure_pct':float(target.sum()*100),'turnover':turnover,'fee':fee,'weights':dict(zip(prices.columns,map(float,target)))})
   pending=None
  records.append({'date':str(prices.index[t].date()),'value':float(value),'cash':float(cash)})
  if (t-first)%step==0 and t+1<len(prices):
   train=prices.iloc[t-lookback:t+1].pct_change(fill_method=None).dropna();raw=model_weights(train,model)
   if not np.isfinite(raw).all() or (raw< -1e-7).any():raise ValueError('Invalid optimizer weights')
   pending={'weights':cap_weights(raw,sectors,risk),'decision_date':str(prices.index[t].date())}
 if not orders:raise ValueError('Insufficient evaluation dates')
 fee=float(holdings.sum()*cost_bps/10000);fees+=fee;value-=fee;records[-1]['value']=float(value)
 v=np.array([r['value'] for r in records]);peak=np.maximum.accumulate(np.r_[1.,v])[1:];draw=(v/peak-1)*100
 daily=np.diff(v)/v[:-1];tail=np.sort(daily)[:max(1,int(math.ceil(len(daily)*.05)))]
 return {'model':model,'risk':risk,'net_return_pct':float((value-1)*100),'max_drawdown_pct':float(draw.min()),'daily_tail_mean_5pct':float(tail.mean()*100),'cost_pct_initial':float(fees*100),'evaluation_days':len(records),'orders':orders,'equity':records,'final_cash_pct':float(cash/value*100),'invariants':{'future_execution':all(o['execution_date']>o['decision_date'] for o in orders),'budget_nonnegative':all(r['cash']>=-1e-9 for r in records)}}

def market_reference(spy,result,cost_bps=10):
 orders={o['execution_date']:o for o in result['orders']};held=0.;cash=1.;prior=None;values=[]
 for r in result['equity']:
  price=float(spy.loc[pd.Timestamp(r['date'])])
  if prior is not None:held*=price/prior
  value=cash+held
  if r['date'] in orders:
   exposure=orders[r['date']]['exposure_pct']/100;fee=abs(value*exposure-held)*cost_bps/10000;value-=fee;held=value*exposure;cash=value-held
  values.append(value);prior=price
 final=values[-1]-held*cost_bps/10000;values[-1]=final;v=np.asarray(values);peak=np.maximum.accumulate(np.r_[1.,v])[1:]
 return {'symbol':'SPY','net_return_pct':float((final-1)*100),'max_drawdown_pct':float(((v/peak-1)*100).min()),'exposure_basis':'Same planned exposure and actual rebalance dates as this strategy; USD price returns and same conventional transaction costs'}

def load_prices(folder):
 protocol=json.loads((folder/'protocol.json').read_text());series={};excluded=[];sources=[]
 for symbol in sorted(protocol['symbols']):
  path=folder/(symbol+'.json')
  if not path.exists():excluded.append({'symbol':symbol,'reason':'source file missing'});continue
  d=json.loads(path.read_text());rows=d.get('price_payload',{}).get('data',{}).get('tradesTable',{}).get('rows',[]);values={}
  for row in rows:
   date=pd.to_datetime(row['date'],format='%m/%d/%Y');v=float(re.sub(r'[$,]','',row['close']))
   if protocol['start']<=str(date.date())<=protocol['end'] and v>0 and np.isfinite(v):values[date]=v
  s=pd.Series(values,name=symbol).sort_index()
  if len(s)<100:excluded.append({'symbol':symbol,'reason':'fewer than 100 observed closes'});continue
  ratios=(s/s.shift(1)).dropna();ratio=np.maximum(ratios.to_numpy(),1/ratios.to_numpy())
  if any(np.any(np.abs(ratio/n-1)<.06) for n in [1.5,2,3,4,5,10]):excluded.append({'symbol':symbol,'reason':'possible split or extreme move; unverified raw-price discontinuity'});continue
  series[symbol]=s;sources.append({'symbol':symbol,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'acquired_at':d.get('acquired_at'),'source':'https://api.nasdaq.com/api/quote/'+symbol+'/historical'})
 prices=pd.concat(series.values(),axis=1).dropna()
 return prices,protocol,excluded,sources

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--sources',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);args=ap.parse_args();prices,protocol,excluded,sources=load_prices(args.sources)
 try:
  text=(Path(__file__).parents[1]/'worker/production.js').read_text();companies=json.loads(re.search(r'const pdCompanies=(\{[^\n]+\});',text).group(1))
 except Exception:companies={}
 sectors=[companies.get(s,{}).get('sector','Da classificare') for s in prices.columns];results=[];failures=[]
 for model in ['equal_weight','inverse_vol','riskfolio_hrp','riskfolio_min_cvar']:
  for risk in PROFILES:
   try:results.append(simulate(prices,sectors,model,risk))
   except Exception as e:failures.append({'model':model,'risk':risk,'error':str(e)})
 spyraw=json.loads((args.sources/'SPY.json').read_text());spyrows=spyraw['price_payload']['data']['tradesTable']['rows'];spy=pd.Series({pd.to_datetime(x['date'],format='%m/%d/%Y'):float(re.sub(r'[$,]','',x['close'])) for x in spyrows}).sort_index()
 for r in results:
  try:r['market_reference']=market_reference(spy,r);r['excess_return_vs_matched_spy_pp']=r['net_return_pct']-r['market_reference']['net_return_pct']
  except Exception as e:r['market_reference']=None;r['benchmark_error']=str(e)
 report={'id':'allocation-lab-v1','kind':'retrospective_quarantine','created_at':pd.Timestamp.now(tz='UTC').isoformat(),'engine':{'Riskfolio-Lib':importlib.metadata.version('Riskfolio-Lib'),'numpy':np.__version__,'pandas':pd.__version__},'source_protocol':protocol['id'],'assets':list(prices.columns),'asset_count':len(prices.columns),'first_date':str(prices.index[0].date()),'last_date':str(prices.index[-1].date()),'common_closes':len(prices),'lookback':60,'rebalance_step':20,'cost_bps_per_traded_value':10,'profiles':{k:dict(zip(['exposure','max_name','max_sector'],v)) for k,v in PROFILES.items()},'excluded':excluded,'sources':sources,'results':results,'failures':failures,'automatic_application':False,'limitations':['Current watchlist selected today: selection and survivor bias, not historical index constituents.','Raw USD Nasdaq closes: no certified total-return adjustments, dividends, taxes, FX or market-impact simulation.','Short retrospective evaluation and overlapping exposures; no evidence of persistent alpha or financial suitability.','Riskfolio proposes weights; shared name/sector/exposure caps project them and can leave cash; projected CVaR weights are not claimed to remain globally optimal.','No live model, study-v2 weight or existing portfolio is changed.','This tests allocation methods, not whether news or skills improve forecasts.']}
 args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2,allow_nan=False));print(json.dumps({'assets':len(prices.columns),'closes':len(prices),'results':len(results),'failures':failures}))
if __name__=='__main__':main()
