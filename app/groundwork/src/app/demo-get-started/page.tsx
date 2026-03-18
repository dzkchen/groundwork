"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3 | 4;

const FHSA_MONTHLY_MAX = 667;
const MIN_MONTHLY_COMMITMENT = 50;
const MATCHMAKING_STAKE = 50;
const MAX_MATCH_PARTICIPANTS = 4;

function formatCad(n: number) {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DemoGetStartedPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [competeMode, setCompeteMode] = useState<"friends" | "random" | null>(null);
  const [friendsSubMode, setFriendsSubMode] = useState<"choose" | "create" | "join">("choose");
  const [joinCode, setJoinCode] = useState("");
  const [matchCode, setMatchCode] = useState<string | null>(null);
  const [bankConnected, setBankConnected] = useState(false);
  const [depositing, setDepositing] = useState(false);

  const suggestedSavings = useMemo(() => {
    if (!monthlyIncome || !monthlyExpenses) return null;
    const income = Number(monthlyIncome);
    const expenses = Number(monthlyExpenses);
    if (!Number.isFinite(income) || !Number.isFinite(expenses)) return null;
    return Math.min(FHSA_MONTHLY_MAX, Math.max(0, Math.floor((income - expenses) * 0.2)));
  }, [monthlyIncome, monthlyExpenses]);

  const monthly = Number(commitmentAmount) || 0;
  const totalStake = MATCHMAKING_STAKE;
  const totalMonths = 1;

  function goToStep2() {
    if (suggestedSavings !== null && !commitmentAmount) {
      setCommitmentAmount(String(Math.max(suggestedSavings, MIN_MONTHLY_COMMITMENT)));
    }
    setStep(2);
  }

  function demoCreateMatch() {
    setTimeout(() => setMatchCode("DEMO42"), 350);
  }

  function demoJoinMatch() {
    if (joinCode.trim().length !== 6) return;
    setTimeout(() => setStep(4), 250);
  }

  function demoFindMatch() {
    setTimeout(() => setStep(4), 350);
  }

  function finishDemo() {
    setDepositing(true);
    setTimeout(() => {
      router.push("/demo-dashboard");
    }, 700);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8">
      <div className="w-full max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Groundwork
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Demo
            </span>
            <Link
              href="/"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Exit
            </Link>
          </div>
        </header>

        <div className="mb-8 flex gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-violet-700" : "bg-gray-100"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Try the flow</h2>
              <p className="mt-1 text-sm text-gray-500">
                This is a demo. No wallet, no bank connection, no on-chain transactions.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">Monthly take-home income</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) setMonthlyIncome(Number(e.target.value).toFixed(2));
                    }}
                    placeholder="5000.00"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">Monthly expenses</span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value) setMonthlyExpenses(Number(e.target.value).toFixed(2));
                    }}
                    placeholder="3500.00"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </label>
            </div>

            {suggestedSavings !== null && (
              <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                  Suggested commitment
                </p>
                <p className="mt-1 text-2xl font-bold text-violet-700">
                  ${formatCad(Math.max(suggestedSavings, MIN_MONTHLY_COMMITMENT))}
                  <span className="ml-1 text-sm font-normal text-violet-400">/ month</span>
                </p>
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

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Monthly commitment</h2>
              <p className="mt-1 text-sm text-gray-500">
                Pick a monthly FHSA contribution amount. Minimum ${MIN_MONTHLY_COMMITMENT}.
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Monthly commitment amount</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min={MIN_MONTHLY_COMMITMENT}
                  value={commitmentAmount}
                  onChange={(e) => setCommitmentAmount(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) setCommitmentAmount(Number(e.target.value).toFixed(2));
                  }}
                  placeholder={suggestedSavings ? String(Math.max(suggestedSavings, MIN_MONTHLY_COMMITMENT)) : "50.00"}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-8 pr-4 text-sm text-gray-900 placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              {commitmentAmount && Number(commitmentAmount) < MIN_MONTHLY_COMMITMENT && (
                <p className="text-xs text-red-500">Minimum is ${MIN_MONTHLY_COMMITMENT}</p>
              )}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
              <button
                disabled={!commitmentAmount || monthly < MIN_MONTHLY_COMMITMENT}
                onClick={() => setStep(3)}
                className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Pick a pool</h2>
              <p className="mt-1 text-sm text-gray-500">
                Demo stake is ${totalStake} USDC. Up to {MAX_MATCH_PARTICIPANTS} people per match.
              </p>
            </div>

            {competeMode === null && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setCompeteMode("friends")}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50"
                >
                  <span className="font-semibold text-gray-900">Compete with friends</span>
                  <span className="text-violet-600">→</span>
                </button>
                <button
                  onClick={() => { setCompeteMode("random"); demoFindMatch(); }}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50"
                >
                  <span className="font-semibold text-gray-900">Random matchmaking</span>
                  <span className="text-sm text-gray-500">Instant in demo</span>
                </button>
              </div>
            )}

            {competeMode === "friends" && friendsSubMode === "choose" && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setFriendsSubMode("create"); demoCreateMatch(); }}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50"
                >
                  <span className="font-semibold text-gray-900">Create a match</span>
                  <span className="text-violet-600">→</span>
                </button>
                <button
                  onClick={() => setFriendsSubMode("join")}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50"
                >
                  <span className="font-semibold text-gray-900">Join with code</span>
                  <span className="text-violet-600">→</span>
                </button>
                <button
                  onClick={() => { setCompeteMode(null); setFriendsSubMode("choose"); setMatchCode(null); }}
                  className="rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            )}

            {competeMode === "friends" && friendsSubMode === "create" && (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                    Share this code with friends
                  </p>
                  <p className="mt-2 text-3xl font-mono font-bold tracking-widest text-violet-900">
                    {matchCode ?? "…"}
                  </p>
                  <p className="mt-1 text-xs text-violet-600">Up to {MAX_MATCH_PARTICIPANTS} people can join.</p>
                </div>
                <button
                  onClick={() => setStep(4)}
                  className="rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                >
                  Continue
                </button>
              </div>
            )}

            {competeMode === "friends" && friendsSubMode === "join" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">Enter a 6-character code.</p>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="DEMO42"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-lg font-mono tracking-widest uppercase placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setFriendsSubMode("choose"); setJoinCode(""); }}
                    className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    disabled={joinCode.trim().length !== 6}
                    onClick={demoJoinMatch}
                    className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>
            )}

            {competeMode === null && (
              <button
                onClick={() => setStep(2)}
                className="rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
              >
                Back
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Connect &amp; deposit</h2>
              <p className="mt-1 text-sm text-gray-500">
                In the real app: connect Plaid + deposit USDC on Solana. In demo: we simulate both.
              </p>
            </div>

            {bankConnected ? (
              <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-sm text-white">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold text-green-800">Bank connected (demo)</p>
                  <p className="text-xs text-green-600">Ready to finish.</p>
                </div>
              </div>
            ) : (
              <button
                disabled={depositing}
                onClick={() => { setDepositing(true); setTimeout(() => { setBankConnected(true); setDepositing(false); }, 650); }}
                className="rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {depositing ? "Connecting…" : "Connect bank (demo)"}
              </button>
            )}

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Stake (this round)</span>
                <span className="font-semibold text-gray-900">${totalStake} USDC</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-gray-700">
                <span className="font-semibold">One-time deposit</span>
                <span className="font-bold text-violet-700">${formatCad(totalStake)} USDC</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Demo commitment: ${formatCad(Math.max(monthly, MIN_MONTHLY_COMMITMENT))}/month for {totalMonths} month.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
              <button
                disabled={!bankConnected || depositing}
                onClick={finishDemo}
                className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                {depositing ? "Finishing…" : "Finish → Demo dashboard"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

