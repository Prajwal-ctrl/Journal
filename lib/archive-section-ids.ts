const sectionIdPattern = /^[a-zA-Z0-9_-]{1,80}$/;

export function parseArchiveSectionIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) return null;
  if (!value.every((id): id is string => typeof id === "string" && sectionIdPattern.test(id))) return null;
  return [...new Set(value)];
}

