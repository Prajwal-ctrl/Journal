"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, CheckSquare2, Circle, ListChecks, Pencil, Save, Sparkles, SquarePen, Trash2, X } from "lucide-react";
import type { ArchiveEntryType } from "@/lib/archive-entry-types";

type ArchiveEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  mood: string | null;
  tags: string[];
  entry_type: ArchiveEntryType;
  is_completed: boolean;
  custom_sections: string[];
  created_at: string | null;
};

const entryTypeOptions: { value: ArchiveEntryType; label: string; description: string; icon: typeof SquarePen }[] = [
  { value: "paragraph", label: "Paragraph", description: "A full journal entry", icon: SquarePen },
  { value: "quick_note", label: "Quick note", description: "A single line to remember", icon: Circle },
  { value: "todo", label: "To-do", description: "A task you can check off", icon: CheckSquare2 },
];

export default function JournalEditor({
  onBack,
  initialCategory = "journal",
  initialCustomSectionId = "",
  categories,
  sections,
  categoryNames = {},
}: {
  onBack: () => void;
  initialCategory?: string;
  initialCustomSectionId?: string;
  categories: { value: string; label: string }[];
  sections: { id: string; name: string }[];
  categoryNames?: Record<string, string>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [mood, setMood] = useState("Calm");
  const [tags, setTags] = useState("");
  const [entryType, setEntryType] = useState<ArchiveEntryType>("paragraph");
  const [isCompleted, setIsCompleted] = useState(false);
  const [customSectionId, setCustomSectionId] = useState(initialCustomSectionId);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [preview, setPreview] = useState(false);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      try {
        const response = await fetch("/api/entries");
        const result = (await response.json()) as {
          entries?: ArchiveEntry[];
          error?: string;
        };

        if (!response.ok) throw new Error(result.error ?? "Unable to load entries.");
        if (active) setEntries(result.entries ?? []);
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load entries.",
          );
        }
      } finally {
        if (active) setLoadingEntries(false);
      }
    }

    loadEntries();
    return () => {
      active = false;
    };
  }, []);

  function handlePreview() {
    if (!(title.trim() || (entryType !== "paragraph" && content.trim())) || !content.trim()) {
      alert("Please add some text before previewing.");
      return;
    }
    setPreview(true);
  }

  function beginEdit(entry: ArchiveEntry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setMood(entry.mood ?? "");
    setTags(entry.tags.join(", "));
    setEntryType(entry.entry_type);
    setIsCompleted(entry.is_completed);
    setCustomSectionId(entry.custom_sections[0] ?? "");
    setError(null);
    setSaveMessage(null);
    setPreview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setCategory(initialCategory);
    setMood("Calm");
    setTags("");
    setEntryType("paragraph");
    setIsCompleted(false);
    setCustomSectionId("");
    setPreview(false);
    setError(null);
    setSaveMessage(null);
  }

  async function deleteEntry(entry: ArchiveEntry) {
    if (!window.confirm(`Delete “${entry.title}” permanently? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your entry could not be deleted.");
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (editingId === entry.id) cancelEdit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your entry could not be deleted.");
    }
  }

  async function toggleTodo(entry: ArchiveEntry) {
    const nextCompleted = !entry.is_completed;
    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: entry.title, content: entry.content, category: entry.category, entry_type: entry.entry_type, is_completed: nextCompleted, custom_sections: entry.custom_sections, mood: entry.mood ?? "", tags: entry.tags }),
      });
      const result = await response.json() as { entry?: ArchiveEntry; error?: string };
      if (!response.ok || !result.entry) throw new Error(result.error ?? "The to-do could not be updated.");
      setEntries((current) => current.map((item) => item.id === entry.id ? result.entry! : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The to-do could not be updated.");
    }
  }

  async function handleSave() {
    const entryTitle = title.trim() || (entryType !== "paragraph" ? content.trim().slice(0, 120) : "");
    if (!entryTitle || !content.trim()) {
      setError("Please add some text before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(editingId ? `/api/entries/${editingId}` : "/api/entries", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entryTitle,
          content,
          category,
          entry_type: entryType,
          is_completed: isCompleted,
          custom_sections: customSectionId ? [customSectionId] : [],
          mood,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const result = (await response.json()) as {
        entry?: ArchiveEntry;
        metadataSaved?: boolean;
        error?: string;
      };

      if (!response.ok || !result.entry) {
        throw new Error(result.error ?? "Your entry could not be saved.");
      }

      setEntries((current) => [
        result.entry!,
        ...current.filter((entry) => entry.id !== result.entry!.id),
      ]);
      setEditingId(null);
      setPreview(true);
      setSaveMessage(
        result.metadataSaved === false
          ? "Entry saved. Mood and tags are not available in the current database schema yet."
          : editingId ? "Entry updated in your private archive." : "Entry saved to your private archive.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Your entry could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-400
          hover:text-[#c5a77d] transition mb-10"
      >
        <ArrowLeft size={17} /> Back to overview
      </button>

      <div
        className="flex items-center gap-2 text-[10px] tracking-[.25em] text-[#c5a77d]"
      >
        <Sparkles size={15} />
        PERSONAL JOURNAL
      </div>

      <h1 className="mt-5 font-serif text-4xl font-normal tracking-[-.03em] text-[#f0ebdf] md:text-5xl">
        Capture this moment.
      </h1>

      <div
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-3 py-2 text-xs text-[#92938a]"
      >
        <CalendarDays size={16} />
        {today}
      </div>

      <div className="mt-10 space-y-9">
        <fieldset>
          <legend className="text-xs tracking-widest text-[#c5a77d]">WHAT ARE YOU ADDING?</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {entryTypeOptions.map(({ value, label, description, icon: Icon }) => (
              <button key={value} type="button" aria-pressed={entryType === value} onClick={() => { setEntryType(value); if (value !== "paragraph") { setTitle(""); setContent((current) => current.slice(0, 240)); setMood(""); } if (value !== "todo") setIsCompleted(false); }} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/50 ${entryType === value ? "border-[#c5a77d]/45 bg-[#c5a77d]/[.08]" : "border-white/[.08] bg-white/[.015] hover:border-white/20"}`}>
                <Icon size={17} className={entryType === value ? "mt-0.5 text-[#d5b989]" : "mt-0.5 text-gray-500"} />
                <span><span className="block text-sm text-[#eee9de]">{label}</span><span className="mt-1 block text-[11px] leading-4 text-gray-500">{description}</span></span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Title */}
        {entryType === "paragraph" && <div>
          <label
            className="text-xs text-[#c5a77d]
            tracking-widest"
          >
            ENTRY TITLE
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this moment a name..."
            className="w-full border-b border-white/[.1] bg-transparent py-4 font-serif text-2xl font-normal text-[#eee9de] outline-none transition placeholder:font-sans placeholder:text-lg placeholder:text-[#565950] focus:border-[#c5a77d]/70 md:text-3xl"
          />
        </div>}

        {/* Category */}
        <div>
          <label
            className="text-xs text-[#c5a77d]
            tracking-widest"
          >
            CATEGORY
          </label>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-3 w-full rounded-xl border border-white/[.09] bg-[#171a17] p-3.5 text-sm text-[#d2cfc4] outline-none transition focus:border-[#c5a77d]/40 md:w-72"
          >
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        {sections.length > 0 && <label className="block text-xs tracking-widest text-[#c5a77d]">CUSTOM SECTION
          <select value={customSectionId} onChange={(event) => setCustomSectionId(event.target.value)} className="mt-3 block w-full rounded-xl border border-white/[.09] bg-[#171a17] p-3.5 text-sm tracking-normal text-[#d2cfc4] outline-none transition focus:border-[#c5a77d]/40 md:w-96">
            <option value="">No custom section</option>
            {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </select>
        </label>}

        {/* Writing area */}
        <div>
          <label
            className="text-xs text-[#c5a77d]
            tracking-widest"
          >
            {entryType === "paragraph" ? "YOUR STORY" : entryType === "todo" ? "TASK" : "QUICK NOTE"}
          </label>

          {entryType === "paragraph" ? <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What happened today?

What did you experience?
What were you thinking?
Who did you meet?
What do you want to remember?

Write freely. This is your space.`}
            rows={12}
            className="mt-4 w-full resize-y rounded-[1.2rem] border border-white/[.08] bg-[#171a17] p-5 text-[15px] leading-8 text-[#d2cfc4] outline-none transition placeholder:text-[#676a60] focus:border-[#c5a77d]/35 sm:p-6"
          /> : <input value={content} maxLength={240} onChange={(event) => setContent(event.target.value)} placeholder={entryType === "todo" ? "What do you need to do?" : "Write a quick note..."} className="mt-4 w-full rounded-xl border border-white/[.08] bg-[#171a17] px-5 py-4 text-base text-[#d2cfc4] outline-none transition placeholder:text-[#676a60] focus:border-[#c5a77d]/35" />}
          <p className="text-xs text-gray-600 mt-2">
            {entryType === "paragraph" ? `${content.length} characters` : `${content.length}/240 characters · title is generated from this line`}
          </p>
        </div>

        {entryType === "todo" && <label className="inline-flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={isCompleted} onChange={(event) => setIsCompleted(event.target.checked)} className="size-4 accent-[#c5a77d]" /> Mark this task complete</label>}

        {/* Mood */}
        {entryType === "paragraph" && <div>
          <label
            className="text-xs text-[#c5a77d]
            tracking-widest"
          >
            HOW DID YOU FEEL?
          </label>

          <div className="flex flex-wrap gap-3 mt-4">
            {[
              "Happy",
              "Calm",
              "Grateful",
              "Anxious",
              "Sad",
              "Excited",
              "Thoughtful",
            ].map((item) => (
              <button
                key={item}
                onClick={() => setMood(item)}
                className={`px-4 py-2 rounded-full text-sm border
                  transition ${
                    mood === item
                      ? "bg-[#c5a77d] text-black border-[#c5a77d]"
                      : "border-white/10 text-gray-400 hover:border-[#c5a77d]"
                  }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>}

        {/* Tags */}
        {entryType === "paragraph" && <div>
          <label
            className="text-xs text-[#c5a77d]
            tracking-widest"
          >
            TAGS
          </label>

          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="friends, work, family, travel..."
            className="mt-3 w-full rounded-xl border border-white/[.09] bg-[#171a17] p-4 text-sm text-[#d2cfc4] outline-none transition placeholder:text-[#676a60] focus:border-[#c5a77d]/35"
          />
        </div>}

        {/* Preview */}
        <div className="border-t border-white/10 pt-7">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePreview}
              className="rounded-full border border-white/[.12] px-6 py-3 text-[13px] text-[#c8c5ba] transition hover:border-[#c5a77d]/50 hover:text-[#e5d0aa]"
            >
              Preview entry
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-3 rounded-full bg-[#cfb184] px-7 py-3 text-[13px] font-medium text-[#171812] shadow-[0_8px_28px_rgba(197,167,125,.12)] transition hover:-translate-y-0.5 hover:bg-[#dfc49a] disabled:cursor-wait disabled:opacity-60"
            >
              <Save size={17} />
              {saving ? "Saving…" : editingId ? "Save changes" : "Save entry"}
            </button>
            {editingId && <button type="button" onClick={cancelEdit} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[13px] text-gray-300 hover:bg-white/5 disabled:opacity-50"><X size={15} /> Cancel edit</button>}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-rose-300">
              {error}
            </p>
          )}
          {saveMessage && (
            <p role="status" className="mt-4 text-sm text-emerald-300">
              {saveMessage}
            </p>
          )}

          {preview && (
            <div
              className="mt-6 space-y-3 rounded-[1.35rem] border border-[#c5a77d]/20 bg-[linear-gradient(145deg,#1d221d,#171a17)] p-6 sm:p-8"
            >
              <p className="text-xs text-[#c5a77d] tracking-widest">
                ENTRY PREVIEW
              </p>
              <h2 className="text-2xl">{title.trim() || (entryType !== "paragraph" ? content.trim().slice(0, 120) : "Untitled entry")}</h2>
              <p className="text-xs text-gray-500">
                {today} · {categoryNames[category] ?? category} · {entryTypeOptions.find((item) => item.value === entryType)?.label}{mood ? ` · ${mood}` : ""}
              </p>
              <p
                className="text-sm text-gray-300 whitespace-pre-wrap
                leading-7"
              >
                {content}
              </p>
              {tags && <p className="text-xs text-gray-500">Tags: {tags}</p>}
              <p className="text-xs text-amber-400 pt-3">
                {saveMessage ??
                  "This is a preview. Save the entry to keep it in your archive."}
              </p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-14 border-t border-white/10 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[.2em] text-[#c5a77d]">YOUR ARCHIVE</p>
            <h2 className="mt-2 text-2xl font-light">Recent entries</h2>
          </div>
          <span className="text-xs text-gray-600">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loadingEntries ? (
          <p className="mt-6 text-sm text-gray-500">Loading your entries…</p>
        ) : entries.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">
            Your saved entries will appear here.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                draggable={editingId !== entry.id}
                onDragStart={(event) => { event.dataTransfer.setData("text/plain", entry.id); event.dataTransfer.effectAllowed = "move"; }}
                className="rounded-[1.2rem] border border-white/[.075] bg-[linear-gradient(145deg,rgba(31,35,30,.92),rgba(22,24,21,.96))] p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {entry.entry_type === "todo" && <button type="button" aria-label={entry.is_completed ? "Mark task incomplete" : "Mark task complete"} aria-pressed={entry.is_completed} onClick={() => toggleTodo(entry)} className="shrink-0 text-[#c5a77d]">{entry.is_completed ? <CheckSquare2 size={18} /> : <ListChecks size={18} />}</button>}
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[.16em] text-[#c5a77d]">{entryTypeOptions.find((item) => item.value === entry.entry_type)?.label ?? "Paragraph"}</p>
                      {entry.entry_type === "paragraph" && <h3 className="truncate font-serif text-lg text-[#eee9de]">{entry.title}</h3>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : entry.category}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => beginEdit(entry)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition hover:border-[#c5a77d]/30 hover:text-[#d5b989]"><Pencil size={12} /> Edit</button>
                  <button type="button" onClick={() => deleteEntry(entry)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition hover:border-rose-300/30 hover:text-rose-300"><Trash2 size={12} /> Delete</button>
                </div>
                <p className={`mt-2 ${entry.entry_type === "quick_note" ? "line-clamp-1" : "line-clamp-3"} whitespace-pre-wrap text-sm leading-6 text-[#a4a69c] ${entry.is_completed ? "text-gray-600 line-through" : ""}`}>
                  {entry.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {categoryNames[entry.category] ?? entry.category}
                  </span>
                  {entry.mood && <span>{entry.mood}</span>}
                  {entry.tags.map((tag) => (
                    <span key={`${entry.id}-${tag}`}>#{tag}</span>
                  ))}
                  {entry.custom_sections.map((sectionId) => { const section = sections.find((item) => item.id === sectionId); return section ? <span key={sectionId} className="rounded-full border border-[#c5a77d]/20 px-2 py-1 text-[#cdb184]">{section.name}</span> : null; })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

