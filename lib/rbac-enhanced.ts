import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Enhanced role definitions with proper capitalization
export type Role = "Admin" | "Manager" | "Finance" | "Operations" | "Cashier" | "Supervisor"

export interface Permission {
  id: string
  name: string
  description: string
  category: string
}

export interface RolePermission {
  roleId: string
  permissionId: string
  granted: boolean
  conditions?: Record<string, any>
}

// Comprehensive permission definitions
export const PERMISSIONS = {
  // Transaction Processing
  PROCESS_MOMO: "process:momo",
  PROCESS_AGENCY_BANKING: "process:agency_banking",
  PROCESS_EZWICH: "process:ezwich",
  PROCESS_POWER: "process:power",
  PROCESS_JUMIA: "process:jumia",

  // Transaction Management
  VIEW_TRANSACTIONS: "view:transactions",
  APPROVE_TRANSACTIONS: "approve:transactions",
  REVERSE_TRANSACTIONS: "reverse:transactions",
  INITIATE_TRANSFERS: "initiate:transfers",
  APPROVE_TRANSFERS: "approve:transfers",

  // Financial Management
  VIEW_REPORTS: "view:reports",
  GENERATE_REPORTS: "generate:reports",
  VIEW_GL_ACCOUNTS: "view:gl_accounts",
  MANAGE_GL_ACCOUNTS: "manage:gl_accounts",
  RECONCILE_ACCOUNTS: "reconcile:accounts",

  // User Management
  VIEW_USERS: "view:users",
  CREATE_USERS: "create:users",
  EDIT_USERS: "edit:users",
  DELETE_USERS: "delete:users",
  RESET_PASSWORDS: "reset:passwords",

  // Branch Management
  VIEW_BRANCHES: "view:branches",
  MANAGE_BRANCHES: "manage:branches",
  VIEW_BRANCH_PERFORMANCE: "view:branch_performance",

  // Float Management
  VIEW_FLOAT: "view:float",
  MANAGE_FLOAT: "manage:float",
  APPROVE_FLOAT_REQUESTS: "approve:float_requests",
  ALLOCATE_FLOAT: "allocate:float",

  // Audit and Security
  VIEW_AUDIT_LOGS: "view:audit_logs",
  MANAGE_AUDIT_LOGS: "manage:audit_logs",
  VIEW_SYSTEM_SETTINGS: "view:system_settings",
  MANAGE_SYSTEM_SETTINGS: "manage:system_settings",

  // Commission and Expenses
  VIEW_COMMISSIONS: "view:commissions",
  MANAGE_COMMISSIONS: "manage:commissions",
  APPROVE_EXPENSES: "approve:expenses",
  VIEW_EXPENSES: "view:expenses",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// Role hierarchy and default permissions with proper capitalization
export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  Admin: Object.values(PERMISSIONS), // Full access

  Manager: [
    PERMISSIONS.PROCESS_MOMO,
    PERMISSIONS.PROCESS_AGENCY_BANKING,
    PERMISSIONS.PROCESS_EZWICH,
    PERMISSIONS.PROCESS_POWER,
    PERMISSIONS.PROCESS_JUMIA,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.APPROVE_TRANSACTIONS,
    PERMISSIONS.INITIATE_TRANSFERS,
    PERMISSIONS.APPROVE_TRANSFERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.VIEW_BRANCH_PERFORMANCE,
    PERMISSIONS.VIEW_FLOAT,
    PERMISSIONS.MANAGE_FLOAT,
    PERMISSIONS.APPROVE_FLOAT_REQUESTS,
    PERMISSIONS.ALLOCATE_FLOAT,
    PERMISSIONS.VIEW_COMMISSIONS,
    PERMISSIONS.MANAGE_COMMISSIONS,
    PERMISSIONS.APPROVE_EXPENSES,
    PERMISSIONS.VIEW_EXPENSES,
  ],

  Finance: [
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_GL_ACCOUNTS,
    PERMISSIONS.MANAGE_GL_ACCOUNTS,
    PERMISSIONS.RECONCILE_ACCOUNTS,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.VIEW_BRANCH_PERFORMANCE,
    PERMISSIONS.VIEW_FLOAT,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_COMMISSIONS,
    PERMISSIONS.MANAGE_COMMISSIONS,
    PERMISSIONS.VIEW_EXPENSES,
    PERMISSIONS.APPROVE_EXPENSES,
  ],

  Operations: [
    PERMISSIONS.PROCESS_MOMO,
    PERMISSIONS.PROCESS_AGENCY_BANKING,
    PERMISSIONS.PROCESS_EZWICH,
    PERMISSIONS.PROCESS_POWER,
    PERMISSIONS.PROCESS_JUMIA,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.INITIATE_TRANSFERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.VIEW_FLOAT,
    PERMISSIONS.VIEW_COMMISSIONS,
    PERMISSIONS.VIEW_EXPENSES,
  ],

  Supervisor: [
    PERMISSIONS.PROCESS_MOMO,
    PERMISSIONS.PROCESS_AGENCY_BANKING,
    PERMISSIONS.PROCESS_EZWICH,
    PERMISSIONS.PROCESS_POWER,
    PERMISSIONS.PROCESS_JUMIA,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.APPROVE_TRANSACTIONS,
    PERMISSIONS.INITIATE_TRANSFERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_BRANCHES,
    PERMISSIONS.VIEW_FLOAT,
    PERMISSIONS.VIEW_COMMISSIONS,
    PERMISSIONS.VIEW_EXPENSES,
  ],

  Cashier: [
    PERMISSIONS.PROCESS_MOMO,
    PERMISSIONS.PROCESS_AGENCY_BANKING,
    PERMISSIONS.PROCESS_EZWICH,
    PERMISSIONS.PROCESS_POWER,
    PERMISSIONS.PROCESS_JUMIA,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.VIEW_FLOAT,
  ],
}

