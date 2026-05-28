/**
 * V Shred Shopify Sales Report — "Code by Zapier" (JavaScript / Run Node.js)
 * ---------------------------------------------------------------------------
 * Pulls today's #vshred-shopify-sales messages, applies Rich's counting rules,
 * and produces a Slack-markdown report to DM to Rich (UTE5RS81M).
 *
 * This single file is BOTH:
 *   1. The script you paste into the "Code by Zapier" step (Run Javascript), and
 *   2. A Node-testable module (functions are exported when run under Node).
 *
 * In Zapier, set these Input Data fields (left = key, right = value):
 *   slackToken   -> your Slack bot token  (recommend a Zapier "Storage"/env or
 *                   a Slack OAuth token with channels:history + groups:history)
 *   channelId    -> C03LRQBCZAM
 *   userId       -> UTE5RS81M
 *   runLabel     -> one of: velocity | eod        (8 PM run uses "eod")
 *   runTime      -> {{zap_meta_human_now}} or leave blank to use current time
 *
 * Step output (consumed by the next "Slack: Send Direct Message" action):
 *   output.report  -> the formatted message text
 *   output.userId  -> UTE5RS81M (pass-through convenience)
 *   output.orderCount, output.totalRevenue, output.aov  -> for debugging/filters
 *
 * Calculation rules implemented (must match how Rich tracks it):
 *   1. Only orders timestamped on the CURRENT PT day, 12:00 AM – 8:00 PM PT.
 *   2. Exclude split fragments: messages containing "Do not fulfill" or
 *      "part of split order". Standard daily report = fulfillable-orders logic.
 *   3. Deduplicate by Order # (same order can be reposted; count once).
 *   4. Total Revenue = sum of Total Price across valid orders.
 *   5. AOV = Total Revenue / Order Count.
 *
 * Tier buckets (grouped by Product name):
 *   Genesis (Genesis / Genesis+ / Genesis Elite / Genesis Elite+; incl NEW/6mo/12mo/Custom)
 *   Accelerator (Accelerator / Accelerator+; incl NEW)
 *   Metabolism Tune-Up (3mo / 6mo; incl NEW)
 *   Reservation ($100 holds)
 */

'use strict';

var TIMEZONE = 'America/Los_Angeles';
var BUSINESS_DAY_CLOSE_HOUR = 20; // 8:00 PM PT — V Shred business day close
var BIG_TICKET_MIN = 3997;        // big-ticket threshold

/* ------------------------------------------------------------------ *
 * Time helpers (no external libraries — uses Intl with timeZone)
 * ------------------------------------------------------------------ */

// Returns { y, m, d, hour, minute, second, dateKey, weekday } in PT wall clock.
function ptParts(date) {
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'short'
  });
  var parts = {};
  fmt.formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
  // hour can come back as "24" at midnight in some runtimes — normalize to 0.
  var hour = parseInt(parts.hour, 10) % 24;
  return {
    y: parseInt(parts.year, 10),
    m: parseInt(parts.month, 10),
    d: parseInt(parts.day, 10),
    hour: hour,
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
    weekday: parts.weekday,
    dateKey: parts.year + '-' + parts.month + '-' + parts.day,
    decimalHour: hour + parseInt(parts.minute, 10) / 60 + parseInt(parts.second, 10) / 3600
  };
}

