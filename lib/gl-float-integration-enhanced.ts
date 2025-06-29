import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Server-side GL Float Integration Service
 * Uses existing database connection from lib/db.ts and adapts to existing table structure
 */

export class GLFloatIntegrationService {
  async getGLAccountsWithFloatBalances() {
    try {
      const result = await sql`
        SELECT 
          gl.id as gl_account_id,
          gl.code as gl_account_code,
          gl.name as gl_account_name,
          gl.type as gl_account_type,
          gl.balance as gl_balance,
          fa.id as float_account_id,
          fa.provider as float_provider,
          fa.account_type as float_account_type,
          fa.current_balance as float_balance,
          CASE 
            WHEN fa.id IS NOT NULL THEN ABS(gl.balance - fa.current_balance)
            ELSE NULL
          END as variance
        FROM gl_accounts gl
        LEFT JOIN float_accounts fa ON gl.code = fa.account_number
        WHERE gl.is_active = true
        ORDER BY gl.code
      `

      return result
    } catch (error) {
      console.error("Error fetching GL-Float integration data:", error)
      throw error
    }
  }

  async syncFloatBalancesToGL() {
    try {
      const floatAccounts = await sql`
        SELECT * FROM float_accounts WHERE is_active = true
      `

      for (const account of floatAccounts) {
        // Find corresponding GL account
        const glAccount = await sql`
          SELECT * FROM gl_accounts 
          WHERE code = ${account.account_number} OR name ILIKE ${"%" + account.provider + "%"}
          LIMIT 1
        `

        if (glAccount.length > 0) {
          // Update GL account balance
          await sql`
            UPDATE gl_accounts 
            SET balance = ${account.current_balance},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${glAccount[0].id}
          `
        }
      }

      return { success: true, message: "Float balances synced to GL successfully" }
    } catch (error) {
      console.error("Error syncing float balances to GL:", error)
      throw error
    }
  }

  async generateReconciliationReport(): Promise<{
    matched: any[]
    variances: any[]
    unmapped: any[]
    summary: {
      totalAccounts: number
      matchedAccounts: number
      varianceAccounts: number
      unmappedAccounts: number
      totalVariance: number
    }
  }> {
    try {
      const accounts = await this.getGLAccountsWithFloatBalances()

      const matched = accounts.filter((acc) => acc.float_account_id && acc.variance !== null && acc.variance < 0.01)
      const variances = accounts.filter((acc) => acc.float_account_id && acc.variance !== null && acc.variance >= 0.01)
      const unmapped = accounts.filter((acc) => !acc.float_account_id)
      const totalVariance = variances.reduce((sum, acc) => sum + (acc.variance || 0), 0)

      return {
        matched,
        variances,
        unmapped,
        summary: {
          totalAccounts: accounts.length,
          matchedAccounts: matched.length,
          varianceAccounts: variances.length,
          unmappedAccounts: unmapped.length,
          totalVariance,
        },
      }
    } catch (error) {
      console.error("Error generating reconciliation report:", error)
      return {
        matched: [],
        variances: [],
        unmapped: [],
        summary: {
          totalAccounts: 0,
          matchedAccounts: 0,
          varianceAccounts: 0,
          unmappedAccounts: 0,
          totalVariance: 0,
        },
      }
    }
  }

  async getDatabaseStructure(): Promise<any> {
    try {
      // Get all relevant tables and their columns
      const tableInfo = await sql`
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND (
          t.table_name LIKE '%gl%' OR 
          t.table_name LIKE '%account%' OR 
          t.table_name LIKE '%ledger%' OR
          t.table_name = 'float_accounts'
        )
        ORDER BY t.table_name, c.ordinal_position
      `

      // Group by table
      const tables: Record<string, any[]> = {}
      tableInfo.forEach((row: any) => {
        if (!tables[row.table_name]) {
          tables[row.table_name] = []
        }
        tables[row.table_name].push({
          column: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable,
          default: row.column_default,
        })
      })

      // Get sample data from key tables
      const sampleData: Record<string, any[]> = {}

      for (const tableName of Object.keys(tables)) {
        try {
          const samples = await sql`
            SELECT * FROM ${sql(tableName)} 
            LIMIT 3
          `
          sampleData[tableName] = samples
        } catch (error) {
          sampleData[tableName] = []
        }
      }

      return {
        tables,
        sampleData,
        analysis: {
          hasGLAccounts: "gl_accounts" in tables,
          hasChartOfAccounts: "chart_of_accounts" in tables,
          hasFloatAccounts: "float_accounts" in tables,
          hasAccountBalances: "account_balances" in tables,
          hasGLBalances: "gl_account_balances" in tables,
        },
      }
    } catch (error) {
      console.error("Error getting database structure:", error)
      return { error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  async enhanceExistingGLWithFloatAccounts(): Promise<void> {
    console.log("Enhancement function called - implementation pending database structure analysis")
    // Implementation will be added once we understand the correct table structure
  }
}

// Export standalone functions for easier use
export async function getGLAccountsWithFloatBalances() {
  const service = new GLFloatIntegrationService()
  return service.getGLAccountsWithFloatBalances()
}

export async function generateReconciliationReport() {
  const service = new GLFloatIntegrationService()
  return service.generateReconciliationReport()
}

export async function syncFloatBalancesToGLServer() {
  const service = new GLFloatIntegrationService()
  return service.syncFloatBalancesToGL()
}

export async function enhanceExistingGLWithFloatAccounts() {
  const service = new GLFloatIntegrationService()
  return service.enhanceExistingGLWithFloatAccounts()
}
