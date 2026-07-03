# 1 Call Closers OS — Notion Build Reference

Built 2026-07-03 in Richard's Notion workspace. Hub page: [1 Call Closers OS](https://app.notion.com/p/39210be516c6819188acff17a6e9a457).

## Structure

| Database | Purpose | Database ID | Data source ID |
|---|---|---|---|
| Team Roster | Closers/setters/staff, status, commission % | `d74171e243db46adb960d385f9498189` | `77fe846f-eebc-4c03-965b-ad77e33a9188` |
| Clients & Offers | Live client accounts, AOV, rev share, assigned closers | `c8f0d667335f40e1b9d1eedd8c5badc4` | `8131d1c4-ec30-444e-a8cc-52badc96323b` |
| Client Acquisition Pipeline | New-client sales pipeline (board by stage) | `975612d753c940dea541122aa6cc0c49` | `b241c886-4ca2-4dff-89e0-bafe5889f14f` |
| Call Log | Every booked call, outcome, cash (calendar view) | `3b5b45cc981f4a03831ac983ce51e439` | `28a143bf-27e0-4801-8984-acd70af485e3` |
| Deals & Commissions | Closed deals; Commission Owed auto-formula; Payout Queue + Closer Leaderboard views | `c0ca12c15d4746b1ad088c56f7894958` | `d143033a-41d8-4350-85e5-b28da3f6c364` |
| EOD Reports | Daily per-closer report; show/close rate formulas; Cash by Day chart | `2afc2ff858b34fd9a6adad7e94f26cf6` | `cf6df5f5-674b-432d-b8b1-e211fd6b05e0` |
| SOP Library | 6 seeded SOPs (EOD, closer/client onboarding, QA, payouts, recruiting) | `60de599207404ad6af18766d4437b735` | `9cd633d7-7e9e-42f8-86ed-9b946a5d96c0` |
| Training Library | 6 seeded modules (close framework, setter script, objections, tonality, ramp, tools) | `7919a556b3754147bbd0cf6912c81cc1` | `bc2298cb-fc06-486b-bb21-1fa34de63d84` |
| 1CC Tasks | Company task tracker (canonical Notion tasks DB) | `6a2b28ebb0394575aca5683c36040ad7` | `34af35b2-365c-4da6-8e86-b07a22dfcc88` |

## Relations

- Call Log → Clients & Offers (`Calls`), Team Roster (`Calls`)
- Deals & Commissions → Clients & Offers (`Deals`), Team Roster (`Deals`)
- EOD Reports → Team Roster (`EOD Reports`)
- Clients & Offers → Team Roster (`Assigned Closers` / `Clients Assigned`)

All relations are two-way, so each closer's roster page rolls up their calls, deals, and EOD reports.

## Notes

- Rows titled "Example … (edit or delete me)" are seed data demonstrating the relations; delete after entering real data.
- Commission Owed = `Cash Collected × Commission %` (per-deal override of the roster default).
- Useful automation targets later: Zapier/Slack EOD reminders at 8 PM PT, payment processor → Deals sync.
