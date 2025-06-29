import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"

const sql = neon(process.env.DATABASE_URL!)

// GL Account mappings for E-Zwich operations
const GL_ACCOUNTS = {
  EZWICH_CARD_INVENTORY: { code: "1300-003", name: "E-Zwich Card Inventory" },
  ACCOUNTS_PAYABLE: { code: "2100-001", name: "Accounts Payable - E-Zwich" },
  INVENTORY_ADJUSTMENT: { code: "5200-003", name: "Inventory Adjustment - E-Zwich" },
  CARD_COST_EXPENSE: { code: "5100-003", name: "Card Cost Expense" },
}

export class GLPostingServiceExisting {
  /**
   * Check what GL tables actually exist
   */
  static async checkExistingGLTables(): Promise<string[]> {
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name ILIKE '%gl%'
        ORDER BY table_name
      `

      const tableNames = tables.map((t) => t.table_name)
      console.log("Found existing GL tables:", tableNames)
      return tableNames
    } catch (error) {
      console.error("Error checking existing GL tables:", error)
      return []
    }
  }

  /**
   * Log to existing GL sync logs table
   */
  static async logToExistingGLSyncLogs(
    module: string,
    operation: string,
    status: string,
    details: string,
    error?: string,
  ): Promise<void> {
    try {
      const existingTables = await this.checkExistingGLTables()

      // Check if gl_sync_logs exists
      if (existingTables.includes("gl_sync_logs")) {
        // Get the table structure first
        const columns = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'gl_sync_logs'
        `

        const columnNames = columns.map((c) => c.column_name)
        console.log("gl_sync_logs columns:", columnNames)

        // Build insert based on available columns
        if (columnNames.includes("id")) {
          // If ID column exists, provide explicit UUID
          const logId = uuidv4()
          await sql`
            INSERT INTO gl_sync_logs (id, module, operation, status, details, error)
            VALUES (${logId}, ${module}, ${operation}, ${status}, ${details}, ${error || null})
          `
        } else {
          // If no ID column, insert without it
          await sql`
            INSERT INTO gl_sync_logs (module, operation, status, details, error)
            VALUES (${module}, ${operation}, ${status}, ${details}, ${error || null})
          `
        }

        console.log(`✅ Logged to existing gl_sync_logs: ${module}/${operation}`)
      } else {
        console.log("⚠️ gl_sync_logs table not found, skipping GL sync logging")
      }
    } catch (logError) {
      console.error("Error logging to existing GL sync logs:", logError)
      // Don't throw here as this is just logging
    }
  }

  /**
   * Ensure required GL accounts exist in your existing gl_accounts table
   */
  static async ensureGLAccountsInExistingTable(): Promise<void> {
    try {
      const existingTables = await this.checkExistingGLTables()

      if (!existingTables.includes("gl_accounts")) {
        console.log("⚠️ gl_accounts table not found, skipping account creation")
        return
      }

      // Get the structure of your existing gl_accounts table
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'gl_accounts'
      `

      const columnNames = columns.map((c) => c.column_name)
      console.log("gl_accounts columns:", columnNames)

      const accounts = Object.values(GL_ACCOUNTS)

      for (const account of accounts) {
        // Check if account exists
        const existing = await sql`
          SELECT * FROM gl_accounts WHERE code = ${account.code}
        `

        if (existing.length === 0) {
          // Create the account using your existing table structure
          const accountId = uuidv4()

          if (columnNames.includes("id") && columnNames.includes("code") && columnNames.includes("name")) {
            await sql`
              INSERT INTO gl_accounts (id, code, name, type, is_active)
              VALUES (${accountId}, ${account.code}, ${account.name}, 'Asset', true)
            `
            console.log(`✅ Created GL account in existing table: ${account.code}`)
          } else {
            console.log(`⚠️ Cannot create account ${account.code} - missing required columns`)
          }
        }
      }
    } catch (error) {
      console.error("Error ensuring GL accounts in existing table:", error)
    }
  }

  /**
   * Create GL transaction using your existing GL tables
   */
  static async createBatchGLTransactionInExistingTables(
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
      const existingTables = await this.checkExistingGLTables()
      console.log("Working with existing GL tables:", existingTables)

      await this.ensureGLAccountsInExistingTable()

      const cardCost = 10 // GHS 10 per card
      let amount = 0

      switch (operation) {
        case "create":
          amount = batchData.quantity_received * cardCost
          description = `Card batch received: ${batchData.batch_code}`
          break
        case "update":
          const quantityDiff = batchData.quantity_received - (oldQuantity || 0)
          amount = Math.abs(quantityDiff * cardCost)
          description = `Card batch adjustment: ${batchData.batch_code}`
          break
        case "delete":
          amount = batchData.quantity_received * cardCost
          description = `Card batch deleted: ${batchData.batch_code}`
          break
      }

      // Check if your GL transactions table exists
      if (existingTables.includes("gl_transactions")) {
        // Get the structure of your existing gl_transactions table
        const transactionColumns = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'gl_transactions'
        `

        const transactionColumnNames = transactionColumns.map((c) => c.column_name)
        console.log("gl_transactions columns:", transactionColumnNames)

        // Create transaction using your existing table structure
        const transactionId = uuidv4()

        // Build the insert query dynamically based on available columns
        const insertData: any = {
          id: transactionId,
          description: description,
          status: "posted",
        }

        // Add optional columns if they exist
        if (transactionColumnNames.includes("date")) {
          insertData.date = new Date().toISOString().split("T")[0] // Current date in YYYY-MM-DD format
        }

        if (transactionColumnNames.includes("source_module")) {
          insertData.source_module = "ezwich_batch"
        }

        if (transactionColumnNames.includes("source_transaction_type")) {
          insertData.source_transaction_type = "inventory_adjustment"
        }

        if (transactionColumnNames.includes("source_transaction_id")) {
          insertData.source_transaction_id = batchData.id
        }

        if (transactionColumnNames.includes("created_by")) {
          insertData.created_by = userId
        }

        // Remove this line:
        // if (transactionColumnNames.includes("amount")) {
        //   insertData.amount = amount
        // }

        if (transactionColumnNames.includes("transaction_date")) {
          insertData.transaction_date = new Date().toISOString()
        }

        if (transactionColumnNames.includes("created_at")) {
          insertData.created_at = new Date().toISOString()
        }

        // Build the column names and values arrays
        const columnNames = Object.keys(insertData)
        const values = Object.values(insertData)

        // Create the SQL query dynamically
        if (columnNames.length > 0) {
          // Use a more robust approach for dynamic inserts
          if (columnNames.includes("id") && columnNames.includes("description") && columnNames.includes("status")) {
            // Core required fields are present, proceed with insert

            // Replace the complex if-else chain with this optimized version:
            if (
              columnNames.includes("date") &&
              columnNames.includes("source_module") &&
              columnNames.includes("created_by")
            ) {
              // Full insert with common fields (including source_transaction_type)
              await sql`
                INSERT INTO gl_transactions (
                  id, 
                  date,
                  source_module, 
                  source_transaction_type,
                  source_transaction_id, 
                  description, 
                  status, 
                  created_by
                ) VALUES (
                  ${transactionId}, 
                  ${new Date().toISOString().split("T")[0]},
                  'ezwich_batch',
                  'inventory_adjustment', 
                  ${batchData.id}, 
                  ${description}, 
                  'posted', 
                  ${userId}
                )
              `
            } else if (columnNames.includes("date")) {
              // Insert with date but minimal other fields
              await sql`
                INSERT INTO gl_transactions (
                  id, 
                  date,
                  description, 
                  status
                ) VALUES (
                  ${transactionId}, 
                  ${new Date().toISOString().split("T")[0]},
                  ${description}, 
                  'posted'
                )
              `
            } else {
              // Minimal insert without date
              await sql`
                INSERT INTO gl_transactions (
                  id, 
                  description, 
                  status
                ) VALUES (
                  ${transactionId}, 
                  ${description}, 
                  'posted'
                )
              `
            }

            console.log(`✅ Created GL transaction in existing table: ${transactionId}`)

            // Log to existing GL sync logs
            await this.logToExistingGLSyncLogs(
              "ezwich_batch",
              operation,
              "success",
              `${description} - Amount: GHS ${amount}`,
            )

            return transactionId
          } else {
            console.log("⚠️ gl_transactions table missing required columns (id, description, status)")

            // Still log to sync logs if available
            await this.logToExistingGLSyncLogs(
              "ezwich_batch",
              operation,
              "skipped",
              `${description} - Missing required columns in gl_transactions`,
            )

            return null
          }
        } else {
          console.log("⚠️ No valid columns found for gl_transactions insert")
          return null
        }
      } else {
        console.log("⚠️ gl_transactions table not found, skipping GL transaction creation")

        // Still log to sync logs if available
        await this.logToExistingGLSyncLogs(
          "ezwich_batch",
          operation,
          "skipped",
          `${description} - GL transactions table not found`,
        )

        return null
      }
    } catch (error) {
      console.error(`❌ Error creating GL transaction in existing tables for batch ${operation}:`, error)

      // Log error to existing GL sync logs
      await this.logToExistingGLSyncLogs(
        "ezwich_batch",
        operation,
        "failed",
        description || `Failed ${operation} operation`,
        error instanceof Error ? error.message : String(error),
      )

      return null
    }
  }

  /**
   * Get GL account balances from existing tables
   */
  static async getGLAccountBalancesFromExistingTables(): Promise<any[]> {
    try {
      const existingTables = await this.checkExistingGLTables()

      if (existingTables.includes("gl_account_balances")) {
        const balances = await sql`
          SELECT * FROM gl_account_balances 
          ORDER BY account_id
        `
        return balances
      } else if (existingTables.includes("gl_accounts")) {
        // If no balances table, get accounts with zero balances
        const accounts = await sql`
          SELECT id as account_id, code, name, 0 as current_balance 
          FROM gl_accounts 
          WHERE is_active = true
        `
        return accounts
      }

      return []
    } catch (error) {
      console.error("Error getting GL account balances from existing tables:", error)
      return []
    }
  }
}
