"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

type Step = 1 | 2 | 3;

const PROVIDERS = ["TD", "RBC", "Scotiabank", "BMO", "CIBC", "Other"];

export default function OnboardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [provider, setProvider] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const suggestedSavings =
    monthlyIncome && monthlyExpenses
      ? Math.max(
          0,
          Math.floor((Number(monthlyIncome) - Number(monthlyExpenses)) * 0.2)
        )
      : null;

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
          monthlyBudget: Number(monthlyIncome) - Number(monthlyExpenses),
          commitmentAmount: Number(commitmentAmount),
          provider,
        }),
      });

      if (!res.ok) throw new Error("Onboard failed");
      router.push("/dashboard");
    } catch (e) {
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
                s <= step ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-700"
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
                  className="rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black dark:border-gray-700 dark:bg-black dark:focus:ring-white"
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
                  className="rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black dark:border-gray-700 dark:bg-black dark:focus:ring-white"
                />
              </label>
            </div>

            {suggestedSavings !== null && (
              <div className="rounded-xl bg-gray-50 px-5 py-4 dark:bg-gray-900">
                <p className="text-sm text-gray-500">Suggested monthly commitment</p>
                <p className="mt-1 text-3xl font-bold">${suggestedSavings.toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-400">20% of your surplus</p>
              </div>
            )}

            <button
              disabled={!monthlyIncome || !monthlyExpenses}
              onClick={() => setStep(2)}
              className="rounded-full bg-black py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30 dark:bg-white dark:text-black"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Provider + commitment amount */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold">Your FHSA details</h2>
              <p className="mt-1 text-gray-500">
                Where is your First Home Savings Account and how much will you commit monthly?
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">FHSA provider</span>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        provider === p
                          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                          : "border-gray-200 hover:border-gray-400 dark:border-gray-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Monthly commitment amount ($)</span>
                <input
                  type="number"
                  min="0"
                  value={commitmentAmount}
                  onChange={(e) => setCommitmentAmount(e.target.value)}
                  placeholder={suggestedSavings ? String(suggestedSavings) : "e.g. 300"}
                  className="rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black dark:border-gray-700 dark:bg-black dark:focus:ring-white"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-base font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                Back
              </button>
              <button
                disabled={!provider || !commitmentAmount}
                onClick={() => setStep(3)}
                className="flex-1 rounded-full bg-black py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30 dark:bg-white dark:text-black"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Flinks (placeholder) */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold">Connect your bank</h2>
              <p className="mt-1 text-gray-500">
                Verify your FHSA contributions by linking your bank account via Flinks.
              </p>
            </div>

            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="font-medium text-gray-400">Flinks widget</p>
                <p className="mt-1 text-sm text-gray-300">Coming soon</p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-base font-semibold transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                Back
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 rounded-full bg-black py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-30 dark:bg-white dark:text-black"
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
