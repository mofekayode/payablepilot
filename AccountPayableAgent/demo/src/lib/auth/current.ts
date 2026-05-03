// Server-side helpers to resolve the current user, their firm, and the
// "active" business for the session. The active business is tracked via a
// pp_active_business cookie (and persisted to user_prefs.last_business_id
// so it survives across devices).

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/supabase/types";

const ACTIVE_BUSINESS_COOKIE = "pp_active_business";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("not_authenticated");
  return user;
}

// Returns the businesses the current user can access (via firm membership
// OR direct business membership). Empty array if unauth.
export async function listAccessibleBusinesses(): Promise<Business[]> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return [];

  // RLS does the filtering for us — we just select all businesses we can see.
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[auth] listAccessibleBusinesses:", error);
    return [];
  }
  return (data ?? []) as Business[];
}

// Resolves the active business. Order: cookie → user_prefs.last_business_id
// → first accessible business. Returns null if the user has none yet
// (e.g., during onboarding, before they've created one).
export async function getActiveBusiness(): Promise<Business | null> {
  const businesses = await listAccessibleBusinesses();
  if (businesses.length === 0) return null;

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value;
  if (cookieId) {
    const hit = businesses.find((b) => b.id === cookieId);
    if (hit) return hit;
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (user) {
    const { data: prefs } = await supabase
      .from("user_prefs")
      .select("last_business_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const lastId = prefs?.last_business_id as string | null | undefined;
    if (lastId) {
      const hit = businesses.find((b) => b.id === lastId);
      if (hit) return hit;
    }
  }

  return businesses[0];
}

export async function getActiveBusinessId(): Promise<string | null> {
  const b = await getActiveBusiness();
  return b?.id ?? null;
}

export async function requireActiveBusinessId(): Promise<string> {
  const id = await getActiveBusinessId();
  if (!id) throw new Error("no_active_business");
  return id;
}
