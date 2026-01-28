"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured, clearAuthState } from "./client";
import type { Profile } from "./types";

// Inactivity timeout in milliseconds (30 minutes)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearSession: () => void;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const configured = isSupabaseConfigured();
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);
  const profileRef = useRef<Profile | null>(null); // Keep track of current profile for comparisons
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update profileRef when profile changes
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Fetch user profile from database with timeout
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!configured) return null;

    const timeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((resolve) => {
      setTimeout(() => {
        console.warn("Profile fetch timed out. Check RLS policies in Supabase.");
        resolve({ data: null, error: { code: "TIMEOUT", message: "Profile fetch timed out" } });
      }, 8000); // Increased timeout to 8 seconds
    });

    try {
      const supabase = getSupabase();

      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .is("deleted_at", null)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        if (error.code === "TIMEOUT") {
          console.warn("Profile fetch timed out - preserving existing profile");
          return null; // Return null to signal "keep existing"
        }
        if (error.code === "PGRST116") {
          console.log("Profile not found for user:", userId);
          return null;
        }
        if (error.message?.includes("infinite recursion")) {
          console.error("RLS recursion error! Run migration: 20260127_fix_all_rls.sql");
        }
        console.error("Error fetching profile:", error.message);
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error("Exception fetching profile:", error);
      return null;
    }
  }, [configured]);

  // Clear session and cookies
  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
    setSession(null);
    profileRef.current = null;
    clearAuthState();

    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Sign out due to inactivity
  const signOutDueToInactivity = useCallback(async () => {
    console.log("Session expired due to inactivity");
    if (configured) {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    }
    clearSession();
    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login?reason=inactivity";
    }
  }, [configured, clearSession]);

  // Reset inactivity timer - call this on user activity
  const resetInactivityTimer = useCallback(() => {
    if (!session) return; // Only track inactivity when logged in

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer
    inactivityTimerRef.current = setTimeout(() => {
      signOutDueToInactivity();
    }, INACTIVITY_TIMEOUT);
  }, [session, signOutDueToInactivity]);

  // Set up inactivity tracking
  useEffect(() => {
    if (!session) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];

    // Throttle the reset to avoid too many calls
    let lastReset = Date.now();
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset > 60000) { // Only reset every minute
        lastReset = now;
        resetInactivityTimer();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, throttledReset, { passive: true });
    });

    // Start initial timer
    resetInactivityTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledReset);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [session, resetInactivityTimer]);

  // Refresh profile data (preserves existing if fetch fails)
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (mountedRef.current && profileData !== null) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    if (!configured) {
      console.log("Supabase not configured, auth disabled");
      setIsLoading(false);
      return;
    }

    if (initializingRef.current) return;
    initializingRef.current = true;

    const initializeAuth = async () => {
      const supabase = getSupabase();

      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError.message);
          clearAuthState();
          if (mountedRef.current) {
            setIsLoading(false);
          }
          return;
        }

        if (!mountedRef.current) return;

        if (currentSession) {
          const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

          if (userError || !validatedUser) {
            console.warn("User validation failed:", userError?.message);
            clearAuthState();
            if (mountedRef.current) {
              setIsLoading(false);
            }
            return;
          }

          if (!mountedRef.current) return;

          setSession(currentSession);
          setUser(validatedUser);

          const profileData = await fetchProfile(validatedUser.id);
          if (mountedRef.current) {
            if (profileData) {
              setProfile(profileData);
              console.log("Profile loaded:", profileData.role);
            } else {
              // No profile found - could be RLS issue or missing record
              console.warn("Could not load profile for user:", validatedUser.id);
              console.warn("Check RLS policies and ensure profile exists in database.");
              // Do NOT set a fallback profile - leave it null
              // The app should handle null profile appropriately
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && (
          error.name === "AbortError" ||
          error.message?.includes("aborted")
        )) {
          console.log("Auth initialization aborted (expected during cleanup)");
          return;
        }
        console.error("Auth initialization error:", error);
        if (mountedRef.current) {
          clearAuthState();
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          initializingRef.current = false;
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mountedRef.current) return;

        console.log("Auth state changed:", event);

        if (event === "SIGNED_OUT" || !newSession) {
          setSession(null);
          setUser(null);
          setProfile(null);
          profileRef.current = null;
          return;
        }

        if (event === "SIGNED_IN") {
          setSession(newSession);
          setUser(newSession.user);

          if (newSession.user) {
            const profileData = await fetchProfile(newSession.user.id);
            if (mountedRef.current) {
              if (profileData) {
                setProfile(profileData);
                console.log("SIGNED_IN: Profile loaded with role:", profileData.role);
              } else {
                // Profile fetch failed - could be RLS, timeout, or profile doesn't exist
                // Don't create a fake profile - leave as null and let app handle it
                console.warn("SIGNED_IN: Profile not found or fetch failed for user:", newSession.user.id);
                console.warn("This may indicate RLS policy issues or missing profile record.");
              }
            }
          }
        }

        if (event === "TOKEN_REFRESHED") {
          // Token was refreshed - update session but PRESERVE existing profile
          setSession(newSession);
          setUser(newSession.user);

          // Try to refresh profile, but NEVER overwrite with null or fallback
          if (newSession.user) {
            const profileData = await fetchProfile(newSession.user.id);
            if (mountedRef.current) {
              if (profileData !== null) {
                // Only update if we got real data
                setProfile(profileData);
                console.log("TOKEN_REFRESHED: Profile updated with role:", profileData.role);
              } else {
                // Keep existing profile - do NOT overwrite
                console.log("TOKEN_REFRESHED: Keeping existing profile (fetch failed or timed out)");
                // profileRef.current already has the current profile, no action needed
              }
            }
          }
        }
      }
    );

    return () => {
      mountedRef.current = false;
      initializingRef.current = false;
      subscription.unsubscribe();
    };
  }, [configured, fetchProfile]);

  // Reset mounted ref when component remounts
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    if (!configured) {
      return { error: new Error("Supabase not configured") };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error as Error };
      }

      if (data.user) {
        const profileData = await fetchProfile(data.user.id);

        if (profileData === null) {
          console.warn("Profile not found after login - check RLS policies");
          // Don't create fallback - let the app handle null profile
        }

        if (mountedRef.current) {
          setProfile(profileData);
          if (profileData) {
            console.log("SignIn: Profile loaded with role:", profileData.role);
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [configured, fetchProfile]);

  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!configured) {
      return { error: new Error("Supabase not configured") };
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail || `Registration failed (${response.status})`;
        return { error: new Error(message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [configured]);

  // Sign out
  const signOut = useCallback(async () => {
    if (configured) {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    }
    clearSession();
  }, [configured, clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: configured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        clearSession,
        resetInactivityTimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
