import { NextResponse } from "next/server";
import { requireArchiveUser } from "@/lib/archive-api-auth";
import { isValidArchiveCategory } from "@/lib/archive-categories";
import { isArchiveEntryType } from "@/lib/archive-entry-types";

function databaseErrorMessage(code?: string) {
  if (code === "PGRST205" || code === "42P01") {
    return "The archive_entries table is missing. Apply supabase/setup.sql in the Supabase SQL Editor.";
  }

  if (code === "42501") {
    return "Supabase denied access to archive_entries. Check its grants and owner-only RLS policies.";
  }

  if (code === "PGRST204" || code === "42703") {
    return "The archive_entries table is missing required columns. Apply supabase/setup.sql in the Supabase SQL Editor.";
  }

  return "Your entry could not be saved. Check the archive database settings.";
}

function publicEntry(row: Record<string, unknown>) {
  const tags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === "string")
    : typeof row.tags === "string"
      ? row.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

  return {
    id: typeof row.id === "string" ? row.id : "",
    title: typeof row.title === "string" ? row.title : "",
    content: typeof row.content === "string" ? row.content : "",
    category: typeof row.category === "string" ? row.category : "journal",
    entry_type: typeof row.entry_type === "string" && isArchiveEntryType(row.entry_type) ? row.entry_type : "paragraph",
    is_completed: row.is_completed === true,
    mood: typeof row.mood === "string" ? row.mood : null,
    tags,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

export async function GET() {
  const session = await requireArchiveUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let { data, error } = await session.supabase
    .from("archive_entries")
    .select("*")
    .eq("owner_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error && ["PGRST204", "42703"].includes(error.code)) {
    const fallback = await session.supabase
      .from("archive_entries")
      .select("*")
      .eq("owner_id", session.user.id)
      .limit(100);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Archive entries could not be loaded:", error.code, error.message);
    return NextResponse.json(
      { error: databaseErrorMessage(error.code) },
      { status: 500 },
    );
  }

  const entries = (data ?? [])
    .map((row) => publicEntry(row as Record<string, unknown>))
    .sort((first, second) =>
      (second.created_at ?? "").localeCompare(first.created_at ?? ""),
    );

  const response = NextResponse.json({ entries });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: Request) {
  const session = await requireArchiveUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid entry." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const category = typeof input.category === "string" ? input.category : "";
  const entryType = typeof input.entry_type === "string" ? input.entry_type : "paragraph";
  const isCompleted = input.is_completed === true;
  const mood = typeof input.mood === "string" ? input.mood.trim() : "";
  const tags = Array.isArray(input.tags)
    ? input.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  if (!title || title.length > 120) {
    return NextResponse.json(
      { error: "Title must be between 1 and 120 characters." },
      { status: 400 },
    );
  }

  if (!content || content.length > 20000) {
    return NextResponse.json(
      { error: "Entry text must be between 1 and 20,000 characters." },
      { status: 400 },
    );
  }

  if (!isValidArchiveCategory(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }
  if (!isArchiveEntryType(entryType)) {
    return NextResponse.json({ error: "Choose a valid entry format." }, { status: 400 });
  }
  if (entryType !== "paragraph" && content.length > 240) {
    return NextResponse.json({ error: "Quick notes and to-dos must be 240 characters or fewer." }, { status: 400 });
  }

  const entry = { title, content, category, entry_type: entryType, is_completed: isCompleted, mood: mood || null, tags };
  let { data, error } = await session.supabase
    .from("archive_entries")
    .insert({ ...entry, owner_id: session.user.id })
    .select("*")
    .single();
  let metadataSaved = true;

  if (
    error &&
    ["PGRST204", "42703", "22P02", "42804"].includes(error.code)
  ) {
    const fallback = await session.supabase
      .from("archive_entries")
      .insert({ title, content, category, entry_type: entryType, is_completed: isCompleted, owner_id: session.user.id })
      .select("*")
      .single();

    data = fallback.data;
    error = fallback.error;
    metadataSaved = false;
  }

  if (error || !data) {
    console.error("Archive entry could not be saved:", error?.code, error?.message);
    return NextResponse.json(
      { error: databaseErrorMessage(error?.code) },
      { status: 500 },
    );
  }

  const response = NextResponse.json(
    { entry: publicEntry(data as Record<string, unknown>), metadataSaved },
    { status: 201 },
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

