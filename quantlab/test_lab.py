import unittest,sys,numpy as np,pandas as pd
from run_portfolio_lab import cap_weights,simulate,market_reference,PROFILES
from compare_methods import compare
class LabTests(unittest.TestCase):
 def test_caps_preserve_budget_and_sector(self):
  for risk,(exp,name,sector) in PROFILES.items():
   w=cap_weights([100,2,1,1,1,1],['A','A','B','B','C','C'],risk)
   self.assertLessEqual(w.sum(),exp+1e-9);self.assertLessEqual(w.max(),name+1e-9)
   for s in ['A','B','C']:self.assertLessEqual(sum(w[i] for i,x in enumerate(['A','A','B','B','C','C']) if x==s),sector+1e-9)
 def test_flat_market_benchmark_records_costs_at_matching_dates(self):
  p=self.prices();r=simulate(p,['A','B','C','D'],'equal_weight','high');b=market_reference(pd.Series(100.,index=p.index),r);self.assertLess(b['net_return_pct'],0);self.assertEqual(b['symbol'],'SPY')
 def test_zero_optimizer_weights_do_not_force_buying(self):self.assertEqual(cap_weights([0,0],['A','B'],'high').sum(),0)
 def prices(self):return pd.DataFrame(np.cumprod(1+np.random.default_rng(7).normal(.001,.01,(100,4)),axis=0)*100,index=pd.bdate_range('2025-01-01',periods=100),columns=list('ABCD'))
 def test_future_execution_and_costs(self):
  p=self.prices();a=simulate(p,['A','B','C','D'],'equal_weight','high',cost_bps=10);b=simulate(p,['A','B','C','D'],'equal_weight','high',cost_bps=0)
  self.assertTrue(a['invariants']['future_execution']);self.assertTrue(a['invariants']['budget_nonnegative']);self.assertLess(a['net_return_pct'],b['net_return_pct'])
 def test_future_prices_do_not_change_first_decision(self):
  p=self.prices();a=simulate(p,['A','B','C','D'],'inverse_vol','high');p.iloc[80:]*=2;b=simulate(p,['A','B','C','D'],'inverse_vol','high');self.assertEqual(a['orders'][0]['weights'],b['orders'][0]['weights'])
 def test_no_fake_benchmark_from_empty_runs(self):self.assertIsNone(compare({'runs':[]},draws=20)['selected_skills']['mean_pass_rate_delta'])
 def test_report_order_does_not_invert_effect(self):
  common=dict(case_id='x',replicate=1,model='m',model_version='1',tool_profile='fixed',input_hash='h',total=4,duration_seconds=10,tokens=100)
  data={'runs':[dict(common,arm='selected_skills',passed=3),dict(common,arm='minimal',passed=1)]};r=compare(data,replicates=1,draws=50)['selected_skills'];self.assertEqual(r['mean_pass_rate_delta'],.5);self.assertFalse(r['ready_for_inference'])
if __name__=='__main__':unittest.main()

class PredictionTemporalTests(unittest.TestCase):
 def test_training_outcomes_precede_holdout_and_entry_is_future(self):
  from run_prediction_lab import dataset,split
  p=pd.DataFrame({'A':np.linspace(100,150,150)},index=pd.date_range('2025-01-01',periods=150,freq='D'))
  rows=dataset(p);train,test,cut=split(rows)
  self.assertTrue(train and test)
  self.assertTrue(all(r['entry_date']>r['decision_date'] for r in rows))
  self.assertTrue(all(r['outcome_date']<cut for r in train))
  self.assertTrue(all(r['decision_date']>=cut for r in test))
