# Debt Tracker (personal, no login)

**Pemula? Ikuti `PANDUAN.md` (langkah demi langkah dari nol).**

Next.js static export + Google Sheets (via Google Apps Script) + Firebase Hosting.

Status: all 9 pages are written (Dashboard, Daftar Utang, Detail Utang, Jadwal Cicilan, Riwayat Pembayaran, Analisis Utang, Debt-Free Planner, Laporan, Pengaturan dan Backup). Calculation, operation, backup and Apps Script logic are covered by `npm test`. **Not yet verified:** `npm install`, `npm run build`, real rendering in a browser, and a live Apps Script deployment. Run those first and report any error.

UI components in `src/components/ui.tsx` are hand-written in shadcn/ui style (no CLI was available); you can replace them with the real shadcn/ui components later.

## How data is stored
Your Google Sheet is the database. One tab per collection (`debts`, `installments`, `payments`, `paymentAllocations`, `categories`, `settings`), columns `id | json | updatedAt`. Money is integer rupiah. The app reads/writes through a small Apps Script web app protected by a secret key. Data is shared by every device that has the URL + key. Use the app's CSV/JSON export for readable reports; editing the `json` column by hand is possible but easy to break.

## Setup: Google Sheet + Apps Script
1. Create a Google Sheet (any name).
2. Extensions > Apps Script. Paste `apps-script/Code.gs`, replacing the default code.
3. Project Settings > Script properties > add `API_KEY` = a long random string (32+ characters).
4. Deploy > New deployment > type **Web app** > Execute as **Me** > Who has access **Anyone** > Deploy. Authorize when asked. Copy the Web app URL (ends with `/exec`).
5. After editing the script later: Deploy > Manage deployments > edit > **New version** (the URL stays the same).

## Run locally
`npm install`, `npm test`, `npm run dev`. In the app's Settings page, paste the Web app URL and `API_KEY` (stored in this browser only; do it once per device).

## Deploy (Firebase Hosting, Spark plan)
`npm i -g firebase-tools && firebase login && firebase init hosting` (public dir `out`, single-page: no) then `npm run deploy`. Hosting only; no billing needed. GitHub Pages also works for static export. Optional CI: `.github/workflows/deploy.yml`.

## Static export rules
No API routes, server actions or middleware. Use query params (`/debts/detail?id=...`) instead of `[id]` routes.

## Security notes
- Anyone with the URL can try keys, so use a long random key. If it leaks, change `API_KEY` in Script properties.
- The key lives in each device's browser storage. Do not put it in `.env` or the repository.
- Never commit service account keys, tokens or `.env*` files.

## Limits
- Each request takes about 1 to 3 seconds; there is no realtime sync. Load once, update the in-memory state, write in batches.
- No true transactions. A payment writes its payment, allocations, installments and debt in one `batch` call, validated before writing, under a script lock.
- Google applies daily Apps Script quotas (see Google's quota docs); normal single-user use is unlikely to reach them. Errors show a message in the app.
- Scheduled reminders and payment-proof uploads are not included.
