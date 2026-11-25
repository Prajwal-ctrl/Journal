"use client";

import { useEffect, useState } from "react";
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

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [editorCategory, setEditorCategory] = useState("journal");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigation = ["Overview", ...sections.map((s) => s.name)];
  const categoryBySection: Record<string, string> = {
    "Daily Journal": "journal",
    "Best Memories": "memory",
    Mistakes: "mistake",
    "Lessons Learned": "lesson",
  };
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
    return sections.find((section) => section.name === item)?.icon ?? LayoutDashboard;
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101210] text-[#eee9de]">
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
            const Icon = getNavigationIcon(item);
            const selected = selectedNavigation === item;

            return (
              <button
                key={item}
                aria-current={selected ? "page" : undefined}
                onClick={() => selectSection(item)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60 ${
                  selected
                    ? "border-[#c5a77d]/20 bg-[#c5a77d]/[.09] text-[#e0c397]"
                    : "border-transparent text-gray-300 hover:bg-white/5 hover:text-[#e0c397]"
                }`}
              >
                <Icon size={17} strokeWidth={1.6} />
                {item}
              </button>
            );
          })}
          <button
            onClick={() => openEditor("journal")}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#cfb184] px-4 py-3 text-sm font-medium text-[#171812] transition hover:bg-[#dfc49a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eee9de]"
          >
            <Plus size={16} /> Write an entry
          </button>
          <div className="border-t border-white/10 pt-4">
            <LockArchiveButton />
          </div>
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-10 hidden flex-col border-r border-white/[.07] bg-[#101210]/90 backdrop-blur-xl transition-[width,padding] duration-300 ease-out md:flex ${
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
              const Icon = getNavigationIcon(item);
              const selected = selectedNavigation === item;

              return (
                <button
                  key={item}
                  aria-current={selected ? "page" : undefined}
                  title={sidebarCollapsed ? item : undefined}
                  onClick={() => selectSection(item)}
                  className={`group flex w-full items-center rounded-xl border py-3 text-left text-[13px] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a77d]/60 ${
                    sidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
                  } ${
                    selected
                      ? "border-[#c5a77d]/15 bg-[#c5a77d]/[.09] text-[#e4c89b] shadow-[inset_2px_0_0_0_#c5a77d]"
                      : "border-transparent text-[#999b92] hover:bg-white/[.035] hover:text-[#eee9de]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.6} />
                  <span className={sidebarCollapsed ? "sr-only" : "truncate"}>{item}</span>
                </button>
              );
            })()
          ))}
        </nav>

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
      <section className={`relative z-0 mx-auto max-w-[1500px] px-5 py-7 transition-[margin] duration-300 ease-out sm:px-8 md:px-10 md:py-10 xl:px-16 ${sidebarCollapsed ? "md:ml-[84px]" : "md:ml-[280px]"}`}>
        {active === "Editor" ? (
          <JournalEditor
            key={editorCategory}
            initialCategory={editorCategory}
            onBack={() => setActive("Overview")}
          />
        ) : active !== "Overview" ? (
          <ArchiveCollection
            key={active}
            title={active}
            description={sections.find((section) => section.name === active)?.desc ?? "Explore your personal history"}
            category={active === "Life Timeline" ? null : (categoryBySection[active] as "memory" | "mistake" | "lesson" | undefined) ?? null}
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
