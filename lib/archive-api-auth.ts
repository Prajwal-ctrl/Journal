import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function requireArchiveUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return { supabase, user: data.user };
}
