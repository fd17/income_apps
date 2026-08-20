"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

interface JoinResponse {
  added: boolean;
  position: number;
  count: number;
  message: string;
  error?: string;
}

export default function WaitlistForm({ initialCount }: { initialCount: number }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    // Keep the count fresh if the page was cached.
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d: { count: number }) => setCount(d.count))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: JoinResponse = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setCount(data.count);
      setMessage(
        data.added
          ? `You're #${data.position} on the list. We'll be in touch!`
          : "You're already on the list — hang tight!",
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-base text-neutral-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 dark:border-white/15 dark:bg-white/10 dark:text-white"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Joining…" : "Get early access"}
        </button>
      </form>

      <div className="mt-3 min-h-6 text-sm" aria-live="polite">
        {status === "success" && (
          <p className="text-emerald-600 dark:text-emerald-400">{message}</p>
        )}
        {status === "error" && (
          <p className="text-red-600 dark:text-red-400">{message}</p>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        <span data-testid="count">
          <strong className="text-neutral-800 dark:text-neutral-200">
            {count.toLocaleString()}
          </strong>{" "}
          {count === 1 ? "person has" : "people have"} joined the waitlist
        </span>
      </p>
    </div>
  );
}
