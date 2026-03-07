# Deploy Groundwork to Vercel

Deploy the Next.js app from the **`app/groundwork`** directory so the app and cron work in production.

---

## 1. Vercel project setup

1. In Vercel: **New Project** → import your repo.
2. Set **Root Directory** to **`app/groundwork`** (not the repo root).
3. Framework: **Next.js**. Build command and output dir can stay default.

---

## 2. Environment variables

In the Vercel project: **Settings → Environment Variables**. Add these for **Production** (and Preview if you want):

| Variable | Required | Notes |
|----------|----------|--------|
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Full private key string (include `\n` for newlines) |
| `PLAID_CLIENT_ID` | Yes | From Plaid dashboard |
| `PLAID_SECRET` | Yes | Production secret for prod |
| `PLAID_ENV` | Yes | `production` for real users |
| `NEXT_PUBLIC_RPC_URL` | Yes | Solana RPC (e.g. mainnet or devnet URL) |
| `NEXT_PUBLIC_SOLANA_RPC` | Yes | Same as above (used by cron) |
| `NEXT_PUBLIC_USDC_MINT` | Yes | USDC mint address (mainnet or devnet) |
| `AUTHORITY_PRIVATE_KEY` | Yes | JSON array of 64 bytes, e.g. `[1,2,...]` |
| `CRON_SECRET` | Yes | Random string (e.g. `openssl rand -hex 32`). Used by Vercel Cron as Bearer token. |

- **No spaces** in `AUTHORITY_PRIVATE_KEY` (paste the raw JSON array).
- For **Firebase private key**: paste the key from the JSON; in Vercel you can keep real newlines or use `\n` in one line.

---

## 3. Cron job

The repo includes **`vercel.json`** with a cron that hits `/api/cron/verify` on the **1st of every month at midnight UTC** (`0 0 1 * *`).

- Vercel sends **`Authorization: Bearer <CRON_SECRET>`** when invoking the cron. The API accepts that or **`x-cron-secret: <CRON_SECRET>`**.
- **Cron runs only on Production** deployments (not Preview).
- You need a **Vercel plan that supports Cron** (e.g. Pro). If you’re on Hobby, use an external cron (e.g. [cron-job.org](https://cron-job.org)) to **POST** to `https://<your-domain>/api/cron/verify` with header **`x-cron-secret: <your CRON_SECRET>`** on the same schedule.

---

## 4. After deploy

- Your app URL is `https://<your-project>.vercel.app` (or your custom domain).
- The Solana program and pool must be deployed and initialized on the **same network** (and same USDC mint) as the RPC and `NEXT_PUBLIC_USDC_MINT` you configured.
- For production (real USDC), use **mainnet** RPC, mainnet USDC mint, and a production Plaid app. See **`docs/PRODUCTION.md`** in the repo for full production checklist.

---

## 5. What a user needs to use the app

Each user needs:

1. **A Solana wallet** (e.g. Phantom) with:
   - **Some SOL** – to pay transaction fees (e.g. deposit stake, claim pool share). A small amount (e.g. 0.01–0.05 SOL) is enough.
   - **Enough USDC** – to cover their stake for the chosen plan (50 / 60 / 80 USDC for 12 / 6 / 3 months).

2. **A Canadian bank (or supported institution)** – to connect via Plaid so the app can verify FHSA contributions. They complete the Plaid Link flow in the app.

3. **To complete onboarding** – connect wallet → set income/expenses and commitment → pick plan → connect bank → deposit USDC stake. After that they’re in the pool and the monthly cron will verify and release/forfeit/redistribute as designed.

You can add this “What you need” list to your app’s landing or help page so users see it before they start.
