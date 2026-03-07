"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl.json";

interface UserData {
  walletAddress: string;
  streak: number;
  isActive: boolean;
  verifiedThisMonth: boolean;
  hasClaimed: boolean;
  monthlyCommitment: number | null;
  fhsaProvider: string | null;
}

type Toast = { type: "success" | "error"; message: string };

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchUser = useCallback(
    async (wallet: string) => {
      const res = await fetch(`/api/user/${wallet}`);
      if (res.status === 404) {
        router.push("/onboard");
        return;
      }
      const data = await res.json();
      if (data?.user) setUser(data.user as UserData);
    },
    [router]
  );

  useEffect(() => {
    if (!connected || !publicKey) {
      router.push("/");
      return;
    }
    fetchUser(publicKey.toBase58()).finally(() => setLoading(false));
  }, [connected, publicKey, router, fetchUser]);

  const program = useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
    return new Program(idl as Idl, provider);
  }, [anchorWallet, connection]);

  async function handleDepositStake() {
    if (!publicKey || !program || !user?.monthlyCommitment) return;

    const usdcMintAddr = process.env.NEXT_PUBLIC_USDC_MINT;
    if (!usdcMintAddr) {
      showToast({ type: "error", message: "USDC mint not configured." });
      return;
    }

    setDepositing(true);
    try {
      const usdcMint = new PublicKey(usdcMintAddr);
      const amount = new BN(user.monthlyCommitment * 1_000_000);

      const [userAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_account"), publicKey.toBuffer()],
        program.programId
      );
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), publicKey.toBuffer()],
        program.programId
      );
      const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, publicKey);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program.methods as any)
        .depositStake(amount)
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

      await fetch(`/api/user/${publicKey.toBase58()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      showToast({ type: "success", message: "Stake deposited!" });
      await fetchUser(publicKey.toBase58());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      showToast({ type: "error", message: msg.slice(0, 120) });
    } finally {
      setDepositing(false);
    }
  }

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
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

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
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">This month&apos;s commitment</p>
                <p className="mt-1 text-sm text-gray-500">
                  No active stake. Deposit USDC to lock in your commitment.
                </p>
              </div>
              <StatusBadge
                label="Inactive"
                color="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>
            {user.monthlyCommitment && (
              <p className="mt-4 text-3xl font-bold">
                ${user.monthlyCommitment.toLocaleString()}{" "}
                <span className="text-base font-normal text-gray-400">USDC target</span>
              </p>
            )}
            <button
              onClick={handleDepositStake}
              disabled={depositing || !program}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {depositing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Depositing...
                </>
              ) : (
                "Deposit stake"
              )}
            </button>
          </div>
        ) : user.isActive && !user.verifiedThisMonth ? (
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
              <button className="mt-5 w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80">
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
              <dt className="text-gray-400">Monthly commitment</dt>
              <dd className="font-medium">
                {user.monthlyCommitment ? `$${user.monthlyCommitment.toLocaleString()} USDC` : "—"}
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
