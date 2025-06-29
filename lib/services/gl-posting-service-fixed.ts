import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"
import { AuditLoggerService } from "./audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

// GL Account mappings for E-Zwich operations
const GL_ACCOUNTS = {
  EZWICH_CARD_INVENTORY: { code: "1300-003", name: "E-Zwich Card Inventory" },
  ACCOUNTS_PAYABLE: { code: "2100-001", name: "Accounts Payable - E-Zwich" },
  INVENTORY_ADJUSTMENT: { code: "5200-003", name: "Inventory Adjustment - E-Zwich" },
  CARD_COST_EXPENSE: { code: "5100-003", name: "Card Cost Expense" },
}

export interface GLEntry {
  accountCode: string
  debit: number
  credit: number
  description: string
  metadata?: Record<string, any>
}

export interface GLTransactionData {
  date: string
  sourceModule: string
  sourceTransactionId: string
  sourceTransactionType: string
  description: string
  entries: GLEntry[]
  createdBy: string
  branchId?: string
  metadata?: Record<string, any>
}

export class GLPostingService {
  /**
   * Check GL sync logs table structure and ensure it exists
   */
  static async ensureGLSyncLogsTable(): Promise<void> {
    try {
      // Check if table exists and get its structure
      const tableInfo = await sql`
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'gl_sync_logs'
        ORDER BY ordinal_position
      `

      console.log("GL sync logs table structure:", tableInfo)

      // Create table if it doesn't exist with proper structure
      if (tableInfo.length === 0) {
        await sql`
          CREATE TABLE IF NOT EXISTS gl_sync_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            module VARCHAR(50),
            operation VARCHAR(50),
            status VARCHAR(20),
            details TEXT,
            error TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
        console.log("✅ Created gl_sync_logs table with UUID default")
      } else {
        // Check if id column has proper default
        const idColumn = tableInfo.find((col) => col.column_name === "id")
        if (idColumn && !idColumn.column_default) {
          console.log("⚠️ ID column exists but has no default, will provide explicit UUID")
        }
      }
    } catch (error) {
      console.error("Error checking GL sync logs table:", error)
    }
  }

  /**
   * Ensure required GL accounts exist
   */
  static async ensureGLAccounts(): Promise<void> {
    try {
      const accounts = Object.values(GL_ACCOUNTS)

      for (const account of accounts) {
        // Check if account exists
        const existing = await sql`
          SELECT id FROM gl_accounts WHERE code = ${account.code}
        `

        if (existing.length === 0) {
          // Create the account
          const accountId = uuidv4()
          await sql`
            INSERT INTO gl_accounts (id, code, name, type, is_active)
            VALUES (${accountId}, ${account.code}, ${account.name}, 'Asset', true)
          `

          // Create balance record
          await sql`
            INSERT INTO gl_account_balances (account_id, current_balance)
            VALUES (${accountId}, 0)
            ON CONFLICT (account_id) DO NOTHING
          `

          console.log(`✅ Created GL account: ${account.code} - ${account.name}`)
        }
      }
    } catch (error) {
      console.error("Error ensuring GL accounts:", error)
    }
  }

  /**
   * Log to GL sync logs with error handling
   */
  static async logToGLSyncLogs(
    module: string,
    operation: string,
    status: string,
    details: string,
    error?: string,
  ): Promise<void> {
    try {
      await this.ensureGLSyncLogsTable()

      // Generate explicit UUID for the log entry
      const logId = uuidv4()

      // Try inserting with explicit ID first
      try {
        await sql`
          INSERT INTO gl_sync_logs (id, module, operation, status, details, error, created_at)
          VALUES (${logId}, ${module}, ${operation}, ${status}, ${details}, ${error || null}, CURRENT_TIMESTAMP)
        `
        console.log(`✅ GL sync log created: ${logId}`)
      } catch (insertError) {
        // If that fails, try without explicit ID (in case table has proper defaults)
        console.log("Retrying GL sync log without explicit ID...")
        await sql`
          INSERT INTO gl_sync_logs (module, operation, status, details, error)
          VALUES (${module}, ${operation}, ${status}, ${details}, ${error || null})
        `
        console.log("✅ GL sync log created without explicit ID")
      }
    } catch (logError) {
      console.error("Error logging to GL sync logs:", logError)
      // Don't throw here as this is just logging
    }
  }

  /**
   * Create GL transaction for E-Zwich batch operations
   */
  static async createBatchGLTransaction(
    operation: "create" | "update" | "delete",
    batchData: {
      id: string
      batch_code: string
      quantity_received: number
    },
    userId: string,
    branchId: string,
    oldQuantity?: number,
  ): Promise<string | null> {
    let description = ""
    try {
      await this.ensureGLAccounts()

      let entries: Array<{
        accountCode: string
        accountName: string
        debit: number
        credit: number
        description: string
      }> = []

      const cardCost = 10 // GHS 10 per card
      let amount = 0

      // Get account IDs
      const inventoryAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code}
      `
      const payableAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.ACCOUNTS_PAYABLE.code}
      `
      const adjustmentAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.INVENTORY_ADJUSTMENT.code}
      `

      if (inventoryAccount.length === 0 || payableAccount.length === 0 || adjustmentAccount.length === 0) {
        throw new Error("Required GL accounts not found")
      }

      const inventoryAccountId = inventoryAccount[0].id
      const payableAccountId = payableAccount[0].id
      const adjustmentAccountId = adjustmentAccount[0].id

      switch (operation) {
        case "create":
          amount = batchData.quantity_received * cardCost
          description = `Card batch received: ${batchData.batch_code}`
          entries = [
            {
              accountCode: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code,
              accountName: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.name,
              debit: amount,
              credit: 0,
              description: `Card inventory increase - ${batchData.batch_code}`,
            },
            {
              accountCode: GL_ACCOUNTS.ACCOUNTS_PAYABLE.code,
              accountName: GL_ACCOUNTS.ACCOUNTS_PAYABLE.name,
              debit: 0,
              credit: amount,
              description: `Payable for card batch - ${batchData.batch_code}`,
            },
          ]
          break

        case "update":
          const quantityDiff = batchData.quantity_received - (oldQuantity || 0)
          amount = Math.abs(quantityDiff * cardCost)
          description = `Card batch adjustment: ${batchData.batch_code}`

          if (quantityDiff !== 0) {
            if (quantityDiff > 0) {
              // Increase in inventory
              entries = [
                {
                  accountCode: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code,
                  accountName: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.name,
                  debit: amount,
                  credit: 0,
                  description: `Inventory increase - ${batchData.batch_code}`,
                },
                {
                  accountCode: GL_ACCOUNTS.INVENTORY_ADJUSTMENT.code,
                  accountName: GL_ACCOUNTS.INVENTORY_ADJUSTMENT.name,
                  debit: 0,
                  credit: amount,
                  description: `Inventory adjustment - ${batchData.batch_code}`,
                },
              ]
            } else {
              // Decrease in inventory
              entries = [
                {
                  accountCode: GL_ACCOUNTS.INVENTORY_ADJUSTMENT.code,
                  accountName: GL_ACCOUNTS.INVENTORY_ADJUSTMENT.name,
                  debit: amount,
                  credit: 0,
                  description: `Inventory adjustment - ${batchData.batch_code}`,
                },
                {
                  accountCode: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code,
                  accountName: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.name,
                  debit: 0,
                  credit: amount,
                  description: `Inventory decrease - ${batchData.batch_code}`,
                },
              ]
            }
          }
          break

        case "delete":
          amount = batchData.quantity_received * cardCost
          description = `Card batch deleted: ${batchData.batch_code}`
          entries = [
            {
              accountCode: GL_ACCOUNTS.ACCOUNTS_PAYABLE.code,
              accountName: GL_ACCOUNTS.ACCOUNTS_PAYABLE.name,
              debit: amount,
              credit: 0,
              description: `Reverse payable - ${batchData.batch_code}`,
            },
            {
              accountCode: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code,
              accountName: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.name,
              debit: 0,
              credit: amount,
              description: `Reverse inventory - ${batchData.batch_code}`,
            },
          ]
          break
      }

      if (entries.length === 0) {
        await this.logToGLSyncLogs("ezwich_batch", operation, "skipped", `No GL entries needed for ${operation}`)
        return null
      }

      // Create GL transaction
      const transactionId = uuidv4()
      await sql`
        INSERT INTO gl_transactions (
          id, date, source_module, source_transaction_id, source_transaction_type,
          description, status, created_by
        ) VALUES (
          ${transactionId}, CURRENT_DATE, 'ezwich_batch', ${batchData.id},
          ${`batch_${operation}`}, ${description}, 'posted', ${userId}
        )
      `

      // Create transaction entries
      for (const entry of entries) {
        // Get account ID for this entry
        const accountResult = await sql`
          SELECT id FROM gl_accounts WHERE code = ${entry.accountCode}
        `

        if (accountResult.length > 0) {
          const accountId = accountResult[0].id

          await sql`
            INSERT INTO gl_transaction_entries (
              transaction_id, account_id, account_code, debit, credit, description
            ) VALUES (
              ${transactionId}, ${accountId}, ${entry.accountCode},
              ${entry.debit}, ${entry.credit}, ${entry.description}
            )
          `

          // Update account balance
          const balanceChange = entry.debit - entry.credit
          await sql`
            UPDATE gl_account_balances 
            SET current_balance = COALESCE(current_balance, 0) + ${balanceChange},
                last_updated = CURRENT_TIMESTAMP
            WHERE account_id = ${accountId}
          `
        }
      }

      // Log to GL sync logs
      await this.logToGLSyncLogs("ezwich_batch", operation, "success", `${description} - Amount: GHS ${amount}`)

      console.log(`✅ GL transaction created for batch ${operation}: ${batchData.batch_code} (Amount: GHS ${amount})`)

      // Log to audit
      await AuditLoggerService.log({
        userId,
        actionType: `gl_posting_${operation}`,
        entityType: "ezwich_batch_gl",
        entityId: batchData.id,
        description: `GL entries posted for batch ${operation}`,
        details: {
          operation,
          batch_code: batchData.batch_code,
          amount,
          transaction_id: transactionId,
          entries: entries.map((e) => ({
            account: e.accountCode,
            debit: e.debit,
            credit: e.credit,
            description: e.description,
          })),
        },
        severity: "medium",
        branchId,
      })

      return transactionId
    } catch (error) {
      console.error(`❌ Error creating GL transaction for batch ${operation}:`, error)

      // Log error to GL sync logs
      await this.logToGLSyncLogs(
        "ezwich_batch",
        operation,
        "failed",
        description || `Failed ${operation} operation`,
        error instanceof Error ? error.message : String(error),
      )

      // Log to audit
      await AuditLoggerService.log({
        userId,
        actionType: `gl_posting_error`,
        entityType: "ezwich_batch_gl",
        entityId: batchData.id,
        description: `Failed to post GL entries for batch ${operation}`,
        details: {
          operation,
          batch_code: batchData.batch_code,
          error: error instanceof Error ? error.message : String(error),
        },
        severity: "high",
        branchId,
        status: "failure",
        errorMessage: error instanceof Error ? error.message : String(error),
      })

      return null
    }
  }

