import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-service-db"
import { hasPermission, canProcessTransaction, type PermissionKey, type Role } from "@/lib/rbac-enhanced"

interface RBACOptions {
  permissions?: PermissionKey[]
  roles?: Role[]
  requireAll?: boolean
  maxTransactionAmount?: number
  allowSelfAccess?: boolean // For user-specific endpoints
}

export async function withRBAC(
  request: NextRequest,
  options: RBACOptions = {},
): Promise<{ authorized: boolean; user?: any; reason?: string }> {
  try {
    const session = await getSession(request)

    if (!session || !session.user) {
      return { authorized: false, reason: "Not authenticated" }
    }

    const user = session.user
    const userRole = user.role as Role

    // Check role-based access
    if (options.roles && options.roles.length > 0) {
      if (!options.roles.includes(userRole)) {
        return {
          authorized: false,
          reason: `Role '${userRole}' not authorized. Required: ${options.roles.join(", ")}`,
        }
      }
    }

    // Check permission-based access
    if (options.permissions && options.permissions.length > 0) {
      const hasRequiredPermissions = options.requireAll
        ? options.permissions.every((permission) => hasPermission(userRole, permission))
        : options.permissions.some((permission) => hasPermission(userRole, permission))

      if (!hasRequiredPermissions) {
        return {
          authorized: false,
          reason: `Missing required permissions: ${options.permissions.join(", ")}`,
        }
      }
    }

    // Check transaction amount limits
    if (options.maxTransactionAmount !== undefined) {
      if (!canProcessTransaction(userRole, options.maxTransactionAmount)) {
        return {
          authorized: false,
          reason: `Transaction amount exceeds authorization limit for role '${userRole}'`,
        }
      }
    }

    // Check self-access for user-specific endpoints
    if (options.allowSelfAccess) {
      const url = new URL(request.url)
      const pathParts = url.pathname.split("/")
      const resourceUserId = pathParts[pathParts.indexOf("users") + 1]

      if (resourceUserId && resourceUserId !== user.id && userRole !== "admin") {
        return {
          authorized: false,
          reason: "Can only access your own resources",
        }
      }
    }

    return { authorized: true, user }
  } catch (error) {
    console.error("RBAC middleware error:", error)
    return { authorized: false, reason: "Authorization check failed" }
  }
}

// Convenience function for API route protection
export function createRBACHandler(options: RBACOptions) {
  return async function rbacHandler(
    request: NextRequest,
    handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const rbacResult = await withRBAC(request, options)

    if (!rbacResult.authorized) {
      return NextResponse.json({ error: "Forbidden", reason: rbacResult.reason }, { status: 403 })
    }

    return handler(request, rbacResult.user)
  }
}

// Decorator for API routes
export function requirePermissions(...permissions: PermissionKey[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const rbacResult = await withRBAC(request, { permissions })

      if (!rbacResult.authorized) {
        return NextResponse.json({ error: "Forbidden", reason: rbacResult.reason }, { status: 403 })
      }

      return originalMethod.call(this, request, rbacResult.user, ...args)
    }

    return descriptor
  }
}

// Decorator for role-based access
export function requireRoles(...roles: Role[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const rbacResult = await withRBAC(request, { roles })

      if (!rbacResult.authorized) {
        return NextResponse.json({ error: "Forbidden", reason: rbacResult.reason }, { status: 403 })
      }

      return originalMethod.call(this, request, rbacResult.user, ...args)
    }

    return descriptor
  }
}
