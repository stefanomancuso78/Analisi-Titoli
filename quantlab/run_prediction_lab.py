"""Temporal holdout prediction benchmark. Current-watchlist selection bias; never promotes to production."""
import argparse,json,hashlib,importlib.metadata
from pathlib import Path
import numpy as np,pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import brier_score_loss,log_loss
from run_portfolio_lab import load_prices

def dataset(prices):
 rows=[]
 for symbol in prices.columns:
  p=prices[symbol];r=p.pct_change(fill_method=None)
  for i in range(20,len(p)-1):
   entry=i+1;deadline=p.index[entry]+pd.Timedelta(days=30);future=np.where(p.index>=deadline)[0]
   if not len(future):continue
   end=int(future[0]);features=[r.iloc[i],p.iloc[i]/p.iloc[i-5]-1,p.iloc[i]/p.iloc[i-20]-1,r.iloc[i-19:i+1].std(ddof=1)]
   if not np.isfinite(features).all():continue
   ret=float(p.iloc[end]/p.iloc[entry]-1)
   rows.append(dict(symbol=symbol,decision_date=str(p.index[i].date()),entry_date=str(p.index[entry].date()),outcome_date=str(p.index[end].date()),x=list(map(float,features)),y=int(ret>0),net_return=(1+ret)*.999/1.001-1))
 return rows

def split(rows):
 dates=sorted({r['decision_date'] for r in rows});cut=dates[int(len(dates)*.75)];train=[r for r in rows if r['outcome_date']<cut];test=[r for r in rows if r['decision_date']>=cut]
 assert all(r['outcome_date']<cut for r in train)
 return train,test,cut

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--sources',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args();prices,protocol,excluded,sources=load_prices(a.sources);rows=dataset(prices);train,test,cut=split(rows)
 X=np.array([r['x'] for r in train]);y=np.array([r['y'] for r in train]);Xt=np.array([r['x'] for r in test]);yt=np.array([r['y'] for r in test]);results=[]
 for name,model in [('training_prior',None),('logistic',make_pipeline(StandardScaler(),LogisticRegression(C=1,max_iter=500,random_state=37))),('hist_gradient_boosting',HistGradientBoostingClassifier(max_iter=60,max_leaf_nodes=7,l2_regularization=1,random_state=37))]:
  if model is None:prob=np.repeat(y.mean(),len(test))
  else:model.fit(X,y);prob=model.predict_proba(Xt)[:,1]
  selected=[r for r,p in zip(test,prob) if p>=.55]
  results.append(dict(model=name,brier=float(brier_score_loss(yt,prob)),log_loss=float(log_loss(yt,np.clip(prob,1e-9,1-1e-9),labels=[0,1])),accuracy_pct=float(100*np.mean((prob>=.5)==yt)),selected_cases=len(selected),selected_mean_net_return_pct=float(100*np.mean([r['net_return'] for r in selected])) if selected else None))
 report=dict(id='prediction-temporal-lab-v1',created_at=pd.Timestamp.now(tz='UTC').isoformat(),source_protocol=protocol['id'],features=['return_1','return_5','return_20','volatility_20'],train_count=len(train),test_count=len(test),holdout_start=cut,train_last_outcome=max(r['outcome_date'] for r in train),test_first_decision=min(r['decision_date'] for r in test),results=results,excluded=excluded,sources=sources,engine={'scikit-learn':importlib.metadata.version('scikit-learn')},automatic_application=False,limitations=['Current watchlist selected today: selection/survivor bias; not historical constituents.','Raw closes, incomplete corporate actions, no dividends, tax or FX.','Overlapping 30-day outcomes and correlated stocks; no independent-sample confidence claim.','Holdout used once for this registered comparison; later changes require a new unseen holdout.','Mean selected-case return is not a tradable portfolio return.','Models use price features only; not evidence about news interpretation or Claude/Codex quality.'])
 a.output.write_text(json.dumps(report,indent=2,allow_nan=False));print(json.dumps({k:report[k] for k in ['train_count','test_count','holdout_start','results']}))
if __name__=='__main__':main()
