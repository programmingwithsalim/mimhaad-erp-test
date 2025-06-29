"use client"

import { useCurrentUser } from "@/hooks/use-current-user"

export function useFloatPermissions() {
  const { user } = useCurrentUser()

  // Based on the requirements:
  // - Admins and Finance roles: Can add, edit, delete float accounts and view all branches
  // - Managers: Can only view their own branch accounts, cannot add/edit/delete

  const canViewAllBranches = user?.role === "admin" || user?.role === "finance"
  const canManageFloat = user?.role === "admin" || user?.role === "finance"
  const canDeleteFloat = user?.role === "admin" || user?.role === "finance"
  const canAllocateFloat = user?.role === "admin" || user?.role === "finance"

  const shouldFilterByBranch = user?.role === "manager" && Boolean(user?.branchId)
  const userBranchId = user?.branchId || null

  return {
    canViewAllBranches,
    canManageFloat,
    canDeleteFloat,
    canAllocateFloat,
    shouldFilterByBranch,
    userBranchId,
    userRole: user?.role,
  }
}
