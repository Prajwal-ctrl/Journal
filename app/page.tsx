"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import {
  BookOpen,
  Heart,
  Brain,
  Lightbulb,
  Clock,
  Search,
  Plus,
  Lock,
  Menu,
  X,
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  Feather,
  Settings2,
  Tag,
  ListFilter,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";
import JournalEditor from "@/components/JournalEditor";
import ArchiveCollection from "@/components/ArchiveCollection";
import LockArchiveButton from "@/components/LockArchiveButton";
import OnThisDay from "@/components/OnThisDay";
import { DEFAULT_ARCHIVE_SETTINGS, type ArchivePreferences } from "@/lib/archive-settings";

const sections = [
  {
    name: "Daily Journal",
    icon: BookOpen,
    desc: "Document your everyday life",
  },
  { name: "Best Memories", icon: Heart, desc: "Moments worth remembering" },
  { name: "Mistakes", icon: Brain, desc: "Understand and grow" },
  { name: "Lessons Learned", icon: Lightbulb, desc: "Wisdom from experiences" },
  { name: "Life Timeline", icon: Clock, desc: "Explore your personal history" },
];

type CustomSection = {
  id: string;
  name: string;
  category: string;
  tags: string[];
};

type CustomCategory = { id: string; value: string; name: string };
type SidebarEntry = { id: string; title: string; content: string; category: string; entry_type: "paragraph" | "quick_note" | "todo"; is_completed: boolean; custom_sections: string[]; mood: string | null; tags: string[]; created_at: string | null };

const builtInCategories = [
  ["journal", "Daily Journal"],
  ["memory", "Best Memories"],
  ["mistake", "Mistakes"],
  ["lesson", "Lessons Learned"],
  ["reflection", "Reflections"],
  ["future", "Future Me"],
];

