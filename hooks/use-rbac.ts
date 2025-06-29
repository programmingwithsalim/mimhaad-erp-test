"use client"

import { useAuth } from "@/lib/auth-context"
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/rbac/permissions"
import type { Permission } from "@/lib/rbac/types"

export function useRBAC() {
  const { user } = useAuth()

  // If no user or no role, return no permissions
  if (!user || !user.role) {
    return {
      can: () => false,
      canAny: () => false,
      canAll: () => false,
      isAdmin: false,
      isManager: false,
      role: null,
      user: null,
    }
  }

  // Map the user's role to our RBAC system
  // This handles any differences between your auth system's role names and our RBAC system
  const role = user.role.toLowerCase()

  return {
    can: (permission: Permission) => hasPermission(role, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    isAdmin: role === "admin",
    isManager: role === "manager" || role === "admin",
    role,
    user,
  }
}
