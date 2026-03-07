"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface UserData {
  walletAddress: string;
  streak: number;
  isActive: boolean;
  verifiedThisMonth: boolean;
  hasClaimed: boolean;
  commitmentAmount: number | null;
  provider: string | null;
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}
    >
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { publicKey, connected, disconnect } = useWallet();
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      router.push("/");
      return;
    }

    const wallet = publicKey.toBase58();
    fetch(`/api/user/${wallet}`)
      .then((res) => {
        if (res.status === 404) {
          router.push("/onboard");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) setUser(data.user as UserData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [connected, publicKey, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black dark:border-gray-700 dark:border-t-white" />
      </main>
    );
  }

  if (!user) return null;

  const walletShort = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      {/* Header */}
      <header className="flex w-full max-w-lg items-center justify-between pb-8">
        <span className="text-xl font-bold">Groundwork</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{walletShort}</span>
          <WalletMultiButton />
        </div>
      </header>

      <div className="w-full max-w-lg space-y-5">
        {/* Streak card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm text-gray-500">Current streak</p>
          <p className="mt-1 text-5xl font-bold">
            {user.streak}
            <span className="ml-1 text-2xl font-normal text-gray-400">mo</span>
          </p>
          {user.streak >= 3 && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              {user.streak >= 24
                ? "24+ month tier — 400 COMMIT / month"
                : user.streak >= 12
                ? "12–23 month tier — 300 COMMIT / month"
                : user.streak >= 6
                ? "6–11 month tier — 200 COMMIT / month"
                : "3–5 month tier — 150 COMMIT / month"}
            </p>
          )}
        </div>

        {/* State card */}
        {!user.isActive ? (
          // State 1: No active deposit
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">This month's commitment</p>
                <p className="mt-1 text-gray-500 text-sm">
                  No active stake. Deposit USDC to lock in your commitment.
                </p>
              </div>
              <StatusBadge
                label="Inactive"
                color="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
            {user.commitmentAmount && (
              <p className="mt-4 text-3xl font-bold">
                ${(user.commitmentAmount / 1_000_000).toLocaleString()}{" "}
                <span className="text-base font-normal text-gray-400">USDC target</span>
              </p>
            )}
            <button className="mt-5 w-full rounded-full bg-black py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black">
              Deposit stake
            </button>
          </div>
        ) : user.isActive && !user.verifiedThisMonth ? (
          // State 2: Active, waiting for verification
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">Stake active</p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  Your deposit is locked in. Keep contributing to your FHSA — verification happens at month end.
                </p>
              </div>
              <StatusBadge
                label="Pending"
                color="bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
              />
            </div>
            <div className="mt-5 rounded-xl bg-amber-100/60 px-4 py-3 dark:bg-amber-900/20">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Verification checks that you made your committed contribution to your FHSA this month.
              </p>
            </div>
          </div>
        ) : (
          // State 3: Verified — can claim pool share
          <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-sm dark:border-green-900/40 dark:bg-green-950/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">Verified this month</p>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  Your contribution was confirmed.{" "}
                  {user.hasClaimed
                    ? "You've already claimed your pool share."
                    : "Claim your share of the redistribution pool."}
                </p>
              </div>
              <StatusBadge
                label="Verified"
                color="bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300"
              />
            </div>
            {!user.hasClaimed && (
              <button className="mt-5 w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80 dark:bg-green-500">
                Claim pool share
              </button>
            )}
          </div>
        )}

        {/* Details */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="mb-3 text-sm font-medium text-gray-500">Account details</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">FHSA provider</dt>
              <dd className="font-medium">{user.provider ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Monthly commitment</dt>
              <dd className="font-medium">
                {user.commitmentAmount
                  ? `$${(user.commitmentAmount / 1_000_000).toLocaleString()} USDC`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Streak</dt>
              <dd className="font-medium">{user.streak} months</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
