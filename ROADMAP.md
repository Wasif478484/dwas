# DWAS feature roadmap (P1/P2 plans, synthesized)

Plans came from three parallel agents (client, admin/platform, technician). Features are implemented **one at a time**, each with build + tests + a commit. Priorities follow the spec: P0 gaps first, then P1, then P2.

## Queue

| # | Feature | Area | Pri | Depends on | Status |
|---|---------|------|-----|-----------|--------|
| 1 | Booking form gap (`/client/booking/new`, BookNowButton, client auth headers) | Client | P0 gap | — | done |
| 2 | D08 event log completeness | Platform | P1 | — | todo |
| 3 | D06 trust score + badges (§7.3) | Platform | P1 | — | todo |
| 4 | C11 price bands + over-band confirm/dispute | Client | P1 | 1 | todo |
| 5 | C12 phone/address privacy UI + rules | Client | P1 | 1 | todo |
| 6 | C15 history + rebook | Client | P1 | 1, 5 | todo |
| 7 | C16 cancel/reschedule/no-show | Client | P1 | 3, 6 | todo |
| 8 | A04 full dashboard | Admin | P1 | 2 | todo |
| 9 | A06 complaints queue with resolve | Admin | P1 | — | todo |
| 10 | D13 health, skeletons, error boundary | Platform | P2 | — | todo |
| 11 | T09 technician stats | Technician | P1 | — | todo |
| 12 | T07 trade + map + radius fallback | Technician | P1 | — | todo |
| 13 | T06 voice onboarding | Technician | P1 | D11 clips (degrades to TTS) | todo |
| 14 | T08 photo upload + Storage rules | Technician | P1 | — | todo |
| 15 | A07 full demo reset | Admin | P1 | 2, 8 | todo |
| 16 | D09 demo mode panel | Platform | P1 | 15, 2 | todo |
| 17 | A09 manual trust badge | Admin | P2 | 3 | todo |
| 18 | A08 CSV export | Admin | P2 | — | todo |
| 19 | C20 favourites | Client | P2 | 1 | todo |
| 20 | C22 public share page | Client | P2 | 5 | todo |
| 21 | T11 report problem client | Technician | P2 | 9 | todo |
| 22 | C17 fault photo upload | Client | P1 | 1 | todo |
| 23 | C19 vision intake | Client | P2 | 22 | todo |
| 24 | D11 Urdu audio pack | Platform | P1 | native review | todo |
| 25 | C21 read results aloud | Client | P2 | 24 | todo |
| 26 | T12 spoken weekly summary | Technician | P2 | 11, 24 | todo |
| 27 | T10 FCM push | Technician | P1 | VAPID key | todo |
| 28 | D07 security rules tests + rate limit | Platform | P1 | final write patterns | todo |
| 29 | D12 accessibility extras | Platform | P2 | — | todo |
| 30 | C23 PWA | Client | P2 | last (Lighthouse) | todo |

## Notes

- The C08 client booking screen was in the P0 list but never built — item 1 closes that gap before P1 work.
- Agent plans are available in the session log; key cross-area edges are captured in the table.
- Storage bucket, VAPID key and native Urdu review are external prerequisites for items 14, 27 and 24.
