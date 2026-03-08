"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface UserData {
  walletAddress: string;
  streak: number;
  isActive: boolean;
  verifiedThisMonth: boolean;
  hasClaimed: boolean;
  monthlyCommitment: number | null;
  fhsaProvider: string | null;
  totalMonths: number;
  monthsCompleted: number;
  graduated: boolean;
}

type Toast = { type: "success" | "error"; message: string };

const DEMO_USER: UserData = {
  walletAddress: "Demo...7xK9",
  streak: 0,
  isActive: false,
  verifiedThisMonth: false,
  hasClaimed: false,
  monthlyCommitment: 500,
  fhsaProvider: "Wealthsimple",
  totalMonths: 12,
  monthsCompleted: 2,
  graduated: false,
};

export default function DemoPage() {
  const [user, setUser] = useState<UserData>(DEMO_USER);
  const [acknowledgedStakeLoss, setAcknowledgedStakeLoss] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [claiming, setClaiming] = useState(false);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleClaimPoolShare = useCallback(() => {
    setClaiming(true);
    setTimeout(() => {
      setUser((prev) => (prev ? { ...prev, hasClaimed: true } : prev));
      showToast({ type: "success", message: "Pool share claimed! (Demo)" });
      setClaiming(false);
    }, 800);
  }, [showToast]);

  const totalMonths = user.totalMonths || 3;
  const monthsCompleted = user.monthsCompleted || 0;
  const progressPct = Math.round((monthsCompleted / totalMonths) * 100);

  return (
    <main className="flex min-h-screen flex-col items-center bg-white p-8">
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-violet-700" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

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
        {!user.isActive && !acknowledgedStakeLoss && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="font-semibold text-red-900">You failed to contribute and lost your stake.</p>
            <p className="mt-2 text-sm text-red-700">
              Your commitment stake has been forfeited. You can start a new commitment when you’re ready.
            </p>
            <button
              onClick={() => setAcknowledgedStakeLoss(true)}
              className="mt-5 w-full rounded-full bg-red-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              I acknowledge
            </button>
          </div>
        )}

        {(user.isActive || acknowledgedStakeLoss) && (
          <>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Current streak</p>
          <p className="mt-2 text-5xl font-bold text-gray-900">
            {user.streak}
            <span className="ml-2 text-xl font-normal text-gray-400">mo</span>
          </p>
          {user.streak >= 3 && (
            <p className="mt-2 text-xs font-medium text-violet-600">
              {user.streak >= 24
                ? "24+ month tier: 400 COMMIT / month"
                : user.streak >= 12
                ? "12–23 month tier: 300 COMMIT / month"
                : user.streak >= 6
                ? "6–11 month tier: 200 COMMIT / month"
                : "3–5 month tier: 150 COMMIT / month"}
            </p>
          )}
        </div>

        {user.graduated ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">Commitment complete</p>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Graduated 🎓</span>
            </div>
            <p className="mt-1 text-sm text-violet-700">
              You completed your {totalMonths}-month commitment. Your full stake has been returned to your wallet.
            </p>
          </div>
        ) : !user.isActive ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">Not enrolled</p>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">Inactive</span>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Your stake was forfeited. Start a new commitment to try again.
            </p>
            <button
              className="mt-5 w-full rounded-full border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => {}}
            >
              Start new commitment
            </button>
          </div>
        ) : !user.verifiedThisMonth ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">This month</p>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Pending</span>
            </div>
            <p className="mt-1 text-sm text-amber-700">
              Keep contributing to your FHSA. Verification runs at month end. Miss it and your full stake is forfeited.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">This month</p>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Verified</span>
            </div>
            <p className="mt-1 text-sm text-green-700">
              {user.hasClaimed
                ? "You've already claimed your pool share."
                : "Your contribution was confirmed. Claim your share of the redistribution pool."}
            </p>
            {!user.hasClaimed && (
              <button
                onClick={handleClaimPoolShare}
                disabled={claiming}
                className="mt-5 w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {claiming ? "Claiming…" : "Claim pool share"}
              </button>
            )}
          </div>
        )}

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
              <dd className="font-semibold text-gray-900">
                {user.monthlyCommitment ? `$${user.monthlyCommitment.toFixed(2)} USDC` : "–"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Commitment period</dt>
              <dd className="font-semibold text-gray-900">{totalMonths} months</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Streak</dt>
              <dd className="font-semibold text-gray-900">{user.streak} {user.streak === 1 ? "month" : "months"}</dd>
            </div>
          </dl>
        </div>
          </>
        )}
      </div>
    </main>
  );
}
