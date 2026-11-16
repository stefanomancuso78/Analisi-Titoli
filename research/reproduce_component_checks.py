import importlib.util,json,tempfile,pathlib,hashlib,math
root=pathlib.Path(__file__).parent
mods={}
for name in ['quick_validate','aggregate_benchmark']:
 spec=importlib.util.spec_from_file_location(name,root/'upstream'/('openai_quick_validate.py' if name=='quick_validate' else 'anthropic_aggregate_benchmark.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);mods[name]=m
v=mods['quick_validate'];a=mods['aggregate_benchmark'];checks=[]
def record(name,actual,expected,scope,limitation=None):
 assert actual==expected,(name,actual,expected)
 checks.append(dict(name=name,observed=actual,expected=expected,scope=scope,limitation=limitation))
with tempfile.TemporaryDirectory() as t:
 p=pathlib.Path(t)
 for name,txt,want in [('valid','name: research-audit\ndescription: Validate primary evidence.',True),('bad_name','name: Bad_Name\ndescription: Sample.',False),('unknown_key','name: audit\ndescription: Sample.\nunsafe: true',False),('empty_metadata','name: ""\ndescription: ""',True)]:
  (p/'SKILL.md').write_text('---\n'+txt+'\n---\nBody.\n');record('OpenAI validator '+name,v.validate_skill(p)[0],want,'format_only','Empty metadata is accepted; structural validation does not prove usefulness.' if name=='empty_metadata' else None)
 record('Anthropic numeric aggregation',a.calculate_stats([0,1,1])['mean'],.6667,'component_math')
 inputs={'without_skill':[{'pass_rate':.25,'time_seconds':10,'tokens':100}], 'with_skill':[{'pass_rate':.75,'time_seconds':12,'tokens':150}]}
 record('Anthropic delta depends on insertion order',a.aggregate_results(inputs)['delta']['pass_rate'],'-0.50','report_semantics','Delta uses first group minus second, not explicit with-minus-without; callers must label direction.')
 run=p/'eval-1'/'with_skill'/'run-1';run.mkdir(parents=True);(run/'grading.json').write_text(json.dumps({'summary':{'pass_rate':1,'passed':1,'failed':0,'total':1},'execution_metrics':{'output_chars':1234}}))
 loaded=a.load_run_results(p);record('Anthropic character fallback',loaded['with_skill'][0]['tokens'],1234,'report_semantics','Output characters can be reported in the tokens field; not a measured token count.')
 report=a.generate_benchmark(p);record('Anthropic fixed repetition metadata',report['metadata']['runs_per_configuration'],3,'report_semantics','Fixture has one run, yet metadata reports three; derive repetitions from observed runs instead.')
result={'checked_at':'2026-11-12','kind':'local_component_checks_not_llm_comparison','checks':checks,'count':len(checks),'scripts':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in (root/'upstream').glob('*.py')},'conclusion':'Scripts execute as observed. This is not evidence that a skill improves agent output or financial performance. Claude end-to-end tests were not run: no configured Claude CLI/API.'}
(root/'local-check-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
