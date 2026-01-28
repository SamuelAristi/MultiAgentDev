// Client-side exports only
export { createClient, getSupabase, isSupabaseConfigured } from "./client";
export { AuthProvider, useAuth } from "./auth-context";
export type * from "./types";

// Server-side exports should be imported directly:
// import { createServerSupabaseClient } from "@/lib/supabase/server";
