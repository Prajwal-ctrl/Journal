import { NextResponse } from "next/server";
import { requireArchiveUser } from "@/lib/archive-api-auth";
import { isValidArchiveCategory } from "@/lib/archive-categories";
import { isArchiveEntryType } from "@/lib/archive-entry-types";
import { parseArchiveSectionIds } from "@/lib/archive-section-ids";

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(message: string, status: number) {
  const response = NextResponse.json({ error: message }, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

async function getId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return idPattern.test(id) ? id : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireArchiveUser();
  if (!session) return errorResponse("Authentication required.", 401);

  const id = await getId(context);
  if (!id) return errorResponse("Invalid entry ID.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }
  if (typeof body !== "object" || body === null) return errorResponse("Invalid entry.", 400);

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const category = typeof input.category === "string" ? input.category : "";
  const entryType = typeof input.entry_type === "string" ? input.entry_type : "paragraph";
  const isCompleted = input.is_completed === true;
  const customSections = parseArchiveSectionIds(input.custom_sections);
  const mood = typeof input.mood === "string" ? input.mood.trim() : "";
  const tags = Array.isArray(input.tags)
    ? [...new Set(input.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))].slice(0, 20)
    : [];

  if (!title || title.length > 120) return errorResponse("Title must be between 1 and 120 characters.", 400);
  if (!content || content.length > 20000) return errorResponse("Entry text must be between 1 and 20,000 characters.", 400);
  if (!isValidArchiveCategory(category)) return errorResponse("Choose a valid category.", 400);
  if (!isArchiveEntryType(entryType)) return errorResponse("Choose a valid entry format.", 400);
  if (!customSections) return errorResponse("Invalid custom section assignment.", 400);
  if (entryType !== "paragraph" && content.length > 240) return errorResponse("Quick notes and to-dos must be 240 characters or fewer.", 400);
  if (mood.length > 80) return errorResponse("Mood must be 80 characters or fewer.", 400);

  const values = { title, content, category, entry_type: entryType, is_completed: isCompleted, custom_sections: customSections, mood: mood || null, tags };
  let { data, error } = await session.supabase
    .from("archive_entries")
    .update(values)
    .eq("id", id)
    .eq("owner_id", session.user.id)
    .select("*")
    .maybeSingle();
  let metadataSaved = true;

  if (error && ["PGRST204", "42703", "22P02", "42804"].includes(error.code)) {
    const fallback = await session.supabase
      .from("archive_entries")
      .update({ title, content, category, entry_type: entryType, is_completed: isCompleted, custom_sections: customSections })
      .eq("id", id)
      .eq("owner_id", session.user.id)
      .select("*")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
    metadataSaved = false;
  }

  if (error) {
    console.error("Archive entry could not be updated:", error.code, error.message);
    return errorResponse(error.code === "42501" ? "Supabase denied access. Apply the owner-only update grant and policy from supabase/setup.sql." : "Your entry could not be updated. Check the archive database settings.", 500);
  }
  if (!data) return errorResponse("Entry not found.", 404);

  const row = data as Record<string, unknown>;
  const tagsFromRow = Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const response = NextResponse.json({
    entry: {
      id: typeof row.id === "string" ? row.id : id,
      title: typeof row.title === "string" ? row.title : title,
      content: typeof row.content === "string" ? row.content : content,
      category: typeof row.category === "string" ? row.category : category,
      entry_type: typeof row.entry_type === "string" && isArchiveEntryType(row.entry_type) ? row.entry_type : entryType,
      is_completed: row.is_completed === true,
      custom_sections: Array.isArray(row.custom_sections) ? row.custom_sections.filter((id): id is string => typeof id === "string") : customSections,
      mood: typeof row.mood === "string" ? row.mood : null,
      tags: tagsFromRow,
      created_at: typeof row.created_at === "string" ? row.created_at : null,
    },
    metadataSaved,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireArchiveUser();
  if (!session) return errorResponse("Authentication required.", 401);

  const id = await getId(context);
  if (!id) return errorResponse("Invalid entry ID.", 400);

  const { data, error } = await session.supabase
    .from("archive_entries")
    .delete()
    .eq("id", id)
    .eq("owner_id", session.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Archive entry could not be deleted:", error.code, error.message);
    return errorResponse(error.code === "42501" ? "Supabase denied access. Apply the owner-only delete grant and policy from supabase/setup.sql." : "Your entry could not be deleted. Check the archive database settings.", 500);
  }
  if (!data) return errorResponse("Entry not found.", 404);

  const response = NextResponse.json({ deleted: true, id });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

