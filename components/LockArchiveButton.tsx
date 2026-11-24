"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LockArchiveButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function lockArchive() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/lock", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      router.replace("/unlock");
      router.refresh();
    } catch (error) {
      console.error("Archive sign-out failed:", error);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={lockArchive}
      disabled={pending}
      className="flex items-center gap-2 text-xs text-gray-500 transition hover:text-[#d8bc91] disabled:opacity-50"
      aria-label="Lock archive"
    >
      <Lock size={14} /> {pending ? "LOCKING…" : "LOCK ARCHIVE"}
    </button>
  );
}
