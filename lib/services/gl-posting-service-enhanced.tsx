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
  accountId: string
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
  branchName?: string
  metadata?: Record<string, any>
}

export class GLPostingServiceEnhanced {
  /**
   * Debug GL tables and operations
   */
  static async debugGLTables(): Promise<void> {
    try {
      console.log("🔍 Debugging GL tables...")

      // Check existing tables
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name ILIKE '%gl%'
        ORDER BY table_name
      `

      console.log(
        "📋 Found GL tables:",
        tables.map((t) => t.table_name),
      )

      // Check gl_accounts
      if (tables.some((t) => t.table_name === "gl_accounts")) {
        const accounts = await sql`SELECT code, name FROM gl_accounts ORDER BY code`
        console.log("💰 GL Accounts:", accounts)
      }

      // Check gl_transactions
      if (tables.some((t) => t.table_name === "gl_transactions")) {
        const recentTransactions = await sql`
          SELECT id, description, status, created_at 
          FROM gl_transactions 
          ORDER BY created_at DESC 
          LIMIT 5
        `
        console.log("📊 Recent GL Transactions:", recentTransactions)
      }

      // Check gl_sync_logs
      if (tables.some((t) => t.table_name === "gl_sync_logs")) {
        const recentLogs = await sql`
          SELECT module, operation, status, details, created_at 
          FROM gl_sync_logs 
          ORDER BY created_at DESC 
          LIMIT 5
        `
        console.log("📝 Recent GL Sync Logs:", recentLogs)
      }
    } catch (error) {
      console.error("❌ Error debugging GL tables:", error)
    }
  }

  /**
   * Ensure GL accounts exist with proper error handling
   */
  static async ensureGLAccounts(): Promise<boolean> {
    try {
      console.log("🔧 Ensuring GL accounts exist...")

      // Check if gl_accounts table exists
      const tableCheck = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gl_accounts'
      `

      if (tableCheck.length === 0) {
        console.log("⚠️ gl_accounts table not found")
        return false
      }

      const accounts = Object.values(GL_ACCOUNTS)
      let accountsCreated = 0

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

          // Create balance record if table exists
          try {
            await sql`
              INSERT INTO gl_account_balances (account_id, current_balance)
              VALUES (${accountId}, 0)
              ON CONFLICT (account_id) DO NOTHING
            `
          } catch (balanceError) {
            console.log("⚠️ gl_account_balances table might not exist")
          }

          console.log(`✅ Created GL account: ${account.code} - ${account.name}`)
          accountsCreated++
        }
      }

