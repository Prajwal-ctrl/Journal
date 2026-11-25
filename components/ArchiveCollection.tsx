"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Plus, Search } from "lucide-react";

type EntryCategory = "journal" | "memory" | "mistake" | "lesson" | "reflection" | "future";

type ArchiveEntry = {
  id: string;
  title: string;
  content: string;
  category: EntryCategory;
  mood: string | null;
  tags: string[];
  created_at: string | null;
};

const categoryLabels: Record<EntryCategory, string> = {
  journal: "Daily Journal",
  memory: "Best Memory",
  mistake: "Mistake",
  lesson: "Lesson Learned",
  reflection: "Reflection",
  future: "Future Me",
};

function formatDate(value: string | null, options: Intl.DateTimeFormatOptions) {
  if (!value) return "Undated";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Undated"
    : date.toLocaleDateString("en-IN", options);
}

export default function ArchiveCollection({
  title,
  description,
  category,
  initialTags = [],
  initialSearch = "",
  onBack,
  onCreate,
  onSaveTags,
}: {
  title: string;
  description: string;
  category: EntryCategory | null;
  initialTags?: string[];
  initialSearch?: string;
  onBack: () => void;
  onCreate: () => void;
  onSaveTags?: (tags: string[]) => void;
}) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [query, setQuery] = useState(initialSearch);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/entries", { cache: "no-store" });
        const result = (await response.json()) as {
          entries?: ArchiveEntry[];
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "Unable to load entries.");
        if (active) setEntries(result.entries ?? []);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load entries.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEntries();
    return () => {
      active = false;
    };
  }, []);

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const normalizedTags = selectedTags.map((tag) => tag.toLocaleLowerCase());
    return entries.filter((entry) => {
      const matchesCategory = category === null || entry.category === category;
      const entryTags = entry.tags.map((tag) => tag.toLocaleLowerCase());
      const matchesTags = normalizedTags.every((tag) => entryTags.includes(tag));
      const searchableText = [entry.title, entry.content, entry.mood ?? "", ...entry.tags]
        .join(" ")
        .toLocaleLowerCase();
      return matchesCategory && matchesTags && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [category, entries, query, selectedTags]);

  const availableTags = useMemo(
    () => [...new Set(entries.flatMap((entry) => entry.tags.filter(Boolean)))].sort((a, b) => a.localeCompare(b)),
    [entries],
  );
  const tagFiltersChanged = initialTags.length !== selectedTags.length
    || initialTags.some((tag) => !selectedTags.some((selected) => selected.toLocaleLowerCase() === tag.toLocaleLowerCase()));

  const timelineGroups = useMemo(() => {
    if (category !== null) return [];
    const groups = new Map<string, ArchiveEntry[]>();
    visibleEntries.forEach((entry) => {
      const year = entry.created_at ? new Date(entry.created_at).getFullYear().toString() : "Undated";
      groups.set(year, [...(groups.get(year) ?? []), entry]);
    });
    return [...groups.entries()];
  }, [category, visibleEntries]);

  function renderEntry(entry: ArchiveEntry) {
    return (
      <article
        key={entry.id}
        className="rounded-[1.35rem] border border-white/[.075] bg-[linear-gradient(145deg,rgba(31,35,30,.92),rgba(22,24,21,.96))] p-5 transition-colors hover:border-[#c5a77d]/20 md:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-[#c5a77d]">
              {categoryLabels[entry.category] ?? "Archive Entry"}
            </p>
            <h3 className="mt-2 font-serif text-xl font-normal text-[#eee9de]">{entry.title}</h3>
          </div>
          <span className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays size={14} />
            {formatDate(entry.created_at, { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#b4b4aa]">
          {entry.content}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {entry.mood && <span className="rounded-full border border-white/10 px-3 py-1">{entry.mood}</span>}
          {entry.tags.map((tag) => (
            <span key={`${entry.id}-${tag}`} className="rounded-full bg-white/5 px-3 py-1">#{tag}</span>
          ))}
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-xs tracking-[.08em] text-[#96978e] transition hover:text-[#d6ba8f]"
      >
        <ArrowLeft size={17} /> Back to overview
      </button>

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] tracking-[.25em] text-[#92938a]">PERSONAL LIFE ARCHIVE</p>
          <h1 className="mt-3 font-serif text-4xl font-normal tracking-[-.03em] text-[#f0ebdf] md:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-[#96978e]">{description}</p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-full bg-[#cfb184] px-5 py-3 text-[13px] font-medium text-[#171812] shadow-[0_8px_30px_rgba(197,167,125,.12)] transition hover:-translate-y-0.5 hover:bg-[#dfc49a]"
        >
          <Plus size={17} /> Add {category ? categoryLabels[category] : "entry"}
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-5">
        <label className="flex min-w-64 flex-1 items-center gap-3 rounded-lg border border-white/10 px-4 py-3 md:max-w-xl">
          <Search size={17} className="shrink-0 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${category ? categoryLabels[category].toLowerCase() : "your timeline"}...`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-600"
          />
        </label>
        <p className="text-xs tracking-[.06em] text-[#92938a]">
          {visibleEntries.length} {visibleEntries.length === 1 ? "entry" : "entries"}
          {query.trim() ? " found" : " saved"}
        </p>
      </div>

      {availableTags.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] tracking-[.18em] text-[#92938a]">FILTER BY TAGS <span className="ml-1 normal-case tracking-normal text-gray-600">(choose any combination)</span></p>
            <div className="flex items-center gap-4">
              {onSaveTags && tagFiltersChanged && <button type="button" onClick={() => onSaveTags(selectedTags)} className="text-[11px] text-[#c5a77d] transition hover:text-[#e0c397]">Save to section</button>}
              {selectedTags.length > 0 && <button type="button" onClick={() => setSelectedTags([])} className="text-[11px] text-[#c5a77d] transition hover:text-[#e0c397]">Clear filters</button>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const selected = selectedTags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase());
              return <button key={tag} type="button" aria-pressed={selected} onClick={() => setSelectedTags((current) => selected ? current.filter((item) => item.toLocaleLowerCase() !== tag.toLocaleLowerCase()) : [...current, tag])} className={`rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/50 ${selected ? "border-[#c5a77d]/40 bg-[#c5a77d]/10 text-[#d5b989]" : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"}`}>#{tag}</button>;
            })}
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-gray-500">Loading your archive...</p>
      ) : error ? (
        <p role="alert" className="py-12 text-center text-sm text-rose-300">{error}</p>
      ) : visibleEntries.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-gray-300">{query.trim() ? "No entries match that search." : "Nothing here yet."}</p>
          <p className="mt-2 text-sm text-gray-500">Add an entry and it will appear here.</p>
        </div>
      ) : category === null ? (
        <div className="mt-8 space-y-10">
          {timelineGroups.map(([year, groupEntries]) => (
            <section key={year}>
              <h2 className="mb-4 border-l border-[#c5a77d]/70 pl-4 font-serif text-2xl font-normal text-[#ded8c9]">{year}</h2>
              <div className="space-y-4 border-l border-white/10 pl-5 md:ml-1 md:pl-7">
                {groupEntries.map(renderEntry)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-4">{visibleEntries.map(renderEntry)}</div>
      )}
    </div>
  );
}
