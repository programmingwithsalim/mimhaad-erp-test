import { sql } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

// GL Account mappings for Jumia operations
const GL_ACCOUNTS = {
  JUMIA_RECEIVABLE: { code: "1200-001", name: "Jumia Receivable" },
  JUMIA_PAYABLE: { code: "2200-001", name: "Jumia Payable" },
  JUMIA_REVENUE: { code: "4100-001", name: "Jumia Commission Revenue" },
  CASH_IN_HAND: { code: "1100-001", name: "Cash in Hand" },
}

export class JumiaGLServiceEnhanced {
  /**
   * Test GL posting for Jumia transaction
   */
  static async testGLPosting(
    userId: string,
    branchId: string,
  ): Promise<{
    success: boolean
    transactionId?: string
    error?: string
    details?: any
  }> {
    console.log("🚀 Starting test GL posting for Jumia")

    try {
      // 1. Check if required tables exist
      const tablesExist = await this.checkRequiredTables()
      if (!tablesExist.success) {
        return {
          success: false,
          error: `Missing required tables: ${tablesExist.missingTables.join(", ")}`,
          details: tablesExist,
        }
      }

      // 2. Ensure GL accounts exist
      const accountsExist = await this.ensureGLAccounts()
      if (!accountsExist.success) {
        return {
          success: false,
          error: "Failed to ensure GL accounts",
          details: accountsExist,
        }
      }

      // 3. Create a test GL transaction
      const transactionId = uuidv4()
      const amount = 100.0 // GHS 100
      const description = "Test Jumia POD GL Transaction"

      // Insert main transaction
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
          'jumia', 
          ${"test-" + uuidv4()},
          'pod', 
          ${description}, 
          'pending', 
          ${userId}
        )
      `

      // Get account IDs
      const receivableAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.JUMIA_RECEIVABLE.code} LIMIT 1
      `

      const revenueAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${GL_ACCOUNTS.JUMIA_REVENUE.code} LIMIT 1
      `

      if (receivableAccount.length === 0 || revenueAccount.length === 0) {
        return {
          success: false,
          error: "Required GL accounts not found",
          details: { receivableAccount, revenueAccount },
        }
      }

      // Insert transaction entries
      try {
        // Debit entry (Receivable)
        await sql`
          INSERT INTO gl_transaction_entries (
            transaction_id, account_id, account_code, debit, credit, description
          ) VALUES (
            ${transactionId}, 
            ${receivableAccount[0].id}, 
            ${GL_ACCOUNTS.JUMIA_RECEIVABLE.code},
            ${amount}, 0, 
            'Jumia POD receivable'
          )
        `

        // Credit entry (Revenue)
        await sql`
          INSERT INTO gl_transaction_entries (
            transaction_id, account_id, account_code, debit, credit, description
          ) VALUES (
            ${transactionId}, 
            ${revenueAccount[0].id}, 
            ${GL_ACCOUNTS.JUMIA_REVENUE.code},
            0, ${amount}, 
            'Jumia POD commission revenue'
          )
        `
      } catch (entriesError) {
        console.error("Error creating GL transaction entries:", entriesError)
        return {
          success: false,
          transactionId,
          error: "Failed to create GL transaction entries",
          details: entriesError instanceof Error ? entriesError.message : String(entriesError),
        }
      }

      // 4. Post the transaction
      try {
        await sql`
          UPDATE gl_transactions 
          SET status = 'posted', posted_by = ${userId}, posted_at = NOW()
          WHERE id = ${transactionId}
        `
      } catch (postError) {
        console.error("Error posting GL transaction:", postError)
        return {
          success: false,
          transactionId,
          error: "Failed to post GL transaction",
          details: postError instanceof Error ? postError.message : String(postError),
        }
      }

      // 5. Verify the transaction was created
      const verifyTransaction = await sql`
        SELECT t.id, t.description, t.status, 
               COUNT(e.id) as entry_count,
               SUM(e.debit) as total_debit,
               SUM(e.credit) as total_credit
        FROM gl_transactions t
        LEFT JOIN gl_transaction_entries e ON t.id = e.transaction_id
        WHERE t.id = ${transactionId}
        GROUP BY t.id, t.description, t.status
      `

      if (verifyTransaction.length === 0) {
        return {
          success: false,
          transactionId,
          error: "Transaction created but not found in verification",
          details: { verifyTransaction },
        }
      }

      return {
        success: true,
        transactionId,
        details: {
          transaction: verifyTransaction[0],
          message: "GL transaction created and posted successfully",
        },
      }
    } catch (error) {
      console.error("Error in test GL posting:", error)
      return {
        success: false,
        error: "Error in test GL posting",
        details: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check if required tables exist
   */
  static async checkRequiredTables(): Promise<{
    success: boolean
    missingTables: string[]
    existingTables: string[]
  }> {
    const requiredTables = ["gl_accounts", "gl_transactions", "gl_transaction_entries"]
    const missingTables: string[] = []
    const existingTables: string[] = []

    for (const table of requiredTables) {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        ) as exists
      `

      if (!tableCheck[0]?.exists) {
        missingTables.push(table)
      } else {
        existingTables.push(table)
      }
    }

