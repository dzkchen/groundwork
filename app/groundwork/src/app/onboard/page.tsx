"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePlaidLink } from "react-plaid-link";

type Step = 1 | 2 | 3;

const FHSA_MONTHLY_MAX = 667;

export default function OnboardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bankConnected, setBankConnected] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkTokenLoading, setLinkTokenLoading] = useState(false);

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

  // Fetch Plaid link token when entering step 3
  useEffect(() => {
    if (step !== 3 || linkToken || linkTokenLoading) return;
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
          console.error("Plaid link token error:", data);
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

  async function handleSubmit() {
    if (!publicKey) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          monthlyCommitment: Number(commitmentAmount),
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-purple-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Budget calculator */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold">Let's size your savings</h2>
              <p className="mt-1 text-gray-500">
                Enter your monthly income and expenses to see what you can commit.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Monthly take-home income ($)</span>
                <input
                  type="number"
                  min="0"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="e.g. 5000"
                  className="rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-black"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Monthly expenses ($)</span>
                <input
                  type="number"
                  min="0"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(e.target.value)}
                  placeholder="e.g. 3500"
                  className="rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-black"
                />
              </label>
            </div>

            {suggestedSavings !== null && (
              <div className="rounded-xl bg-purple-600 px-5 py-4">
                <p className="text-sm text-purple-200">Suggested monthly commitment</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  ${suggestedSavings.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-purple-300">
                  {suggestedSavings === FHSA_MONTHLY_MAX
                    ? "Capped at FHSA monthly max ($667)"
                    : "20% of your surplus"}
                </p>
              </div>
            )}

            <button
              disabled={!monthlyIncome || !monthlyExpenses}
              onClick={goToStep2}
              className="rounded-full bg-purple-600 py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Commitment amount */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold">Your FHSA details</h2>
              <p className="mt-1 text-gray-500">
                How much will you commit to saving each month?
              </p>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Monthly commitment amount ($)</span>
              <input
                type="number"
                min="0"
                value={commitmentAmount}
                onChange={(e) => setCommitmentAmount(e.target.value)}
                placeholder={suggestedSavings ? String(suggestedSavings) : "e.g. 300"}
                className="rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-600 dark:border-gray-700 dark:bg-black"
              />
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-base font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                Back
              </button>
              <button
                disabled={!commitmentAmount}
                onClick={() => setStep(3)}
                className="flex-1 rounded-full bg-purple-600 py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Plaid bank connection */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold">Connect your bank</h2>
              <p className="mt-1 text-gray-500">
                Link your account to verify your FHSA contributions each month.
              </p>
            </div>

            {bankConnected ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-800 dark:bg-green-950/30">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white text-lg font-bold">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">
                    Bank connected successfully
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Your account was linked. Click Finish to complete setup.
                  </p>
                </div>
              </div>
            ) : linkTokenLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-purple-600" />
              </div>
            ) : (
              <button
                disabled={!ready}
                onClick={() => open()}
                className="w-full rounded-full bg-purple-600 py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                Connect Bank Account
              </button>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-base font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                Back
              </button>
              <button
                disabled={submitting || !bankConnected}
                onClick={handleSubmit}
                className="flex-1 rounded-full bg-purple-600 py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                {submitting ? "Saving..." : "Finish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
