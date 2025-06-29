import { neon } from "@neondatabase/serverless"

export interface GLAccount {
  id: string
  accountCode: string
  accountName: string
  accountType: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"
  parentAccountId?: string
  currentBalance: number
  floatAccountId?: string
  floatAccountBalance?: number
  isActive: boolean
}

export interface GLTransaction {
  id: string
  transactionNumber: string
  transactionDate: string
  description: string
  totalAmount: number
  status: "pending" | "posted" | "reversed"
  lines: GLTransactionLine[]
}

export interface GLTransactionLine {
  id: string
  accountId: string
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
  description: string
}

export class GLServiceEnhanced {
  private sql = neon(process.env.DATABASE_URL!)

  /**
   * Get chart of accounts with float account balances
   */
  async getChartOfAccountsWithFloatBalances(): Promise<GLAccount[]> {
    const accounts = await this.sql`
      SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.parent_account_id,
        coa.is_active,
        COALESCE(ab.closing_balance, 0) as current_balance,
        fa.id as float_account_id,
        fa.current_balance as float_account_balance
      FROM chart_of_accounts coa
      LEFT JOIN account_balances ab ON coa.id = ab.account_id 
        AND ab.balance_date = CURRENT_DATE
      LEFT JOIN float_account_gl_mapping fagm ON coa.id = fagm.gl_account_id
        AND fagm.mapping_type = 'main_account'
      LEFT JOIN float_accounts fa ON fagm.float_account_id = fa.id
        AND fa.is_active = true
      WHERE coa.is_active = true
      ORDER BY coa.account_code
    `

    return accounts.map((account) => ({
      id: account.id,
      accountCode: account.account_code,
      accountName: account.account_name,
      accountType: account.account_type,
      parentAccountId: account.parent_account_id,
      currentBalance: Number(account.current_balance),
      floatAccountId: account.float_account_id,
      floatAccountBalance: account.float_account_balance ? Number(account.float_account_balance) : undefined,
      isActive: account.is_active,
    }))
  }

  /**
   * Get trial balance with float account integration
   */
  async getTrialBalance(asOfDate?: string): Promise<{
    accounts: Array<{
      accountCode: string
      accountName: string
      accountType: string
      debitBalance: number
      creditBalance: number
      floatBalance?: number
    }>
    totalDebits: number
    totalCredits: number
    isBalanced: boolean
  }> {
    const balanceDate = asOfDate || new Date().toISOString().split("T")[0]

    const accounts = await this.sql`
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        COALESCE(ab.closing_balance, 0) as balance,
        fa.current_balance as float_balance
      FROM chart_of_accounts coa
      LEFT JOIN account_balances ab ON coa.id = ab.account_id 
        AND ab.balance_date <= ${balanceDate}
      LEFT JOIN float_account_gl_mapping fagm ON coa.id = fagm.gl_account_id
      LEFT JOIN float_accounts fa ON fagm.float_account_id = fa.id
      WHERE coa.is_active = true
      ORDER BY coa.account_code
    `

    let totalDebits = 0
    let totalCredits = 0

    const processedAccounts = accounts.map((account) => {
      const balance = Number(account.balance)
      const isDebitAccount = ["Asset", "Expense"].includes(account.account_type)

      const debitBalance = isDebitAccount && balance > 0 ? balance : 0
      const creditBalance = !isDebitAccount && balance > 0 ? balance : 0

      totalDebits += debitBalance
      totalCredits += creditBalance

      return {
        accountCode: account.account_code,
        accountName: account.account_name,
        accountType: account.account_type,
        debitBalance,
        creditBalance,
        floatBalance: account.float_balance ? Number(account.float_balance) : undefined,
      }
    })

    return {
      accounts: processedAccounts,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    }
  }

  /**
   * Create GL transaction from float transaction
   */
  async createGLTransactionFromFloat(
    floatTransactionId: string,
    transactionType: string,
    amount: number,
    description: string,
  ): Promise<GLTransaction> {
    const transactionNumber = await this.generateTransactionNumber()

    // Create GL transaction
    const glTransaction = await this.sql`
      INSERT INTO gl_transactions (
        transaction_number, transaction_date, description, 
        reference_type, reference_id, total_amount, status
      )
      VALUES (
        ${transactionNumber}, CURRENT_DATE, ${description},
        'float_transaction', ${floatTransactionId}, ${amount}, 'pending'
      )
      RETURNING *
    `

    // Create transaction lines based on transaction type
    const lines = await this.createTransactionLines(glTransaction[0].id, transactionType, amount, floatTransactionId)

    return {
      id: glTransaction[0].id,
      transactionNumber: glTransaction[0].transaction_number,
      transactionDate: glTransaction[0].transaction_date,
      description: glTransaction[0].description,
      totalAmount: Number(glTransaction[0].total_amount),
      status: glTransaction[0].status,
      lines,
    }
  }

  private async createTransactionLines(
    glTransactionId: string,
    transactionType: string,
    amount: number,
    floatTransactionId: string,
  ): Promise<GLTransactionLine[]> {
    // Implementation would create appropriate debit/credit entries
    // based on transaction type and business rules
    return []
  }

  private async generateTransactionNumber(): Promise<string> {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")

    const lastTransaction = await this.sql`
      SELECT transaction_number 
      FROM gl_transactions 
      WHERE transaction_number LIKE ${"GL" + year + month + "%"}
      ORDER BY transaction_number DESC 
      LIMIT 1
    `

    let sequence = 1
    if (lastTransaction.length > 0) {
      const lastNumber = lastTransaction[0].transaction_number
      sequence = Number.parseInt(lastNumber.slice(-4)) + 1
    }

    return `GL${year}${month}${String(sequence).padStart(4, "0")}`
  }

  /**
   * Update account balances from float account changes
   */
  async syncFloatAccountBalances(): Promise<void> {
    const today = new Date().toISOString().split("T")[0]

    const floatAccounts = await this.sql`
      SELECT 
        fa.id as float_account_id,
        fa.current_balance,
        coa.id as gl_account_id
      FROM float_accounts fa
      JOIN float_account_gl_mapping fagm ON fa.id = fagm.float_account_id
      JOIN chart_of_accounts coa ON fagm.gl_account_id = coa.id
      WHERE fa.is_active = true AND fagm.mapping_type = 'main_account'
    `

    for (const account of floatAccounts) {
      await this.sql`
        INSERT INTO account_balances (account_id, balance_date, closing_balance)
        VALUES (${account.gl_account_id}, ${today}, ${account.current_balance})
        ON CONFLICT (account_id, balance_date)
        DO UPDATE SET 
          closing_balance = ${account.current_balance},
          updated_at = NOW()
      `
    }
  }
}
