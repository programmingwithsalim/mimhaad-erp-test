import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"
import { AuditLoggerService } from "./audit-logger-service"
import { GLPostingService } from "./gl-posting-service"

const sql = neon(process.env.DATABASE_URL!)

export interface AgencyBankingTransactionData {
  type: "deposit" | "withdrawal" | "interbank" | "commission"
  amount: number
  fee: number
  customerName: string
  accountNumber: string
  partnerBankId: string
  partnerBankName: string
  partnerBankCode: string
  reference?: string
  description?: string
}

export interface UserContext {
  userId: string
  username: string
  fullName?: string
  email?: string
  branchId: string
  branchName?: string
  ipAddress?: string
  userAgent?: string
}

export interface AgencyBankingTransaction {
  id: string
  type: "deposit" | "withdrawal" | "interbank" | "commission"
  amount: number
  fee: number
  customerName: string
  accountNumber: string
  partnerBank: string
  partnerBankCode: string
  partnerBankId: string
  reference?: string
  status: "pending" | "completed" | "failed" | "reversed"
  date: string
  branchId: string
  userId: string
  cashTillAffected: number
  floatAffected: number
  glTransactionId?: string
  createdAt: string
  updatedAt: string
}

export class EnhancedAgencyBankingService {
  /**
   * Create an enhanced agency banking transaction with audit logging and GL posting
   */
  static async createEnhancedTransaction(
    transactionData: AgencyBankingTransactionData,
    userContext: UserContext,
  ): Promise<AgencyBankingTransaction> {
    const transactionId = `abt-${uuidv4().substring(0, 8)}`
    const now = new Date().toISOString()

    console.log(`🏦 Starting agency banking transaction: ${transactionId}`)

    try {
      // Calculate cash till and float effects
      let cashTillAffected = 0
      let floatAffected = 0

      switch (transactionData.type) {
        case "deposit":
          cashTillAffected = transactionData.amount + transactionData.fee
          floatAffected = -transactionData.amount
          break
        case "withdrawal":
          cashTillAffected = -(transactionData.amount - transactionData.fee)
          floatAffected = transactionData.amount
          break
        case "interbank":
          cashTillAffected = transactionData.fee
          floatAffected = 0
          break
        case "commission":
          cashTillAffected = transactionData.amount
          floatAffected = 0
          break
      }

      console.log(`💰 Cash till affected: ${cashTillAffected}, Float affected: ${floatAffected}`)

      // Create the transaction record
      const transaction: AgencyBankingTransaction = {
        id: transactionId,
        type: transactionData.type,
        amount: transactionData.amount,
        fee: transactionData.fee,
        customerName: transactionData.customerName,
        accountNumber: transactionData.accountNumber,
        partnerBank: transactionData.partnerBankName,
        partnerBankCode: transactionData.partnerBankCode,
        partnerBankId: transactionData.partnerBankId,
        reference: transactionData.reference,
        status: "completed",
        date: now,
        branchId: userContext.branchId,
        userId: userContext.userId,
        cashTillAffected,
        floatAffected,
        createdAt: now,
        updatedAt: now,
      }

      // Save to database first
      console.log("💾 Saving transaction to database...")
      await this.saveTransactionToDatabase(transaction)
      console.log("✅ Transaction saved to database")

      // Create audit log entry
      console.log("📝 Creating audit log...")
      try {
        await AuditLoggerService.log({
          userId: userContext.userId,
          username: userContext.username,
          actionType: "agency_banking_create",
          entityType: "agency_banking_transaction",
          entityId: transactionId,
          description: `Agency banking ${transactionData.type} transaction created`,
          details: {
            type: transactionData.type,
            amount: transactionData.amount,
            fee: transactionData.fee,
            customerName: transactionData.customerName,
            accountNumber: transactionData.accountNumber,
            partnerBank: transactionData.partnerBankName,
            partnerBankCode: transactionData.partnerBankCode,
            cashTillAffected,
            floatAffected,
          },
          severity: transactionData.amount > 10000 ? "high" : "medium",
          branchId: userContext.branchId,
          branchName: userContext.branchName,
          status: "success",
        })
        console.log("✅ Audit log created")
      } catch (auditError) {
        console.error("❌ Failed to create audit log:", auditError)
        // Don't fail the transaction for audit errors
      }

      // Create GL entries
      console.log("📊 Creating GL entries...")
      try {
        await this.createGLEntries(transaction, userContext)
        console.log("✅ GL entries created successfully")
      } catch (glError) {
        console.error("❌ Failed to create GL entries:", glError)

        // Log GL failure to audit
        try {
          await AuditLoggerService.log({
            userId: userContext.userId,
            username: userContext.username,
            actionType: "gl_posting_failure",
            entityType: "agency_banking_transaction",
            entityId: transactionId,
            description: "Failed to create GL entries for agency banking transaction",
            details: {
              error: glError instanceof Error ? glError.message : String(glError),
              transactionId,
              amount: transactionData.amount,
            },
            severity: "high",
            branchId: userContext.branchId,
            branchName: userContext.branchName,
            status: "failure",
            errorMessage: glError instanceof Error ? glError.message : String(glError),
          })
        } catch (auditError) {
          console.error("Failed to log GL error to audit:", auditError)
        }
      }

      // Update float balances
      console.log("🔄 Updating float balances...")
      try {
        await this.updateFloatBalances(userContext.branchId, floatAffected, transactionData.partnerBankId)
        console.log("✅ Float balances updated")
      } catch (floatError) {
        console.error("❌ Failed to update float balances:", floatError)

        // Log float update failure
        try {
          await AuditLoggerService.log({
            userId: userContext.userId,
            username: userContext.username,
            actionType: "float_balance_update_failure",
            entityType: "float_account",
            entityId: transactionData.partnerBankId,
            description: `Failed to update float balance for ${transactionData.partnerBankName}`,
            details: {
              floatAffected,
              error: floatError instanceof Error ? floatError.message : String(floatError),
              transactionId,
            },
            severity: "high",
            branchId: userContext.branchId,
            branchName: userContext.branchName,
            status: "failure",
            errorMessage: floatError instanceof Error ? floatError.message : String(floatError),
          })
        } catch (auditError) {
          console.error("Failed to log float error to audit:", auditError)
        }
      }

      console.log(`✅ Agency banking transaction completed successfully: ${transactionId}`)
      return transaction
    } catch (error) {
      console.error(`❌ Error creating agency banking transaction ${transactionId}:`, error)

      // Log transaction failure
      try {
        await AuditLoggerService.log({
          userId: userContext.userId,
          username: userContext.username,
          actionType: "agency_banking_failure",
          entityType: "agency_banking_transaction",
          entityId: transactionId,
          description: "Failed to create agency banking transaction",
          details: {
            type: transactionData.type,
            amount: transactionData.amount,
            customerName: transactionData.customerName,
            partnerBank: transactionData.partnerBankName,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          severity: "critical",
          branchId: userContext.branchId,
          branchName: userContext.branchName,
          status: "failure",
          errorMessage: error instanceof Error ? error.message : String(error),
        })
      } catch (auditError) {
        console.error("Failed to log transaction failure:", auditError)
      }

      throw error
    }
  }

  /**
   * Create GL entries for agency banking transaction
   */
  private static async createGLEntries(transaction: AgencyBankingTransaction, userContext: UserContext): Promise<void> {
    try {
      const entries = []

      // Get GL accounts
      const cashAccount = await this.getOrCreateGLAccount("1001", "Cash", "Asset")
      const partnerBankAccount = await this.getOrCreateGLAccount(
        `2100-${transaction.partnerBankCode}`,
        `${transaction.partnerBank} Float`,
        "Liability",
      )
      const feeRevenueAccount = await this.getOrCreateGLAccount("4002", "Agency Banking Fee Income", "Revenue")

      switch (transaction.type) {
        case "deposit":
          // Customer deposits cash, we credit their account with partner bank
          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: transaction.amount,
            credit: 0,
            description: `Agency Banking Deposit - ${transaction.partnerBank} - ${transaction.accountNumber}`,
            metadata: {
              transactionId: transaction.id,
              customerName: transaction.customerName,
              partnerBank: transaction.partnerBank,
            },
          })

          entries.push({
            accountId: partnerBankAccount.id,
            accountCode: partnerBankAccount.code,
            debit: 0,
            credit: transaction.amount,
            description: `Agency Banking Deposit - ${transaction.partnerBank} - ${transaction.accountNumber}`,
            metadata: {
              transactionId: transaction.id,
              customerName: transaction.customerName,
              partnerBank: transaction.partnerBank,
            },
          })
          break

        case "withdrawal":
          // Customer withdraws from their account, we pay cash
          entries.push({
            accountId: partnerBankAccount.id,
            accountCode: partnerBankAccount.code,
            debit: transaction.amount,
            credit: 0,
            description: `Agency Banking Withdrawal - ${transaction.partnerBank} - ${transaction.accountNumber}`,
            metadata: {
              transactionId: transaction.id,
              customerName: transaction.customerName,
              partnerBank: transaction.partnerBank,
            },
          })

          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: 0,
            credit: transaction.amount,
            description: `Agency Banking Withdrawal - ${transaction.partnerBank} - ${transaction.accountNumber}`,
            metadata: {
              transactionId: transaction.id,
              customerName: transaction.customerName,
              partnerBank: transaction.partnerBank,
            },
          })
          break

