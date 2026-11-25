import { NextResponse } from "next/server";
import { requireArchiveUser } from "@/lib/archive-api-auth";
import { DEFAULT_ARCHIVE_SETTINGS, parseArchiveSettingsPatch, type ArchiveSettings } from "@/lib/archive-settings";

const settingsColumns = "preferences, custom_sections, custom_categories";

function publicSettings(row: Record<string, unknown> | null): ArchiveSettings {
  if (!row) return DEFAULT_ARCHIVE_SETTINGS;
  const parsed = parseArchiveSettingsPatch({
    preferences: row.preferences,
    custom_sections: row.custom_sections,
    custom_categories: row.custom_categories,
  });
  return parsed ? { ...DEFAULT_ARCHIVE_SETTINGS, ...parsed } : DEFAULT_ARCHIVE_SETTINGS;
}

export async function GET() {
  const session = await requireArchiveUser();
  if (!session) return NextResponse.json({ error: "Sign in to load your archive settings." }, { status: 401 });

  const { data, error } = await session.supabase
    .from("archive_user_settings")
    .select(settingsColumns)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Your archive settings could not be loaded." }, { status: 500 });
  return NextResponse.json({ settings: publicSettings(data), hasSettings: Boolean(data) });
}

export async function PATCH(request: Request) {
  const session = await requireArchiveUser();
  if (!session) return NextResponse.json({ error: "Sign in to save your archive settings." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send valid settings data." }, { status: 400 });
  }
  const patch = parseArchiveSettingsPatch(body);
  if (!patch) return NextResponse.json({ error: "The archive settings are not valid." }, { status: 400 });

  const { data: existing, error: readError } = await session.supabase
    .from("archive_user_settings")
    .select(settingsColumns)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Your archive settings could not be loaded before saving." }, { status: 500 });

  const settings = { ...publicSettings(existing), ...patch };
  const { data, error } = await session.supabase
    .from("archive_user_settings")
    .upsert({ user_id: session.user.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select(settingsColumns)
    .single();

  if (error) return NextResponse.json({ error: "Your archive settings could not be saved. Check the database migration and try again." }, { status: 500 });
  return NextResponse.json({ settings: publicSettings(data), hasSettings: true });
}

