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
