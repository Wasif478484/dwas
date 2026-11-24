# DECISIONS — DWAS build foundation (spec v1.0, foundation task)

Recorded where the spec was silent or open, per the project rule "spec wins; when silent, choose the simplest option and write it here".

## i18n helper

- Chose a small JSON dictionary helper (`src/lib/i18n/en.json` + `ur.json` + `src/lib/i18n/index.ts`) instead of `next-intl` — the spec allows either ("next-intl or a small JSON dictionary helper").
- Urdu strings are placeholders, each value prefixed `[TODO-REVIEW]`; a native speaker must review them (spec §9.4, §9.3).
- Language toggle: `src/components/LanguageToggle.tsx` persists the choice in `localStorage` key `dwas-lang`, sets `document.documentElement.dir` to `rtl`/`ltr` and `lang`. Root layout renders `LanguageToggle` above `children`.

## Firestore rules admin model (A01/10.1)

- Admin role is read from the server-set Firestore token claim `admin == true` (`isAdmin()` in `firestore.rules`). `ADMIN_EMAILS` is checked server-side at sign-in (mock-OTP route, spec §8).

## Seed (§11)

- `scripts/seed.ts` wipes the demo collections (users, technicians, bookings, reviews, rateTable, areas, complaints, events, audit) and rewrites them — the same data as the A07 admin reset. Idempotent by design.
- Aggregates (jobsCompleted, ratingSum/ratingCount, avgResponseSec, noShowCount) are computed from the seeded bookings/reviews, not typed in (spec §11.1).
- Demo users (§11.1): Ayesha Khan (client), Rafiq Ahmad + a second online plumber, and 3 demo clients total (Ayesha + Farah Rizvi + Tauseef Ali, the user's "3 demo clients").

## Emulator for seed

- With `FIRESTORE_EMULATOR_HOST` set, `src/lib/firebase/admin.ts` connects the Admin SDK to the emulator.
- Emulator for rules tests (§10.1): `firebase emulators:start --only firestore,auth` — the rules file is written per the §10.1 table; rules emulator tests were deferred to later milestones (D07).

## Design — Linear reference (awesome-design-md)

- Reference: Linear. Read from `C:\Users\Precision\.config\opencode\skills\awesome-design-md\design-md\linear.app\DESIGN.md`: near-black canvas, light gray ink, lavender-blue accent, pill radius, hairline borders, no decorative accent.
- Adaptation: DWAS ships a light theme (white canvas + teal) — spec 9.2 pins "Teal as the main colour" and the foundation used white; Linear is near-black. Linear's fonts (SF Pro Display/Linear custom) are NOT shipped — we keep Geist (next/font).
- Tokens added to `src/app/globals.css` (Linear-inspired, scaled down): `--color-primary: #107a8b` (verified 5.03:1 on white via `antislop-human/contrast-check.py` — spec 9.2 teal kept), ink neutrals, hairline, radius scale, text scale.
- Accessibility checks run with `antislop-human`: `contrast-check.py` passes on primary/ink/surface.
- Mobile: everything is flow-based (`flex-col`, `gap`), 362px first; no overflow-hidden on content, `min-h-screen` removed? — pages use `min-h-screen flex flex-col`.

## Platform gotchas (found in the deployed app)

- Next.js 16.4.6 ignores `+page.tsx`; route pages must be named `page.tsx`. The old `app/(client)/+page.tsx` never created `/client` (and a `(client)` route group maps to `/`, colliding with the landing) — the landing's links 404'd. Routes now use `page.tsx` and the client home lives at `src/app/client/page.tsx` (spec §9.1).
- GitHub rejected pushes with a private commit email (GH007); local git identity is now `Wasif478484@users.noreply.github.com` and the history was rewritten with `--reset-author` so pushes work.

## Visual system (ui-ux-pro-max)

- Design-system search (`"mobile service booking voice first marketplace" --design-system`) returned Minimalism & Swiss Style + a 3-step funnel pattern + accessible typography (Atkinson suggested; spec pins Inter/Geist for Latin, so kept). `--domain style --rtl=full` returned flat-design (`rtl_level: full`), so no directional rework was needed.
- Applied as tokens in `src/app/globals.css`: teal primary (spec 9.2), amber waiting, green accept, red danger — all AA-verified with `antislop-human/contrast-check.py`; 4/8 spacing scale, one shared 150ms transform-only `pressable` micro-interaction, visible focus ring, reduced-motion support, cursor affordance. No gradients, glass, emoji, glow or decorative dots.
- The client home's mic remains the single primary CTA; "Continue" is now a secondary outline button.

## Notes and open items

- Verified against the Firestore emulator: started with `npx firebase-tools@14 emulators:start --only firestore --project dwas` (requires Java 8+; installed Corretto 17 via winget here). `npm run seed` with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` produced: users 5 (4 demo clients + 1 admin; Rafiq shares a user doc with Tech[0]), technicians 24, bookings 60, reviews 21 (completed bookings only, per A07/12.1), areas 7, rateTable 21.
- `admin.ts` passes `projectId: GCLOUD_PROJECT ?? "dwas"` when talking to the emulator (no credentials); the Admin SDK errors without it.

- Spec contradictions found during the read (listed here or handed to the build):
  - D10 says tick every 15 s; C18/QUICKBOOK_STEP_SEC=120 says the quick-book step is 2 minutes — cadence conflict, config default 120 wins.
  - C11's over-band "client must confirm or dispute" has no UI screen on `/client/booking/[id]`; `completed → disputed` exists in 7.4 but the confirm screen is under-specified.
  - D08 lists dashboard numbers (acceptance rate, avg time to accept) but `/api/admin/stats` shape is unspecified (A04).
  - 7.4 defines quick-book candidate moves as side effects of decline/tick with no explicit tick row — implementers must infer.
- Risk: `npm audit` reports 4 high-severity findings in Firebase SDK transitive deps (`@firebase/firestore`, `@grpc/grpc-js`); suggested fix: `npm install firebase@9.14.0` (verify after install).
- `LLM_MODEL=claude-haiku-5-5` — spec says to check the current model list at launch.
- Audio pack (D11) and `scripts/reset-demo.ts` (A07/5.2) are listed in the layout but belong to later milestones; the directory skeletons exist (`public/audio/`, `tests/`).
