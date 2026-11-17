import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyConnector,connectorTriageSummary} from '../worker/connector-triage.js';
const row=(last_status,last_error='',extra={})=>({id:'x',payload:JSON.stringify({kind:'company',enabled:true,symbol:'ABC'}),last_status,last_error,...extra});
test('connector errors are not collapsed into one outage',()=>{
  assert.equal(classifyConnector(row('error','HTTP 403')).category,'blocked_403');
  assert.equal(classifyConnector(row('error','HTTP 404')).category,'permanent_404_410');
  assert.equal(classifyConnector(row('error','HTTP 410')).category,'permanent_404_410');
  assert.equal(classifyConnector(row('rate_limited','HTTP 429')).category,'rate_limited');
  assert.equal(classifyConnector(row('credentials_required','Credenziali mancanti')).category,'requires_credentials');
  assert.equal(classifyConnector(row('error','Risposta SEC non Atom')).category,'parser_broken');
  assert.equal(classifyConnector(row('error','HTTP 503')).category,'transient');
});
test('successful fetch is not a qualified primary document',()=>{
  const x=classifyConnector(row('ok'));
  assert.equal(x.category,'reachable_unverified_content');
  assert.equal(x.action,'measure_end_to_end_yield');
});
test('disabled and future backoff are never due',()=>{
  assert.equal(classifyConnector({...row('error','HTTP 404'),payload:JSON.stringify({kind:'company',enabled:false})}).due,false);
  assert.equal(classifyConnector(row('rate_limited','HTTP 429',{next_poll:'2030-01-01T00:00:00Z'}),'2026-11-17T00:00:00Z').due,false);
});
test('summary keeps connector identity and separates categories',()=>{
  const s=connectorTriageSummary([row('error','HTTP 404'),{...row('ok'),id:'healthy'}]);
  assert.equal(s.total,2);assert.equal(s.by_category.permanent_404_410,1);
  assert.equal(s.rows[1].id,'healthy');
});
