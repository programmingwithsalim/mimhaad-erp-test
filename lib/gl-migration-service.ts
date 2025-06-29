import { neon } from "@neondatabase/serverless"

export class GLMigrationService {
  private sql = neon(process.env.DATABASE_URL!)

  /**
   * Migrate existing float accounts to GL structure
   */
  async migrateFloatAccountsToGL(): Promise<void> {
    try {
      // 1. Create default chart of accounts
      await this.createDefaultChartOfAccounts()

      // 2. Map existing float accounts to GL accounts
      await this.mapFloatAccountsToGL()

      // 3. Create opening balances
      await this.createOpeningBalances()

      // 4. Migrate historical transactions
      await this.migrateHistoricalTransactions()
    } catch (error) {
      console.error("GL Migration failed:", error)
      throw error
    }
  }

  private async createDefaultChartOfAccounts(): Promise<void> {
    const defaultAccounts = [
      // Assets
      { code: "1000", name: "Current Assets", type: "Asset", parent: null },
      { code: "1100", name: "Cash and Cash Equivalents", type: "Asset", parent: "1000" },
      { code: "1110", name: "MoMo Float Account", type: "Asset", parent: "1100" },
      { code: "1120", name: "Agency Banking Float", type: "Asset", parent: "1100" },
      { code: "1130", name: "E-Zwich Float Account", type: "Asset", parent: "1100" },
      { code: "1140", name: "Power Float Account", type: "Asset", parent: "1100" },
      { code: "1150", name: "Jumia Float Account", type: "Asset", parent: "1100" },

      // Liabilities
      { code: "2000", name: "Current Liabilities", type: "Liability", parent: null },
      { code: "2100", name: "Accounts Payable", type: "Liability", parent: "2000" },

      // Equity
      { code: "3000", name: "Equity", type: "Equity", parent: null },
      { code: "3100", name: "Retained Earnings", type: "Equity", parent: "3000" },

      // Revenue
      { code: "4000", name: "Revenue", type: "Revenue", parent: null },
      { code: "4100", name: "Commission Revenue", type: "Revenue", parent: "4000" },
      { code: "4110", name: "MoMo Commission", type: "Revenue", parent: "4100" },
      { code: "4120", name: "Agency Banking Commission", type: "Revenue", parent: "4100" },

      // Expenses
      { code: "5000", name: "Operating Expenses", type: "Expense", parent: null },
      { code: "5100", name: "Transaction Fees", type: "Expense", parent: "5000" },
    ]

    for (const account of defaultAccounts) {
      await this.sql`
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, is_system_account)
        VALUES (
          ${account.code}, 
          ${account.name}, 
          ${account.type}, 
          ${account.parent ? `(SELECT id FROM chart_of_accounts WHERE account_code = ${account.parent})` : null},
          true
        )
        ON CONFLICT (account_code) DO NOTHING
      `
    }
  }

  private async mapFloatAccountsToGL(): Promise<void> {
    const floatAccounts = await this.sql`
      SELECT id, account_type, provider FROM float_accounts WHERE is_active = true
    `

    for (const floatAccount of floatAccounts) {
      const glAccountCode = this.getGLAccountCode(floatAccount.account_type)

      const glAccount = await this.sql`
        SELECT id FROM chart_of_accounts WHERE account_code = ${glAccountCode}
      `

      if (glAccount.length > 0) {
        await this.sql`
          INSERT INTO float_account_gl_mapping (float_account_id, gl_account_id, mapping_type)
          VALUES (${floatAccount.id}, ${glAccount[0].id}, 'main_account')
          ON CONFLICT (float_account_id, mapping_type) DO NOTHING
        `
      }
    }
  }

  private getGLAccountCode(accountType: string): string {
    const mapping: Record<string, string> = {
      momo: "1110",
      "agency-banking": "1120",
      "e-zwich": "1130",
      power: "1140",
      jumia: "1150",
    }
    return mapping[accountType] || "1100"
  }

  private async createOpeningBalances(): Promise<void> {
    const today = new Date().toISOString().split("T")[0]

    // Get current float account balances
    const floatBalances = await this.sql`
      SELECT fa.current_balance, coa.id as account_id
      FROM float_accounts fa
      JOIN float_account_gl_mapping fagm ON fa.id = fagm.float_account_id
      JOIN chart_of_accounts coa ON fagm.gl_account_id = coa.id
      WHERE fa.is_active = true AND fagm.mapping_type = 'main_account'
    `

    for (const balance of floatBalances) {
      await this.sql`
        INSERT INTO account_balances (account_id, balance_date, opening_balance, closing_balance)
        VALUES (${balance.account_id}, ${today}, ${balance.current_balance}, ${balance.current_balance})
        ON CONFLICT (account_id, balance_date) 
        DO UPDATE SET 
          opening_balance = ${balance.current_balance},
          closing_balance = ${balance.current_balance}
      `
    }
  }

  private async migrateHistoricalTransactions(): Promise<void> {
    // This would migrate existing transaction data to GL format
    // Implementation depends on existing transaction structure
    console.log("Historical transaction migration would be implemented here")
  }
}
