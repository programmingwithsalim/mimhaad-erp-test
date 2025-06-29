import { neon } from "@neondatabase/serverless"
import { AuditLoggerService } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export interface MoMoTransactionData {
  type: string
  amount: number
  fee: number
  phone_number: string
  customer_name: string
  float_account_id: string
  user_id: string
  processed_by: string
  branch_id: string
  provider: string
  reference?: string
  status?: string
}

export interface UserContext {
  userId: string
  username: string
  branchId: string
  branchName: string
  ipAddress?: string
  userAgent?: string
}

export class EnhancedMoMoService {
  static async createEnhancedTransaction(transactionData: MoMoTransactionData, userContext: UserContext): Promise<any> {
    // Validate UUIDs before proceeding
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (!uuidRegex.test(transactionData.user_id)) {
      throw new Error(`Invalid user_id format: ${transactionData.user_id}`)
    }

    if (!uuidRegex.test(transactionData.branch_id)) {
      throw new Error(`Invalid branch_id format: ${transactionData.branch_id}`)
    }

    if (!uuidRegex.test(transactionData.float_account_id)) {
      throw new Error(`Invalid float_account_id format: ${transactionData.float_account_id}`)
    }

    console.log("📱 [MOMO] Creating MoMo transaction", transactionData.float_account_id)

    try {
      // Ensure momo_transactions table exists
      await sql`
        CREATE TABLE IF NOT EXISTS momo_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          fee DECIMAL(12,2) DEFAULT 0,
          phone_number VARCHAR(20) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          provider VARCHAR(100),
          reference VARCHAR(100) UNIQUE,
          status VARCHAR(20) DEFAULT 'completed',
          float_account_id UUID NOT NULL,
          user_id UUID NOT NULL,
          processed_by VARCHAR(255),
          branch_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Prepare all values with proper defaults and types
      const transactionType = String(transactionData.type || "cash-in")
      const transactionAmount = Number(transactionData.amount || 0)
      const transactionFee = Number(transactionData.fee || 0)
      const phoneNumber = String(transactionData.phone_number || "")
      const customerName = String(transactionData.customer_name || "")
      const provider = String(transactionData.provider || "Mobile Money")
      const reference = String(transactionData.reference || `MOMO-${Date.now()}`)
      const status = String(transactionData.status || "completed")
      const floatAccountId = String(transactionData.float_account_id)
      const userId = String(transactionData.user_id)
      const processedBy = String(transactionData.processed_by || "Unknown User")
      const branchId = String(transactionData.branch_id)

      console.log("📱 [MOMO] Prepared transaction data:", {
        transactionType,
        transactionAmount,
        transactionFee,
        phoneNumber,
        customerName,
        provider,
        reference,
        status,
        floatAccountId,
        userId,
        processedBy,
        branchId,
      })

      // Create the transaction with explicit parameter casting
      const result = await sql`
        INSERT INTO momo_transactions (
          type,
          amount,
          fee,
          phone_number,
          customer_name,
          provider,
          reference,
          status,
          float_account_id,
          user_id,
          processed_by,
          branch_id
        ) VALUES (
          ${transactionType}::varchar,
          ${transactionAmount}::decimal,
          ${transactionFee}::decimal,
          ${phoneNumber}::varchar,
          ${customerName}::varchar,
          ${provider}::varchar,
          ${reference}::varchar,
          ${status}::varchar,
          ${floatAccountId}::uuid,
          ${userId}::uuid,
          ${processedBy}::varchar,
          ${branchId}::uuid
        )
        RETURNING *
      `

      const transaction = result[0]

      // Update MoMo float account balance
      const momoBalanceChange = transactionType === "cash-in" ? -transactionAmount : transactionAmount

      await sql`
        UPDATE float_accounts 
        SET 
          current_balance = current_balance + ${momoBalanceChange}::decimal,
          last_updated = CURRENT_TIMESTAMP
        WHERE id = ${floatAccountId}::uuid
      `

      // Update Cash in Till balance (opposite of MoMo float)
      const cashBalanceChange = transactionType === "cash-in" ? transactionAmount : -transactionAmount

      // Find cash in till account for this branch
      const cashAccount = await sql`
        SELECT id FROM float_accounts 
        WHERE branch_id = ${branchId}::uuid
        AND account_type = 'cash-in-till'
        AND is_active = true
        LIMIT 1
      `

      if (cashAccount.length > 0) {
        await sql`
          UPDATE float_accounts 
          SET 
            current_balance = current_balance + ${cashBalanceChange}::decimal,
            last_updated = CURRENT_TIMESTAMP
          WHERE id = ${cashAccount[0].id}::uuid
        `

        console.log(`📱 [MOMO] Updated cash till balance by ${cashBalanceChange}`)
      } else {
        console.warn(`📱 [MOMO] No cash till account found for branch ${branchId}`)
      }

      // Create float transaction records
      await sql`
        INSERT INTO float_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference,
          created_at,
          updated_at
        ) VALUES (
          ${floatAccountId}::uuid,
          ${transactionType}::varchar,
          ${momoBalanceChange}::decimal,
          ${"MoMo " + transactionType + " transaction for " + customerName}::varchar,
          ${reference}::varchar,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `

      if (cashAccount.length > 0) {
        const cashTransactionType = transactionType === "cash-in" ? "cash-in" : "cash-out"
        await sql`
          INSERT INTO float_transactions (
            account_id,
            transaction_type,
            amount,
            description,
            reference,
            created_at,
            updated_at
          ) VALUES (
            ${cashAccount[0].id}::uuid,
            ${cashTransactionType}::varchar,
            ${cashBalanceChange}::decimal,
            ${"Cash till update from MoMo " + transactionType + " transaction"}::varchar,
            ${reference}::varchar,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `
      }

      // Log successful transaction with proper user context
      await AuditLoggerService.log({
        userId: userContext.userId,
        username: userContext.username,
        actionType: "momo_transaction_created",
        entityType: "momo_transaction",
        entityId: transaction.id,
        description: `Created MoMo ${transactionType} transaction for ${customerName}`,
        details: {
          transactionId: transaction.id,
          amount: transactionAmount,
          fee: transactionFee,
          phone_number: phoneNumber,
          provider: provider,
          momoBalanceChange,
          cashBalanceChange,
        },
        severity: transactionAmount > 5000 ? "high" : "medium",
        branchId: userContext.branchId,
        branchName: userContext.branchName,
        status: "success",
      })

      return transaction
    } catch (error) {
      console.error("❌ [MOMO] Error creating MoMo transaction:", error)

      // Log error with proper user context
      await AuditLoggerService.log({
        userId: userContext.userId,
        username: userContext.username,
        actionType: "momo_transaction_failed",
        entityType: "momo_transaction",
        description: "Failed to create MoMo transaction",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          transactionData,
        },
        severity: "critical",
        branchId: userContext.branchId,
        branchName: userContext.branchName,
        status: "failure",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })

      throw error
    }
  }
}
