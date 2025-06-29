import { sql } from "@/lib/db"

export class JumiaGLServiceSimple {
  /**
   * Check GL transactions table structure
   */
  static async checkGLTransactionsTableStructure(): Promise<{
    success: boolean
    columns?: any[]
    error?: string
  }> {
    try {
      const columns = await sql`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'gl_transactions' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `

      return {
        success: true,
        columns,
      }
    } catch (error) {
      console.error("Error checking GL transactions table structure:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Fix GL transactions table structure
   */
  static async fixGLTransactionsTable(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // First, check if the table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'gl_transactions'
        ) as exists
      `

      if (!tableExists[0]?.exists) {
        // Create the table with proper structure
        await sql`
          CREATE TABLE gl_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            source_module VARCHAR(50),
            source_transaction_id VARCHAR(255),
            source_transaction_type VARCHAR(50),
            description TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            posted_by VARCHAR(255),
            posted_at TIMESTAMP
          )
        `
      } else {
        // Check if id column has proper default
        const idColumn = await sql`
          SELECT column_default 
          FROM information_schema.columns 
          WHERE table_name = 'gl_transactions' 
          AND column_name = 'id'
          AND table_schema = 'public'
        `

        if (!idColumn[0]?.column_default?.includes("gen_random_uuid")) {
          // Add default UUID generation to existing table
          await sql`
            ALTER TABLE gl_transactions 
            ALTER COLUMN id SET DEFAULT gen_random_uuid()
          `
        }
      }

      return { success: true }
    } catch (error) {
      console.error("Error fixing GL transactions table:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check if GL transaction entries table exists
   */
  static async checkGLEntriesTable(): Promise<{
    exists: boolean
    error?: string
  }> {
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'gl_transaction_entries'
        ) as exists
      `

      return {
        exists: result[0]?.exists || false,
      }
    } catch (error) {
      console.error("Error checking GL entries table:", error)
      return {
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Create GL transaction entries table
   */
  static async createGLEntriesTable(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS gl_transaction_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_id UUID NOT NULL,
          account_id UUID,
          account_code VARCHAR(20) NOT NULL,
          debit DECIMAL(15,2) DEFAULT 0,
          credit DECIMAL(15,2) DEFAULT 0,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (transaction_id) REFERENCES gl_transactions(id) ON DELETE CASCADE
        )
      `

      // Create indexes for better performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_gl_entries_transaction_id 
        ON gl_transaction_entries(transaction_id)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_gl_entries_account_code 
        ON gl_transaction_entries(account_code)
      `

      return { success: true }
    } catch (error) {
      console.error("Error creating GL entries table:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Test GL posting with explicit UUID generation
   */
  static async testGLPosting(): Promise<{
    success: boolean
    transactionId?: string
    error?: string
    details?: any
  }> {
    try {
      // Check if tables exist
      const tablesCheck = await this.checkGLEntriesTable()
      if (!tablesCheck.exists) {
        return {
          success: false,
          error: "GL transaction entries table does not exist",
        }
      }

      // Generate UUID explicitly
      const uuidResult = await sql`SELECT gen_random_uuid() as id`
      const transactionId = uuidResult[0]?.id

      if (!transactionId) {
        return {
          success: false,
          error: "Failed to generate transaction ID",
        }
      }

      // Create a test transaction with explicit ID
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
          ${"test-" + Date.now()},
          'pod', 
          'Test Jumia POD GL Transaction', 
          'pending', 
          'test-user'
        )
      `

      // Create test entries
      await sql`
        INSERT INTO gl_transaction_entries (
          transaction_id, account_code, debit, credit, description
        ) VALUES 
        (${transactionId}, '1200-001', 100.00, 0, 'Test Jumia receivable'),
        (${transactionId}, '4100-001', 0, 100.00, 'Test Jumia revenue')
      `

      // Update transaction status
      await sql`
        UPDATE gl_transactions 
        SET status = 'posted', posted_at = NOW()
        WHERE id = ${transactionId}
      `

      // Verify the transaction
      const verification = await sql`
        SELECT 
          t.id, 
          t.description, 
          t.status,
          COUNT(e.id) as entry_count,
          SUM(e.debit) as total_debit,
          SUM(e.credit) as total_credit
        FROM gl_transactions t
        LEFT JOIN gl_transaction_entries e ON t.id = e.transaction_id
        WHERE t.id = ${transactionId}
        GROUP BY t.id, t.description, t.status
      `

      return {
        success: true,
        transactionId,
        details: verification[0],
      }
    } catch (error) {
      console.error("Error in test GL posting:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get GL transactions for Jumia
   */
  static async getJumiaGLTransactions(): Promise<{
    success: boolean
    transactions?: any[]
    error?: string
  }> {
    try {
      const transactions = await sql`
        SELECT 
          t.id,
          t.date,
          t.source_transaction_id,
          t.source_transaction_type,
          t.description,
          t.status,
          t.created_at,
          COUNT(e.id) as entry_count,
          SUM(e.debit) as total_debit,
          SUM(e.credit) as total_credit
        FROM gl_transactions t
        LEFT JOIN gl_transaction_entries e ON t.id = e.transaction_id
        WHERE t.source_module = 'jumia'
        GROUP BY t.id, t.date, t.source_transaction_id, t.source_transaction_type, 
                 t.description, t.status, t.created_at
        ORDER BY t.created_at DESC
        LIMIT 20
      `

      return {
        success: true,
        transactions,
      }
    } catch (error) {
      console.error("Error getting Jumia GL transactions:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get comprehensive diagnostics
   */
  static async getDiagnostics(): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const tableStructure = await this.checkGLTransactionsTableStructure()
      const entriesTableExists = await this.checkGLEntriesTable()
      const jumiaTransactions = await this.getJumiaGLTransactions()

      return {
        success: true,
        data: {
          glTransactionsStructure: tableStructure,
          entriesTableExists: entriesTableExists.exists,
          jumiaTransactions: jumiaTransactions.transactions || [],
        },
      }
    } catch (error) {
      console.error("Error getting diagnostics:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}
