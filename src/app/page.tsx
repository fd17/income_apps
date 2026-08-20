import WaitlistForm from "@/components/WaitlistForm";
import { getCount } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Validate before you build",
    body: "Measure real demand with a live signup count instead of guessing.",
  },
  {
    title: "Pre-sell early access",
    body: "Turn a landing page into revenue with waitlists, tiers, and offers.",
  },
  {
    title: "Own your audience",
    body: "Collect emails you control — no algorithm between you and buyers.",
  },
];

export default async function Home() {
  const count = await getCount();

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-black">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-600/20"
      />

      <section className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10 dark:text-neutral-200">
          <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          LaunchList · income-app starter
        </span>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-neutral-900 sm:text-6xl dark:text-white">
          Turn interest into{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
            income
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-lg text-neutral-600 dark:text-neutral-300">
          A launch-ready waitlist page for your next product. Capture early-access
          signups, show social proof, and pre-sell before you write a line of
          product code.
        </p>

        <div className="mt-10 flex justify-center">
          <WaitlistForm initialCount={count} />
        </div>

        <dl className="mt-20 grid w-full gap-6 text-left sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
            >
              <dt className="text-base font-semibold text-neutral-900 dark:text-white">
                {f.title}
              </dt>
              <dd className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                {f.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="relative border-t border-black/5 py-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-500">
        Built with Next.js · a starter for income-generating web apps
      </footer>
    </main>
  );
}
