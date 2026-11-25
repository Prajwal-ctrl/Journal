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
} from "lucide-react";
import JournalEditor from "@/components/JournalEditor";
import ArchiveCollection from "@/components/ArchiveCollection";
import LockArchiveButton from "@/components/LockArchiveButton";
import OnThisDay from "@/components/OnThisDay";

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

const customSectionCategories = [
  ["all", "All entry types"],
  ["journal", "Daily Journal"],
  ["memory", "Best Memories"],
  ["mistake", "Mistakes"],
  ["lesson", "Lessons Learned"],
  ["reflection", "Reflections"],
  ["future", "Future Me"],
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [editorCategory, setEditorCategory] = useState("journal");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionCategory, setSectionCategory] = useState("all");
  const [sectionTags, setSectionTags] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({ accent: "brass", textSize: "default", width: "wide" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("life-archive-preferences");
        if (!saved) return;
        const value = JSON.parse(saved) as Record<string, unknown>;
        setPreferences({
          accent: ["brass", "sage", "ocean", "rose"].includes(String(value.accent)) ? String(value.accent) : "brass",
          textSize: ["small", "default", "large"].includes(String(value.textSize)) ? String(value.textSize) : "default",
          width: ["focused", "wide", "full"].includes(String(value.width)) ? String(value.width) : "wide",
        });
      } catch {
        // Use the default appearance if browser storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("life-archive-sections");
        if (!saved) return;
        const value = JSON.parse(saved) as unknown;
        if (Array.isArray(value)) {
          setCustomSections(value.filter((item): item is CustomSection =>
            typeof item?.id === "string" && typeof item?.name === "string"
            && typeof item?.category === "string" && Array.isArray(item?.tags)
            && item.tags.every((tag: unknown) => typeof tag === "string"),
          ));
        }
      } catch {
        // Keep default navigation if local storage contains invalid data.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = preferences.textSize === "small" ? "15px" : preferences.textSize === "large" ? "18px" : "16px";
    return () => { document.documentElement.style.fontSize = ""; };
  }, [preferences.textSize]);

  function updatePreferences(next: typeof preferences) {
    setPreferences(next);
    try {
      localStorage.setItem("life-archive-preferences", JSON.stringify(next));
    } catch {
      // Preferences still apply for this session if storage is unavailable.
    }
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

  function openEditor(category: string) {
    setEditorCategory(category);
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

  function persistCustomSections(next: CustomSection[]) {
    setCustomSections(next);
    try {
      localStorage.setItem("life-archive-sections", JSON.stringify(next));
    } catch {
      // Sections remain available until the page is closed if storage is unavailable.
    }
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
                  {customSectionCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
              {customSections.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-gray-500">Your custom sections will show up here.</p> : <ul className="mt-3 divide-y divide-white/[.07] rounded-xl border border-white/[.07]">{customSections.map((section) => <li key={section.id} className="flex items-center justify-between gap-3 p-3.5"><div className="min-w-0"><p className="truncate text-sm text-gray-200">{section.name}</p><p className="mt-1 truncate text-[11px] text-gray-500">{customSectionCategories.find(([value]) => value === section.category)?.[1] ?? "All entry types"}{section.tags.length ? ` · ${section.tags.map((tag) => `#${tag}`).join(" ")}` : ""}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => editCustomSection(section)} aria-label={`Edit ${section.name}`} className="rounded-lg px-2.5 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white">Edit</button><button type="button" onClick={() => deleteCustomSection(section)} aria-label={`Delete ${section.name}`} className="rounded-lg px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-400/10">Delete</button></div></li>)}</ul>}
            </div>
            <p className="mt-4 text-[11px] text-gray-600">Custom sections are saved in this browser. Deleting a section never deletes its entries.</p>
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
                  <button key={accent.id} type="button" aria-label={`${accent.name} accent`} aria-pressed={preferences.accent === accent.id} onClick={() => updatePreferences({ ...preferences, accent: accent.id })} className={`size-9 rounded-full border-2 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${preferences.accent === accent.id ? "border-white" : "border-transparent"}`} style={{ backgroundColor: accent.color }} />
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-xs text-[#b7b7ad]">Text size</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[{ id: "small", name: "Small" }, { id: "default", name: "Default" }, { id: "large", name: "Large" }].map((size) => (
                  <button key={size.id} type="button" aria-pressed={preferences.textSize === size.id} onClick={() => updatePreferences({ ...preferences, textSize: size.id })} className={`rounded-lg border px-2 py-2 text-xs transition ${preferences.textSize === size.id ? "border-[#c5a77d]/50 bg-[#c5a77d]/10 text-[#eee9de]" : "border-white/10 text-gray-400 hover:border-white/20"}`}>{size.name}</button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="text-xs text-[#b7b7ad]">Content width</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[{ id: "focused", name: "Focused" }, { id: "wide", name: "Wide" }, { id: "full", name: "Full" }].map((width) => (
                  <button key={width.id} type="button" aria-pressed={preferences.width === width.id} onClick={() => updatePreferences({ ...preferences, width: width.id })} className={`rounded-lg border px-2 py-2 text-xs transition ${preferences.width === width.id ? "border-[#c5a77d]/50 bg-[#c5a77d]/10 text-[#eee9de]" : "border-white/10 text-gray-400 hover:border-white/20"}`}>{width.name}</button>
                ))}
              </div>
            </fieldset>
            <p className="mt-5 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-gray-500">These choices are saved in this browser and stay private to this device.</p>
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
          className="archive-menu-enter relative z-20 space-y-2 border-b border-white/[.07] bg-[#151815] p-5 shadow-[0_24px_60px_rgba(0,0,0,.38)] md:hidden"
        >
          <p className="px-3 pb-1 text-[10px] tracking-[.22em] text-[#70746a]">YOUR ARCHIVE</p>
          {navigation.map((item) => {
            const Icon = getNavigationIcon(item.key);
            const selected = selectedNavigation === item.key;

            return (
              <button
                key={item.key}
                aria-current={selected ? "page" : undefined}
                onClick={() => selectSection(item.key)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60 ${
                  selected
                    ? "border-[#c5a77d]/20 bg-[#c5a77d]/[.09] text-[#e0c397]"
                    : "border-transparent text-gray-300 hover:bg-white/5 hover:text-[#e0c397]"
                }`}
              >
                <Icon size={17} strokeWidth={1.6} />
                {item.label}
              </button>
            );
          })}
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
        <div className={`flex min-h-9 items-center ${sidebarCollapsed ? "justify-center" : "justify-between gap-3"}`}>
          {!sidebarCollapsed && (
            <span className="font-serif text-[1.2rem] tracking-[.12em]">
              LIFE<span className="text-[#c5a77d]">.</span>ARCHIVE
            </span>
          )}
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
          {navigation.map((item) => (
            (() => {
              const Icon = getNavigationIcon(item.key);
              const selected = selectedNavigation === item.key;

              return (
                <button
                  key={item.key}
                  aria-current={selected ? "page" : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => selectSection(item.key)}
                  className={`group flex w-full items-center rounded-xl border py-3 text-left text-[13px] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60 ${
                    sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
                  } ${
                    selected
                      ? "border-[#c5a77d]/15 bg-[#c5a77d]/[.09] text-[#e4c89b] shadow-[inset_2px_0_0_0_#c5a77d]"
                      : "border-transparent text-[#999b92] hover:bg-white/[.035] hover:text-[#eee9de]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.6} />
                  <span className={sidebarCollapsed ? "sr-only" : "truncate"}>{item.label}</span>
                </button>
              );
            })()
          ))}
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
            key={editorCategory}
            initialCategory={editorCategory}
            onBack={() => setActive("Overview")}
          />
        ) : active !== "Overview" ? (
          <ArchiveCollection
            key={`${active}-${currentCustomSection?.category ?? ""}-${currentCustomSection?.tags.join("|") ?? ""}`}
            title={currentCustomSection?.name ?? active}
            description={currentCustomSection ? `Your saved view${currentCustomSection.tags.length ? ` · ${currentCustomSection.tags.map((tag) => `#${tag}`).join(" ")}` : " across your archive"}.` : sections.find((section) => section.name === active)?.desc ?? "Explore your personal history"}
            category={currentCustomSection ? currentCustomSection.category === "all" ? null : currentCustomSection.category as "journal" | "memory" | "mistake" | "lesson" | "reflection" | "future" : active === "Life Timeline" ? null : (categoryBySection[active] as "memory" | "mistake" | "lesson" | undefined) ?? null}
            initialTags={currentCustomSection?.tags ?? []}
            onSaveTags={currentCustomSection ? (tags) => persistCustomSections(customSections.map((section) => section.id === currentCustomSection.id ? { ...section, tags } : section)) : undefined}
            initialSearch={active === "Life Timeline" ? search : ""}
            onBack={() => setActive("Overview")}
            onCreate={() => openEditor(categoryBySection[active] ?? "journal")}
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