    return {
      success: missingTables.length === 0,
      missingTables,
      existingTables,
    }
  }

  /**
   * Ensure GL accounts exist
   */
  static async ensureGLAccounts(): Promise<{
    success: boolean
    created: number
    existing: number
    error?: string
  }> {
    try {
      let created = 0
      let existing = 0

      for (const [key, account] of Object.entries(GL_ACCOUNTS)) {
        // Check if account exists
        const accountCheck = await sql`
          SELECT id FROM gl_accounts WHERE code = ${account.code}
        `

        if (accountCheck.length === 0) {
          // Create account
          const accountId = uuidv4()
          await sql`
            INSERT INTO gl_accounts (id, code, name, type, is_active)
            VALUES (
              ${accountId}, 
              ${account.code}, 
              ${account.name}, 
              ${key.includes("REVENUE") ? "Revenue" : key.includes("PAYABLE") ? "Liability" : "Asset"}, 
              true
            )
          `
          created++
        } else {
          existing++
        }
      }

      return {
        success: true,
        created,
        existing,
      }
    } catch (error) {
      console.error("Error ensuring GL accounts:", error)
      return {
        success: false,
        created: 0,
        existing: 0,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Post Jumia transaction to GL
   */
  static async postJumiaTransactionToGL(
    transaction: {
      id: string
      amount: number
      transactionType: string
      description: string
    },
    userId: string,
    branchId: string,
  ): Promise<{
    success: boolean
    transactionId?: string
    error?: string
  }> {
    try {
      // Check if required tables exist
      const tablesExist = await this.checkRequiredTables()
      if (!tablesExist.success) {
        console.error("Missing required tables:", tablesExist.missingTables)
        return {
          success: false,
          error: `Missing required tables: ${tablesExist.missingTables.join(", ")}`,
        }
      }

      // Ensure GL accounts exist
      await this.ensureGLAccounts()

      // Create GL transaction
      const transactionId = uuidv4()
      const description = `Jumia ${transaction.transactionType.toUpperCase()}: ${transaction.description}`

      // Insert main transaction
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
          'jumia', 
          ${transaction.id},
          ${transaction.transactionType}, 
          ${description}, 
          'pending', 
          ${userId}
        )
      `

      // Get account IDs based on transaction type
      let debitAccountCode, creditAccountCode

      if (transaction.transactionType === "pod") {
        debitAccountCode = GL_ACCOUNTS.JUMIA_RECEIVABLE.code
        creditAccountCode = GL_ACCOUNTS.JUMIA_REVENUE.code
      } else {
        // Default for other transaction types
        debitAccountCode = GL_ACCOUNTS.CASH_IN_HAND.code
        creditAccountCode = GL_ACCOUNTS.JUMIA_PAYABLE.code
      }

      const debitAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${debitAccountCode} LIMIT 1
      `

      const creditAccount = await sql`
        SELECT id FROM gl_accounts WHERE code = ${creditAccountCode} LIMIT 1
      `

      if (debitAccount.length === 0 || creditAccount.length === 0) {
        return {
          success: false,
          error: "Required GL accounts not found",
        }
      }

      // Insert transaction entries
      try {
        // Debit entry
        await sql`
          INSERT INTO gl_transaction_entries (
            transaction_id, account_id, account_code, debit, credit, description
          ) VALUES (
            ${transactionId}, 
            ${debitAccount[0].id}, 
            ${debitAccountCode},
            ${transaction.amount}, 0, 
            ${`Jumia ${transaction.transactionType} debit`}
          )
        `

        // Credit entry
        await sql`
          INSERT INTO gl_transaction_entries (
            transaction_id, account_id, account_code, debit, credit, description
          ) VALUES (
            ${transactionId}, 
            ${creditAccount[0].id}, 
            ${creditAccountCode},
            0, ${transaction.amount}, 
            ${`Jumia ${transaction.transactionType} credit`}
          )
        `
      } catch (entriesError) {
        console.error("Error creating GL transaction entries:", entriesError)
        return {
          success: false,
          transactionId,
          error: "Failed to create GL transaction entries",
        }
      }

      // Post the transaction
      await sql`
        UPDATE gl_transactions 
        SET status = 'posted', posted_by = ${userId}, posted_at = NOW()
        WHERE id = ${transactionId}
      `

      return {
        success: true,
        transactionId,
      }
    } catch (error) {
      console.error("Error posting Jumia transaction to GL:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
