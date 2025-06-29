import { neon } from "@neondatabase/serverless"
import { NotificationMiddleware } from "./services/notification-middleware"

const sql = neon(process.env.DATABASE_URL!)

// Enhanced MoMo Transaction interface
export interface MoMoTransaction {
  id: string
  type: "cash-in" | "cash-out" | "transfer" | "payment" | "commission"
  amount: number
  fee: number
  phoneNumber: string
  reference: string
  status: "pending" | "completed" | "failed"
  date: string
  branchId?: string
  userId: string
  provider: string
  metadata?: Record<string, any>
  customerName?: string
  floatAccountId?: string
  floatAccountName?: string
  branchName?: string
  processedBy?: string
  cashTillAffected?: number
  floatAffected?: number
}

/**
 * Create a MoMo transaction with automatic notifications and proper UUID handling
 */
export async function createMoMoTransactionWithNotifications(
  transaction: Partial<MoMoTransaction>,
): Promise<MoMoTransaction | null> {
  try {
    // Validate that we have a proper user ID (not "system" or other strings)
    if (!transaction.userId || transaction.userId === "system" || transaction.userId === "System") {
      console.error("Invalid user ID provided for MoMo transaction:", transaction.userId)
      return null
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(transaction.userId)) {
      console.error("User ID is not a valid UUID:", transaction.userId)
      return null
    }

    const newTransaction: MoMoTransaction = {
      id: `momo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: transaction.type || "cash-in",
      amount: transaction.amount || 0,
      fee: transaction.fee || 0,
      phoneNumber: transaction.phoneNumber || "",
      reference: transaction.reference || "",
      status: "completed",
      date: transaction.date || new Date().toISOString(),
      branchId: transaction.branchId || "",
      userId: transaction.userId, // This is now guaranteed to be a valid UUID
      provider: transaction.provider || "MTN Mobile Money",
      customerName: transaction.customerName || "",
      floatAccountId: transaction.floatAccountId || "",
      floatAccountName: transaction.floatAccountName || "",
      branchName: transaction.branchName || "",
      processedBy: transaction.processedBy || "",
      cashTillAffected: transaction.cashTillAffected || 0,
      floatAffected: transaction.floatAffected || 0,
      metadata: transaction.metadata || {},
    }

    // Store in database with proper UUID casting
    try {
      await sql`
        INSERT INTO momo_transactions (
          id, type, amount, fee, phone_number, reference, status, date,
          branch_id, user_id, provider, customer_name, float_account_id,
          float_account_name, branch_name, processed_by, cash_till_affected, float_affected
        ) VALUES (
          ${newTransaction.id}, ${newTransaction.type}, ${newTransaction.amount}, ${newTransaction.fee},
          ${newTransaction.phoneNumber}, ${newTransaction.reference}, ${newTransaction.status}, ${newTransaction.date},
          ${newTransaction.branchId}::UUID, ${newTransaction.userId}::UUID, ${newTransaction.provider}, ${newTransaction.customerName},
          ${newTransaction.floatAccountId || null}, ${newTransaction.floatAccountName}, ${newTransaction.branchName},
          ${newTransaction.processedBy}, ${newTransaction.cashTillAffected}, ${newTransaction.floatAffected}
        )
      `
      console.log("Enhanced MoMo transaction stored in database successfully")
    } catch (dbError) {
      console.error("Database error storing enhanced MoMo transaction:", dbError)
      // Continue with mock data if database fails
    }

    // Send notification
    try {
      const middleware = NotificationMiddleware.getInstance()
      await middleware.notifyTransaction({
        type: "MoMo",
        operation: newTransaction.type,
        amount: newTransaction.amount,
        customerPhone: newTransaction.phoneNumber,
        customerName: newTransaction.customerName,
        reference: newTransaction.reference,
        status: newTransaction.status,
      })
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError)
      // Don't fail the transaction for notification errors
    }

    return newTransaction
  } catch (error) {
    console.error("Error creating enhanced MoMo transaction:", error)
    return null
  }
}

// Export the original function for backward compatibility
export {
  createMoMoTransaction,
  getAllMoMoTransactions,
  getMoMoTransactions,
  getMoMoTransactionById,
} from "./momo-service"
