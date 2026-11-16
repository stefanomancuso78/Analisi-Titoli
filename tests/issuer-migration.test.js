import test from 'node:test';
import assert from 'node:assert/strict';
import {gLinks} from '../worker/graph.js';
test('issuer-specific release paths preserve host boundaries and default discovery',()=>{
 const html='<a href="/en/news/2026-first-half-results">2026 first-half results</a><a href="https://outside.example/en/news/event">Outside issuer statement</a><a href="/en/news/x">Menu</a>';
 assert.deepEqual(gLinks(html,'https://www.legrand.com/en/investors'),[]);
 assert.deepEqual(gLinks(html,'https://www.legrand.com/en/investors',['/en/news/']),[{url:'https://www.legrand.com/en/news/2026-first-half-results',title:'2026 first-half results'}]);
});
