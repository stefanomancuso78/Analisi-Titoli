import test from 'node:test';
import assert from 'node:assert/strict';
import {shExpectedPriorBusinessDay,shAssess} from '../worker/source-health.js';

test('previous-business-day expectation respects weekends and never fabricates a holiday close',()=>{
 assert.equal(shExpectedPriorBusinessDay('2026-11-16T12:00:00Z'),'2026-11-13');
 assert.equal(shExpectedPriorBusinessDay('2026-11-17T12:00:00Z'),'2026-11-16');
 assert.equal(shExpectedPriorBusinessDay('2026-11-15T12:00:00Z'),'2026-11-13');
 assert.equal(shExpectedPriorBusinessDay('not a date'),null);
});

test('stock with Fri close is not marked absent on Mon but is flagged on Tue; its stored close is unchanged',()=>{
 const symbols=[{symbol:'ACME',name:'Acme'}],quote={symbol:'ACME',trade_date:'2026-11-13',recorded_at:'2026-11-14T01:00:00Z',currency:'USD',close:100,source:'https://api.nasdaq.com/acme'};
 const monday=shAssess(symbols,[],[],[quote],'2026-11-16T12:00:00Z');
 const tuesday=shAssess(symbols,[],[],[quote],'2026-11-17T12:00:00Z');
 assert.equal(monday.stocks[0].prices.prior_business_day_missing,false);
 assert.equal(tuesday.stocks[0].prices.prior_business_day_missing,true);
 assert.equal(tuesday.stocks[0].prices.trade_date,'2026-11-13');
 assert.equal(tuesday.counts.prices_prior_business_day_missing,1);
 assert.match(tuesday.stocks[0].prices.expected_day_notice,/festività/);
});
