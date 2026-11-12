import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) return null;
  return { url, key };
}

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const config = supabaseConfig();
  if (!config) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    cached = null;
  }
  return cached;
}
