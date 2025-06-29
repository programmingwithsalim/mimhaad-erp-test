export interface TransactionReversal {
  id: string
  original_transaction_id: string
  reversal_type: "void" | "reverse"
  reason: string
  requested_by: string
  requested_at: string
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  status: "pending" | "approved" | "rejected" | "completed"
  approval_notes?: string
  metadata?: Record<string, any>
}

export interface ReversalRequest {
  transaction_id: string
  reversal_type: "void" | "reverse"
  reason: string
  requested_by: string
  approval_required: boolean
}

export interface ReversalApproval {
  reversal_id: string
  approved_by: string
  approval_notes?: string
  action: "approve" | "reject"
}

export interface UserPermissions {
  can_request_reversal: boolean
  can_approve_reversal: boolean
  can_void_transactions: boolean
  max_reversal_amount?: number
  requires_approval_above?: number
}

// User roles with different permissions
export const USER_ROLES = {
  AGENT: {
    can_request_reversal: true,
    can_approve_reversal: false,
    can_void_transactions: false,
    max_reversal_amount: 1000,
    requires_approval_above: 100,
  },
  SUPERVISOR: {
    can_request_reversal: true,
    can_approve_reversal: true,
    can_void_transactions: true,
    max_reversal_amount: 10000,
    requires_approval_above: 5000,
  },
  MANAGER: {
    can_request_reversal: true,
    can_approve_reversal: true,
    can_void_transactions: true,
    max_reversal_amount: 50000,
    requires_approval_above: 20000,
  },
  ADMIN: {
    can_request_reversal: true,
    can_approve_reversal: true,
    can_void_transactions: true,
    max_reversal_amount: undefined, // No limit
    requires_approval_above: undefined, // No approval required
  },
} as const

export type UserRole = keyof typeof USER_ROLES
