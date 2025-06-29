// Expense Head
export interface ExpenseHead {
  id: string
  name: string
  category: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Expense
export interface Expense {
  id: string
  branch_id: string
  expense_head_id: string
  amount: number
  description: string
  reference_number: string
  payment_source: string // cash, bank_transfer, mobile_money, etc.
  payment_account_id: string | null // ID of the float account if applicable
  attachment_url: string | null
  status: string // pending, approved, rejected
  created_by: string // User ID
  approved_by: string | null // User ID
  expense_date: string
  created_at: string
  updated_at: string
}

// Expense Filters
export interface ExpenseFilters {
  branch_id?: string
  expense_head_id?: string
  category?: string
  status?: string
  payment_source?: string
  start_date?: string
  end_date?: string
  min_amount?: number
  max_amount?: number
  created_by?: string
}

// Expense Summary
export interface ExpenseSummary {
  total_expenses: number
  total_amount: number
  by_status: Record<string, number>
  by_branch: Record<string, number>
  by_payment_source: Record<string, number>
  recent_expenses: Expense[]
}
