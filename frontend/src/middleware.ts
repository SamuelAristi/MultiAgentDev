import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
function isSupabaseConfigured(): boolean {
  return (
    isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key_here"
  );
}

export async function middleware(request: NextRequest) {
  // Skip auth checks if Supabase is not configured
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured - skipping auth middleware");
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Use getUser() instead of getSession() for security
  // getUser() validates the JWT with Supabase, while getSession() only reads from cookies
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Handle auth errors (invalid/expired tokens)
  if (error) {
    console.warn("Auth error in middleware:", error.message);

    // Clear invalid cookies by redirecting to login
    if (!isPublicRoute && pathname !== "/") {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      redirectUrl.searchParams.set("error", "session_expired");

      // Clear auth cookies
      const response = NextResponse.redirect(redirectUrl);
      const cookies = request.cookies.getAll();
      cookies.forEach((cookie) => {
        if (cookie.name.startsWith("sb-")) {
          response.cookies.delete(cookie.name);
        }
      });

      return response;
    }
  }

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute && pathname !== "/") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and trying to access login/register
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/tienda/snatched", request.url));
  }

  // If user is authenticated and accessing root, redirect to dashboard
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/tienda/snatched", request.url));
  }

  // If user is not authenticated and accessing root, redirect to login
  if (!user && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
