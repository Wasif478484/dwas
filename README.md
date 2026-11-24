# DWAS

Voice-first technician booking app for the Capital Youth Expo Hackathon (Competition 04-HK). A client (Ayesha) describes a household problem by voice or tap, the app matches a technician (Rafiq) by score, the booking is tracked, reviewed and shared — with Urdu (RTL) and English.

**Live deployment:** https://dwas-beryl.vercel.app (scoped at `wasif-uchiha`, GitHub repo `https://github.com/Wasif478484/dwas` — pushes to main deploy automatically via `vercel git connect`).

## Architecture (spec §5)

- **Client** (web, phone): Next.js App Router, PWA. Client/technician/admin routes (§9.1).
- **Technician** (web, phone): icon-first UI, accepted bookings, numpad.
- **Admin** (laptop): approval queue, bookings, reviews, complaints, dashboard.
- **Backend**: Next.js route handlers (§8) with `firebase-admin`; all business state changes (status machine, reviews, phone reveal, admin actions) go through API routes.
- **Data**: Firebase Auth, Firestore, Storage, FCM; realtime status via `onSnapshot`.
- **AI**: LLM intake with a keyword-rules fallback; never produces prices (§7.1, D03).
- **Ranking**: deterministic `rankTechnicians` (§7.2); trust score/badges (§7.3).
- **State machine**: `transition()` is the only writer of `booking.status` (§7.4).

## Folder layout (§5.2)

```
dwas/
  README.md  DECISIONS.md  .env.example  firestore.rules  firebase.json
  public/audio/            (D11 — audio pack, later)
  scripts/                 seed.ts  (scripts/reset-demo.ts, D07 — later)
  src/
    app/
      (client)/  tech/  admin/  s/[token]/  api/
    lib/
      types.ts config.ts rate-table.ts  (Appendix A, §5.3)
      llm/ rules/ match/ booking/ trust/ speech/
      firebase/ (client.ts, admin.ts)  i18n/ (en.json, ur.json)
    components/
  tests/
```

## Environment (§5.3)

Copy `.env.example`, set the values, and see the comments for each variable. `ADMIN_EMAILS` must contain the admin's Google account; `MOCK_OTP_CODE` is the demo OTP (123456).

## Seed (§11)

```
npm run seed
```

Requires `FIREBASE_ADMIN_CREDENTIALS` (base64 service account) or a Firestore
emulator host (`FIRESTORE_EMULATOR_HOST`). See DECISIONS.md.

## Tests (§12)

```
npm run test
```

## Development

```
npm install
npm run dev     # http://localhost:3000
npm run build   # production build check
```

## Honest limitations (§14.2)

- Rate table values are placeholders ("indicative range" only, not quotes).
- `EMERGENCY_NUMBERS` in `src/lib/config.ts` must be confirmed with the team before launch.
- Urdu strings are marked TODO-REVIEW; all UI strings live in `src/lib/i18n/en.json` and `ur.json`.
- Real payments, real SMS OTP, live maps, FCM on iOS PWA, and native apps are out of scope for the foundation build (spec §3).