        case "interbank":
          // Transfer between banks - no cash movement, just liability transfer
          entries.push({
            accountId: partnerBankAccount.id,
            accountCode: partnerBankAccount.code,
            debit: transaction.amount,
            credit: 0,
            description: `Interbank Transfer - ${transaction.partnerBank} - ${transaction.accountNumber}`,
            metadata: {
              transactionId: transaction.id,
              customerName: transaction.customerName,
              partnerBank: transaction.partnerBank,
            },
          })

          // This would credit another bank's account (simplified for now)
          entries.push({
            accountId: cashAccount.id, // Placeholder - should be destination bank account
            accountCode: cashAccount.code,
            debit: 0,
            credit: transaction.amount,
            description: `Interbank Transfer - ${transaction.partnerBank} - ${transaction.accountNumber}`,
            metadata: {
              transactionId: transaction.id,
              customerName: transaction.customerName,
              partnerBank: transaction.partnerBank,
            },
          })
          break

        case "commission":
          // Commission earned
          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: transaction.amount,
            credit: 0,
            description: `Agency Banking Commission - ${transaction.partnerBank}`,
            metadata: {
              transactionId: transaction.id,
              partnerBank: transaction.partnerBank,
            },
          })

          entries.push({
            accountId: feeRevenueAccount.id,
            accountCode: feeRevenueAccount.code,
            debit: 0,
            credit: transaction.amount,
            description: `Agency Banking Commission - ${transaction.partnerBank}`,
            metadata: {
              transactionId: transaction.id,
              partnerBank: transaction.partnerBank,
            },
          })
          break
      }

      // Fee entries (if applicable)
      if (transaction.fee > 0) {
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: transaction.fee,
          credit: 0,
          description: `Agency Banking Fee - ${transaction.partnerBank}`,
          metadata: {
            transactionId: transaction.id,
            feeAmount: transaction.fee,
            partnerBank: transaction.partnerBank,
          },
        })

        entries.push({
          accountId: feeRevenueAccount.id,
          accountCode: feeRevenueAccount.code,
          debit: 0,
          credit: transaction.fee,
          description: `Agency Banking Fee Revenue - ${transaction.partnerBank}`,
          metadata: {
            transactionId: transaction.id,
            feeAmount: transaction.fee,
            partnerBank: transaction.partnerBank,
          },
        })
      }

      // Create GL transaction
      const glResult = await GLPostingService.createAndPostTransaction({
        date: new Date().toISOString().split("T")[0],
        sourceModule: "agency_banking",
        sourceTransactionId: transaction.id,
        sourceTransactionType: transaction.type,
        description: `Agency Banking ${transaction.type} - ${transaction.partnerBank} - ${transaction.accountNumber}`,
        entries,
        createdBy: userContext.userId,
        branchId: userContext.branchId,
        branchName: userContext.branchName,
        metadata: {
          partnerBank: transaction.partnerBank,
          partnerBankCode: transaction.partnerBankCode,
          customerName: transaction.customerName,
          accountNumber: transaction.accountNumber,
          amount: transaction.amount,
          fee: transaction.fee,
          reference: transaction.reference,
        },
      })

      if (glResult.success && glResult.glTransactionId) {
        // Update transaction with GL transaction ID
        await this.updateTransactionGLId(transaction.id, glResult.glTransactionId)

        console.log(`✅ GL entries created for agency banking transaction: ${transaction.id}`)

        // Log successful GL posting
        await AuditLoggerService.log({
          userId: userContext.userId,
          username: userContext.username,
          actionType: "gl_transaction_create",
          entityType: "gl_transaction",
          entityId: glResult.glTransactionId,
          description: `GL entries created for agency banking transaction ${transaction.id}`,
          details: {
            sourceTransactionId: transaction.id,
            partnerBank: transaction.partnerBank,
            amount: transaction.amount,
            entriesCount: entries.length,
          },
          severity: "low",
          branchId: userContext.branchId,
          branchName: userContext.branchName,
          status: "success",
        })
      } else {
        throw new Error(glResult.error || "Failed to create GL transaction")
      }
    } catch (error) {
      console.error("❌ Error creating GL entries for agency banking transaction:", error)
      throw error
    }
  }

  /**
   * Get or create GL account
   */
  private static async getOrCreateGLAccount(code: string, name: string, type: string): Promise<any> {
    try {
      // Try to get existing account
      const existing = await sql`
        SELECT id, code, name, type
        FROM gl_accounts
        WHERE code = ${code} AND is_active = true
      `

      if (existing.length > 0) {
        return existing[0]
      }

      // Create new account
      const accountId = uuidv4()
      const result = await sql`
        INSERT INTO gl_accounts (id, code, name, type, balance, is_active)
        VALUES (${accountId}, ${code}, ${name}, ${type}, 0, true)
        RETURNING id, code, name, type
      `

      console.log(`Created GL account: ${code} - ${name}`)
      return result[0]
    } catch (error) {
      console.error(`Failed to get or create GL account ${code}:`, error)
      throw error
    }
  }

  /**
   * Save transaction to database
   */
  private static async saveTransactionToDatabase(transaction: AgencyBankingTransaction): Promise<void> {
    try {
      await sql`
        INSERT INTO agency_banking_transactions (
          id, type, amount, fee, customer_name, account_number,
          partner_bank, partner_bank_code, partner_bank_id,
          reference, status, date, branch_id, user_id,
          cash_till_affected, float_affected, created_at, updated_at
        ) VALUES (
          ${transaction.id}, ${transaction.type}, ${transaction.amount}, ${transaction.fee},
          ${transaction.customerName}, ${transaction.accountNumber},
          ${transaction.partnerBank}, ${transaction.partnerBankCode}, ${transaction.partnerBankId},
          ${transaction.reference || null}, ${transaction.status}, ${transaction.date},
          ${transaction.branchId}, ${transaction.userId},
          ${transaction.cashTillAffected}, ${transaction.floatAffected},
          ${transaction.createdAt}, ${transaction.updatedAt}
        )
      `
    } catch (error) {
      console.error("Failed to save agency banking transaction to database:", error)
      throw error
    }
  }

  /**
   * Update transaction with GL transaction ID
   */
  private static async updateTransactionGLId(transactionId: string, glTransactionId: string): Promise<void> {
    try {
      await sql`
        UPDATE agency_banking_transactions
        SET gl_entry_id = ${glTransactionId}, updated_at = NOW()
        WHERE id = ${transactionId}
      `
    } catch (error) {
      console.error("Failed to update transaction with GL ID:", error)
      // Don't throw - this is not critical
    }
  }

  /**
   * Update float balances
   */
  private static async updateFloatBalances(
    branchId: string,
    floatAffected: number,
    partnerBankId: string,
  ): Promise<void> {
    try {
      if (floatAffected === 0) return

      // Update partner bank float account
      await sql`
        UPDATE float_accounts
        SET current_balance = COALESCE(current_balance, 0) + ${floatAffected},
            updated_at = NOW()
        WHERE branch_id = ${branchId}
        AND account_type = 'agency-banking'
        AND provider = ${partnerBankId}
        AND is_active = true
      `

      console.log(`Updated float balance for ${partnerBankId}: ${floatAffected > 0 ? "+" : ""}${floatAffected}`)
    } catch (error) {
      console.error("Failed to update float balances:", error)
      throw error
    }
  }
}