  /**
   * Create GL transaction for E-Zwich card issuance
   */
  static async createCardIssuanceGLTransaction(
    cardData: {
      id: string
      card_number: string
      customer_name: string
      fee_charged: number
      batch_id: string
    },
    userId: string,
    branchId: string,
  ): Promise<string | null> {
    try {
      await this.ensureGLAccounts()

      const cardCost = 10 // GHS 10 per card
      const fee = Number(cardData.fee_charged) || 15 // Default fee

      // Create GL transaction for card issuance
      const transactionId = uuidv4()
      const description = `E-Zwich card issued: ${cardData.card_number} to ${cardData.customer_name}`

      await sql`
        INSERT INTO gl_transactions (
          id, date, source_module, source_transaction_id, source_transaction_type,
          description, status, created_by
        ) VALUES (
          ${transactionId}, CURRENT_DATE, 'ezwich_cards', ${cardData.id},
          'card_issuance', ${description}, 'posted', ${userId}
        )
      `

      // Get account IDs
      const inventoryAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code}
      `
      const expenseAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.CARD_COST_EXPENSE.code}
      `

      if (inventoryAccount.length > 0 && expenseAccount.length > 0) {
        const inventoryAccountId = inventoryAccount[0].id
        const expenseAccountId = expenseAccount[0].id

        // Debit: Card Cost Expense, Credit: Card Inventory
        await sql`
          INSERT INTO gl_transaction_entries (
            transaction_id, account_id, account_code, debit, credit, description
          ) VALUES (
            ${transactionId}, ${expenseAccountId}, ${GL_ACCOUNTS.CARD_COST_EXPENSE.code},
            ${cardCost}, 0, 'Card cost for issuance - ${cardData.card_number}'
          )
        `

        await sql`
          INSERT INTO gl_transaction_entries (
            transaction_id, account_id, account_code, debit, credit, description
          ) VALUES (
            ${transactionId}, ${inventoryAccountId}, ${GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code},
            0, ${cardCost}, 'Card inventory reduction - ${cardData.card_number}'
          )
        `

        // Update balances
        await sql`
          UPDATE gl_account_balances 
          SET current_balance = COALESCE(current_balance, 0) + ${cardCost},
              last_updated = CURRENT_TIMESTAMP
          WHERE account_id = ${expenseAccountId}
        `

        await sql`
          UPDATE gl_account_balances 
          SET current_balance = COALESCE(current_balance, 0) - ${cardCost},
              last_updated = CURRENT_TIMESTAMP
          WHERE account_id = ${inventoryAccountId}
        `

        // Log to GL sync logs
        await this.logToGLSyncLogs(
          "ezwich_cards",
          "card_issuance",
          "success",
          `Card issued: ${cardData.card_number} - Cost: GHS ${cardCost}`,
        )
      }

      console.log(`✅ GL transaction created for card issuance: ${cardData.card_number}`)

      return transactionId
    } catch (error) {
      console.error("❌ Error creating GL transaction for card issuance:", error)

      // Log error to GL sync logs
      await this.logToGLSyncLogs(
        "ezwich_cards",
        "card_issuance",
        "failed",
        `Failed to create GL transaction for card: ${cardData.card_number}`,
        error instanceof Error ? error.message : String(error),
      )

      return null
    }
  }

  /**
   * Simple method to test GL sync logs functionality
   */
  static async testGLSyncLogs(): Promise<boolean> {
    try {
      await this.logToGLSyncLogs("test", "test_operation", "success", "Testing GL sync logs functionality")
      console.log("✅ GL sync logs test successful")
      return true
    } catch (error) {
      console.error("❌ GL sync logs test failed:", error)
      return false
    }
  }

  /**
   * Get GL account by code - uses the specific accounts from user's SQL
   */
  static async getGLAccountByCode(code: string): Promise<any> {
    try {
      const account = await sql`
        SELECT id, code, name, type
        FROM gl_accounts
        WHERE code = ${code} AND is_active = true
        LIMIT 1
      `

      if (account.length === 0) {
        console.warn(`⚠️ GL account not found for code: ${code}`)
        return null
      }

      return account[0]
    } catch (error) {
      console.error(`❌ Error getting GL account ${code}:`, error)
      return null
    }
  }

  /**
   * Create MoMo GL entries using specific account codes
   */
  static async createMoMoGLEntries(params: {
    transactionId: string
    type: "cash-in" | "cash-out" | "transfer" | "payment" | "commission"
    amount: number
    fee: number
    provider: string
    phoneNumber: string
    customerName: string
    reference: string
    processedBy: string
    branchId: string
  }): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(`🏦 Creating MoMo GL entries for ${params.provider} ${params.type}`)

      // Map provider to specific GL account codes
      let floatAccountCode: string
      let feeAccountCode: string
      let commissionAccountCode: string

      switch (params.provider.toLowerCase()) {
        case "mtn":
          floatAccountCode = "1100-001" // MTN MoMo Float
          feeAccountCode = "4100-001" // MTN MoMo Transaction Fees
          commissionAccountCode = "4200-001" // MTN MoMo Commission Revenue
          break
        case "vodafone":
          floatAccountCode = "1100-002" // Vodafone Cash Float
          feeAccountCode = "4100-002" // Vodafone Cash Transaction Fees
          commissionAccountCode = "4200-002" // Vodafone Cash Commission Revenue
          break
        case "airteltigo":
          floatAccountCode = "1100-003" // AirtelTigo Money Float
          feeAccountCode = "4100-003" // AirtelTigo Money Transaction Fees
          commissionAccountCode = "4200-003" // AirtelTigo Money Commission Revenue
          break
        default:
          // Default to MTN if provider not recognized
          floatAccountCode = "1100-001"
          feeAccountCode = "4100-001"
          commissionAccountCode = "4200-001"
      }

      // Get GL accounts
      const floatAccount = await this.getGLAccountByCode(floatAccountCode)
      const cashAccount = await this.getGLAccountByCode("1010-001") // Cash in Till
      const feeAccount = await this.getGLAccountByCode(feeAccountCode)

      if (!floatAccount || !cashAccount) {
        throw new Error(`Required GL accounts not found: ${floatAccountCode}, 1010-001`)
      }

      const entries: GLEntry[] = []

      if (params.type === "cash-in") {
        // Debit: MoMo Float (increase asset)
        entries.push({
          accountCode: floatAccount.code,
          debit: params.amount,
          credit: 0,
          description: `MoMo Cash In - ${params.customerName} - ${params.phoneNumber}`,
          metadata: { transactionId: params.transactionId, phoneNumber: params.phoneNumber },
        })

        // Credit: Cash in Till (decrease cash)
        entries.push({
          accountCode: cashAccount.code,
          debit: 0,
          credit: params.amount,
          description: `MoMo Cash In - ${params.customerName} - ${params.phoneNumber}`,
          metadata: { transactionId: params.transactionId, phoneNumber: params.phoneNumber },
        })
      } else if (params.type === "cash-out") {
        // Debit: Cash in Till (increase cash)
        entries.push({
          accountCode: cashAccount.code,
          debit: params.amount,
          credit: 0,
          description: `MoMo Cash Out - ${params.customerName} - ${params.phoneNumber}`,
          metadata: { transactionId: params.transactionId, phoneNumber: params.phoneNumber },
        })

        // Credit: MoMo Float (decrease asset)
        entries.push({
          accountCode: floatAccount.code,
          debit: 0,
          credit: params.amount,
          description: `MoMo Cash Out - ${params.customerName} - ${params.phoneNumber}`,
          metadata: { transactionId: params.transactionId, phoneNumber: params.phoneNumber },
        })
      }

      // Add fee entries if applicable
      if (params.fee > 0 && feeAccount) {
        entries.push({
          accountCode: cashAccount.code,
          debit: params.fee,
          credit: 0,
          description: `MoMo Transaction Fee - ${params.phoneNumber}`,
          metadata: { transactionId: params.transactionId, feeAmount: params.fee },
        })

        entries.push({
          accountCode: feeAccount.code,
          debit: 0,
          credit: params.fee,
          description: `MoMo Fee Revenue - ${params.phoneNumber}`,
          metadata: { transactionId: params.transactionId, feeAmount: params.fee },
        })
      }

      const glTransactionData: GLTransactionData = {
        date: new Date().toISOString().split("T")[0],
        sourceModule: "momo",
        sourceTransactionId: params.transactionId,
        sourceTransactionType: params.type,
        description: `MoMo ${params.type} - ${params.customerName} - ${params.phoneNumber}`,
        entries,
        createdBy: params.processedBy,
        branchId: params.branchId,
        metadata: {
          provider: params.provider,
          phoneNumber: params.phoneNumber,
          customerName: params.customerName,
          reference: params.reference,
          amount: params.amount,
          fee: params.fee,
        },
      }

      return await this.createAndPostTransaction(glTransactionData)
    } catch (error) {
      console.error("❌ Error creating MoMo GL entries:", error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Create Power GL entries using specific account codes
   */
  static async createPowerGLEntries(params: {
    transactionId: string
    meterNumber: string
    provider: string
    amount: number
    fee: number
    customerName: string
    reference: string
    processedBy: string
    branchId: string
  }): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(`🔌 Creating Power GL entries for ${params.provider}`)

      // Map provider to specific GL account codes
      let floatAccountCode: string
      let feeAccountCode: string
      let commissionAccountCode: string

      switch (params.provider.toLowerCase()) {
        case "ecg":
          floatAccountCode = "1400-001" // ECG Power Float
          feeAccountCode = "4100-301" // ECG Power Transaction Fees
          commissionAccountCode = "4200-301" // ECG Power Commission Revenue
          break
        case "nedco":
          floatAccountCode = "1400-002" // NEDCO Power Float
          feeAccountCode = "4100-302" // NEDCO Power Transaction Fees
          commissionAccountCode = "4200-302" // NEDCO Power Commission Revenue
          break
        default:
          // Default to ECG if provider not recognized
          floatAccountCode = "1400-001"
          feeAccountCode = "4100-301"
          commissionAccountCode = "4200-301"
      }

      // Get GL accounts
      const floatAccount = await this.getGLAccountByCode(floatAccountCode)
      const cashAccount = await this.getGLAccountByCode("1010-001") // Cash in Till
      const feeAccount = await this.getGLAccountByCode(feeAccountCode)

      if (!floatAccount || !cashAccount) {
        throw new Error(`Required GL accounts not found: ${floatAccountCode}, 1010-001`)
      }

      const entries: GLEntry[] = []

      // Debit: Cash in Till (payment received from customer)
      entries.push({
        accountCode: cashAccount.code,
        debit: params.amount + params.fee,
        credit: 0,
        description: `Power Payment - ${params.provider} - ${params.meterNumber}`,
        metadata: { transactionId: params.transactionId, meterNumber: params.meterNumber },
      })

      // Credit: Power Float (amount to be paid to power company)
      entries.push({
        accountCode: floatAccount.code,
        debit: 0,
        credit: params.amount,
        description: `Power Credit - ${params.provider} - ${params.meterNumber}`,
        metadata: { transactionId: params.transactionId, meterNumber: params.meterNumber },
      })

      // Credit: Power Service Revenue (our commission/fee)
      if (params.fee > 0 && feeAccount) {
        entries.push({
          accountCode: feeAccount.code,
          debit: 0,
          credit: params.fee,
          description: `Power Service Fee - ${params.provider} - ${params.meterNumber}`,
          metadata: { transactionId: params.transactionId, feeAmount: params.fee },
        })
      }

      const glTransactionData: GLTransactionData = {
        date: new Date().toISOString().split("T")[0],
        sourceModule: "power",
        sourceTransactionId: params.transactionId,
        sourceTransactionType: "power_sale",
        description: `Power sale - ${params.provider} - ${params.meterNumber}`,
        entries,
        createdBy: params.processedBy,
        branchId: params.branchId,
        metadata: {
          provider: params.provider,
          meterNumber: params.meterNumber,
          customerName: params.customerName,
          reference: params.reference,
          amount: params.amount,
          fee: params.fee,
        },
      }

      return await this.createAndPostTransaction(glTransactionData)
    } catch (error) {
      console.error("❌ Error creating Power GL entries:", error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Create E-Zwich GL entries using specific account codes
   */
  static async createEZwichGLEntries(params: {
    transactionId: string
    type: "withdrawal" | "card_issuance"
    amount: number
    fee: number
    cardNumber: string
    customerName: string
    reference: string
    processedBy: string
    branchId: string
  }): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(`💳 Creating E-Zwich GL entries for ${params.type}`)

      // Get GL accounts using specific codes
      const ezwichFloatAccount = await this.getGLAccountByCode("1300-001") // E-Zwich Float
      const cashAccount = await this.getGLAccountByCode("1010-001") // Cash in Till
      const feeAccount = await this.getGLAccountByCode("4100-201") // E-Zwich Transaction Fees
      const cardInventoryAccount = await this.getGLAccountByCode("1300-002") // E-Zwich Card Inventory
      const cardFeeAccount = await this.getGLAccountByCode("4100-202") // E-Zwich Card Issuance Fees

      if (!ezwichFloatAccount || !cashAccount) {
        throw new Error("Required GL accounts not found: 1300-001, 1010-001")
      }

      const entries: GLEntry[] = []

      if (params.type === "withdrawal") {
        // Debit: E-Zwich Float (amount we're owed by E-Zwich)
        entries.push({
          accountCode: ezwichFloatAccount.code,
          debit: params.amount,
          credit: 0,
          description: `E-Zwich withdrawal - ${params.cardNumber} - ${params.customerName}`,
          metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
        })

        // Credit: Cash in Till (cash paid to customer)
        entries.push({
          accountCode: cashAccount.code,
          debit: 0,
          credit: params.amount,
          description: `E-Zwich withdrawal - ${params.cardNumber} - ${params.customerName}`,
          metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
        })

        // Fee entries if applicable
        if (params.fee > 0 && feeAccount) {
          entries.push({
            accountCode: cashAccount.code,
            debit: params.fee,
            credit: 0,
            description: `E-Zwich withdrawal fee - ${params.cardNumber}`,
            metadata: { transactionId: params.transactionId, feeAmount: params.fee },
          })

          entries.push({
            accountCode: feeAccount.code,
            debit: 0,
            credit: params.fee,
            description: `E-Zwich withdrawal fee revenue - ${params.cardNumber}`,
            metadata: { transactionId: params.transactionId, feeAmount: params.fee },
          })
        }
      } else if (params.type === "card_issuance") {
        // Debit: Cash in Till (card fee collected)
        entries.push({
          accountCode: cashAccount.code,
          debit: params.amount,
          credit: 0,
          description: `E-Zwich card issuance fee - ${params.cardNumber} - ${params.customerName}`,
          metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
        })

        // Credit: Card Issuance Fee Revenue
        if (cardFeeAccount) {
          entries.push({
            accountCode: cardFeeAccount.code,
            debit: 0,
            credit: params.amount,
            description: `E-Zwich card issuance revenue - ${params.cardNumber} - ${params.customerName}`,
            metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
          })
        }
      }

      const glTransactionData: GLTransactionData = {
        date: new Date().toISOString().split("T")[0],
        sourceModule: "ezwich",
        sourceTransactionId: params.transactionId,
        sourceTransactionType: params.type,
        description: `E-Zwich ${params.type} - ${params.cardNumber} - ${params.customerName}`,
        entries,
        createdBy: params.processedBy,
        branchId: params.branchId,
        metadata: {
          cardNumber: params.cardNumber,
          customerName: params.customerName,
          reference: params.reference,
          amount: params.amount,
          fee: params.fee,
        },
      }

      return await this.createAndPostTransaction(glTransactionData)
    } catch (error) {
      console.error("❌ Error creating E-Zwich GL entries:", error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Create and post GL transaction
   */
  private static async createAndPostTransaction(
    transactionData: GLTransactionData,
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      // Validate entries balance
      const totalDebits = transactionData.entries.reduce((sum, entry) => sum + entry.debit, 0)
      const totalCredits = transactionData.entries.reduce((sum, entry) => sum + entry.credit, 0)

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`GL entries don't balance: Debits ${totalDebits}, Credits ${totalCredits}`)
      }

      // Check if transaction already exists
      const existingTransaction = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_transaction_id = ${transactionData.sourceTransactionId}
        AND source_module = ${transactionData.sourceModule}
      `

      if (existingTransaction.length > 0) {
        console.log(
          `GL transaction already exists for ${transactionData.sourceModule} transaction ${transactionData.sourceTransactionId}`,
        )
        return { success: true, glTransactionId: existingTransaction[0].id }
      }

      // Generate UUID for GL transaction
      const glTransactionResult = await sql`SELECT gen_random_uuid() as id`
      const glTransactionId = glTransactionResult[0].id

      // Create GL transaction
      await sql`
        INSERT INTO gl_transactions (
          id, date, source_module, source_transaction_id,
          source_transaction_type, description, status, created_by, metadata
        ) VALUES (
          ${glTransactionId}, ${transactionData.date}, ${transactionData.sourceModule},
          ${transactionData.sourceTransactionId}, ${transactionData.sourceTransactionType},
          ${transactionData.description}, 'posted', 
          ${transactionData.createdBy}, ${transactionData.metadata ? JSON.stringify(transactionData.metadata) : null}
        )
      `

      // Create journal entries
      for (const entry of transactionData.entries) {
        // Get account ID by code
        const account = await this.getGLAccountByCode(entry.accountCode)
        if (!account) {
          throw new Error(`GL account not found for code: ${entry.accountCode}`)
        }

        const entryResult = await sql`SELECT gen_random_uuid() as id`
        const entryId = entryResult[0].id

        await sql`
          INSERT INTO gl_journal_entries (
            id, transaction_id, account_id, account_code, debit,
            credit, description, metadata
          ) VALUES (
            ${entryId}, ${glTransactionId}, ${account.id}, ${entry.accountCode},
            ${entry.debit}, ${entry.credit}, ${entry.description},
            ${entry.metadata ? JSON.stringify(entry.metadata) : null}
          )
        `

        // Update account balance
        const netAmount = entry.debit - entry.credit
        await sql`
          UPDATE gl_accounts 
          SET balance = COALESCE(balance, 0) + ${netAmount},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${account.id}
        `
      }

      console.log(`✅ GL transaction created successfully: ${glTransactionId}`)
      return { success: true, glTransactionId }
    } catch (error) {
      console.error("❌ Error creating GL transaction:", error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}
