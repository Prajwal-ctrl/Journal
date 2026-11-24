import UnlockForm from "@/components/UnlockForm";

export default function UnlockPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101210] px-6 text-[#eee9de]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(197,167,125,.12),transparent_55%)]" />
      <section className="relative w-full max-w-md rounded-[1.7rem] border border-[#c5a77d]/15 bg-[linear-gradient(145deg,#1b201b,#151714)] p-8 shadow-[0_30px_100px_rgba(0,0,0,.4)] sm:p-10">
        <p className="text-center font-serif text-lg tracking-[.2em]">
          LIFE<span className="text-[#c5a77d]">.</span>ARCHIVE
        </p>
        <div className="mt-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[#c5a77d]/30 bg-[#c5a77d]/10 text-[#c5a77d]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.6">
              <rect x="4.5" y="10" width="15" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
            </svg>
          </div>
          <h1 className="mt-5 font-serif text-3xl font-normal">Your private world</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Sign in to open your personal archive.
          </p>
        </div>
        <UnlockForm />
        <p className="mt-5 text-center text-xs leading-5 text-gray-500">
          Use the email and password for your Supabase account.
        </p>
        <p className="mt-8 text-center text-[11px] tracking-[.16em] text-gray-600">
          YOUR LIFE. YOUR STORY. YOURS ALONE.
        </p>
      </section>
    </main>
  );
}
