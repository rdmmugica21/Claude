# V Shred Shopify — 4×/day Slack Sales Report (Zapier)

Recurring automation that pulls the V Shred Shopify sales activity from
`#vshred-shopify-sales` (`C03LRQBCZAM`), applies Rich's counting rules, and
DMs a formatted report to **Rich — `UTE5RS81M`** on the **1CallClosers**
workspace, four times a day.

| Run | Time (America/Los_Angeles) | Mode | Extra |
|-----|----------------------------|------|-------|
| 1 | 10:00 AM PT | Velocity | EOD projection |
| 2 | 1:00 PM PT  | Velocity | EOD projection |
| 3 | 4:00 PM PT  | Velocity | EOD projection |
| 4 | 8:00 PM PT  | **EOD Final** | day-over-day vs prior same weekday (no projection) |

> The 8 PM run is the official day close — the V Shred business day ends at
> 8 PM PT, so only orders timestamped **12:00 AM – 8:00 PM PT** are counted.

---

## Files

| File | Purpose |
|------|---------|
| `code-by-zapier.js` | The script to paste into the **Code by Zapier** step. Self-contained (no `require`), and also runnable/testable under Node. |
| `test/run-tests.js` | Local verification harness — asserts the counting rules against real + synthetic messages. |
| `fixtures/sample-messages.json` | Captured real messages from the channel + synthetic edge cases (dedupe / split / reservation / after-8 PM). |

Run the tests locally before shipping:

```bash
cd zapier/vshred-shopify-report
npm test        # or: node test/run-tests.js
```

---

## Counting rules (implemented in `code-by-zapier.js`)

1. **Window** — only orders timestamped on the current PT day, `00:00 – 20:00` PT.
2. **Exclude split fragments** — any message containing `Do not fulfill` or
   `part of split order`. The standard daily report uses fulfillable-orders
   logic, so only the single primary (non-flagged) order of a split set counts.
   *(`Subtotal Paid` is parsed and preserved on each order for a future
   cash-collected / leaderboard view, but is not used in this fulfillable report.)*
3. **Dedupe by Order #** — the same order can be reposted; counted once
   (first occurrence wins).
4. **Total Revenue** = Σ `Total Price` over valid orders.
5. **AOV** = Total Revenue ÷ Order Count.
6. **Revenue/Hour** = Total Revenue ÷ hours since the first order of the day.

**Tier buckets** (grouped by Product name; a finer sub-tier is tracked too):

- **Genesis** — Genesis / Genesis+ / Genesis Elite / Genesis Elite+ (incl. `NEW`, 6mo, 12mo, ELITE Custom)
- **Accelerator** — Accelerator / Accelerator+ (incl. `NEW`)
- **Metabolism Tune-Up** — 3mo / 6mo (incl. `NEW`)
- **Reservation** — $100 holds

Big-ticket callouts use a `$3,997+` threshold (top 5 by price).

---

## Build the Zaps

Create **four** Zaps (one per time slot). They are identical except for the
trigger time and the `runLabel` value.

### Step 1 — Trigger: Schedule by Zapier → Every Day

- **Trigger event:** Every Day
- **Time of Day:** the slot for this Zap (`10:00 AM`, `1:00 PM`, `4:00 PM`, or `8:00 PM`)
- **Trigger on weekends:** Yes (sales post 7 days/week)
- **Account/Zap timezone:** set to **America/Los_Angeles** so the times are PT.
  (Set this in the Zap's settings → *Timezone*; the Schedule trigger fires in
  the Zap timezone.)

### Step 2 — Action: Code by Zapier → Run Javascript

- Paste the **entire contents** of `code-by-zapier.js` into the Code field.
- Add these **Input Data** key/value pairs:

  | Key | Value |
  |-----|-------|
  | `slackToken` | Slack token with `channels:history` (and `groups:history` if the channel is private). Store as a Zapier account/env secret; don't hardcode. |
  | `channelId` | `C03LRQBCZAM` |
  | `userId` | `UTE5RS81M` |
  | `runLabel` | `velocity` for the 10 AM / 1 PM / 4 PM Zaps; `eod` for the 8 PM Zap |
  | `runTime` | *(optional)* leave blank to use the trigger time, or map `{{zap_meta_human_now}}` |

  The code fetches `conversations.history` itself (paginated) back to midnight
  PT — `1` day of lookback for velocity runs, `8` days for the EOD run so the
  day-over-day comparison has the prior same-weekday data.

- **Output** produced for the next step:
  - `report` — the formatted Slack-markdown message
  - `userId` — `UTE5RS81M` (pass-through)
  - `orderCount`, `totalRevenue`, `aov`, `messageCount` — for debugging/filters

> **Alternative without a raw token:** if you prefer Zapier's managed Slack
> connection, replace Step 2 with a Slack **"Find Messages"** (or a loop over
> messages) feeding the message text into the Code step. Note Slack's
> *Find Messages* returns a limited set, so the direct `conversations.history`
> approach in the pasted code is the reliable path for full-day aggregation.

### Step 3 — Action: Slack → Send Direct Message

- **To Username / User:** map the Code step's `userId` output, or set
  directly to `UTE5RS81M` (Rich).
- **Message Text:** map the Code step's **`report`** output.
- **Send as a bot / Include a link to this Zap:** your preference. Leave
  *"Translate markdown"* / *"Send as plain text"* **off** so the `*bold*` and
  ```` ``` ```` table render.

---

## Test (per Zap, before turning on)

1. In the Zap editor, use **"Test step"** on the Code step and confirm the
   `report` output looks right for today.
2. Run the Slack DM step once and confirm the DM arrives to Rich and the totals
   match a manual count of today's `#vshred-shopify-sales` orders (apply the
   same dedupe/exclude-splits rules by hand).
3. Repeat for all four Zaps (only `runLabel` and the trigger time differ).
4. Turn all four **On**.

A reference run from captured data (3:30 PM PT, 2026-05-28) produced **27
orders / $58,766 revenue / $2,177 AOV**, with Genesis 10 · Accelerator 8 ·
Metabolism 8 · Reservation 1 — see `npm test` for the full rendered sample.

---

## Notes & maintenance

- **New product names:** `classifyTier()` matches on substrings
  (`genesis elite+`, `genesis elite`, `genesis+`, `genesis`, `accelerator+`,
  `accelerator`, `metabolism`/`tune-up`, `reservation`). If V Shred adds a new
  SKU family, add a branch there and a fixture case.
- **Discounted orders** (e.g. `NEW - … - $5,197` with `Total Price: 4677.3`)
  are summed at their actual `Total Price`, not the sticker price in the name.
- **Day-over-day** only renders on the EOD run and only when the prior
  same-weekday messages are within the fetch window (handled by the 8-day
  lookback). If the channel had no orders that prior weekday it shows N/A.
- **Time zone** is handled with `Intl` (`America/Los_Angeles`) — no external
  date library, so it survives DST automatically.