// Transaction limits by role
export const TRANSACTION_LIMITS: Record<Role, { maxAmount: number; dailyLimit: number }> = {
  Admin: { maxAmount: Number.POSITIVE_INFINITY, dailyLimit: Number.POSITIVE_INFINITY },
  Manager: { maxAmount: 100000, dailyLimit: 500000 },
  Finance: { maxAmount: 50000, dailyLimit: 200000 },
  Operations: { maxAmount: 25000, dailyLimit: 100000 },
  Supervisor: { maxAmount: 15000, dailyLimit: 75000 },
  Cashier: { maxAmount: 5000, dailyLimit: 25000 },
}

// Permission checking functions
export function hasPermission(userRole: Role, permission: PermissionKey): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

export function canProcessTransaction(userRole: Role, amount: number): boolean {
  const limits = TRANSACTION_LIMITS[userRole]
  return amount <= limits.maxAmount
}

export function getMaxTransactionAmount(userRole: Role): number {
  return TRANSACTION_LIMITS[userRole].maxAmount
}

export function getDailyTransactionLimit(userRole: Role): number {
  return TRANSACTION_LIMITS[userRole].dailyLimit
}

// Database functions for dynamic permissions
export async function getUserPermissions(userId: string): Promise<PermissionKey[]> {
  try {
    const user = await sql`
      SELECT role FROM users WHERE id = ${userId} AND status = 'active'
    `

    if (user.length === 0) return []

    const userRole = user[0].role as Role
    return ROLE_PERMISSIONS[userRole] || []
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return []
  }
}

export async function checkUserPermission(userId: string, permission: PermissionKey): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions.includes(permission)
}

// Client-side permission checking
export function createClientPermissionCheck(permissions: PermissionKey[], userRole: Role) {
  return {
    hasPermission: (permission: PermissionKey) => permissions.includes(permission),
    canProcessTransaction: (amount: number) => canProcessTransaction(userRole, amount),
    getMaxAmount: () => getMaxTransactionAmount(userRole),
    getDailyLimit: () => getDailyTransactionLimit(userRole),
  }
}

// Permission categories for UI organization
export const PERMISSION_CATEGORIES = {
  TRANSACTIONS: "Transactions",
  FINANCIAL: "Financial Management",
  USER_MANAGEMENT: "User Management",
  BRANCH_MANAGEMENT: "Branch Management",
  FLOAT_MANAGEMENT: "Float Management",
  AUDIT_SECURITY: "Audit & Security",
  COMMISSION_EXPENSES: "Commission & Expenses",
} as const

export function getPermissionsByCategory() {
  return {
    [PERMISSION_CATEGORIES.TRANSACTIONS]: [
      PERMISSIONS.PROCESS_MOMO,
      PERMISSIONS.PROCESS_AGENCY_BANKING,
      PERMISSIONS.PROCESS_EZWICH,
      PERMISSIONS.PROCESS_POWER,
      PERMISSIONS.PROCESS_JUMIA,
      PERMISSIONS.VIEW_TRANSACTIONS,
      PERMISSIONS.APPROVE_TRANSACTIONS,
      PERMISSIONS.REVERSE_TRANSACTIONS,
      PERMISSIONS.INITIATE_TRANSFERS,
      PERMISSIONS.APPROVE_TRANSFERS,
    ],
    [PERMISSION_CATEGORIES.FINANCIAL]: [
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.GENERATE_REPORTS,
      PERMISSIONS.VIEW_GL_ACCOUNTS,
      PERMISSIONS.MANAGE_GL_ACCOUNTS,
      PERMISSIONS.RECONCILE_ACCOUNTS,
    ],
    [PERMISSION_CATEGORIES.USER_MANAGEMENT]: [
      PERMISSIONS.VIEW_USERS,
      PERMISSIONS.CREATE_USERS,
      PERMISSIONS.EDIT_USERS,
      PERMISSIONS.DELETE_USERS,
      PERMISSIONS.RESET_PASSWORDS,
    ],
    [PERMISSION_CATEGORIES.BRANCH_MANAGEMENT]: [
      PERMISSIONS.VIEW_BRANCHES,
      PERMISSIONS.MANAGE_BRANCHES,
      PERMISSIONS.VIEW_BRANCH_PERFORMANCE,
    ],
    [PERMISSION_CATEGORIES.FLOAT_MANAGEMENT]: [
      PERMISSIONS.VIEW_FLOAT,
      PERMISSIONS.MANAGE_FLOAT,
      PERMISSIONS.APPROVE_FLOAT_REQUESTS,
      PERMISSIONS.ALLOCATE_FLOAT,
    ],
    [PERMISSION_CATEGORIES.AUDIT_SECURITY]: [
      PERMISSIONS.VIEW_AUDIT_LOGS,
      PERMISSIONS.MANAGE_AUDIT_LOGS,
      PERMISSIONS.VIEW_SYSTEM_SETTINGS,
      PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
    ],
    [PERMISSION_CATEGORIES.COMMISSION_EXPENSES]: [
      PERMISSIONS.VIEW_COMMISSIONS,
      PERMISSIONS.MANAGE_COMMISSIONS,
      PERMISSIONS.APPROVE_EXPENSES,
      PERMISSIONS.VIEW_EXPENSES,
    ],
  }
}
