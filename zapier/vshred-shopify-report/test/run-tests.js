/**
 * Local verification harness for the V Shred Shopify report logic.
 * Runs the pure functions from ../code-by-zapier.js against captured + synthetic
 * messages and asserts the counting rules. No network / no Slack calls.
 *
 *   node zapier/vshred-shopify-report/test/run-tests.js
 */
'use strict';

var path = require('path');
var fs = require('fs');
var lib = require(path.join(__dirname, '..', 'code-by-zapier.js'));

var fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'sample-messages.json'), 'utf8')
);
var messages = fixture.messages;

// Fixed "now": 3:30 PM PT on the captured day (PDT = UTC-07:00).
var NOW = '2026-05-28T15:30:00-07:00';

var failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log('  PASS  ' + name);
  } else {
    failures++;
    console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  }
}
function approx(a, b) { return Math.abs(a - b) < 0.01; }

console.log('\n--- unit: parsing ---');
var sample = lib.parseOrder(messages[0]);
check('parseOrder customer', sample.customer === 'Carole Urban', sample.customer);
check('parseOrder orderNo', sample.orderNo === '84377', sample.orderNo);
check('parseOrder totalPrice', sample.totalPrice === 1497, String(sample.totalPrice));
check('parseOrder owner', sample.owner === 'Daniel Dimitrov', sample.owner);
check('unwrapEmail', sample.email === 'c51948538@gmail.com', sample.email);
check('parseMoney $5,197', lib.parseMoney('$5,197') === 5197, '');
check('parseMoney 4677.3', lib.parseMoney('4677.3') === 4677.3, '');

console.log('\n--- unit: tier classification ---');
check('Genesis Elite+', lib.classifyTier('V Shred Genesis Elite+ 12 Month Transformation Package - $5,997').sub === 'Genesis Elite+');
check('Genesis Elite', lib.classifyTier('V Shred Genesis Elite Coaching Program - 6 Month Transformation Package - $3,997').sub === 'Genesis Elite');
check('Genesis+', lib.classifyTier('NEW - V Shred Genesis+ 12 Month Transformation Package - $5,197').sub === 'Genesis+');
check('Genesis plain', lib.classifyTier('V Shred Genesis Coaching Program - 6 Month Transformation Package').sub === 'Genesis');
check('Accelerator+', lib.classifyTier('V Shred Accelerator+ Custom Coaching Plan').sub === 'Accelerator+');
check('Accelerator', lib.classifyTier('NEW - V Shred Accelerator Custom Coaching Plan').sub === 'Accelerator');
check('Metabolism 6mo', lib.classifyTier('NEW - V Shred Metabolism Tune-Up Program (6 Months)').bucket === 'Metabolism Tune-Up');
check('Reservation', lib.classifyTier('V Shred Reservation').bucket === 'Reservation');
check('all Genesis variants share bucket',
  lib.classifyTier('V Shred Genesis Elite+ ...').bucket === 'Genesis' &&
  lib.classifyTier('V Shred Genesis+ ...').bucket === 'Genesis');

console.log('\n--- integration: computeReport ---');
var stats = lib.computeReport(messages, { now: NOW });

check('order count = 27 (26 real + 1 reservation; dedup+splits+late excluded)',
  stats.orderCount === 27, String(stats.orderCount));
check('total revenue = 58766.3', approx(stats.totalRevenue, 58766.3), String(stats.totalRevenue));
check('AOV = revenue / count', approx(stats.aov, 58766.3 / 27), String(stats.aov));

check('dedupe: order 84377 counted once',
  stats.validOrders.filter(function (o) { return o.orderNo === '84377'; }).length === 1);
check('split fragment 99001 excluded',
  stats.validOrders.filter(function (o) { return o.orderNo === '99001'; }).length === 0);
check('split fragment 99002 excluded',
  stats.validOrders.filter(function (o) { return o.orderNo === '99002'; }).length === 0);
check('late (8:30 PM) order 99004 excluded',
  stats.validOrders.filter(function (o) { return o.orderNo === '99004'; }).length === 0);
check('reservation 99003 included',
  stats.validOrders.filter(function (o) { return o.orderNo === '99003'; }).length === 1);

console.log('\n--- tier buckets ---');
check('Genesis bucket = 10 orders', stats.tiers.Genesis.orders === 10, String(stats.tiers.Genesis.orders));
check('Genesis revenue = 39650.3', approx(stats.tiers.Genesis.revenue, 39650.3), String(stats.tiers.Genesis.revenue));
check('Accelerator bucket = 8 orders', stats.tiers.Accelerator.orders === 8, String(stats.tiers.Accelerator.orders));
check('Accelerator revenue = 13976', approx(stats.tiers.Accelerator.revenue, 13976), String(stats.tiers.Accelerator.revenue));
check('Metabolism bucket = 8 orders', stats.tiers['Metabolism Tune-Up'].orders === 8, String(stats.tiers['Metabolism Tune-Up'].orders));
check('Metabolism revenue = 5040', approx(stats.tiers['Metabolism Tune-Up'].revenue, 5040), String(stats.tiers['Metabolism Tune-Up'].revenue));
check('Reservation bucket = 1 order', stats.tiers.Reservation.orders === 1, String(stats.tiers.Reservation.orders));

console.log('\n--- big tickets ---');
check('big tickets capped at 5', stats.bigTickets.length === 5, String(stats.bigTickets.length));
check('top big ticket = 5997', stats.bigTickets[0].totalPrice === 5997, String(stats.bigTickets[0].totalPrice));
check('all big tickets >= 3997', stats.bigTickets.every(function (o) { return o.totalPrice >= 3997; }));

console.log('\n--- projection / DoD ---');
check('projection conservative < realistic < bullish',
  stats.projection.conservative < stats.projection.realistic &&
  stats.projection.realistic < stats.projection.bullish);
check('day-over-day N/A when no prior-weekday data', stats.priorDayRevenue === null);
check('revenue/hour positive', stats.revPerHour > 0, String(stats.revPerHour));

console.log('\n=== Rendered VELOCITY report (1:00 PM-style) ===\n');
console.log(lib.formatReport(stats, { runLabel: 'velocity' }));

console.log('\n=== Rendered EOD report ===\n');
console.log(lib.formatReport(lib.computeReport(messages, { now: '2026-05-28T20:00:00-07:00' }), { runLabel: 'eod' }));

console.log('\n----------------------------------------');
if (failures === 0) {
  console.log('ALL CHECKS PASSED');
  process.exit(0);
} else {
  console.log(failures + ' CHECK(S) FAILED');
  process.exit(1);
}
