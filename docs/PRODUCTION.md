# Production deployment checklist

This doc covers what to change to run Groundwork in production (real users, real money, Canadian FHSA commitment tool).

---

## 1. Environment variables

### 1.1 Firebase (unchanged)

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — keep using your Firebase project or create a dedicated **production** project and its service account key.
- Ensure Firestore **security rules** lock down reads/writes (e.g. server-only writes via Admin SDK; no client access to `plaidAccessToken`).

### 1.2 Plaid

| Current (sandbox) | Production |
|-------------------|------------|
| `PLAID_ENV="sandbox"` | `PLAID_ENV="production"` |
| Sandbox keys | **Production** keys from [Plaid Dashboard](https://dashboard.plaid.com) |

- In production, use **production** `PLAID_CLIENT_ID` and `PLAID_SECRET` (separate from sandbox).
- **Go-live**: Plaid requires you to complete their [production approval](https://plaid.com/docs/link/go-live/) (use case, compliance, etc.). For Canada + Transactions, ensure your app is approved for production.
- The app already uses `CountryCode.Ca` and `Products.Transactions`; no code change needed beyond env.

### 1.3 Solana

| Current (devnet / test) | Production |
|-------------------------|------------|
| `NEXT_PUBLIC_RPC_URL` / `NEXT_PUBLIC_SOLANA_RPC`: `https://api.devnet.solana.com` | **Mainnet** RPC (e.g. Helius, QuickNode, Triton). Do not rely on public mainnet RPC for production. |
| `NEXT_PUBLIC_USDC_MINT`: devnet mock mint | **Mainnet USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `AUTHORITY_PRIVATE_KEY`: test keypair | **New, secure keypair** (see §3). |

- Create a **new keypair** for the program authority; store the private key in a secrets manager (e.g. Vercel env, GCP Secret Manager). Never commit it.
- Update the **Solana program** to use the new authority pubkey and **redeploy** (see §3).

### 1.4 Cron

- `CRON_SECRET`: replace `dev-cron-secret` with a **long, random secret** (e.g. `openssl rand -hex 32`). Only your cron runner (e.g. Vercel Cron) should send this in `x-cron-secret` when calling `POST /api/cron/verify`.

---

## 2. Plaid verification logic (FHSA)

Current behaviour in `app/groundwork/src/app/api/cron/verify/route.ts`:

- Fetches last 30 days of transactions via Plaid.
- Marks the user “verified” if **any** transaction has `amount >= monthlyCommitment`.

That is a **stand-in**: it does not detect **FHSA contributions** specifically. For production you should:

- Use transaction **category** and/or **merchant** (from Plaid) to identify FHSA-related transfers (e.g. to the user’s FHSA provider).
- Optionally use Plaid’s **Investments** product if you need to verify FHSA account balances.
- Tighten date window (e.g. “this calendar month”) to align with your commitment period.

Until then, treat the current check as “any large enough transaction” and document that FHSA-specific logic is still to be implemented.

---

## 3. Solana program (mainnet)

### 3.1 Authority keypair

- The program has a **hardcoded** `AUTHORITY_PUBKEY` in `programs/groundwork/src/lib.rs`. The keypair in `AUTHORITY_PRIVATE_KEY` must match this pubkey.
- For production:
  1. Generate a new keypair: `solana-keygen new` (or use your preferred method). Back it up securely.
  2. In `programs/groundwork/src/lib.rs`, replace `AUTHORITY_PUBKEY` with the **public key** of this new keypair (as a `Pubkey::new_from_array([...])`).
  3. Rebuild the program and **redeploy** to mainnet (see below).
  4. Set `AUTHORITY_PRIVATE_KEY` in production env to the **base64 or JSON array** of the new keypair’s secret key (same format as today).

### 3.2 Deploy program to mainnet

- In `Anchor.toml` (or your deploy config), set `cluster = "mainnet"` (or `cluster = "mainnet-beta"` as per Anchor).
- Ensure your wallet has SOL for deploy and that the program ID (`declare_id!(...)`) is correct (or run `anchor keys list` and update if you use a new program ID).
- Run your deploy (e.g. `anchor deploy --provider.cluster mainnet`).
- After deploy:
  - Create or configure the **pool** (initialize pool with mainnet USDC mint and your COMMIT mint).
  - Ensure the **COMMIT** Token-2022 mint exists and has the pool_state PDA as mint authority.

### 3.3 Frontend / app config

- Set `NEXT_PUBLIC_USDC_MINT` to mainnet USDC.
- Set `NEXT_PUBLIC_RPC_URL` and `NEXT_PUBLIC_SOLANA_RPC` to your mainnet RPC.
- Regenerate and commit the **IDL** after any program change so the app uses the correct instructions and accounts.

---

## 4. Cron job (verify)

- **POST** `https://<your-domain>/api/cron/verify` must be invoked on a schedule (e.g. monthly) by a **trusted** cron service.
- Send header: `x-cron-secret: <CRON_SECRET>`.
- **GET** `/api/cron/verify?wallet=...&result=verified|forfeited` is for **dev only** (single-user, forced result). In production it is disabled when `NODE_ENV === "production"` so that only POST with the secret is allowed.

---

## 5. Hosting and security

- Deploy the Next.js app to Vercel (or similar). Configure **env vars** there (no `.env.local` in repo).
- Keep **CSP** in `next.config.ts`; add your production domain to `connect-src` / `frame-src` if you add other origins.
- Ensure **HTTPS** only and that the cron endpoint is not guessable (relying on `CRON_SECRET`).

---

## 6. Summary checklist

- [ ] Firebase: prod project (optional) + service account key; Firestore rules.
- [ ] Plaid: production keys; `PLAID_ENV=production`; go-live approval.
- [ ] Solana: mainnet RPC; mainnet USDC mint; new authority keypair; program updated and deployed; pool + COMMIT mint set up.
- [ ] Cron: strong `CRON_SECRET`; scheduled POST to `/api/cron/verify`; GET disabled in production.
- [ ] Env: all production values set in hosting (e.g. Vercel); no dev secrets.
- [ ] Verification: plan (or implement) FHSA-specific transaction detection.
