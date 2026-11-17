import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCT_HTML,PRODUCT_UI} from '../worker/product-ui.js';
import {MANAGER_STATUS_HTML} from '../worker/manager-status.js';

test('manager workspace explains the prospective prediction-learning cycle without claiming live trading',()=>{
  for(const label of ['1 · Memoria','2 · Interpretazione','3 · Previsione','4 · Validazione','5 · Apprendimento'])
    assert.ok(PRODUCT_HTML.includes(label),label);
  assert.match(PRODUCT_HTML,/nessun ordine automatico/);
  assert.match(PRODUCT_HTML,/nuove versioni soltanto da esiti maturati/i);
  assert.match(PRODUCT_HTML,/osservazione del gestore/i);
});

test('Test 4 cases are exposed from read-only status response, not created on view',()=>{
  assert.match(PRODUCT_HTML,/id="test4-case-list"/);
  assert.match(PRODUCT_UI,/fetch\('\/api\/test4',\{cache:'no-store'\}\)/);
  assert.match(PRODUCT_UI,/Array\.isArray\(d\.recent\)/);
  assert.match(PRODUCT_UI,/c\.excluded_reason/);
  assert.match(PRODUCT_UI,/c\.alpha/);
  assert.doesNotMatch(PRODUCT_UI,/fetch\('\/api\/test4',\{method:'POST'/);
});

test('learning-readiness uses observed model counts and preserves the four tests',()=>{
  assert.match(PRODUCT_UI,/d\.learning\.models\.length/);
  assert.match(PRODUCT_UI,/d\.learning\.scores\.evaluation_outcomes/);
  assert.match(PRODUCT_HTML,/I quattro test/);
  assert.match(MANAGER_STATUS_HTML,/Test 4/);
});
