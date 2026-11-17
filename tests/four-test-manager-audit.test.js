import test from 'node:test';
import assert from 'node:assert/strict';
import {MANAGER_GUIDE,MANAGER_GUIDE_HTML} from '../worker/manager-guide.js';
import {PRODUCT_HTML,PRODUCT_UI} from '../worker/product-ui.js';
import {PERFORMANCE_HTML,PERFORMANCE_UI,pcGroups} from '../worker/performance-charts.js';
import {MANAGER_STATUS_HTML,managerStatus} from '../worker/manager-status.js';
import {readFileSync} from 'node:fs';

test('all manager-facing test navigation, descriptions and guides account for Test 4',()=>{
 assert.match(PRODUCT_HTML,/I quattro test/);
 assert.match(PRODUCT_HTML,/Test 4/);
 assert.match(PERFORMANCE_HTML,/Come evolvono i quattro test/);
 assert.match(MANAGER_STATUS_HTML,/Test 4/);
 assert.match(MANAGER_GUIDE,/\| Test 4 \|/);
 assert.match(MANAGER_GUIDE_HTML,/<td>Test 4<\/td>/);
 assert.match(MANAGER_GUIDE,/Test 4 ha una serie distinta/);
 assert.match(readFileSync('docs/GUIDA_GESTORE_STOKIQ.md','utf8'),/\| Test 4 \|/);
 assert.doesNotMatch(PRODUCT_HTML,/quattro casi registrati/);
});

test('historical chart explicitly distinguishes different denominators and no observed prediction skill',()=>{
 assert.match(PERFORMANCE_HTML,/Denominatori e protocolli differenti/);
 assert.match(PERFORMANCE_UI,/casi selezionati appaiati/);
 assert.match(PERFORMANCE_UI,/titoli misurabili/);
 assert.match(PRODUCT_HTML,/Non ogni notizia diventa una previsione/);
});