// PT dateKey ("YYYY-MM-DD") for N days before the given date, in PT.
function ptDateKeyDaysAgo(date, days) {
  var shifted = new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
  return ptParts(shifted).dateKey;
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

// Pull "Label: value" out of a "New Shopify Sale" message body.
function field(text, label) {
  // Matches "Order #: 84377", "Total Price: 1497.0", "Subtotal Paid: 1200", etc.
  var re = new RegExp('^\\s*' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '\\s*:?\\s*(.+?)\\s*$', 'im');
  var m = text.match(re);
  return m ? m[1].trim() : null;
}

// "$3,997" / "1497.0" / "4677.3" -> 1497.0 (Number) or null.
function parseMoney(raw) {
  if (raw === null || raw === undefined) return null;
  var cleaned = String(raw).replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  var n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Slack wraps emails as <mailto:a@b.com|a@b.com>. Unwrap to a@b.com.
function unwrapEmail(raw) {
  if (!raw) return null;
  var m = raw.match(/mailto:([^|>]+)/i);
  if (m) return m[1].trim();
  return raw.replace(/[<>]/g, '').trim();
}

// Classify a product name into one of the four top-level tier buckets,
// plus a finer sub-tier label for optional detail. Order of checks matters.
function classifyTier(product) {
  var p = (product || '').toLowerCase();

  if (p.indexOf('reservation') !== -1) {
    return { bucket: 'Reservation', sub: 'Reservation' };
  }
  if (p.indexOf('metabolism') !== -1 || p.indexOf('tune-up') !== -1 || p.indexOf('tune up') !== -1) {
    var months = p.indexOf('(3') !== -1 ? '3mo' : (p.indexOf('(6') !== -1 ? '6mo' : '');
    return { bucket: 'Metabolism Tune-Up', sub: ('Metabolism Tune-Up ' + months).trim() };
  }
  if (p.indexOf('genesis') !== -1) {
    var sub;
    if (p.indexOf('elite+') !== -1) sub = 'Genesis Elite+';
    else if (p.indexOf('elite') !== -1) sub = 'Genesis Elite';
    else if (p.indexOf('genesis+') !== -1) sub = 'Genesis+';
    else sub = 'Genesis';
    return { bucket: 'Genesis', sub: sub };
  }
  if (p.indexOf('accelerator') !== -1) {
    var asub = p.indexOf('accelerator+') !== -1 ? 'Accelerator+' : 'Accelerator';
    return { bucket: 'Accelerator', sub: asub };
  }
  return { bucket: 'Other', sub: 'Other' };
}

// Detects split fragments that must be excluded from the standard daily report.
function isSplitFragment(text) {
  var t = (text || '').toLowerCase();
  return t.indexOf('do not fulfill') !== -1 || t.indexOf('part of split order') !== -1;
}

/**
 * Normalize a raw Slack message into an order object (or null if not an order).
 * `msg` is { text, ts } where ts is the Slack epoch-seconds string/number.
 */
function parseOrder(msg) {
  var text = msg.text || '';
  if (text.indexOf('New order in Shopify') === -1 && !field(text, 'Order #')) {
    return null; // not a sale notification
  }
  var orderNo = field(text, 'Order #');
  if (!orderNo) return null;

  var tsSeconds = parseFloat(msg.ts);
  return {
    orderNo: String(orderNo).replace(/[^0-9A-Za-z]/g, ''),
    customer: field(text, 'Customer name'),
    email: unwrapEmail(field(text, 'Email')),
    product: field(text, 'Product'),
    totalPrice: parseMoney(field(text, 'Total Price')),
    subtotalPaid: parseMoney(field(text, 'Subtotal Paid')),
    owner: field(text, 'Owner'),
    isSplit: isSplitFragment(text),
    ts: tsSeconds,
    date: new Date(tsSeconds * 1000),
    raw: text
  };
}

/* ------------------------------------------------------------------ *
 * Core computation
 * ------------------------------------------------------------------ */

/**
 * @param messages  array of { text, ts }
 * @param opts      { now: Date, includePriorWeekday: bool }
 * @returns stats object
 */
function computeReport(messages, opts) {
  opts = opts || {};
  var now = opts.now ? new Date(opts.now) : new Date();
  var nowPT = ptParts(now);
  var todayKey = nowPT.dateKey;
  var priorWeekdayKey = ptDateKeyDaysAgo(now, 7);

  var orders = [];
  for (var i = 0; i < messages.length; i++) {
    var o = parseOrder(messages[i]);
    if (o) orders.push(o);
  }

  // Partition by PT day, keeping only the in-window business hours (12am–8pm PT).
  function inBusinessWindow(order, dateKey) {
    var pt = ptParts(order.date);
    return pt.dateKey === dateKey && pt.decimalHour < BUSINESS_DAY_CLOSE_HOUR;
  }

  // --- Today's valid orders (standard daily / fulfillable-orders logic) ---
  // 1) window filter  2) exclude split fragments  3) dedupe by Order #
  var byOrderNo = {};
  var firstOrderTs = null;
  orders.forEach(function (o) {
    if (!inBusinessWindow(o, todayKey)) return;
    if (o.isSplit) return;                 // exclude split fragments
    if (o.totalPrice === null) return;     // can't value it
    if (!byOrderNo[o.orderNo]) {           // dedupe — keep first seen
      byOrderNo[o.orderNo] = o;
      if (firstOrderTs === null || o.ts < firstOrderTs) firstOrderTs = o.ts;
    }
  });

  var valid = Object.keys(byOrderNo).map(function (k) { return byOrderNo[k]; });
  valid.sort(function (a, b) { return a.ts - b.ts; });

  var totalRevenue = valid.reduce(function (s, o) { return s + o.totalPrice; }, 0);
  var orderCount = valid.length;
  var aov = orderCount ? totalRevenue / orderCount : 0;

  // Revenue/hour = revenue ÷ hours since the first order of the day.
  var firstOrderPT = firstOrderTs ? ptParts(new Date(firstOrderTs * 1000)) : null;
  var hoursSinceFirst = firstOrderPT ? Math.max(0.25, nowPT.decimalHour - firstOrderPT.decimalHour) : 0;
  var revPerHour = hoursSinceFirst ? totalRevenue / hoursSinceFirst : 0;

  // Tier buckets.
  var tierOrder = ['Genesis', 'Accelerator', 'Metabolism Tune-Up', 'Reservation', 'Other'];
  var tiers = {};
  tierOrder.forEach(function (t) { tiers[t] = { orders: 0, revenue: 0, subs: {} }; });
  valid.forEach(function (o) {
    var c = classifyTier(o.product);
    if (!tiers[c.bucket]) tiers[c.bucket] = { orders: 0, revenue: 0, subs: {} };
    tiers[c.bucket].orders += 1;
    tiers[c.bucket].revenue += o.totalPrice;
    if (!tiers[c.bucket].subs[c.sub]) tiers[c.bucket].subs[c.sub] = { orders: 0, revenue: 0 };
    tiers[c.bucket].subs[c.sub].orders += 1;
    tiers[c.bucket].subs[c.sub].revenue += o.totalPrice;
  });

  // Big tickets ($3,997+), top 5 by price.
  var bigTickets = valid
    .filter(function (o) { return o.totalPrice >= BIG_TICKET_MIN; })
    .sort(function (a, b) { return b.totalPrice - a.totalPrice; })
    .slice(0, 5);

  // EOD projection (pace-based on revenue/hour and remaining hours to 8pm PT).
  var remainingHours = Math.max(0, BUSINESS_DAY_CLOSE_HOUR - nowPT.decimalHour);
  var projection = {
    conservative: totalRevenue + revPerHour * remainingHours * 0.70,
    realistic: totalRevenue + revPerHour * remainingHours * 1.00,
    bullish: totalRevenue + revPerHour * remainingHours * 1.30
  };

  // Day-over-day vs prior same weekday (only if those messages were supplied).
  var priorDayRevenue = null, priorDayOrders = 0, priorSeen = false;
  var priorByOrderNo = {};
  orders.forEach(function (o) {
    if (!inBusinessWindow(o, priorWeekdayKey)) return;
    priorSeen = true;
    if (o.isSplit || o.totalPrice === null) return;
    if (!priorByOrderNo[o.orderNo]) priorByOrderNo[o.orderNo] = o;
  });
  if (priorSeen) {
    var priorValid = Object.keys(priorByOrderNo).map(function (k) { return priorByOrderNo[k]; });
    priorDayOrders = priorValid.length;
    priorDayRevenue = priorValid.reduce(function (s, o) { return s + o.totalPrice; }, 0);
  }

  return {
    now: now,
    nowPT: nowPT,
    todayKey: todayKey,
    priorWeekdayKey: priorWeekdayKey,
    orderCount: orderCount,
    totalRevenue: totalRevenue,
    aov: aov,
    revPerHour: revPerHour,
    hoursSinceFirst: hoursSinceFirst,
    firstOrderPT: firstOrderPT,
    tiers: tiers,
    tierOrder: tierOrder,
    bigTickets: bigTickets,
    projection: projection,
    remainingHours: remainingHours,
    priorDayRevenue: priorDayRevenue,
    priorDayOrders: priorDayOrders,
    validOrders: valid
  };
}

/* ------------------------------------------------------------------ *
 * Formatting (Slack markdown)
 * ------------------------------------------------------------------ */

function money(n) {
  return '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}
function money0(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}
function pad(str, len) {
  str = String(str);
  return str.length >= len ? str : str + new Array(len - str.length + 1).join(' ');
}

function formatReport(stats, opts) {
  opts = opts || {};
  var isEOD = opts.runLabel === 'eod';
  var pt = stats.nowPT;
  var dateStr = pt.weekday + ' ' + pt.m + '/' + pt.d + '/' + pt.y;
  var timeStr = (pt.hour % 12 || 12) + ':' + pad2(pt.minute) + ' ' + (pt.hour < 12 ? 'AM' : 'PM');
  var mode = isEOD ? 'EOD Final' : 'Velocity';

  var lines = [];
  lines.push('📊 *V Shred Shopify — ' + mode + '* | ' + dateStr + ' | ' + timeStr + ' PT'
    + (isEOD ? '  *(FINAL)*' : ''));
  lines.push('');

  // Headline metrics.
  lines.push('*Total Orders:* ' + stats.orderCount);
  lines.push('*Total Revenue:* ' + money0(stats.totalRevenue));
  lines.push('*AOV:* ' + money0(stats.aov));
  lines.push('*Revenue/Hour:* ' + money0(stats.revPerHour)
    + '  _(' + stats.hoursSinceFirst.toFixed(1) + 'h since first order)_');
  lines.push('');

  // Tier breakdown table.
  lines.push('*Tier Breakdown*');
  lines.push('```');
  lines.push(pad('Tier', 22) + pad('Orders', 8) + 'Revenue');
  lines.push(pad('----', 22) + pad('------', 8) + '-------');
  stats.tierOrder.forEach(function (t) {
    var row = stats.tiers[t];
    if (!row || row.orders === 0) return;
    lines.push(pad(t, 22) + pad(String(row.orders), 8) + money0(row.revenue));
  });
  lines.push(pad('TOTAL', 22) + pad(String(stats.orderCount), 8) + money0(stats.totalRevenue));
  lines.push('```');
  lines.push('');

  // Big tickets.
  if (stats.bigTickets.length) {
    lines.push('*Big Tickets ($3,997+)*');
    stats.bigTickets.forEach(function (o) {
      lines.push('• ' + money0(o.totalPrice) + ' — ' + (o.customer || 'Unknown')
        + ' — ' + (o.product || '') + '  _(' + (o.owner || 'Unassigned') + ')_');
    });
    lines.push('');
  }

  // Projection (velocity runs) OR day-over-day (EOD).
  if (!isEOD) {
    lines.push('*EOD Projection* _(pace to 8 PM PT, ' + stats.remainingHours.toFixed(1) + 'h left)_');
    lines.push('• Conservative: ' + money0(stats.projection.conservative));
    lines.push('• Realistic:    ' + money0(stats.projection.realistic));
    lines.push('• Bullish:      ' + money0(stats.projection.bullish));
  } else {
    if (stats.priorDayRevenue !== null) {
      var delta = stats.totalRevenue - stats.priorDayRevenue;
      var pct = stats.priorDayRevenue ? (delta / stats.priorDayRevenue) * 100 : 0;
      var arrow = delta >= 0 ? '▲' : '▼';
      lines.push('*Day-over-Day* _(vs ' + stats.priorWeekdayKey + ', same weekday)_');
      lines.push('• Prior: ' + money0(stats.priorDayRevenue) + ' (' + stats.priorDayOrders + ' orders)');
      lines.push('• Today: ' + money0(stats.totalRevenue) + ' (' + stats.orderCount + ' orders)');
      lines.push('• ' + arrow + ' ' + money0(Math.abs(delta)) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)');
    } else {
      lines.push('_Day-over-day unavailable — include prior same-weekday messages in the Slack search to enable._');
    }
  }

  return lines.join('\n');
}

function pad2(n) { return n < 10 ? '0' + n : String(n); }

/* ------------------------------------------------------------------ *
 * Slack fetch (used inside Zapier; not exercised by unit tests)
 * ------------------------------------------------------------------ */

// Pulls conversations.history for the channel back to `oldestSeconds`,
// paginating as needed. Requires a bot token with channels:history
// (and groups:history if the channel is private).
async function fetchChannelMessages(token, channelId, oldestSeconds) {
  var collected = [];
  var cursor = '';
  for (var guard = 0; guard < 20; guard++) {
    var url = 'https://slack.com/api/conversations.history'
      + '?channel=' + encodeURIComponent(channelId)
      + '&oldest=' + encodeURIComponent(String(oldestSeconds))
      + '&limit=200'
      + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
    var res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    var data = await res.json();
    if (!data.ok) throw new Error('Slack API error: ' + data.error);
    (data.messages || []).forEach(function (m) {
      collected.push({ text: m.text || '', ts: m.ts });
    });
    if (data.has_more && data.response_metadata && data.response_metadata.next_cursor) {
      cursor = data.response_metadata.next_cursor;
    } else {
      break;
    }
  }
  return collected;
}

// Zapier entry point: fetch -> compute -> format. Returns the step output.
async function run(input) {
  input = input || {};
  var now = input.runTime ? new Date(input.runTime) : new Date();
  if (isNaN(now.getTime())) now = new Date();

  var runLabel = (input.runLabel || 'velocity').toLowerCase();
  var isEOD = runLabel === 'eod';

  // Oldest cutoff: midnight PT today, or 8 days back on the EOD run so the
  // day-over-day comparison has the prior same-weekday data available.
  var lookbackDays = isEOD ? 8 : 1;
  var oldest = Math.floor((now.getTime() - lookbackDays * 24 * 60 * 60 * 1000) / 1000);

  var messages = await fetchChannelMessages(input.slackToken, input.channelId, oldest);
  var stats = computeReport(messages, { now: now });
  var report = formatReport(stats, { runLabel: runLabel });

  return {
    report: report,
    userId: input.userId || 'UTE5RS81M',
    orderCount: stats.orderCount,
    totalRevenue: Math.round(stats.totalRevenue),
    aov: Math.round(stats.aov),
    messageCount: messages.length
  };
}

/* ------------------------------------------------------------------ *
 * Dual runtime wiring
 * ------------------------------------------------------------------ */

// Export pure functions for the Node test harness.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ptParts: ptParts,
    ptDateKeyDaysAgo: ptDateKeyDaysAgo,
    field: field,
    parseMoney: parseMoney,
    unwrapEmail: unwrapEmail,
    classifyTier: classifyTier,
    isSplitFragment: isSplitFragment,
    parseOrder: parseOrder,
    computeReport: computeReport,
    formatReport: formatReport,
    fetchChannelMessages: fetchChannelMessages,
    run: run
  };
}

// In Zapier, `inputData` is a provided global. Top-level `return` is legal in
// both the CommonJS module wrapper and the Code-by-Zapier wrapper.
if (typeof inputData !== 'undefined') {
  return run(inputData); // eslint-disable-line no-undef
}
