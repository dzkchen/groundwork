"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { usePlaidLink } from "react-plaid-link";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl.json";

type Step = 1 | 2 | 3 | 4;

const FHSA_MONTHLY_MAX = 667;

// One-time stake per tier — paid upfront, returned in full at graduation
const PERIODS = [
  { months: 3,  label: "Starter",   description: "3 months",  stake: 80 },
  { months: 6,  label: "Committed", description: "6 months",  stake: 60 },
  { months: 12, label: "All in",    description: "12 months", stake: 50 },
] as const;

export default function OnboardPage() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [totalMonths, setTotalMonths] = useState<3 | 6 | 12>(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bankConnected, setBankConnected] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkTokenLoading, setLinkTokenLoading] = useState(false);

  const program = useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
    return new Program(idl as Idl, provider);
  }, [anchorWallet, connection]);

  const suggestedSavings =
    monthlyIncome && monthlyExpenses
      ? Math.min(
          FHSA_MONTHLY_MAX,
          Math.max(
            0,
            Math.floor((Number(monthlyIncome) - Number(monthlyExpenses)) * 0.2)
          )
        )
      : null;

  const monthly = Number(commitmentAmount) || 0;
  const selectedPeriod = PERIODS.find((p) => p.months === totalMonths)!;
  const totalStake = selectedPeriod.stake;

  // Fetch Plaid link token when entering step 4
  useEffect(() => {
    if (step !== 4 || linkToken || linkTokenLoading) return;
    setLinkTokenLoading(true);
    fetch("/api/plaid/create-link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_user_id: publicKey?.toBase58() ?? "user" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.link_token) {
          setLinkToken(data.link_token);
        } else {
          setError(`Bank connection failed: ${data.error ?? "unknown error"}`);
        }
      })
      .catch((e) => setError(`Failed to initialize bank connection: ${e.message}`))
      .finally(() => setLinkTokenLoading(false));
  }, [step, linkToken, linkTokenLoading, publicKey]);

  const onPlaidSuccess = useCallback(
    async (public_token: string) => {
      if (!publicKey) return;
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token, wallet: publicKey.toBase58() }),
        });
        if (!res.ok) throw new Error();
        setBankConnected(true);
      } catch {
        setError("Bank connection failed. Please try again.");
      }
    },
    [publicKey]
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess: onPlaidSuccess });

  function goToStep2() {
    if (suggestedSavings !== null && !commitmentAmount) {
      setCommitmentAmount(String(suggestedSavings));
    }
    setStep(2);
  }

  async function handleFinish() {
    if (!publicKey || !program) return;
    setSubmitting(true);
    setError("");
    try {
      // 1. Save user to Firebase
      const onboardRes = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          monthlyCommitment: monthly,
          totalMonths,
          stakeAmount: totalStake,
        }),
      });
      if (!onboardRes.ok) throw new Error("Failed to save profile");

      // 2. Deposit lump sum on-chain
      const usdcMintAddr = process.env.NEXT_PUBLIC_USDC_MINT;
      if (!usdcMintAddr) throw new Error("USDC mint not configured");

      const usdcMint = new PublicKey(usdcMintAddr);
      const lumpSum = new BN(totalStake * 1_000_000);

      const [userAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_account"), publicKey.toBuffer()],
        program.programId
      );
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), publicKey.toBuffer()],
        program.programId
      );
      const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, publicKey);

      // Program accepts only amount (lump sum). totalMonths stored in Firebase.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .depositStake(lumpSum)
        .accounts({
          user: publicKey,
          userAccount: userAccountPda,
          vault: vaultPda,
          userUsdcAta,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 3. Mark isActive in Firebase
      await fetch(`/api/user/${publicKey.toBase58()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg.slice(0, 160));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-violet-700" : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Budget */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Let&apos;s size your savings</h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your monthly income and expenses to see what you can commit.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">Monthly take-home income</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    onBlur={(e) => { if (e.target.value) setMonthlyIncome(Number(e.target.value).toFixed(2)); }}
                    placeholder="5000.00"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">Monthly expenses</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    onBlur={(e) => { if (e.target.value) setMonthlyExpenses(Number(e.target.value).toFixed(2)); }}
                    placeholder="3500.00"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </label>
            </div>

            {suggestedSavings !== null && (
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Suggested commitment</p>
                <p className="mt-1 text-2xl font-bold text-violet-700">
                  ${suggestedSavings.toFixed(2)}
                  <span className="ml-1 text-sm font-normal text-violet-400">/ month</span>
                </p>
                {suggestedSavings === FHSA_MONTHLY_MAX && (
                  <p className="mt-0.5 text-xs text-violet-400">Capped at FHSA monthly max ($667)</p>
                )}
              </div>
            )}

            <button
              disabled={!monthlyIncome || !monthlyExpenses}
              onClick={goToStep2}
              className="rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2 — Monthly amount */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Monthly commitment</h2>
              <p className="mt-1 text-sm text-gray-500">
                How much will you deposit to your FHSA each month?
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Monthly commitment amount</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  value={commitmentAmount}
                  onChange={(e) => setCommitmentAmount(e.target.value)}
                  onBlur={(e) => { if (e.target.value) setCommitmentAmount(Number(e.target.value).toFixed(2)); }}
                  placeholder={suggestedSavings ? suggestedSavings.toFixed(2) : "300.00"}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
              <button
                disabled={!commitmentAmount || Number(commitmentAmount) <= 0}
                onClick={() => setStep(3)}
                className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Commitment period */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Choose your period</h2>
              <p className="mt-1 text-sm text-gray-500">
                Your full stake is locked until you complete every month. Miss one and you lose the entire stake.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {PERIODS.map(({ months, label, description, stake }) => (
                <button
                  key={months}
                  onClick={() => setTotalMonths(months)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left transition-colors ${
                    totalMonths === months
                      ? "border-violet-600 bg-violet-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${totalMonths === months ? "text-violet-700" : "text-gray-900"}`}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-400">{description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-semibold ${totalMonths === months ? "text-violet-700" : "text-gray-700"}`}>
                      ${stake.toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Stake deposit</span>
                <span className="font-semibold text-gray-900">${totalStake.toFixed(2)} USDC</span>
              </div>
              <div className="mt-1 flex justify-between text-gray-500">
                <span>Returned at graduation</span>
                <span className="font-semibold text-gray-900">full ${totalStake.toFixed(2)} USDC +</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">+ your share of forfeited stakes from others who miss payments</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Bank + deposit */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Connect &amp; deposit</h2>
              <p className="mt-1 text-sm text-gray-500">
                Link your bank so we can verify contributions, then deposit your stake.
              </p>
            </div>

            {/* Bank connection */}
            {bankConnected ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-sm text-white">✓</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Bank connected</p>
                  <p className="text-xs text-green-600">Ready to deposit your stake.</p>
                </div>
              </div>
            ) : linkTokenLoading ? (
              <div className="flex h-16 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-violet-700" />
              </div>
            ) : (
              <button
                disabled={!ready}
                onClick={() => open()}
                className="rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-30"
              >
                Connect Bank Account
              </button>
            )}

            {/* Stake summary */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Period</span>
                <span className="font-semibold text-gray-900">{totalMonths} months</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-gray-700">
                <span className="font-semibold">Stake (one-time)</span>
                <span className="font-bold text-violet-700">${totalStake.toFixed(2)} USDC</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">Held until graduation. Returned in full + pool share if you complete every month.</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
              <button
                disabled={submitting || !bankConnected || !program}
                onClick={handleFinish}
                className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Depositing...
                  </span>
                ) : (
                  `Deposit $${totalStake.toFixed(2)} USDC`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
