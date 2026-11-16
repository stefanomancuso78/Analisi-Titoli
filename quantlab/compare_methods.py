"""Paired, task-clustered analysis. Ingests real exported runs; never fabricates model outputs."""
import argparse,json,random,statistics

def compare(report,replicates=3,draws=5000):
 by_case={}
 for r in report['runs']:
  if 'arm' not in r:raise ValueError('Owner-authorized unblinded export required for analysis')
  by_case.setdefault(r['case_id'],{}).setdefault(r['arm'],{})[r['replicate']]=r
 output={}
 for treatment in ['selected_skills','skills_human_review']:
  cases=[]
  for cid,arms in by_case.items():
   common=sorted(set(arms.get('minimal',{}))&set(arms.get(treatment,{})))
   if len(common)<replicates:continue
   metrics={k:[] for k in ['pass_rate_delta','seconds_delta','tokens_delta','human_seconds_delta']}
   for n in common:
    a,b=arms['minimal'][n],arms[treatment][n]
    if any(a[k]!=b[k] for k in ['model','model_version','tool_profile','input_hash','total']):raise ValueError('Unmatched experimental controls')
    metrics['pass_rate_delta'].append(b['passed']/b['total']-a['passed']/a['total'])
    for field,key in [('duration_seconds','seconds_delta'),('tokens','tokens_delta'),('human_seconds','human_seconds_delta')]:metrics[key].append(b.get(field,0)-a.get(field,0))
   cases.append({'case_id':cid,**{k:statistics.mean(v) for k,v in metrics.items()}})
  rng=random.Random(1776);values=[c['pass_rate_delta'] for c in cases]
  boot=sorted(statistics.mean(rng.choices(values,k=len(values))) for _ in range(draws)) if values else []
  output[treatment]={'paired_tasks':len(cases),'mean_pass_rate_delta':statistics.mean(values) if values else None,'task_clustered_bootstrap_95pct':[boot[int(.025*draws)],boot[min(draws-1,int(.975*draws))]] if boot else None,'ready_for_inference':len(cases)>=20,'per_task':cases,'note':'Treatment minus minimal. Replicates averaged within each task before bootstrap; a development-method result, not financial alpha. No significance claim with an insufficient sample.'}
 return output
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('export');p.add_argument('--output',required=True);a=p.parse_args();result=compare(json.load(open(a.export)));open(a.output,'w').write(json.dumps(result,indent=2));print(json.dumps({k:v['paired_tasks'] for k,v in result.items()}))
