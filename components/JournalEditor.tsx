"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Save, Sparkles } from "lucide-react";

type ArchiveEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  mood: string | null;
  tags: string[];
  created_at: string | null;
};

export default function JournalEditor({
  onBack,
  initialCategory = "journal",
}: {
  onBack: () => void;
  initialCategory?: string;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [mood, setMood] = useState("Calm");
  const [tags, setTags] = useState("");

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [preview, setPreview] = useState(false);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (!title.trim() || !content.trim()) {
      alert("Please add a title and write something first.");
      return;
    }
    setPreview(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError("Please add a title and write something before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category,
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
      setPreview(true);
      setSaveMessage(
        result.metadataSaved === false
          ? "Entry saved. Mood and tags are not available in the current database schema yet."
          : "Entry saved to your private archive.",
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
        {/* Title */}
        <div>
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
        </div>

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
            <option value="journal">Daily Journal</option>
            <option value="memory">Best Memory</option>
            <option value="mistake">Mistake</option>
            <option value="lesson">Lesson Learned</option>
            <option value="reflection">Reflection</option>
            <option value="future">Future Me</option>
          </select>
        </div>

        {/* Writing area */}
        <div>
          <label
            className="text-xs text-[#c5a77d]
            tracking-widest"
          >
            YOUR STORY
          </label>

          <textarea
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
          />
          <p className="text-xs text-gray-600 mt-2">
            {content.length} characters
          </p>
        </div>

        {/* Mood */}
        <div>
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
        </div>

        {/* Tags */}
        <div>
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
        </div>

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
              {saving ? "Saving…" : "Save entry"}
            </button>
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
              <h2 className="text-2xl">{title}</h2>
              <p className="text-xs text-gray-500">
                {today} · {category} · {mood}
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
                className="rounded-[1.2rem] border border-white/[.075] bg-[linear-gradient(145deg,rgba(31,35,30,.92),rgba(22,24,21,.96))] p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg text-[#eee9de]">{entry.title}</h3>
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
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#a4a69c]">
                  {entry.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {entry.category}
                  </span>
                  {entry.mood && <span>{entry.mood}</span>}
                  {entry.tags.map((tag) => (
                    <span key={`${entry.id}-${tag}`}>#{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