function readLegacyArchiveValue<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [editorCategory, setEditorCategory] = useState("journal");
  const [editorSectionId, setEditorSectionId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [sidebarEntries, setSidebarEntries] = useState<SidebarEntry[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionCategory, setSectionCategory] = useState("all");
  const [sectionTags, setSectionTags] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ArchivePreferences>(DEFAULT_ARCHIVE_SETTINGS.preferences);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const result = await response.json() as { settings?: typeof DEFAULT_ARCHIVE_SETTINGS; hasSettings?: boolean; error?: string };
        if (!response.ok || !result.settings) throw new Error(result.error ?? "Your archive settings could not be loaded.");

        let settings = result.settings;
        const legacyKeys = ["life-archive-preferences", "life-archive-sections", "life-archive-categories"];
        const hasLegacySettings = legacyKeys.some((key) => {
          try { return window.localStorage.getItem(key) !== null; } catch { return false; }
        });
        if (hasLegacySettings) {
          const localPreferences = readLegacyArchiveValue("life-archive-preferences", DEFAULT_ARCHIVE_SETTINGS.preferences);
          const localSections = readLegacyArchiveValue("life-archive-sections", DEFAULT_ARCHIVE_SETTINGS.custom_sections);
          const localCategories = readLegacyArchiveValue("life-archive-categories", DEFAULT_ARCHIVE_SETTINGS.custom_categories);
          const sections = Array.isArray(localSections) ? localSections.filter((item): item is CustomSection =>
            typeof item?.id === "string" && typeof item?.name === "string" && typeof item?.category === "string" && Array.isArray(item?.tags) && item.tags.every((tag: unknown) => typeof tag === "string"),
          ) : [];
          const categories = Array.isArray(localCategories) ? localCategories.filter((item): item is CustomCategory =>
            typeof item?.id === "string" && typeof item?.value === "string" && typeof item?.name === "string",
          ) : [];
          const merged = {
            preferences: result.hasSettings
              ? JSON.stringify(settings.preferences) === JSON.stringify(DEFAULT_ARCHIVE_SETTINGS.preferences) ? localPreferences : settings.preferences
              : localPreferences,
            custom_sections: result.hasSettings
              ? [...settings.custom_sections, ...sections.filter((section) => !settings.custom_sections.some((current) => current.id === section.id))]
              : sections,
            custom_categories: result.hasSettings
              ? [...settings.custom_categories, ...categories.filter((category) => !settings.custom_categories.some((current) => current.id === category.id || current.value === category.value))]
              : categories,
          };
          const migrated = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(merged) });
          const migratedResult = await migrated.json() as { settings?: typeof DEFAULT_ARCHIVE_SETTINGS; error?: string };
          if (!migrated.ok || !migratedResult.settings) throw new Error(migratedResult.error ?? "Your saved browser settings could not be moved to the database.");
          settings = migratedResult.settings;
        }
        if (!active) return;
        setPreferences(settings.preferences);
        setCustomSections(settings.custom_sections);
        setCustomCategories(settings.custom_categories);
        legacyKeys.forEach((key) => { try { window.localStorage.removeItem(key); } catch { /* Settings are safely persisted in Supabase. */ } });
        setSettingsError(null);
      } catch (cause) {
        if (active) setSettingsError(cause instanceof Error ? cause.message : "Your archive settings could not be loaded.");
      }
    }
    void loadSettings();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let current = true;
    async function loadSidebarEntries() {
      try {
        const response = await fetch("/api/entries", { cache: "no-store" });
        const result = await response.json() as { entries?: SidebarEntry[] };
        if (current && response.ok) setSidebarEntries(result.entries ?? []);
      } catch {
        // The sidebar remains usable if entry previews cannot be loaded.
      }
    }
    loadSidebarEntries();
    return () => { current = false; };
  }, [active]);

  async function saveSettings(patch: Record<string, unknown>) {
    setSettingsError(null);
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your settings could not be saved.");
      return true;
    } catch (cause) {
      setSettingsError(cause instanceof Error ? cause.message : "Your settings could not be saved.");
      return false;
    }
  }

  useEffect(() => {
    document.documentElement.style.fontSize = preferences.textSize === "small" ? "15px" : preferences.textSize === "large" ? "18px" : "16px";
    return () => { document.documentElement.style.fontSize = ""; };
  }, [preferences.textSize]);

  function updatePreferences(next: typeof preferences) {
    setPreferences(next);
    void saveSettings({ preferences: next });
  }

  const navigation = [
    { key: "Overview", label: "Overview" },
    ...sections.map((section) => ({ key: section.name, label: section.name })),
    ...customSections.map((section) => ({ key: `custom:${section.id}`, label: section.name })),
  ];
  const categoryBySection: Record<string, string> = {
    "Daily Journal": "journal",
    "Best Memories": "memory",
    Mistakes: "mistake",
    "Lessons Learned": "lesson",
  };
  const categoryLabels = Object.fromEntries([...builtInCategories, ...customCategories.map((category) => [category.value, category.name])]);
  const sectionCategoryOptions: string[][] = [...builtInCategories, ...customCategories.map((category) => [category.value, category.name])];
  const entryCategoryOptions: string[][] = [...builtInCategories, ...customCategories.map((category) => [category.value, category.name])];
  const currentCustomSection = customSections.find((section) => active === `custom:${section.id}`);
  const selectedNavigation =
    active === "Editor"
      ? Object.keys(categoryBySection).find((section) => categoryBySection[section] === editorCategory)
      : active;

  useEffect(() => {
    if (!menuOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  function getNavigationIcon(item: string) {
    if (item === "Overview") return LayoutDashboard;
    return sections.find((section) => section.name === item)?.icon ?? (item.startsWith("custom:") ? Tag : LayoutDashboard);
  }

  function entriesForSection(key: string) {
    const savedView = customSections.find((section) => key === `custom:${section.id}`);
    const category = savedView ? savedView.category : key === "Life Timeline" ? "all" : categoryBySection[key] ?? "all";
    const tags = savedView?.tags.map((tag) => tag.toLocaleLowerCase()) ?? [];
    return sidebarEntries.filter((entry) => {
      if (savedView) {
        if (entry.custom_sections.includes(savedView.id)) return true;
        if (entry.custom_sections.length > 0) return false;
        return (category === "all" || entry.category === category)
          && tags.every((tag) => entry.tags.some((entryTag) => entryTag.toLocaleLowerCase() === tag));
      }
      if (entry.custom_sections.length > 0) return false;
      return category === "all" || entry.category === category;
    });
  }

  async function moveSidebarEntry(entryId: string, targetKey: string) {
    const entry = sidebarEntries.find((item) => item.id === entryId);
    if (!entry || targetKey === "Overview" || targetKey === "Life Timeline") return;
    const customSection = customSections.find((section) => targetKey === `custom:${section.id}`);
    const nextCategory = customSection ? entry.category : categoryBySection[targetKey] ?? entry.category;
    const nextCustomSections = customSection ? [customSection.id] : [];
    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.title,
          content: entry.content,
          category: nextCategory,
          entry_type: entry.entry_type,
          is_completed: entry.is_completed,
          custom_sections: nextCustomSections,
          mood: entry.mood ?? "",
          tags: entry.tags,
        }),
      });
      const result = await response.json() as { entry?: SidebarEntry; error?: string };
      if (!response.ok || !result.entry) throw new Error(result.error ?? "The entry could not be moved.");
      setSidebarEntries((current) => current.map((item) => item.id === entry.id ? result.entry! : item));
      window.dispatchEvent(new CustomEvent("archive-entry-updated", { detail: result.entry }));
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "The entry could not be moved.");
    }
  }

  function toggleExpandedSection(key: string) {
    if (sidebarCollapsed) setSidebarCollapsed(false);
    setExpandedSections((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function openEntryFromSidebar(entry: SidebarEntry) {
    setSearch(entry.title);
    setActive("Life Timeline");
    setMenuOpen(false);
  }

  function renderNavigationItem(item: { key: string; label: string }, mobile = false) {
    const Icon = getNavigationIcon(item.key);
    const selected = selectedNavigation === item.key;
    const expanded = expandedSections.includes(item.key);
    const matchingEntries = entriesForSection(item.key);
    const buttonClass = `group flex w-full min-w-0 flex-1 items-center rounded-xl border py-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60 ${mobile ? "gap-3 px-3 text-sm" : sidebarCollapsed ? "justify-center px-0 text-[13px]" : "gap-3 px-3 text-[13px]"} ${selected ? "border-[#c5a77d]/15 bg-[#c5a77d]/[.09] text-[#e4c89b] shadow-[inset_2px_0_0_0_#c5a77d]" : "border-transparent text-[#999b92] hover:bg-white/[.035] hover:text-[#eee9de]"}`;
    return (
      <div key={item.key} className="min-w-0" onDragOver={(event) => { if (item.key !== "Overview" && item.key !== "Life Timeline") event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain"); if (id) void moveSidebarEntry(id, item.key); }}>
        <div className="flex items-center gap-1">
          <button type="button" aria-current={selected ? "page" : undefined} title={!mobile && sidebarCollapsed ? item.label : undefined} onClick={() => selectSection(item.key)} className={buttonClass}>
            <Icon size={!mobile && sidebarCollapsed ? 21 : 16} strokeWidth={1.6} />
            <span className={!mobile && sidebarCollapsed ? "sr-only" : "truncate"}>{item.label}</span>
          </button>
          {item.key !== "Overview" && (mobile || !sidebarCollapsed) && <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`} aria-expanded={expanded} onClick={() => toggleExpandedSection(item.key)} className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white/[.05] hover:text-[#d5b989] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/50 ${expanded ? "rotate-180" : ""}`}><ChevronDown size={16} /></button>}
        </div>
        {expanded && (mobile || !sidebarCollapsed) && <div className="mb-2 mt-1 space-y-0.5 border-l border-white/10 pb-1 pl-3 ml-4">
          {matchingEntries.length === 0 ? <p className="px-2 py-2 text-[11px] text-gray-600">No notes in this section yet</p> : matchingEntries.map((entry) => <button key={entry.id} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", entry.id); event.dataTransfer.effectAllowed = "move"; }} onClick={() => openEntryFromSidebar(entry)} title={`${entry.title} · drag to move sections`} className="block w-full truncate rounded-md px-2 py-2 text-left text-[11px] leading-4 text-gray-500 transition hover:bg-white/[.04] hover:text-[#e7e1d5]">{entry.title}</button>)}
        </div>}
      </div>
    );
  }

  function openEditor(category: string, customSectionId = "") {
    setEditorCategory(category);
    setEditorSectionId(customSectionId);
    setActive("Editor");
    setMenuOpen(false);
  }

  function selectSection(item: string) {
    if (item === "Daily Journal") {
      openEditor("journal");
      return;
    }
    setActive(item);
    setMenuOpen(false);
  }

  async function persistCustomSections(next: CustomSection[]) {
    const previous = customSections;
    setCustomSections(next);
    if (!await saveSettings({ custom_sections: next })) setCustomSections(previous);
  }

  async function persistCustomCategories(next: CustomCategory[]) {
    const previous = customCategories;
    setCustomCategories(next);
    if (!await saveSettings({ custom_categories: next })) setCustomCategories(previous);
  }

  function saveCustomCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    if (editingCategoryId) {
      persistCustomCategories(customCategories.map((item) => item.id === editingCategoryId ? { ...item, name } : item));
    } else {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const normalized = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 34) || "category";
      let value = `custom_${normalized}`;
      let suffix = 2;
      while ([...builtInCategories.map(([key]) => key), ...customCategories.map((item) => item.value)].includes(value)) value = `custom_${normalized}_${suffix++}`;
      persistCustomCategories([...customCategories, { id, value, name }]);
    }
    setCategoryName("");
    setEditingCategoryId(null);
  }

  function moveCustomSection(id: string, destination: number) {
    const currentIndex = customSections.findIndex((section) => section.id === id);
    if (currentIndex < 0 || destination < 0 || destination >= customSections.length) return;
    const next = [...customSections];
    const [section] = next.splice(currentIndex, 1);
    next.splice(destination, 0, section);
    persistCustomSections(next);
  }

  function dropCustomSection(targetId: string) {
    if (!draggingSectionId || draggingSectionId === targetId) return;
    const sourceIndex = customSections.findIndex((section) => section.id === draggingSectionId);
    const targetIndex = customSections.findIndex((section) => section.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...customSections];
    const [section] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, section);
    persistCustomSections(next);
    setDraggingSectionId(null);
  }

  function resetSectionForm() {
    setSectionName("");
    setSectionCategory("all");
    setSectionTags("");
    setEditingSectionId(null);
  }

  function saveCustomSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sectionName.trim();
    if (!name) return;
    const tags = [...new Set(sectionTags.split(",").map((tag) => tag.trim()).filter(Boolean))];
    if (editingSectionId) {
      persistCustomSections(customSections.map((section) => section.id === editingSectionId
        ? { ...section, name, category: sectionCategory, tags }
        : section));
    } else {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      persistCustomSections([...customSections, { id, name, category: sectionCategory, tags }]);
    }
    resetSectionForm();
  }

  function editCustomSection(section: CustomSection) {
    setEditingSectionId(section.id);
    setSectionName(section.name);
    setSectionCategory(section.category);
    setSectionTags(section.tags.join(", "));
  }

  function deleteCustomSection(section: CustomSection) {
    persistCustomSections(customSections.filter((item) => item.id !== section.id));
    if (active === `custom:${section.id}`) setActive("Overview");
    if (editingSectionId === section.id) resetSectionForm();
  }

  return (
    <main data-accent={preferences.accent} style={{ "--user-accent": ({ brass: "#c5a77d", sage: "#a3b990", ocean: "#8eafb9", rose: "#c8959b" } as Record<string, string>)[preferences.accent] } as CSSProperties} className="relative min-h-screen overflow-hidden bg-[#101210] text-[#eee9de]">
      {settingsError && <div role="alert" className="fixed left-1/2 top-3 z-[70] w-[min(92vw,36rem)] -translate-x-1/2 rounded-xl border border-rose-300/20 bg-[#241a19] px-4 py-3 text-xs text-rose-200 shadow-xl">{settingsError}</div>}
      {sectionManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSectionManagerOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="section-manager-title" className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#171a17] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] tracking-[.2em] text-[#c5a77d]">MAKE IT YOURS</p><h2 id="section-manager-title" className="mt-1 font-serif text-2xl">Manage sections</h2><p className="mt-2 max-w-md text-xs leading-5 text-gray-400">Create saved views for entry types, tags, or both. They appear in your left navigation.</p></div>
              <button type="button" aria-label="Close section manager" onClick={() => setSectionManagerOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={saveCustomSection} className="mt-6 space-y-4 rounded-xl border border-white/[.08] bg-black/10 p-4">
              <label className="block text-xs text-gray-300">Section name
                <input required maxLength={36} value={sectionName} onChange={(event) => setSectionName(event.target.value)} placeholder="e.g. Travel, Personal growth" className="mt-2 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c5a77d]/50" />
              </label>
              <label className="block text-xs text-gray-300">Entry type
                <select value={sectionCategory} onChange={(event) => setSectionCategory(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c5a77d]/50">
                  <option value="all">All entry types</option>
                  {sectionCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block text-xs text-gray-300">Tags to include <span className="text-gray-500">(optional, comma separated)</span>
                <input value={sectionTags} onChange={(event) => setSectionTags(event.target.value)} placeholder="travel, family, milestones" className="mt-2 w-full rounded-lg border border-white/10 bg-[#101210] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c5a77d]/50" />
              </label>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#cfb184] px-4 py-2.5 text-xs font-medium text-[#171812] transition hover:bg-[#dfc49a]"><Plus size={15} /> {editingSectionId ? "Save changes" : "Add section"}</button>
                {editingSectionId && <button type="button" onClick={resetSectionForm} className="rounded-full border border-white/10 px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5">Cancel edit</button>}
              </div>
            </form>

            <div className="mt-6">
              <h3 className="text-[10px] tracking-[.18em] text-gray-500">YOUR SECTIONS · {customSections.length}</h3>
              {customSections.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-gray-500">Your custom sections will show up here.</p> : <ul className="mt-3 divide-y divide-white/[.07] rounded-xl border border-white/[.07]">{customSections.map((section, index) => <li key={section.id} draggable onDragStart={() => setDraggingSectionId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropCustomSection(section.id)} onDragEnd={() => setDraggingSectionId(null)} className={`flex items-center justify-between gap-2 p-3.5 ${draggingSectionId === section.id ? "opacity-40" : ""}`}><div className="flex min-w-0 items-center gap-2"><GripVertical size={16} className="shrink-0 cursor-grab text-gray-600" /><div className="min-w-0"><p className="truncate text-sm text-gray-200">{section.name}</p><p className="mt-1 truncate text-[11px] text-gray-500">{section.category === "all" ? "All entry types" : categoryLabels[section.category] ?? "All entry types"}{section.tags.length ? ` · ${section.tags.map((tag) => `#${tag}`).join(" ")}` : ""}</p></div></div><div className="flex shrink-0 items-center gap-0.5"><button type="button" disabled={index === 0} onClick={() => moveCustomSection(section.id, index - 1)} aria-label={`Move ${section.name} up`} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 disabled:opacity-25"><ArrowUp size={14} /></button><button type="button" disabled={index === customSections.length - 1} onClick={() => moveCustomSection(section.id, index + 1)} aria-label={`Move ${section.name} down`} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 disabled:opacity-25"><ArrowDown size={14} /></button><button type="button" onClick={() => editCustomSection(section)} aria-label={`Edit ${section.name}`} className="rounded-lg px-2.5 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white">Edit</button><button type="button" onClick={() => deleteCustomSection(section)} aria-label={`Delete ${section.name}`} className="rounded-lg px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-400/10">Delete</button></div></li>)}</ul>}
            </div>

            <div className="mt-7 border-t border-white/[.07] pt-6">
              <h3 className="text-[10px] tracking-[.18em] text-gray-500">ENTRY CATEGORIES</h3>
              <p className="mt-2 text-xs leading-5 text-gray-500">Add your own category and it will appear in the entry and section filters.</p>
              <form onSubmit={saveCustomCategory} className="mt-3 flex gap-2">
                <input required maxLength={36} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Health, Travel" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101210] px-3 py-2.5 text-sm text-white outline-none focus:border-[#c5a77d]/50" />
                <button type="submit" className="rounded-full bg-[#cfb184] px-4 py-2 text-xs font-medium text-[#171812] hover:bg-[#dfc49a]">{editingCategoryId ? "Save" : "Add"}</button>
                {editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); }} className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-300">Cancel</button>}
              </form>
              {customCategories.length > 0 && <ul className="mt-3 divide-y divide-white/[.07] rounded-xl border border-white/[.07]">{customCategories.map((item) => {
                const useCount = sidebarEntries.filter((entry) => entry.category === item.value).length;
                const sectionUses = customSections.some((section) => section.category === item.value);
                return <li key={item.id} className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate text-sm text-gray-200">{item.name}</p><p className="text-[11px] text-gray-500">{useCount} {useCount === 1 ? "entry" : "entries"}</p></div><div className="flex gap-1"><button type="button" onClick={() => { setEditingCategoryId(item.id); setCategoryName(item.name); }} className="rounded-lg px-2.5 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white">Rename</button><button type="button" disabled={useCount > 0 || sectionUses} title={useCount > 0 || sectionUses ? "Reassign entries and sections before deleting this category" : "Delete category"} onClick={() => persistCustomCategories(customCategories.filter((category) => category.id !== item.id))} className="rounded-lg px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-30">Delete</button></div></li>;
              })}</ul>}
            </div>
            <p className="mt-4 text-[11px] text-gray-600">Custom sections sync through your private archive database. Deleting a section never deletes its entries.</p>
          </section>
        </div>
      )}
      <button type="button" aria-label="Customize appearance" aria-expanded={customizeOpen} onClick={() => setCustomizeOpen((open) => !open)} className="fixed right-5 top-5 z-30 flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#171a17]/90 text-[#c5a77d] shadow-lg backdrop-blur transition hover:border-[#c5a77d]/40 hover:bg-[#20251f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60 md:right-8 md:top-8">
        <Settings2 size={18} />
      </button>
      {customizeOpen && (
        <>
          <button aria-label="Close customization panel" onClick={() => setCustomizeOpen(false)} className="fixed inset-0 z-30 cursor-default bg-black/45 backdrop-blur-[2px]" />
          <section aria-label="Customize your archive" className="fixed right-4 top-[4.5rem] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#171a17] p-5 shadow-[0_24px_80px_rgba(0,0,0,.55)] md:right-8 md:top-[5.5rem]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] tracking-[.2em] text-[#c5a77d]">YOUR EXPERIENCE</p><h2 className="mt-1 font-serif text-2xl text-[#eee9de]">Customize</h2></div>
              <button type="button" onClick={() => setCustomizeOpen(false)} className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-white">Done</button>
            </div>

            <fieldset className="mt-6">
              <legend className="text-xs text-[#b7b7ad]">Accent color</legend>
              <div className="mt-3 flex gap-3">
                {[{ id: "brass", name: "Brass", color: "#c5a77d" }, { id: "sage", name: "Sage", color: "#a3b990" }, { id: "ocean", name: "Ocean", color: "#8eafb9" }, { id: "rose", name: "Rose", color: "#c8959b" }].map((accent) => (
                  <button key={accent.id} type="button" aria-label={`${accent.name} accent`} aria-pressed={preferences.accent === accent.id} onClick={() => updatePreferences({ ...preferences, accent: accent.id as ArchivePreferences["accent"] })} className={`size-9 rounded-full border-2 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${preferences.accent === accent.id ? "border-white" : "border-transparent"}`} style={{ backgroundColor: accent.color }} />
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-xs text-[#b7b7ad]">Text size</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[{ id: "small", name: "Small" }, { id: "default", name: "Default" }, { id: "large", name: "Large" }].map((size) => (
                  <button key={size.id} type="button" aria-pressed={preferences.textSize === size.id} onClick={() => updatePreferences({ ...preferences, textSize: size.id as ArchivePreferences["textSize"] })} className={`rounded-lg border px-2 py-2 text-xs transition ${preferences.textSize === size.id ? "border-[#c5a77d]/50 bg-[#c5a77d]/10 text-[#eee9de]" : "border-white/10 text-gray-400 hover:border-white/20"}`}>{size.name}</button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-xs text-[#b7b7ad]">Content width</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[{ id: "focused", name: "Focused" }, { id: "wide", name: "Wide" }, { id: "full", name: "Full" }].map((width) => (
                  <button key={width.id} type="button" aria-pressed={preferences.width === width.id} onClick={() => updatePreferences({ ...preferences, width: width.id as ArchivePreferences["width"] })} className={`rounded-lg border px-2 py-2 text-xs transition ${preferences.width === width.id ? "border-[#c5a77d]/50 bg-[#c5a77d]/10 text-[#eee9de]" : "border-white/10 text-gray-400 hover:border-white/20"}`}>{width.name}</button>
                ))}
              </div>
            </fieldset>
            <p className="mt-5 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-gray-500">These choices are saved to your private database and sync across your devices.</p>
          </section>
        </>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(197,167,125,0.12),transparent_68%)]"
      />
      {/* Mobile navigation */}
      <div className="relative z-20 flex items-center justify-between border-b border-white/[.07] bg-[#101210]/90 p-5 backdrop-blur-xl md:hidden">
        <span className="font-serif text-lg tracking-[.14em]">
          LIFE<span className="text-[#c5a77d]">.</span>ARCHIVE
        </span>
        <button
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-archive-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
          className="relative flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[.025] text-gray-300 transition duration-200 hover:border-[#c5a77d]/40 hover:bg-[#c5a77d]/[.08] hover:text-[#d9bd91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60"
        >
          <Menu
            aria-hidden="true"
            className={`absolute transition duration-200 ${menuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
          />
          <X
            aria-hidden="true"
            className={`absolute transition duration-200 ${menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
          />
        </button>
      </div>

      {menuOpen && (
        <button
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-10 bg-black/55 backdrop-blur-[2px] md:hidden"
        />
      )}

      {menuOpen && (
        <nav
          id="mobile-archive-navigation"
          aria-label="Archive navigation"
          className="archive-menu-enter relative z-20 max-h-[75vh] space-y-2 overflow-y-auto border-b border-white/[.07] bg-[#151815] p-5 shadow-[0_24px_60px_rgba(0,0,0,.38)] md:hidden"
        >
          <p className="px-3 pb-1 text-[10px] tracking-[.22em] text-[#70746a]">YOUR ARCHIVE</p>
          {navigation.map((item) => renderNavigationItem(item, true))}
          <button
            onClick={() => openEditor("journal")}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#cfb184] px-4 py-3 text-sm font-medium text-[#171812] transition hover:bg-[#dfc49a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eee9de]"
          >
            <Plus size={16} /> Write an entry
          </button>
          <button onClick={() => setSectionManagerOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 transition hover:border-[#c5a77d]/30 hover:bg-white/[.035]"><ListFilter size={16} /> Manage sections</button>
          <div className="border-t border-white/10 pt-4">
            <LockArchiveButton />
          </div>
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-10 hidden flex-col overflow-y-auto border-r border-white/[.07] bg-[#101210]/90 backdrop-blur-xl transition-[width,padding] duration-300 ease-out md:flex ${
          sidebarCollapsed ? "w-[84px] p-4" : "w-[280px] p-8"
        }`}
      >
        <div className={`flex min-h-9 items-center ${sidebarCollapsed ? "justify-center" : "justify-start gap-3"}`}>
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-gray-400 transition hover:border-[#c5a77d]/40 hover:bg-[#c5a77d]/[.08] hover:text-[#d9bd91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60 md:flex"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={17} strokeWidth={1.6} />
          </button>
          {!sidebarCollapsed && (
            <span className="font-serif text-[1.2rem] tracking-[.12em]">
              LIFE<span className="text-[#c5a77d]">.</span>ARCHIVE
            </span>
          )}
        </div>

        {!sidebarCollapsed && (
          <p className="mt-2 text-[10px] tracking-[.25em] text-[#85877d]">
            A PRIVATE LIFE IN REVIEW
          </p>
        )}

        {!sidebarCollapsed && (
          <p className="mb-3 mt-14 px-3 text-[10px] tracking-[.24em] text-[#686c63]">YOUR ARCHIVE</p>
        )}
        <nav aria-label="Archive navigation" className={`space-y-1.5 ${sidebarCollapsed ? "mt-10" : ""}`}>
          {navigation.map((item) => renderNavigationItem(item))}
        </nav>

        <button type="button" onClick={() => setSectionManagerOpen(true)} title={sidebarCollapsed ? "Manage sections" : undefined} className={`mt-3 flex w-full items-center rounded-xl border border-dashed border-white/10 py-3 text-left text-xs text-gray-400 transition hover:border-[#c5a77d]/35 hover:bg-white/[.035] hover:text-[#d5b989] ${sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}>
          <Plus size={16} /><span className={sidebarCollapsed ? "sr-only" : "truncate"}>Manage sections</span>
        </button>

        <div className="mt-auto">
          {sidebarCollapsed ? (
            <div className="mb-4 flex justify-center rounded-xl border border-white/[.07] bg-gradient-to-br from-[#1b201b] to-[#151714] py-3" title="Make room for the moments that matter">
              <Feather size={17} className="text-[#c5a77d]" strokeWidth={1.5} />
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-white/[.07] bg-gradient-to-br from-[#1b201b] to-[#151714] p-4">
              <Feather size={17} className="text-[#c5a77d]" strokeWidth={1.5} />
              <p className="mt-3 font-serif text-[15px] leading-6 text-[#ded8c9]">Make room for the moments that matter.</p>
              <p className="mt-2 text-[11px] leading-5 text-[#85877d]">A quiet place to keep your story close.</p>
            </div>
          )}
          <div className={`flex items-center border-t border-white/[.07] pt-5 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 text-[10px] tracking-[.16em] text-[#878a80]">
                <Lock size={12} /> PRIVATE SPACE
              </div>
            )}
            <LockArchiveButton compact={sidebarCollapsed} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <section style={{ maxWidth: preferences.width === "focused" ? "1120px" : preferences.width === "full" ? "none" : "1500px" }} className={`relative z-0 mx-auto px-5 py-7 transition-[margin] duration-300 ease-out sm:px-8 md:px-10 md:py-10 xl:px-16 ${sidebarCollapsed ? "md:ml-[84px]" : "md:ml-[280px]"}`}>
        {active === "Editor" ? (
          <JournalEditor
            key={`${editorCategory}-${editorSectionId}`}
            initialCategory={editorCategory}
            initialCustomSectionId={editorSectionId}
            categories={entryCategoryOptions.map(([value, label]) => ({ value, label }))}
            sections={customSections.map(({ id, name }) => ({ id, name }))}
            categoryNames={categoryLabels}
            onBack={() => setActive("Overview")}
          />
        ) : active !== "Overview" ? (
          <ArchiveCollection
            key={`${active}-${currentCustomSection?.category ?? ""}-${currentCustomSection?.tags.join("|") ?? ""}-${active === "Life Timeline" ? search : ""}`}
            title={currentCustomSection?.name ?? active}
            description={currentCustomSection ? `Your saved view${currentCustomSection.tags.length ? ` · ${currentCustomSection.tags.map((tag) => `#${tag}`).join(" ")}` : " across your archive"}.` : sections.find((section) => section.name === active)?.desc ?? "Explore your personal history"}
            category={currentCustomSection ? currentCustomSection.category === "all" ? null : currentCustomSection.category : active === "Life Timeline" ? null : categoryBySection[active] ?? null}
            categoryNames={categoryLabels}
            categoryOptions={entryCategoryOptions.map(([value, label]) => ({ value, label }))}
            sections={customSections.map(({ id, name }) => ({ id, name }))}
            customSectionId={currentCustomSection?.id}
            initialTags={currentCustomSection?.tags ?? []}
            onSaveTags={currentCustomSection ? (tags) => persistCustomSections(customSections.map((section) => section.id === currentCustomSection.id ? { ...section, tags } : section)) : undefined}
            initialSearch={active === "Life Timeline" ? search : ""}
            onBack={() => setActive("Overview")}
            onCreate={() => openEditor(categoryBySection[active] ?? (currentCustomSection && currentCustomSection.category !== "all" ? currentCustomSection.category : "journal"), currentCustomSection?.id ?? "")}
          />
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="flex items-center gap-2 text-[10px] tracking-[.28em] text-[#a9a496]">
                  <span className="size-1.5 rounded-full bg-[#c5a77d] shadow-[0_0_12px_rgba(197,167,125,.8)]" />
                  YOUR PRIVATE ARCHIVE
                </p>
                <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-.035em] text-[#f0ebdf] sm:text-5xl md:text-6xl">
                  Your story, <span className="italic text-[#cfb184]">unfolding.</span>
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-[#92948b]">A thoughtful home for the days, discoveries, and turning points that make you who you are.</p>
              </div>

              <div
                className="hidden items-center gap-2 rounded-full border border-[#c5a77d]/20 bg-[#c5a77d]/[.055] px-4 py-2.5 text-[10px] tracking-[.16em] text-[#c6b18e] sm:flex"
              >
                <Lock size={13} /> YOUR SPACE, ALWAYS
              </div>
            </header>

            {/* Welcome section */}
            <div
              className="group relative mt-10 overflow-hidden rounded-[1.7rem] border border-[#c5a77d]/15 bg-[linear-gradient(115deg,#20251f_0%,#1a1c18_56%,#211e18_100%)] p-7 shadow-[0_24px_80px_rgba(0,0,0,.22)] sm:p-10 lg:mt-12 lg:p-12"
            >
              <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-44 size-[27rem] rounded-full border border-[#d6bd92]/[.10]" />
              <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-28 size-[20rem] rounded-full border border-[#d6bd92]/[.08]" />
              <div aria-hidden="true" className="pointer-events-none absolute right-12 top-8 size-48 rounded-full bg-[#bc9e6d]/[.055] blur-3xl" />
              <div className="relative grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
                <div>
                  <div className="flex items-center gap-2 text-[10px] tracking-[.25em] text-[#d5b989]">
                    <Sparkles size={14} strokeWidth={1.5} /> A MOMENT TO REFLECT
                  </div>

                  <h2 className="mt-6 max-w-2xl font-serif text-4xl font-normal leading-[1.1] tracking-[-.03em] text-[#f0ebdf] sm:text-5xl lg:text-[3.6rem]">
                    Every day is a<br className="hidden sm:block" /> part of your story.
                  </h2>

                  <p className="mt-5 max-w-lg text-sm leading-7 text-[#a6a69d]">
                    Preserve the moments, understand the mistakes, and remember the person you are becoming.
                  </p>

                  <button
                    onClick={() => openEditor("journal")}
                    className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#cfb184] px-5 py-3 text-[13px] font-medium text-[#171812] shadow-[0_8px_30px_rgba(197,167,125,.16)] transition hover:-translate-y-0.5 hover:bg-[#dfc49a]"
                  >
                    <Plus size={16} /> Write today&apos;s entry <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="relative hidden min-h-56 items-center justify-center lg:flex">
                  <div className="absolute h-52 w-52 rounded-full border border-[#c5a77d]/15" />
                  <div className="absolute h-40 w-40 rounded-full border border-[#c5a77d]/10" />
                  <div className="relative max-w-[17rem] rotate-[-3deg] rounded-2xl border border-white/10 bg-[#111411]/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm transition duration-500 group-hover:rotate-0">
                    <p className="text-[9px] tracking-[.22em] text-[#c5a77d]">A GENTLE REMINDER</p>
                    <p className="mt-4 font-serif text-2xl italic leading-8 text-[#e5dfd2]">The life you notice is the life you remember.</p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[.08] pt-4 text-[9px] tracking-[.15em] text-[#777b71]">
                      <span>YOUR ARCHIVE</span><Sparkles size={13} className="text-[#b49a70]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <OnThisDay />

            {/* Archive sections */}
            <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] tracking-[.24em] text-[#8d8e83]">CHOOSE A CHAPTER</p>
                <h2 className="mt-2 font-serif text-3xl font-normal tracking-[-.02em] text-[#eee9de]">Explore your archive</h2>
              </div>
              <span className="pb-1 text-[10px] tracking-[.18em] text-[#74766e]">YOUR LIFE, IN YOUR WORDS</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sections.map(({ name, icon: Icon, desc }, index) => (
                <button
                  key={name}
                  onClick={() => selectSection(name)}
                  className="group relative min-h-48 overflow-hidden rounded-[1.35rem] border border-white/[.075] bg-[linear-gradient(145deg,rgba(31,35,30,.92),rgba(22,24,21,.96))] p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-[#c5a77d]/35 hover:shadow-[0_20px_50px_rgba(0,0,0,.24)] sm:p-7"
                >
                  <span className="absolute right-6 top-6 font-serif text-xs italic text-[#77776d] transition group-hover:text-[#c5a77d]">0{index + 1}</span>
                  <div className="flex size-11 items-center justify-center rounded-full border border-[#c5a77d]/20 bg-[#c5a77d]/[.07] text-[#cdb184] transition duration-300 group-hover:scale-105 group-hover:bg-[#c5a77d]/[.13]">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <div className="mt-9 flex items-end justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-[1.3rem] text-[#eee9de]">{name}</h3>
                      <p className="mt-2 text-xs tracking-[.02em] text-[#898b81]">{desc}</p>
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="shrink-0 text-[#77796f] transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#cfb184]"
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mt-14 rounded-[1.4rem] border border-white/[.07] bg-[#171a17]/80 p-6 sm:p-8">
              <p className="text-[10px] tracking-[.24em] text-[#c5a77d]">A MEMORY, SOMEWHERE</p>
              <h2 className="mt-2 font-serif text-2xl text-[#eee9de]">Find a moment</h2>

              <div
                className="mt-5 flex max-w-2xl items-center gap-3 rounded-xl border border-white/[.09] bg-[#101210]/70 px-4 py-3.5 transition focus-within:border-[#c5a77d]/40"
              >
                <Search size={17} className="text-[#9e927e]" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setActive("Life Timeline");
                  }}
                  placeholder="Search your memories..."
                  className="w-full bg-transparent text-sm text-[#e9e4d7] outline-none placeholder:text-[#666961]"
                />
                <button
                  onClick={() => setActive("Life Timeline")}
                  className="rounded-full border border-[#c5a77d]/25 px-4 py-2 text-[11px] tracking-[.1em] text-[#d5b989] transition hover:bg-[#c5a77d]/10"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-16 flex flex-wrap justify-between gap-4 border-t border-white/[.07] pt-6 text-[9px] tracking-[.2em] text-[#666961]">
              <span>YOUR LIFE. YOUR STORY.</span>
              <span>MADE FOR REFLECTION.</span>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}

