export const archiveEntryTypes = ["paragraph", "quick_note", "todo"] as const;
export type ArchiveEntryType = (typeof archiveEntryTypes)[number];

export function isArchiveEntryType(value: string): value is ArchiveEntryType {
  return (archiveEntryTypes as readonly string[]).includes(value);
}

