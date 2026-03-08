"use client";

import { useState } from "react";
import Link from "next/link";

const DEMO_WALLET = "Demo...7xK9";

const DEMO_USER = {
  walletAddress: DEMO_WALLET,
  streak: 2,
  isActive: true,
  verifiedThisMonth: true,
  hasClaimed: false,
  monthlyCommitment: 50,
  fhsaProvider: "Wealthsimple",
  totalMonths: 1,
  monthsCompleted: 0,
  graduated: false,
};

const DEMO_MATCH = {
  matchId: "demo-match-1",
  participants: [
    { walletAddress: DEMO_WALLET, verifiedThisMonth: true, isYou: true },
    { walletAddress: "9k2M…4pL1", verifiedThisMonth: true, isYou: false },
    { walletAddress: "5nR8…bH3", verifiedThisMonth: false, isYou: false },
    { walletAddress: "2xY7…qW9", verifiedThisMonth: true, isYou: false },
  ],
};

function shortenWallet(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function DemoDashboardPage() {
  const [user] = useState(DEMO_USER);
  const [claiming, setClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);

  const totalMonths = user.totalMonths || 1;
  const monthsCompleted = user.monthsCompleted || 0;
  const progressPct = Math.round((monthsCompleted / totalMonths) * 100);

  const handleClaimPoolShare = () => {
    setClaiming(true);
    setTimeout(() => {
      setHasClaimed(true);
      setClaiming(false);
    }, 800);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-white p-8">
      <header className="flex w-full max-w-md items-center justify-between pb-8">
        <span className="text-lg font-bold tracking-tight text-gray-900">Groundwork</span>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Demo mode
          </span>
          <Link
            href="/"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Your match</p>
          <p className="mt-1 text-sm text-gray-500">
            Matchmade with 3 others. Green = contributed this month, red = not yet.
          </p>
          <ul className="mt-4 space-y-3">
            {DEMO_MATCH.participants.map((p) => (
              <li key={p.walletAddress} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${
                      p.verifiedThisMonth ? "bg-green-500" : "bg-red-500"
                    }`}
                    aria-label={p.verifiedThisMonth ? "Contributed" : "Not yet"}
                  />
                  <span className="font-mono text-sm text-gray-700">
                    {shortenWallet(p.walletAddress)}
                    {p.isYou && <span className="ml-1.5 text-xs text-violet-600">(you)</span>}
                  </span>
                </span>
                <span className="text-xs text-gray-400">
                  {p.verifiedThisMonth ? "Verified" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Current streak</p>
          <p className="mt-2 text-5xl font-bold text-gray-900">
            {user.streak}
            <span className="ml-2 text-xl font-normal text-gray-400">mo</span>
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">This month</p>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Verified</span>
          </div>
          <p className="mt-1 text-sm text-green-700">
            {hasClaimed
              ? "You've already claimed your pool share."
              : "Your contribution was confirmed. Claim your share of the redistribution pool."}
          </p>
          {!hasClaimed && (
            <button
              onClick={handleClaimPoolShare}
              disabled={claiming}
              className="mt-5 w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {claiming ? "Claiming…" : "Claim pool share"}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Commitment progress</p>
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs text-gray-400">
              <span>{monthsCompleted} of {totalMonths} months completed</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Monthly commitment</dt>
              <dd className="font-semibold text-gray-900">$50.00 USDC</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Commitment period</dt>
              <dd className="font-semibold text-gray-900">{totalMonths} month</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Streak</dt>
              <dd className="font-semibold text-gray-900">{user.streak} months</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
