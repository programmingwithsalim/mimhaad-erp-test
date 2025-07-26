import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseSession } from "./lib/database-session-service";
import {
  normalizeRole,
  hasPermission,
  type Role,
  type Permission,
} from "./lib/rbac/unified-rbac";

// Define role-based route restrictions
const ROLE_ROUTE_RESTRICTIONS: Record<
  string,
  { roles: Role[]; permissions?: Permission[] }
> = {
  "/dashboard/admin": { roles: ["Admin"] },
  "/dashboard/user-management": { roles: ["Admin"] },
  "/dashboard/branch-management": { roles: ["Admin"] },
  "/dashboard/gl-accounting": { roles: ["Admin", "Finance"] },
  "/dashboard/audit-trail": { roles: ["Admin", "Manager", "Finance"] },
  "/dashboard/settings": {
    roles: ["Admin", "Manager", "Finance", "Operations", "Cashier"],
  },
  "/dashboard/float-management": { roles: ["Admin", "Manager", "Finance"] },
  "/dashboard/expenses": {
    roles: ["Admin", "Manager", "Finance", "Operations", "Cashier"],
  },
  "/dashboard/commissions": { roles: ["Admin", "Manager", "Finance"] },
  "/dashboard/reports": { roles: ["Admin", "Manager", "Finance"] },
  "/dashboard/analytics": { roles: ["Admin", "Manager", "Finance"] },
  "/dashboard/momo": {
    roles: ["Admin", "Manager", "Operations"],
  },
  "/dashboard/agency-banking": {
    roles: ["Admin", "Manager", "Operations"],
  },
  "/dashboard/e-zwich": {
    roles: ["Admin", "Manager", "Operations"],
  },
  "/dashboard/power": {
    roles: ["Admin", "Manager", "Operations"],
  },
  "/dashboard/jumia": {
    roles: ["Admin", "Manager", "Operations"],
  },
  "/dashboard/inventory": { roles: ["Admin", "Manager", "Finance"] },
  "/dashboard/transactions": {
    roles: ["Admin", "Manager", "Finance", "Operations", "Cashier"],
  },
};

// API route restrictions
const API_ROUTE_RESTRICTIONS: Record<
  string,
  { roles: Role[]; permissions?: Permission[] }
> = {
  "/api/users": { roles: ["Admin"] },
  "/api/branches": { roles: ["Admin", "Manager", "Finance"] },
  "/api/settings": { roles: ["Admin", "Manager", "Finance"] },
  "/api/gl": { roles: ["Admin", "Finance"] },
  "/api/audit-logs": { roles: ["Admin", "Manager", "Finance"] },
  "/api/float-accounts": {
    roles: ["Admin", "Manager", "Finance", "Operations", "Cashier"],
  },
  "/api/expenses": {
    roles: ["Admin", "Manager", "Finance", "Operations", "Cashier"],
  },
  "/api/expenses-statistics": {
    roles: ["Admin", "Manager", "Finance", "Operations", "Cashier"],
  },
  "/api/commissions": { roles: ["Admin", "Manager", "Finance"] },
  "/api/reports": { roles: ["Admin", "Manager", "Finance"] },
  "/api/analytics": { roles: ["Admin", "Manager", "Finance"] },
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/setup"];
  // Base public routes that are always available
  const basePublicApiRoutes = [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/check-setup",
    "/api/auth/session",
    "/api/seed",
    "/api/transactions/all",
  ];

  // Development-only routes (debug and db initialization)
  const developmentApiRoutes = [
    "/api/dev/debug/test-sql",
    "/api/dev/debug/check-ezwich-gl-mappings",
    "/api/dev/debug/fix-ezwich-mappings",
    "/api/dev/db/add-payment-source-to-fixed-assets",
    "/api/dev/db/add-payment-method-to-power-transactions",
    "/api/dev/db/fix-float-account-id-column",
    "/api/dev/db/add-system-config-table",
    "/api/dev/db/check-float-gl-mappings",
  ];

  // Combine routes based on environment
  const publicApiRoutes = [
    ...basePublicApiRoutes,
    ...(process.env.NODE_ENV === "development" ? developmentApiRoutes : []),
  ];

  // Log available routes for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("🔧 Development mode: Debug and DB routes available");
  } else {
    console.log("🚀 Production mode: Debug and DB routes excluded");
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/_next")
  ) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith("/api/")) {
    // Add CORS headers
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Skip auth check for public API routes
    if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
      return response;
    }

    // Check authentication for protected API routes
    try {
      const session = await getDatabaseSession(request);
      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Check role-based access for API routes
      const userRole = normalizeRole(session.user.role);
      if (userRole) {
        // Check if this API route has restrictions
        for (const [route, restriction] of Object.entries(
          API_ROUTE_RESTRICTIONS
        )) {
          if (pathname.startsWith(route)) {
            // Check role restriction
            if (!restriction.roles.includes(userRole)) {
              return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            // Check permission restriction if specified
            if (restriction.permissions) {
              const hasRequiredPermission = restriction.permissions.some(
                (permission) => hasPermission(userRole, permission)
              );
              if (!hasRequiredPermission) {
                return NextResponse.json(
                  { error: "Forbidden" },
                  { status: 403 }
                );
              }
            }
            break;
          }
        }
      }

      return response;
    } catch (error) {
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 500 }
      );
    }
  }

  // Handle page routes
  try {
    const session = await getDatabaseSession(request);

    // Debug: Check what cookies are present
    const sessionCookie = request.cookies.get("session_token");

    // If accessing public routes, allow access
    if (publicRoutes.includes(pathname)) {
      // If user is authenticated and trying to access login page, redirect to dashboard
      if (session && pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // For protected routes, if no session, redirect to login
    if (!session || !session.user) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Check role-based access for page routes
    const userRole = normalizeRole(session.user.role);
    if (userRole) {
      // Check if this page route has restrictions
      for (const [route, restriction] of Object.entries(
        ROLE_ROUTE_RESTRICTIONS
      )) {
        if (pathname.startsWith(route)) {
          // Check role restriction
          if (!restriction.roles.includes(userRole)) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
          }

          // Check permission restriction if specified
          if (restriction.permissions) {
            const hasRequiredPermission = restriction.permissions.some(
              (permission) => hasPermission(userRole, permission)
            );
            if (!hasRequiredPermission) {
              return NextResponse.redirect(
                new URL("/unauthorized", request.url)
              );
            }
          }
          break;
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    // On error, redirect to login for safety
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
