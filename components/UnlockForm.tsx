"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UnlockForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw new Error(
          signInError.message === "Invalid login credentials"
            ? "That email and password didn’t match."
            : "Unable to sign in. Check your connection and try again.",
        );
      }

      setEmail("");
      setPassword("");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to unlock your archive.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label htmlFor="archive-email" className="block text-xs tracking-wide text-gray-400">
        EMAIL
      </label>
      <input
        id="archive-email"
        type="email"
        autoComplete="username"
        autoFocus
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#101114] px-4 py-3 text-sm outline-none transition placeholder:text-gray-600 focus:border-[#c5a77d]/70"
        placeholder="you@example.com"
      />
      <label htmlFor="archive-password" className="block text-xs tracking-wide text-gray-400">
        PASSWORD
      </label>
      <input
        id="archive-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#101114] px-4 py-3 text-sm outline-none transition placeholder:text-gray-600 focus:border-[#c5a77d]/70"
        placeholder="Enter your account password"
      />
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#c5a77d] px-5 py-3 text-sm font-medium text-[#101114] transition hover:bg-[#d4b990] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in to your archive"}
      </button>
    </form>
  );
}
