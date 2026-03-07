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
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tight text-gray-900">Groundwork</h1>
        <p className="mt-4 text-xl text-gray-500">
          Retake control of your FHSA with Solana Blockchain.
        </p>
        <p className="mt-6 max-w-md mx-auto text-sm text-gray-400">
          You’ll need: a Solana wallet (e.g. Phantom) with some SOL and USDC, and a Canadian bank account to connect via Plaid.
        </p>
      </div>

      {connected && publicKey ? (
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="font-mono text-base text-gray-600">{addrShort}</span>
          </div>
          <button
            onClick={handleContinue}
            disabled={loading}
            className="rounded-full bg-violet-700 px-10 py-4 text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
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
