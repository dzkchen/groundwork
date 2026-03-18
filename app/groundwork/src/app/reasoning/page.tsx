"use client";

import Link from "next/link";

export default function ReasoningPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="w-full border-b border-stone-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-violet-700"
          >
            Groundwork
          </Link>
          <div className="flex items-center gap-8">
            <Link
              href="/onboard"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-violet-700"
            >
              Onboard
            </Link>
            <Link
              href="/reasoning"
              className="text-sm font-medium text-violet-700"
            >
              Reasoning
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-stone-600 transition-colors hover:text-violet-700"
            >
              About
            </Link>
            <Link
              href="/home"
              className="rounded-full border-2 border-violet-600 bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 hover:border-violet-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            The economic and psychological framework for decentralized savings
          </h1>
          <p className="mt-3 text-stone-600">
            Why we built Groundwork, and how it turns intention into action.
          </p>
        </header>

        <section className="mb-12 rounded-2xl border border-violet-200 bg-violet-50/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-700">
            TL;DR
          </h2>
          <p className="mt-3 text-stone-700 leading-relaxed">
            The FHSA is one of the best financial tools available to Canadians: tax-deductible in, tax-free out for a first home. Yet adoption and follow-through are strikingly low: about two-thirds of Canadians don’t understand the FHSA; only a fraction of eligible renters have opened one; and even among account holders, average balances stay around ~$4K, leaving huge tax-advantaged room unused.
          </p>
          <p className="mt-3 text-stone-700 leading-relaxed">
            <strong className="text-stone-900">Groundwork</strong> closes the gap between wanting to save and actually saving by making FHSA contributions financially binding and socially accountable, so the cost of inaction is real and immediate.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-stone-900">
            1. The core bottleneck: time inconsistency
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            Standard finance assumes rational, long-term optimization. In practice, people heavily discount future rewards (hyperbolic discounting). A house in 5–10 years rarely beats the immediate friction of locking up money today. Groundwork fixes this by making the consequences of inaction <em>present</em>: miss your contribution and you lose your stake now, not in some vague future.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-stone-900">
            2. The solution: commitment devices
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            A <strong>commitment device</strong> is a voluntary mechanism that restricts your future choices so you can’t quietly procrastinate. By staking USDC upfront, you enter a binding deposit contract. Research shows that people using strict deposit contracts hit savings targets at much higher rates than with ordinary accounts (Ashraf, Karlan & Yin, 2006). The option to “just skip this month” is removed.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-stone-900">
            3. Loss aversion: the main driver
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            In <strong>Prospect Theory</strong>, losses hurt about twice as much as equivalent gains (Kahneman & Tversky, 1979). A small bonus for contributing wouldn’t move the needle. Putting your own capital at risk does: failing to contribute no longer means “missing out later”; it means an immediate, tangible loss. People also tend to prefer these “loss contracts” because they work as a strong psychological stick (Imas, Sadoff & Samek, 2017).
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-stone-900">
            4. Gamified yield and pool dynamics
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            When someone misses their contribution, their staked USDC is forfeited and shared among successful savers in that pool. That creates a modern tontine-like structure: disciplined savers earn yield above typical savings accounts, and the system turns saving into a positive-sum game where consistency is directly rewarded with real payouts.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-stone-900">
            5. Trustless execution on Web3
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            For a commitment device to work, the referee must be impartial. Human accountability groups often fail when sympathy overrides rules. On Solana, the rules are in code: once USDC is staked and the timeline is set, there’s no backing out. Bank APIs (e.g. Plaid) act as oracles: verification is binary, either the FHSA contribution happened, or it didn’t. The contract executes accordingly.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-stone-900">
            How it works
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            Make a real FHSA contribution in the window → keep your stake and earn a share of forfeited funds from those who missed the deadline.
          </p>
          <ul className="mt-6 space-y-4">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">1</span>
              <div>
                <strong className="text-stone-900">Form a pool</strong>: private group with friends or public lobby with other savers.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">2</span>
              <div>
                <strong className="text-stone-900">Stake on Solana</strong>: lock USDC in a smart contract (stablecoin = no volatility while locked).
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">3</span>
              <div>
                <strong className="text-stone-900">Race to save</strong>: make a qualifying fiat contribution to your FHSA within the timeframe.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">4</span>
              <div>
                <strong className="text-stone-900">Verification</strong>: we verify via bank APIs (Plaid) that the contribution occurred.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">5</span>
              <div>
                <strong className="text-stone-900">Settlement</strong>: success means stake returned plus share of forfeited pool; failure means stake forfeited and distributed to successful savers.
              </div>
            </li>
          </ul>
        </section>

        <section className="mb-12 rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-bold text-stone-900">
            Bottom line
          </h2>
          <p className="mt-3 text-stone-600 leading-relaxed">
            Groundwork doesn’t just encourage saving; it structures it. Commitment devices, loss aversion, pooled rewards, and trustless execution align short-term behavior with long-term outcomes so that following through becomes the path of least resistance.
          </p>
        </section>

        <section className="border-t border-stone-200 pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            References
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>
              Ashraf, N., Karlan, D., & Yin, W. (2006). Tying Odysseus to the mast: Evidence from a commitment savings product in the Philippines. <em>The Quarterly Journal of Economics</em>, 121(2), 635–672.{" "}
              <a href="https://doi.org/10.1162/qjec.2006.121.2.635" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">doi.org/10.1162/qjec.2006.121.2.635</a>
            </li>
            <li>
              Imas, A., Sadoff, S., & Samek, A. (2017). Do people anticipate loss aversion? <em>Management Science</em>, 63(10), 3171–3186.{" "}
              <a href="https://doi.org/10.1287/mnsc.2016.2499" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">doi.org/10.1287/mnsc.2016.2499</a>
            </li>
            <li>
              Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of decision under risk. <em>Econometrica</em>, 47(2), 263–291.{" "}
              <a href="https://doi.org/10.2307/1914185" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">doi.org/10.2307/1914185</a>
            </li>
          </ul>
        </section>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </article>
    </main>
  );
}
