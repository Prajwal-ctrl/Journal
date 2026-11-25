import { isValidArchiveCategory } from "@/lib/archive-categories";

export type ArchivePreferences = {
  accent: "brass" | "sage" | "ocean" | "rose";
  textSize: "small" | "default" | "large";
  width: "focused" | "wide" | "full";
};

export type ArchiveCustomSection = {
  id: string;
  name: string;
  category: string;
  tags: string[];
};

export type ArchiveCustomCategory = { id: string; value: string; name: string };

export type ArchiveSettings = {
  preferences: ArchivePreferences;
  custom_sections: ArchiveCustomSection[];
  custom_categories: ArchiveCustomCategory[];
};

export const DEFAULT_ARCHIVE_SETTINGS: ArchiveSettings = {
  preferences: { accent: "brass", textSize: "default", width: "wide" },
  custom_sections: [],
  custom_categories: [],
};

const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;

function parsePreferences(value: unknown): ArchivePreferences | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!(["brass", "sage", "ocean", "rose"] as unknown[]).includes(input.accent)) return null;
  if (!(["small", "default", "large"] as unknown[]).includes(input.textSize)) return null;
  if (!(["focused", "wide", "full"] as unknown[]).includes(input.width)) return null;
  return { accent: input.accent as ArchivePreferences["accent"], textSize: input.textSize as ArchivePreferences["textSize"], width: input.width as ArchivePreferences["width"] };
}

function parseCustomSections(value: unknown): ArchiveCustomSection[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const ids = new Set<string>();
  const sections: ArchiveCustomSection[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const section = item as Record<string, unknown>;
    if (typeof section.id !== "string" || !idPattern.test(section.id) || ids.has(section.id)) return null;
    if (typeof section.name !== "string" || !section.name.trim() || section.name.trim().length > 60) return null;
    if (typeof section.category !== "string" || (section.category !== "all" && !isValidArchiveCategory(section.category))) return null;
    if (!Array.isArray(section.tags) || section.tags.length > 30 || !section.tags.every((tag) => typeof tag === "string" && tag.trim().length > 0 && tag.trim().length <= 80)) return null;
    ids.add(section.id);
    sections.push({ id: section.id, name: section.name.trim(), category: section.category, tags: [...new Set((section.tags as string[]).map((tag) => tag.trim()))] });
  }
  return sections;
}

function parseCustomCategories(value: unknown): ArchiveCustomCategory[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const ids = new Set<string>();
  const values = new Set<string>();
  const categories: ArchiveCustomCategory[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const category = item as Record<string, unknown>;
    if (typeof category.id !== "string" || !idPattern.test(category.id) || ids.has(category.id)) return null;
    if (typeof category.value !== "string" || !/^custom_[a-z0-9_]{1,40}$/.test(category.value) || values.has(category.value)) return null;
    if (typeof category.name !== "string" || !category.name.trim() || category.name.trim().length > 60) return null;
    ids.add(category.id);
    values.add(category.value);
    categories.push({ id: category.id, value: category.value, name: category.name.trim() });
  }
  return categories;
}

export function parseArchiveSettingsPatch(value: unknown): Partial<ArchiveSettings> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const patch: Partial<ArchiveSettings> = {};
  if ("preferences" in input) {
    const preferences = parsePreferences(input.preferences);
    if (!preferences) return null;
    patch.preferences = preferences;
  }
  if ("custom_sections" in input) {
    const customSections = parseCustomSections(input.custom_sections);
    if (!customSections) return null;
    patch.custom_sections = customSections;
  }
  if ("custom_categories" in input) {
    const customCategories = parseCustomCategories(input.custom_categories);
    if (!customCategories) return null;
    patch.custom_categories = customCategories;
  }
  if (Object.keys(patch).length === 0 || Object.keys(input).some((key) => !["preferences", "custom_sections", "custom_categories"].includes(key))) return null;
  return patch;
}

