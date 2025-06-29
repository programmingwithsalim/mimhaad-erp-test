"use client"

import type React from "react"
import { useRBAC } from "@/hooks/use-rbac"
import type { Permission } from "@/lib/rbac/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: React.ReactNode
  showAlert?: boolean
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
  showAlert = true,
}: PermissionGuardProps) {
  const { can, canAny, canAll } = useRBAC()

  // Check permissions
  let hasAccess = true

  if (permission) {
    hasAccess = can(permission)
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions)
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>
  }

  // If fallback is provided, render it
  if (fallback) {
    return <>{fallback}</>
  }

  // Otherwise, show an alert or nothing
  if (showAlert) {
    return (
      <Alert className="mb-4">
        <Shield className="h-4 w-4" />
        <AlertDescription>You don't have permission to access this feature.</AlertDescription>
      </Alert>
    )
  }

  // Return null if no fallback and no alert
  return null
}

// Convenience components
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAdmin } = useRBAC()
  return isAdmin() ? <>{children}</> : fallback ? <>{fallback}</> : null
}

export function ManagerOrAbove({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isManagerOrAbove } = useRBAC()
  return isManagerOrAbove() ? <>{children}</> : fallback ? <>{fallback}</> : null
}
