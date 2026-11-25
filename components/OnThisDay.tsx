"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

type Entry = {
  id: string;
  title: string;
  content: string;
  category: string;
  mood: string | null;
  tags: string[];
  created_at: string | null;
};

const categoryNames: Record<string, string> = {
  journal: "Daily Journal",
  memory: "Best Memory",
  mistake: "Mistake",
  lesson: "Lesson Learned",
  reflection: "Reflection",
  future: "Future Me",
};

export default function OnThisDay() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/entries", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { entries?: Entry[] };
        if (active) setEntries(result.entries ?? []);
      } catch {
        // Keep the dashboard quiet if the archive cannot be reached.
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const memories = entries.filter((entry) => {
    if (!entry.created_at) return false;
    const date = new Date(entry.created_at);
    return !Number.isNaN(date.getTime())
      && date.getFullYear() < todayYear
      && date.getMonth() === todayMonth
      && date.getDate() === todayDay;
  });

  if (loading || memories.length === 0) return null;

  return (
    <section aria-labelledby="on-this-day-title" className="mt-8 overflow-hidden rounded-[1.45rem] border border-[#c5a77d]/20 bg-[linear-gradient(115deg,rgba(36,39,31,.96),rgba(25,27,23,.98))] shadow-[0_18px_55px_rgba(0,0,0,.18)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.07] px-6 py-5 sm:px-8">
        <div>
          <p className="flex items-center gap-2 text-[10px] tracking-[.23em] text-[#cfb184]"><Sparkles size={14} /> FROM YOUR PAST</p>
          <h2 id="on-this-day-title" className="mt-2 font-serif text-2xl text-[#eee9de]">On this day</h2>
          <p className="mt-1 text-xs text-[#92948b]">A moment you saved on {today.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.</p>
        </div>
        <span className="rounded-full border border-[#c5a77d]/20 bg-[#c5a77d]/[.07] px-3 py-1.5 text-xs text-[#d8c39f]">{memories.length} {memories.length === 1 ? "memory" : "memories"}</span>
      </div>
      <div className="divide-y divide-white/[.07]">
        {memories.map((entry) => {
          const date = new Date(entry.created_at!);
          const isExpanded = expanded === entry.id;
          return (
            <article key={entry.id} className="px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#a9a496]"><CalendarDays size={13} className="text-[#c5a77d]" /> {date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} <span className="text-[#c5a77d]/60">·</span> {categoryNames[entry.category] ?? "Archive Entry"}</p>
                  <h3 className="mt-2 font-serif text-xl text-[#eee9de]">{entry.title}</h3>
                  <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 text-[#a6a69d] ${isExpanded ? "" : "line-clamp-2"}`}>{entry.content}</p>
                  {isExpanded && <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#9c9d94]">{entry.mood && <span className="rounded-full border border-white/10 px-3 py-1">{entry.mood}</span>}{entry.tags.map((tag) => <span key={tag} className="rounded-full bg-white/5 px-3 py-1">#{tag}</span>)}</div>}
                </div>
                <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : entry.id)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#c5a77d]/25 px-4 py-2 text-xs text-[#d5b989] transition hover:bg-[#c5a77d]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60">
                  {isExpanded ? <>Close <ChevronUp size={14} /></> : <>Read memory <ArrowUpRight size={14} /> <ChevronDown size={14} /></>}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
