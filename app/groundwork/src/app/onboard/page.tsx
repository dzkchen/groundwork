"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { usePlaidLink } from "react-plaid-link";
import { Transaction } from "@solana/web3.js";

type Step = 1 | 2 | 3 | 4;

const FHSA_MONTHLY_MAX = 667;
const MIN_MONTHLY_COMMITMENT = 50;
const MATCHMAKING_STAKE = 50;
const MAX_MATCH_PARTICIPANTS = 4;

export default function OnboardPage() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [competeMode, setCompeteMode] = useState<"friends" | "random" | null>(null);
  const [friendsSubMode, setFriendsSubMode] = useState<"choose" | "create" | "join">("choose");
  const [joinCode, setJoinCode] = useState("");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchCode, setMatchCode] = useState<string | null>(null);
  const [matchError, setMatchError] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bankConnected, setBankConnected] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkTokenLoading, setLinkTokenLoading] = useState(false);

  const suggestedSavings =
    monthlyIncome && monthlyExpenses
      ? Math.min(
          FHSA_MONTHLY_MAX,
          Math.max(0, Math.floor((Number(monthlyIncome) - Number(monthlyExpenses)) * 0.2))
        )
      : null;

  const monthly = Number(commitmentAmount) || 0;
  const totalStake = MATCHMAKING_STAKE;
  const totalMonths = 1;

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
        if (data.link_token) setLinkToken(data.link_token);
        else setError(`Bank connection failed: ${data.error ?? "unknown error"}`);
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
      setCommitmentAmount(String(Math.max(suggestedSavings, MIN_MONTHLY_COMMITMENT)));
    }
    setStep(2);
  }

  async function handleCreateMatch() {
    if (!publicKey || monthly < MIN_MONTHLY_COMMITMENT) return;
    setMatchLoading(true);
    setMatchError("");
    try {
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          monthlyCommitment: monthly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create match");
      setMatchId(data.matchId);
      setMatchCode(data.code);
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : "Failed to create match");
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleJoinMatch() {
    if (!publicKey || !joinCode.trim() || monthly < MIN_MONTHLY_COMMITMENT) return;
    setMatchLoading(true);
    setMatchError("");
    try {
      const res = await fetch("/api/match/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          matchIdOrCode: joinCode.trim().toUpperCase(),
          monthlyCommitment: monthly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join match");
      setMatchId(data.matchId);
      setStep(4);
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : "Failed to join match");
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleFindMatch() {
    if (!publicKey || monthly < MIN_MONTHLY_COMMITMENT) return;
    setMatchLoading(true);
    setMatchError("");
    try {
      const res = await fetch("/api/match/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          monthlyCommitment: monthly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to find match");
      setMatchId(data.matchId);
      setStep(4);
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : "Failed to find match");
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleFinish() {
    if (!publicKey || !signTransaction) return;
    setSubmitting(true);
    setError("");
    try {
      const onboardRes = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          monthlyCommitment: monthly,
          totalMonths,
          stakeAmount: totalStake,
          matchId: matchId ?? undefined,
        }),
      });
      if (!onboardRes.ok) throw new Error("Failed to save profile");

      const relayRes = await fetch("/api/relay/deposit-stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58(), amount: totalStake }),
      });
      if (!relayRes.ok) {
        const data = await relayRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to prepare deposit");
      }
      const { transaction: txBase64 } = await relayRes.json();
      const tx = Transaction.from(Buffer.from(txBase64, "base64"));
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(sig, "confirmed");

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
                  ${Math.max(suggestedSavings, MIN_MONTHLY_COMMITMENT).toFixed(2)}
                  <span className="ml-1 text-sm font-normal text-violet-400">/ month (min ${MIN_MONTHLY_COMMITMENT})</span>
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
                How much will you deposit to your FHSA each month? Minimum ${MIN_MONTHLY_COMMITMENT}.
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Monthly commitment amount</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min={MIN_MONTHLY_COMMITMENT}
                  value={commitmentAmount}
                  onChange={(e) => setCommitmentAmount(e.target.value)}
                  onBlur={(e) => { if (e.target.value) setCommitmentAmount(Number(e.target.value).toFixed(2)); }}
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
              <h2 className="text-4xl font-bold text-gray-900">How do you want to compete?</h2>
              <p className="mt-1 text-sm text-gray-500">
                $50 USDC stake per round. Up to {MAX_MATCH_PARTICIPANTS} people per match.
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
                  onClick={() => setCompeteMode("random")}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50"
                >
                  <span className="font-semibold text-gray-900">Random matchmaking</span>
                  <span className="text-sm text-gray-500">We match you by commitment level</span>
                </button>
              </div>
            )}

            {competeMode === "random" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">
                  We&apos;ll find others with the same monthly commitment (${monthly.toFixed(2)}). $50 USDC stake.
                </p>
                {matchError && <p className="text-sm text-red-500">{matchError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setCompeteMode(null); setMatchError(""); }}
                    className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    disabled={matchLoading}
                    onClick={handleFindMatch}
                    className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                  >
                    {matchLoading ? "Finding match…" : "Find a match"}
                  </button>
                </div>
              </div>
            )}

            {competeMode === "friends" && friendsSubMode === "choose" && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setFriendsSubMode("create")}
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
                  onClick={() => setCompeteMode(null)}
                  className="rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            )}

            {competeMode === "friends" && friendsSubMode === "create" && (
              <div className="flex flex-col gap-4">
                {!matchCode ? (
                  <>
                    <p className="text-sm text-gray-600">Create a match and share the code with friends (max {MAX_MATCH_PARTICIPANTS}).</p>
                    {matchError && <p className="text-sm text-red-500">{matchError}</p>}
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setFriendsSubMode("choose"); setMatchError(""); }}
                        className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        disabled={matchLoading}
                        onClick={handleCreateMatch}
                        className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                      >
                        {matchLoading ? "Creating…" : "Create match"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Share this code with friends</p>
                      <p className="mt-2 text-3xl font-mono font-bold tracking-widest text-violet-900">{matchCode}</p>
                      <p className="mt-1 text-xs text-violet-600">Up to {MAX_MATCH_PARTICIPANTS} people can join.</p>
                    </div>
                    <button
                      onClick={() => setStep(4)}
                      className="rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                    >
                      Continue to connect bank &amp; deposit
                    </button>
                  </>
                )}
              </div>
            )}

            {competeMode === "friends" && friendsSubMode === "join" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">Enter the 6-character code from your friend.</p>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-center text-lg font-mono tracking-widest uppercase placeholder-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                {matchError && <p className="text-sm text-red-500">{matchError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setFriendsSubMode("choose"); setJoinCode(""); setMatchError(""); }}
                    className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    disabled={matchLoading || joinCode.trim().length !== 6}
                    onClick={handleJoinMatch}
                    className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                  >
                    {matchLoading ? "Joining…" : "Join match"}
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
                Link your bank so we can verify contributions, then deposit your $50 stake.
              </p>
            </div>

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

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Stake (this round)</span>
                <span className="font-semibold text-gray-900">$50 USDC</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-gray-700">
                <span className="font-semibold">One-time deposit</span>
                <span className="font-bold text-violet-700">$50.00 USDC</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">Returned in full + pool share when you verify your FHSA contribution this month.</p>
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
                disabled={submitting || !bankConnected || !signTransaction}
                onClick={handleFinish}
                className="flex-1 rounded-full bg-violet-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-30"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Depositing...
                  </span>
                ) : (
                  "Deposit $50 USDC"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
