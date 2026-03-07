"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!connected || !publicKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${publicKey.toBase58()}`);
      if (res.ok) {
        router.push("/dashboard");
      } else if (res.status === 404) {
        router.push("/onboard");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const addrShort = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Groundwork</h1>
        <p className="mt-3 text-lg text-gray-500">
          Savings accountability for your first home.
        </p>
      </div>

      {connected && publicKey ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-mono text-sm">{addrShort}</span>
          </div>
          <button
            onClick={handleContinue}
            disabled={loading}
            className="rounded-full bg-black px-8 py-3 text-base font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Loading..." : "Continue →"}
          </button>
        </div>
      ) : (
        <WalletMultiButton />
      )}
    </main>
  );
}