      console.log(`✅ GL accounts check complete. Created: ${accountsCreated}`)
      return true
    } catch (error) {
      console.error("❌ Error ensuring GL accounts:", error)
      return false
    }
  }

  /**
   * Create GL transaction with enhanced logging
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
    console.log(`🚀 Starting GL transaction for batch ${operation}:`, {
      batchCode: batchData.batch_code,
      quantity: batchData.quantity_received,
      userId,
      branchId,
    })

    try {
      // Debug GL tables first
      await this.debugGLTables()

      // Ensure accounts exist
      const accountsReady = await this.ensureGLAccounts()
      if (!accountsReady) {
        console.log("⚠️ GL accounts not ready, skipping GL transaction")
        return null
      }

      const cardCost = 10 // GHS 10 per card
      let amount = 0
      let description = ""

      switch (operation) {
        case "create":
          amount = batchData.quantity_received * cardCost
          description = `E-Zwich batch received: ${batchData.batch_code} (${batchData.quantity_received} cards)`
          break
        case "update":
          const quantityDiff = batchData.quantity_received - (oldQuantity || 0)
          amount = Math.abs(quantityDiff * cardCost)
          description = `E-Zwich batch adjusted: ${batchData.batch_code} (${quantityDiff > 0 ? "+" : ""}${quantityDiff} cards)`
          break
        case "delete":
          amount = batchData.quantity_received * cardCost
          description = `E-Zwich batch deleted: ${batchData.batch_code} (${batchData.quantity_received} cards)`
          break
      }

      console.log(`💰 GL Transaction Details:`, { operation, amount, description })

      // Check if gl_transactions table exists
      const transactionTableCheck = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gl_transactions'
      `

      if (transactionTableCheck.length === 0) {
        console.log("⚠️ gl_transactions table not found, creating simple log entry")

        // Try to log to gl_sync_logs instead
        try {
          const logId = uuidv4()
          await sql`
            INSERT INTO gl_sync_logs (id, module, operation, status, details)
            VALUES (${logId}, 'ezwich_batch', ${operation}, 'completed', ${description})
          `
          console.log("✅ Logged to gl_sync_logs instead")
        } catch (logError) {
          console.log("⚠️ Could not log to gl_sync_logs either")
        }

        return null
      }

      // Create GL transaction
      const transactionId = uuidv4()

      try {
        await sql`
          INSERT INTO gl_transactions (
            id, 
            date, 
            source_module, 
            source_transaction_id, 
            source_transaction_type,
            description, 
            status, 
            created_by
          ) VALUES (
            ${transactionId}, 
            CURRENT_DATE, 
            'ezwich_batch', 
            ${batchData.id},
            ${`batch_${operation}`}, 
            ${description}, 
            'posted', 
            ${userId}
          )
        `

        console.log(`✅ GL transaction created: ${transactionId}`)

        // Create transaction entries if table exists
        try {
          const inventoryAccount = await sql`
            SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code}
          `
          const payableAccount = await sql`
            SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.ACCOUNTS_PAYABLE.code}
          `

          if (inventoryAccount.length > 0 && payableAccount.length > 0 && operation === "create") {
            // Create debit entry (Inventory)
            await sql`
              INSERT INTO gl_transaction_entries (
                transaction_id, account_id, account_code, debit, credit, description
              ) VALUES (
                ${transactionId}, ${inventoryAccount[0].id}, ${GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code},
                ${amount}, 0, 'Card inventory increase - ${batchData.batch_code}'
              )
            `

            // Create credit entry (Accounts Payable)
            await sql`
              INSERT INTO gl_transaction_entries (
                transaction_id, account_id, account_code, debit, credit, description
              ) VALUES (
                ${transactionId}, ${payableAccount[0].id}, ${GL_ACCOUNTS.ACCOUNTS_PAYABLE.code},
                0, ${amount}, 'Payable for card batch - ${batchData.batch_code}'
              )
            `

            console.log(`✅ GL entries created for GHS ${amount}`)

            // Update account balances if table exists
            try {
              await sql`
                UPDATE gl_account_balances 
                SET current_balance = COALESCE(current_balance, 0) + ${amount},
                    last_updated = CURRENT_TIMESTAMP
                WHERE account_id = ${inventoryAccount[0].id}
              `

              await sql`
                UPDATE gl_account_balances 
                SET current_balance = COALESCE(current_balance, 0) + ${amount},
                    last_updated = CURRENT_TIMESTAMP
                WHERE account_id = ${payableAccount[0].id}
              `

              console.log("✅ Account balances updated")
            } catch (balanceError) {
              console.log("⚠️ Could not update account balances:", balanceError)
            }
          }
        } catch (entryError) {
          console.log("⚠️ Could not create transaction entries:", entryError)
        }

        // Log to gl_sync_logs
        try {
          const logId = uuidv4()
          await sql`
            INSERT INTO gl_sync_logs (id, module, operation, status, details)
            VALUES (${logId}, 'ezwich_batch', ${operation}, 'success', ${`${description} - Amount: GHS ${amount} - Transaction: ${transactionId}`})
          `
          console.log("✅ Logged to gl_sync_logs")
        } catch (logError) {
          console.log("⚠️ Could not log to gl_sync_logs:", logError)
        }

        // Log audit
        try {
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
            },
            severity: "medium",
            branchId,
          })
          console.log("✅ Audit log created")
        } catch (auditError) {
          console.log("⚠️ Could not create audit log:", auditError)
        }

        return transactionId
      } catch (transactionError) {
        console.error("❌ Error creating GL transaction:", transactionError)
        return null
      }
    } catch (error) {
      console.error(`❌ Error in GL posting for batch ${operation}:`, error)
      return null
    }
  }

  /**
   * Create MoMo GL entries with proper account mapping
   */
  static async createMoMoGLEntries(params: {
    transactionId: string
    type: "cash-in" | "cash-out"
    amount: number
    fee: number
    provider: string
    phoneNumber: string
    customerName: string
    reference: string
    processedBy: string
    branchId?: string
    branchName?: string
  }): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log("🔄 [GL] Creating MoMo GL entries for transaction:", params.transactionId)

      // Ensure GL tables exist
      await this.ensureGLTablesExist()

      // Get or create required GL accounts
      const cashAccount = await this.getOrCreateGLAccount("1001", "Cash in Till", "Asset")
      const momoFloatAccount = await this.getOrCreateGLAccount("1002", "MoMo Float Account", "Asset")
      const feeRevenueAccount = await this.getOrCreateGLAccount("4001", "MoMo Fee Revenue", "Revenue")

      if (!cashAccount || !momoFloatAccount || !feeRevenueAccount) {
        throw new Error("Failed to get or create required GL accounts")
      }

      console.log("✅ [GL] GL accounts ready:", {
        cash: cashAccount.code,
        momoFloat: momoFloatAccount.code,
        feeRevenue: feeRevenueAccount.code,
      })

      const entries: GLEntry[] = []

      // Main transaction entries
      if (params.type === "cash-in") {
        // Customer gives cash, we give them MoMo credit
        // Dr. Cash in Till, Cr. MoMo Float
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: params.amount,
          credit: 0,
          description: `MoMo Cash-In - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        })

        entries.push({
          accountId: momoFloatAccount.id,
          accountCode: momoFloatAccount.code,
          debit: 0,
          credit: params.amount,
          description: `MoMo Cash-In - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        })
      } else {
        // Customer withdraws cash, we debit their MoMo balance
        // Dr. MoMo Float, Cr. Cash in Till
        entries.push({
          accountId: momoFloatAccount.id,
          accountCode: momoFloatAccount.code,
          debit: params.amount,
          credit: 0,
          description: `MoMo Cash-Out - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        })

        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: 0,
          credit: params.amount,
          description: `MoMo Cash-Out - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        })
      }

      // Fee entries
      if (params.fee > 0) {
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: params.fee,
          credit: 0,
          description: `MoMo Transaction Fee - ${params.provider}`,
          metadata: {
            transactionId: params.transactionId,
            feeAmount: params.fee,
            provider: params.provider,
          },
        })

        entries.push({
          accountId: feeRevenueAccount.id,
          accountCode: feeRevenueAccount.code,
          debit: 0,
          credit: params.fee,
          description: `MoMo Fee Revenue - ${params.provider}`,
          metadata: {
            transactionId: params.transactionId,
            feeAmount: params.fee,
            provider: params.provider,
          },
        })
      }

      console.log(`✅ [GL] Created ${entries.length} GL entries`)

      // Validate entries balance
      const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0)
      const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0)

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`GL entries don't balance: Debits ${totalDebits}, Credits ${totalCredits}`)
      }

      console.log("✅ [GL] Entries balanced:", { totalDebits, totalCredits })

      const glTransactionData: GLTransactionData = {
        date: new Date().toISOString().split("T")[0],
        sourceModule: "momo",
        sourceTransactionId: params.transactionId,
        sourceTransactionType: params.type,
        description: `MoMo ${params.type} - ${params.provider} - ${params.phoneNumber}`,
        entries,
        createdBy: params.processedBy,
        branchId: params.branchId,
        branchName: params.branchName,
        metadata: {
          provider: params.provider,
          phoneNumber: params.phoneNumber,
          customerName: params.customerName,
          reference: params.reference,
          amount: params.amount,
          fee: params.fee,
        },
      }

      return await this.createAndPostTransaction(glTransactionData, true)
    } catch (error) {
      console.error("❌ [GL] Error creating MoMo GL entries:", error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Create and post GL transaction
   */
  static async createAndPostTransaction(
    transactionData: GLTransactionData,
    autoPost = true,
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      // Check if GL transaction already exists
      const existingTransaction = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_transaction_id = ${transactionData.sourceTransactionId}
        AND source_module = ${transactionData.sourceModule}
      `

      if (existingTransaction.length > 0) {
        console.log(
          `✅ [GL] Transaction already exists for ${transactionData.sourceModule} transaction ${transactionData.sourceTransactionId}`,
        )
        return { success: true, glTransactionId: existingTransaction[0].id }
      }

      // Generate GL transaction ID
      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`
      const glTransactionId = glTransactionIdResult[0].id

      console.log("🔄 [GL] Creating GL transaction:", glTransactionId)

      // Create main GL transaction record
      await sql`
        INSERT INTO gl_transactions (
          id, date, source_module, source_transaction_id,
          source_transaction_type, description, status, created_by, metadata
        ) VALUES (
          ${glTransactionId}, ${transactionData.date}::date, ${transactionData.sourceModule},
          ${transactionData.sourceTransactionId}, ${transactionData.sourceTransactionType},
          ${transactionData.description}, ${autoPost ? "posted" : "pending"}, 
          ${transactionData.createdBy}, ${transactionData.metadata ? JSON.stringify(transactionData.metadata) : null}
        )
      `

      console.log("✅ [GL] GL transaction record created")

      // Create GL journal entries
      for (const entry of transactionData.entries) {
        const entryId = await sql`SELECT gen_random_uuid() as id`
        await sql`
          INSERT INTO gl_journal_entries (
            id, transaction_id, account_id, account_code, debit,
            credit, description, metadata
          ) VALUES (
            ${entryId[0].id}, ${glTransactionId}, ${entry.accountId}, ${entry.accountCode},
            ${entry.debit}, ${entry.credit}, ${entry.description},
            ${entry.metadata ? JSON.stringify(entry.metadata) : null}
          )
        `
      }

      console.log(`✅ [GL] Created ${transactionData.entries.length} journal entries`)

      // Update account balances if auto-posting
      if (autoPost) {
        await this.updateAccountBalances(transactionData.entries)
        console.log("✅ [GL] Account balances updated")
      }

      return { success: true, glTransactionId }
    } catch (error) {
      console.error("❌ [GL] Error creating GL transaction:", error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Get or create GL account
   */
  private static async getOrCreateGLAccount(code: string, name: string, type: string): Promise<any> {
    try {
      // Check if account exists
      const existing = await sql`
        SELECT id, code, name, type
        FROM gl_accounts
        WHERE code = ${code} AND is_active = true
      `

      if (existing.length > 0) {
        return existing[0]
      }

      // Create new account
      const accountId = await sql`SELECT gen_random_uuid() as id`
      const newAccount = await sql`
        INSERT INTO gl_accounts (id, code, name, type, balance, is_active)
        VALUES (${accountId[0].id}, ${code}, ${name}, ${type}, 0, true)
        RETURNING id, code, name, type
      `

      console.log(`✅ [GL] Created GL account: ${code} - ${name}`)
      return newAccount[0]
    } catch (error) {
      console.error(`❌ [GL] Failed to get or create GL account ${code}:`, error)
      return null
    }
  }

  /**
   * Update account balances
   */
  private static async updateAccountBalances(entries: GLEntry[]): Promise<void> {
    for (const entry of entries) {
      const netAmount = entry.debit - entry.credit
      await sql`
        UPDATE gl_accounts 
        SET balance = COALESCE(balance, 0) + ${netAmount},
            updated_at = NOW()
        WHERE id = ${entry.accountId}
      `
    }
  }

  /**
   * Ensure GL tables exist
   */
  private static async ensureGLTablesExist(): Promise<void> {
    try {
      // Create gl_accounts table
      await sql`
        CREATE TABLE IF NOT EXISTS gl_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
          parent_id UUID,
          balance DECIMAL(15,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create gl_transactions table
      await sql`
        CREATE TABLE IF NOT EXISTS gl_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          date DATE NOT NULL,
          source_module VARCHAR(50) NOT NULL,
          source_transaction_id VARCHAR(255) NOT NULL,
          source_transaction_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'reversed')),
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          posted_by VARCHAR(255),
          posted_at TIMESTAMP WITH TIME ZONE,
          reversed_by VARCHAR(255),
          reversed_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB
        )
      `

      // Create gl_journal_entries table
      await sql`
        CREATE TABLE IF NOT EXISTS gl_journal_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_id UUID NOT NULL,
          account_id UUID NOT NULL,
          account_code VARCHAR(20) NOT NULL,
          debit DECIMAL(15,2) DEFAULT 0,
          credit DECIMAL(15,2) DEFAULT 0,
          description TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Add foreign key constraints if they don't exist
      try {
        await sql`
          ALTER TABLE gl_journal_entries 
          ADD CONSTRAINT IF NOT EXISTS gl_journal_entries_transaction_id_fkey 
          FOREIGN KEY (transaction_id) REFERENCES gl_transactions(id)
        `
      } catch (error) {
        // Constraint might already exist
      }

      try {
        await sql`
          ALTER TABLE gl_journal_entries 
          ADD CONSTRAINT IF NOT EXISTS gl_journal_entries_account_id_fkey 
          FOREIGN KEY (account_id) REFERENCES gl_accounts(id)
        `
      } catch (error) {
        // Constraint might already exist
      }

      console.log("✅ [GL] GL tables ensured to exist")
    } catch (error) {
      console.error("❌ [GL] Error ensuring GL tables exist:", error)
      throw error
    }
  }
}
