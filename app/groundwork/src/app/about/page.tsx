"use client";

import Link from "next/link";

const AUTHORS = [
  {
    name: "Aryan Vasudevan",
    github: "aryan-vasudevan",
    href: "https://github.com/aryan-vasudevan",
  },
  {
    name: "David Chen",
    github: "dzkchen",
    href: "https://github.com/dzkchen",
  },
  {
    name: "Sohum Padhye",
    github: "padhyeSohum",
    href: "https://github.com/padhyeSohum",
  },
] as const;

export default function AboutPage() {
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
              className="text-sm font-medium text-stone-600 transition-colors hover:text-violet-700"
            >
              Reasoning
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-violet-700"
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

      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          About
        </h1>
        <p className="mt-2 text-stone-600">
          Groundwork is a Hack Canada project. We’re building commitment-based savings for Canadians using the FHSA and Solana.
        </p>

        <h2 className="mt-12 text-lg font-semibold text-stone-900">
          Team
        </h2>
        <ul className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {AUTHORS.map(({ name, github, href }) => (
            <li key={github}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-6 text-center transition-shadow hover:shadow-md"
              >
                <img
                  src={`https://github.com/${github}.png?size=200`}
                  alt=""
                  width={96}
                  height={96}
                  className="rounded-full border-2 border-stone-100"
                />
                <span className="mt-4 font-semibold text-stone-900">{name}</span>
                <span className="mt-1 text-sm text-violet-600">@{github}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
