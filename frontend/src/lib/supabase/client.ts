import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Validate Supabase URL
function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return (
    isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key_here"
  );
}

// Create browser client - call this in client components
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseUrl(supabaseUrl)) {
    throw new Error(
      "Invalid NEXT_PUBLIC_SUPABASE_URL. Please set a valid Supabase URL in your .env.local file."
    );
  }

  if (!supabaseAnonKey || supabaseAnonKey === "your_supabase_anon_key_here") {
    throw new Error(
      "Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY. Please set a valid Supabase anon key in your .env.local file."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for client-side usage
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (typeof window === "undefined") {
    // Server-side: always create new instance
    return createClient();
  }

  // Client-side: use singleton
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

// Clear local auth state (for invalid tokens)
export function clearAuthState() {
  if (typeof window !== "undefined") {
    // Clear Supabase auth cookies
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name] = cookie.split("=");
      const trimmedName = name.trim();
      if (trimmedName.startsWith("sb-")) {
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    }
    // Reset singleton
    supabaseInstance = null;
  }
}
