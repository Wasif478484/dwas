# DWAS domain glossary

Vocabulary used in this repo (spec DWAS v1.0). Pure domain terms — no implementation details.

## Intake

- **Problem text** — the free text a client speaks or types to describe their problem (C01/C02).
- **IntakeResult** — the structured result of `POST /api/intake`: the agreed trade, job type, urgency, emergency flag, summaries, confidence, language detection and whether the user needs to pick a trade.
- **Trade picker** — the screen a client sees when they tap "Nahi" on the confirm screen (C03); it lists the trades and pre-fills the text on selection.
