import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSession } from "./lib/auth-service"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/setup"]
  const publicApiRoutes = ["/api/auth/login", "/api/auth/logout", "/api/auth/check-setup", "/api/seed"]

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/_next")
  ) {
    return NextResponse.next()
  }

  console.log("Middleware processing:", pathname)

  // Handle API routes
  if (pathname.startsWith("/api/")) {
    // Add CORS headers
    const response = NextResponse.next()
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")

    // Skip auth check for public API routes
    if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
      console.log("Public API route, skipping auth")
      return response
    }

    // Check authentication for protected API routes
    try {
      const session = await getSession(request)
      if (!session) {
        console.log("No session for protected API route")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      console.log("Authenticated API request")
      return response
    } catch (error) {
      console.error("Session check error in middleware:", error)
      return NextResponse.json({ error: "Authentication error" }, { status: 500 })
    }
  }

  // Handle page routes
  try {
    const session = await getSession(request)
    console.log("Session check result:", !!session)

    // If accessing public routes, allow access
    if (publicRoutes.includes(pathname)) {
      // If user is authenticated and trying to access login page, redirect to dashboard
      if (session && pathname === "/") {
        console.log("Authenticated user accessing login, redirecting to dashboard")
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
      console.log("Public route access allowed")
      return NextResponse.next()
    }

    // For protected routes, if no session, redirect to login
    if (!session) {
      console.log("No session for protected route, redirecting to login")
      return NextResponse.redirect(new URL("/", request.url))
    }

    console.log("Authenticated access to protected route")
    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    // On error, redirect to login for safety
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
