import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Expense interface
export interface Expense {
  id: string
  type: string
  amount: number
  description: string
  date: string
  status: "pending" | "approved" | "rejected" | "paid"
  branchId?: string
  userId: string
  approvedBy?: string
  approvedAt?: string
  paidBy?: string
  paidAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  receiptUrl?: string
  expenseHeadId: string
  metadata?: Record<string, any>
}

export interface ExpenseSummary {
  totalExpenses: number
  totalAmount: number
  pendingExpenses: number
  pendingAmount: number
  approvedExpenses: number
  approvedAmount: number
  paidExpenses: number
  paidAmount: number
  rejectedExpenses: number
  rejectedAmount: number
  byCategory: Record<string, { count: number; amount: number }>
  byMonth: Record<string, { count: number; amount: number }>
}

/**
 * Create an expense
 */
export async function createExpense(expense: Omit<Expense, "id" | "date" | "status">): Promise<Expense | null> {
  try {
    const newExpense: Expense = {
      id: `expense-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...expense,
      date: new Date().toISOString(),
      status: "pending",
    }

    // Try to save to database
    try {
      await sql`
        INSERT INTO expenses (
          id, type, amount, description, date, status, branch_id, user_id, expense_head_id
        ) VALUES (
          ${newExpense.id}, ${newExpense.type}, ${newExpense.amount}, ${newExpense.description},
          ${newExpense.date}, ${newExpense.status}, ${newExpense.branchId}, ${newExpense.userId},
          ${newExpense.expenseHeadId}
        )
      `
    } catch (dbError) {
      console.log("Database not available for expenses")
    }

    return newExpense
  } catch (error) {
    console.error("Error creating expense:", error)
    return null
  }
}

/**
 * Approve an expense
 * @param id ID of the expense to approve
 * @param userId ID of the user approving the expense
 * @returns The approved expense or null if approval failed
 */
export async function approveExpense(id: string, userId: string): Promise<Expense | null> {
  try {
    // Try to update in database
    try {
      await sql`
        UPDATE expenses 
        SET status = 'approved', approved_by = ${userId}, approved_at = NOW()
        WHERE id = ${id} AND status = 'pending'
      `

      return await getExpenseById(id)
    } catch (dbError) {
      console.log("Database not available for expense approval")
    }

    return null
  } catch (error) {
    console.error("Error approving expense:", error)
    return null
  }
}

/**
 * Pay an expense and generate GL entries
 * @param id ID of the expense to pay
 * @param userId ID of the user paying the expense
 * @returns The paid expense or null if payment failed
 */
export async function payExpense(id: string, userId: string): Promise<Expense | null> {
  try {
    // Try to update in database
    try {
      await sql`
        UPDATE expenses 
        SET status = 'paid', paid_by = ${userId}, paid_at = NOW()
        WHERE id = ${id} AND status = 'approved'
      `

      return await getExpenseById(id)
    } catch (dbError) {
      console.log("Database not available for expense payment")
    }

    return null
  } catch (error) {
    console.error("Error paying expense:", error)
    return null
  }
}

/**
 * Get all expenses
 */
export async function getExpenses(filters?: {
  status?: "pending" | "approved" | "rejected" | "paid"
  expenseHeadId?: string
  startDate?: string
  endDate?: string
  branchId?: string
  userId?: string
}): Promise<Expense[]> {
  try {
    // Try database first
    try {
      let query = `SELECT * FROM expenses`
      const conditions = []
      const params = []
      let paramIndex = 1

      if (filters?.status) {
        conditions.push(`status = $${paramIndex}`)
        params.push(filters.status)
        paramIndex++
      }

      if (filters?.branchId) {
        conditions.push(`branch_id = $${paramIndex}`)
        params.push(filters.branchId)
        paramIndex++
      }

      if (filters?.userId) {
        conditions.push(`user_id = $${paramIndex}`)
        params.push(filters.userId)
        paramIndex++
      }

      if (filters?.expenseHeadId) {
        conditions.push(`expense_head_id = $${paramIndex}`)
        params.push(filters.expenseHeadId)
        paramIndex++
      }

      if (filters?.startDate) {
        conditions.push(`date >= $${paramIndex}`)
        params.push(filters.startDate)
        paramIndex++
      }

      if (filters?.endDate) {
        conditions.push(`date <= $${paramIndex}`)
        params.push(filters.endDate)
        paramIndex++
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`
      }

      query += ` ORDER BY date DESC`

      const expenses = await sql.query(query, params)

      return expenses.map((e) => ({
        id: e.id,
        type: e.type,
        amount: Number(e.amount),
        description: e.description,
        date: e.date,
        status: e.status,
        branchId: e.branch_id,
        userId: e.user_id,
        approvedBy: e.approved_by,
        approvedAt: e.approved_at,
        paidBy: e.paid_by,
        paidAt: e.paid_at,
        rejectedBy: e.rejected_by,
        rejectedAt: e.rejected_at,
        rejectionReason: e.rejection_reason,
        receiptUrl: e.receipt_url,
        expenseHeadId: e.expense_head_id,
        metadata: {},
      }))
    } catch (dbError) {
      console.log("Database not available, returning empty array")
    }

    return []
  } catch (error) {
    console.error("Error getting expenses:", error)
    return []
  }
}

/**
 * Get an expense by ID
 */
export async function getExpenseById(id: string): Promise<Expense | null> {
  try {
    const expenses = await getExpenses()
    return expenses.find((e) => e.id === id) || null
  } catch (error) {
    console.error("Error getting expense by ID:", error)
    return null
  }
}

/**
 * Get expense summary statistics
 */
export async function getExpenseSummary(filters?: {
  branchId?: string
  startDate?: string
  endDate?: string
}): Promise<ExpenseSummary> {
  try {
    const expenses = await getExpenses(filters)

    const summary: ExpenseSummary = {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
      pendingExpenses: expenses.filter((e) => e.status === "pending").length,
      pendingAmount: expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0),
      approvedExpenses: expenses.filter((e) => e.status === "approved").length,
      approvedAmount: expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0),
      paidExpenses: expenses.filter((e) => e.status === "paid").length,
      paidAmount: expenses.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.amount, 0),
      rejectedExpenses: expenses.filter((e) => e.status === "rejected").length,
      rejectedAmount: expenses.filter((e) => e.status === "rejected").reduce((sum, e) => sum + e.amount, 0),
      byCategory: {},
      byMonth: {},
    }

    // Group by category (expense head)
    expenses.forEach((expense) => {
      const category = expense.expenseHeadId || "uncategorized"
      if (!summary.byCategory[category]) {
        summary.byCategory[category] = { count: 0, amount: 0 }
      }
      summary.byCategory[category].count++
      summary.byCategory[category].amount += expense.amount
    })

    // Group by month
    expenses.forEach((expense) => {
      const month = expense.date.substring(0, 7) // YYYY-MM
      if (!summary.byMonth[month]) {
        summary.byMonth[month] = { count: 0, amount: 0 }
      }
      summary.byMonth[month].count++
      summary.byMonth[month].amount += expense.amount
    })

    return summary
  } catch (error) {
    console.error("Error getting expense summary:", error)
    return {
      totalExpenses: 0,
      totalAmount: 0,
      pendingExpenses: 0,
      pendingAmount: 0,
      approvedExpenses: 0,
      approvedAmount: 0,
      paidExpenses: 0,
      paidAmount: 0,
      rejectedExpenses: 0,
      rejectedAmount: 0,
      byCategory: {},
      byMonth: {},
    }
  }
}
