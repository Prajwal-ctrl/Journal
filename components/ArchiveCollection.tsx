"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Pencil, Plus, Search, Save, Trash2, X } from "lucide-react";
import { CheckSquare2, ListChecks } from "lucide-react";
import type { ArchiveEntryType } from "@/lib/archive-entry-types";

type EntryCategory = string;
type CategoryOption = { value: string; label: string };

type ArchiveEntry = {
  id: string;
  title: string;
  content: string;
  category: EntryCategory;
  mood: string | null;
  tags: string[];
  entry_type: ArchiveEntryType;
  is_completed: boolean;
  custom_sections: string[];
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

const entryTypeLabels: Record<ArchiveEntryType, string> = { paragraph: "Paragraph", quick_note: "Quick note", todo: "To-do" };

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
  categoryNames = {},
  categoryOptions = [],
  sections = [],
  customSectionId,
  onBack,
  onCreate,
  onSaveTags,
}: {
  title: string;
  description: string;
  category: EntryCategory | null;
  initialTags?: string[];
  initialSearch?: string;
  categoryNames?: Record<string, string>;
  categoryOptions?: CategoryOption[];
  sections?: { id: string; name: string }[];
  customSectionId?: string;
  onBack: () => void;
  onCreate: () => void;
  onSaveTags?: (tags: string[]) => void;
}) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [query, setQuery] = useState(initialSearch);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "", category: "journal" as EntryCategory, entry_type: "paragraph" as ArchiveEntryType, is_completed: false, custom_section_id: "", mood: "", tags: "" });
  const [savingId, setSavingId] = useState<string | null>(null);

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

  useEffect(() => {
    function handleEntryUpdated(event: Event) {
      const updated = (event as CustomEvent<ArchiveEntry>).detail;
      if (updated) setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    }
    window.addEventListener("archive-entry-updated", handleEntryUpdated);
    return () => window.removeEventListener("archive-entry-updated", handleEntryUpdated);
  }, []);

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const normalizedTags = selectedTags.map((tag) => tag.toLocaleLowerCase());
    return entries.filter((entry) => {
      const matchesCategory = category === null || entry.category === category;
      const matchesCustomSection = customSectionId
        ? entry.custom_sections.includes(customSectionId) || entry.custom_sections.length === 0
        : category === null || entry.custom_sections.length === 0;
      const entryTags = entry.tags.map((tag) => tag.toLocaleLowerCase());
      const matchesTags = normalizedTags.every((tag) => entryTags.includes(tag));
      const searchableText = [entry.title, entry.content, entry.mood ?? "", ...entry.tags]
        .join(" ")
        .toLocaleLowerCase();
      return matchesCategory && matchesCustomSection && matchesTags && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [category, customSectionId, entries, query, selectedTags]);

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

  function beginEdit(entry: ArchiveEntry) {
    setActionError(null);
    setEditingId(entry.id);
    setDraft({ title: entry.title, content: entry.content, category: entry.category, entry_type: entry.entry_type, is_completed: entry.is_completed, custom_section_id: entry.custom_sections[0] ?? "", mood: entry.mood ?? "", tags: entry.tags.join(", ") });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingId(editingId);
    setActionError(null);
    try {
      const response = await fetch(`/api/entries/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, custom_sections: draft.custom_section_id ? [draft.custom_section_id] : [], mood: draft.mood.trim(), tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean) }),
      });
      const result = (await response.json()) as { entry?: ArchiveEntry; error?: string; metadataSaved?: boolean };
      if (!response.ok || !result.entry) throw new Error(result.error ?? "Your entry could not be updated.");
      setEntries((current) => current.map((entry) => entry.id === editingId ? result.entry! : entry));
      setEditingId(null);
      if (!result.metadataSaved) setActionError("Entry updated. Mood and tags are not available in the current database schema.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Your entry could not be updated.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteEntry(entry: ArchiveEntry) {
    if (!window.confirm(`Delete “${entry.title}” permanently? This cannot be undone.`)) return;
    setSavingId(entry.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your entry could not be deleted.");
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (editingId === entry.id) setEditingId(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Your entry could not be deleted.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleTodo(entry: ArchiveEntry) {
    setActionError(null);
    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: entry.title, content: entry.content, category: entry.category, entry_type: entry.entry_type, is_completed: !entry.is_completed, custom_sections: entry.custom_sections, mood: entry.mood ?? "", tags: entry.tags }),
      });
      const result = await response.json() as { entry?: ArchiveEntry; error?: string };
      if (!response.ok || !result.entry) throw new Error(result.error ?? "The to-do could not be updated.");
      setEntries((current) => current.map((item) => item.id === entry.id ? result.entry! : item));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "The to-do could not be updated.");
    }
  }

  function renderEntry(entry: ArchiveEntry) {
    const isEditing = editingId === entry.id;
    return (
      <article
        key={entry.id}
        draggable={!isEditing}
        onDragStart={(event) => { event.dataTransfer.setData("text/plain", entry.id); event.dataTransfer.effectAllowed = "move"; }}
        className="rounded-[1.35rem] border border-white/[.075] bg-[linear-gradient(145deg,rgba(31,35,30,.92),rgba(22,24,21,.96))] p-5 transition-colors hover:border-[#c5a77d]/20 md:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          {isEditing ? (
            <div className="min-w-0 flex-1 space-y-3">
              {draft.entry_type === "paragraph" && <><label className="sr-only" htmlFor={`entry-title-${entry.id}`}>Entry title</label><input id={`entry-title-${entry.id}`} maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2 font-serif text-xl text-[#eee9de] outline-none focus:border-[#c5a77d]/45" /></>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-gray-400">Type<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2 text-sm text-gray-200 outline-none">{categoryOptions.length ? categoryOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>) : Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="text-xs text-gray-400">Mood<input maxLength={80} value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value })} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2 text-sm text-gray-200 outline-none" /></label>
              </div>
              <label className="block text-xs text-gray-400">Entry format<select value={draft.entry_type} onChange={(event) => setDraft({ ...draft, entry_type: event.target.value as ArchiveEntryType, is_completed: event.target.value === "todo" ? draft.is_completed : false })} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2 text-sm text-gray-200 outline-none">{Object.entries(entryTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {sections.length > 0 && <label className="block text-xs text-gray-400">Custom section<select value={draft.custom_section_id} onChange={(event) => setDraft({ ...draft, custom_section_id: event.target.value })} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2 text-sm text-gray-200 outline-none"><option value="">No custom section</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>}
            </div>
          ) : (
            <div className="flex min-w-0 items-start gap-3">
              {entry.entry_type === "todo" && <button type="button" aria-label={entry.is_completed ? "Mark task incomplete" : "Mark task complete"} aria-pressed={entry.is_completed} onClick={() => toggleTodo(entry)} className="mt-1 shrink-0 text-[#c5a77d]">{entry.is_completed ? <CheckSquare2 size={18} /> : <ListChecks size={18} />}</button>}
              <div className="min-w-0"><p className="text-xs uppercase tracking-[.18em] text-[#c5a77d]">{categoryLabels[entry.category] ?? categoryNames[entry.category] ?? entry.category ?? "Archive Entry"} <span className="text-gray-600">· {entryTypeLabels[entry.entry_type]}</span></p>{entry.entry_type === "paragraph" && <h3 className="mt-2 font-serif text-xl font-normal text-[#eee9de]">{entry.title}</h3>}{entry.custom_sections.map((sectionId) => { const section = sections.find((item) => item.id === sectionId); return section ? <span key={sectionId} className="mt-2 inline-block rounded-full border border-[#c5a77d]/20 px-2 py-1 text-[10px] text-[#cdb184]">{section.name}</span> : null; })}</div>
            </div>
          )}
          <span className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays size={14} />
            {formatDate(entry.created_at, { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        {isEditing ? <>
          <label className="sr-only" htmlFor={`entry-content-${entry.id}`}>Entry text</label>
          {draft.entry_type === "paragraph" ? <textarea id={`entry-content-${entry.id}`} maxLength={20000} rows={8} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-[#101210] p-4 text-sm leading-7 text-[#d2cfc4] outline-none focus:border-[#c5a77d]/40" /> : <input id={`entry-content-${entry.id}`} maxLength={240} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value, title: event.target.value.slice(0, 120) })} className="mt-4 w-full rounded-xl border border-white/10 bg-[#101210] px-4 py-3 text-sm text-[#d2cfc4] outline-none focus:border-[#c5a77d]/40" />}
          <label className="mt-3 block text-xs text-gray-400">Tags <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="friends, work, travel" className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2 text-sm text-gray-200 outline-none" /></label>
        </> : <p className={`mt-4 whitespace-pre-wrap text-sm leading-7 text-[#b4b4aa] ${entry.is_completed ? "text-gray-600 line-through" : ""} ${entry.entry_type === "quick_note" ? "line-clamp-1" : ""}`}>{entry.content}</p>}
        {!isEditing && <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {entry.mood && <span className="rounded-full border border-white/10 px-3 py-1">{entry.mood}</span>}
          {entry.tags.map((tag) => (
            <span key={`${entry.id}-${tag}`} className="rounded-full bg-white/5 px-3 py-1">#{tag}</span>
          ))}
        </div>}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[.06] pt-4">
          {isEditing ? <>
            <button type="button" disabled={savingId === entry.id} onClick={saveEdit} className="inline-flex items-center gap-2 rounded-full bg-[#cfb184] px-4 py-2 text-xs font-medium text-[#171812] transition hover:bg-[#dfc49a] disabled:opacity-50"><Save size={14} /> {savingId === entry.id ? "Saving…" : "Save changes"}</button>
            <button type="button" disabled={savingId === entry.id} onClick={() => setEditingId(null)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"><X size={14} /> Cancel</button>
          </> : <>
            <button type="button" disabled={savingId === entry.id} onClick={() => beginEdit(entry)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-gray-300 transition hover:border-[#c5a77d]/30 hover:text-[#d5b989] disabled:opacity-50"><Pencil size={13} /> Edit</button>
            <button type="button" disabled={savingId === entry.id} onClick={() => deleteEntry(entry)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-gray-400 transition hover:border-rose-300/30 hover:bg-rose-300/[.06] hover:text-rose-300 disabled:opacity-50"><Trash2 size={13} /> Delete</button>
          </>}
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

      {actionError && <p role="alert" className="mt-5 rounded-xl border border-rose-300/15 bg-rose-300/[.05] px-4 py-3 text-sm text-rose-200">{actionError}</p>}

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

