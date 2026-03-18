"use client";

import Link from "next/link";

const TECH_STACK = [
  { label: "Frontend", items: ["Next.js", "TypeScript", "Tailwind CSS"] },
  { label: "Backend & Services", items: ["Firebase", "Rust"] },
  { label: "Blockchain", items: ["Solana"] },
  { label: "Identity & Verification", items: ["Plaid"] },
] as const;

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-stone-50">
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
              className="text-sm font-medium text-stone-600 transition-colors hover:text-violet-700"
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
            <Link
              href="/demo-get-started"
              className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
            >
              Try demo
            </Link>
          </div>
        </div>
      </nav>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl md:text-6xl">
          Savings accountability for your first home
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
          Groundwork helps you stay on track with your FHSA by committing stakes on Solana.
          Meet your monthly contribution and keep your stake; miss it and it goes to the pool.
          Simple, transparent, and aligned with your goal.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/home"
            className="inline-flex rounded-full border-2 border-violet-600 bg-violet-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-violet-700 hover:border-violet-700"
          >
            Get started
          </Link>
          <Link
            href="/demo-get-started"
            className="inline-flex rounded-full border-2 border-violet-600 bg-white px-8 py-3 text-base font-semibold text-violet-700 transition-colors hover:bg-violet-50"
          >
            Try demo
          </Link>
          <Link
            href="/reasoning"
            className="inline-flex rounded-full border-2 border-stone-200 bg-white px-8 py-3 text-base font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            How it works
          </Link>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-stone-900">
            Tech stack
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {TECH_STACK.map(({ label, items }) => (
              <div
                key={label}
                className="rounded-2xl border border-stone-200 border-l-4 border-l-violet-500 bg-stone-50/50 p-6"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-700">
                  {label}
                </h3>
                <p className="mt-2 text-stone-900 font-medium">
                  {items.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 py-6">
        <div className="mx-auto max-w-4xl px-6 text-center text-sm text-stone-400">
          <p>Groundwork. Hack Canada Project made by Aryan, Sohum and David</p>
          <p className="mt-1">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}
