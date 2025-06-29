"use client"

import { useAuth } from "@/lib/auth-context"
import { hasPermission } from "@/lib/rbac/permissions"

export function useBranchAwareRBAC() {
  const { user } = useAuth()

  return {
    // Get the current user's branch ID
    getCurrentBranchId: (): string | null => {
      return user?.branchId || null
    },

    // Get the current user's branch name
    getCurrentBranchName: (): string | null => {
      return user?.branchName || null
    },

    // Check if user can access data from a specific branch
    canAccessBranch: (branchId: string): boolean => {
      if (!user) return false

      // Admins can access all branches
      if (user.role === "admin") return true

      // Managers can access all branches (if needed for your business)
      if (user.role === "manager") return true

      // Other users can only access their own branch
      return user.branchId === branchId
    },

    // Check if user can view cross-branch data
    canViewAllBranches: (): boolean => {
      if (!user) return false
      return hasPermission(user.role, "view_all_branches")
    },

    // Get branch filter for API calls
    getBranchFilter: (): { branchId?: string } => {
      if (!user) return {}

      // If user can view all branches, don't filter
      if (hasPermission(user.role, "view_all_branches")) {
        return {}
      }

      // Otherwise, filter by user's branch
      return { branchId: user.branchId }
    },
  }
}
