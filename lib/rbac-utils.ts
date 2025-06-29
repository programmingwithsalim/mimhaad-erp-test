// Utility functions for role-based access control with proper case handling

export type UserRole = "Admin" | "Manager" | "Operations" | "Finance" | "Cashier"

// Normalize role to handle case sensitivity
export function normalizeRole(role: string | undefined | null): UserRole | null {
  if (!role) return null

  const normalized = role.toLowerCase()

  switch (normalized) {
    case "admin":
      return "Admin"
    case "manager":
      return "Manager"
    case "operations":
      return "Operations"
    case "finance":
      return "Finance"
    case "cashier":
      return "Cashier"
    default:
      return null
  }
}

// Check if user has a specific role
export function hasRole(userRole: string | undefined | null, targetRole: UserRole): boolean {
  const normalized = normalizeRole(userRole)
  return normalized === targetRole
}

// Check if user has any of the specified roles
export function hasAnyRole(userRole: string | undefined | null, targetRoles: UserRole[]): boolean {
  const normalized = normalizeRole(userRole)
  return normalized ? targetRoles.includes(normalized) : false
}

// Float management permissions
export function canManageFloat(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Manager", "Finance"])
}

export function canDeleteFloat(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Finance"])
}

export function canViewAllBranches(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Finance"])
}

// Transaction permissions
export function canProcessTransactions(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Manager", "Operations", "Finance", "Cashier"])
}

export function canApproveTransactions(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Manager", "Finance"])
}

// User management permissions
export function canManageUsers(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Manager"])
}

// Audit permissions
export function canViewAuditLogs(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Manager", "Finance"])
}

// GL permissions
export function canManageGL(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Finance"])
}

export function canViewGL(userRole: string | undefined | null): boolean {
  return hasAnyRole(userRole, ["Admin", "Manager", "Finance"])
}
