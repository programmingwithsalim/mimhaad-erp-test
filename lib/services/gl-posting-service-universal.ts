import { sql } from "@/lib/db"

export class GLPostingService {
  static async createMoMoGLEntries(transactionData: any) {
    try {
      console.log("🔄 Creating MoMo GL entries for transaction:", transactionData.id)

      const { id: transactionId, type, amount, fee, branchId, userId, provider, customerName } = transactionData

      // Get GL account mappings
      const glAccounts = await this.getGLAccountMappings()

      const entries = []

      if (type === "cash-in") {
        // Cash In: Customer gives cash, we credit their mobile wallet
        // Dr. Cash in Till (Asset)
        // Cr. MoMo Float (Liability)
        entries.push({
          account_id: glAccounts.cashInTill,
          debit_amount: amount,
          credit_amount: 0,
          description: `Cash in for ${customerName} via ${provider}`,
        })

        entries.push({
          account_id: glAccounts.momoFloat,
          debit_amount: 0,
          credit_amount: amount,
          description: `Cash in for ${customerName} via ${provider}`,
        })
      } else if (type === "cash-out") {
        // Cash Out: Customer withdraws cash from mobile wallet
        // Dr. MoMo Float (Liability)
        // Cr. Cash in Till (Asset)
        entries.push({
          account_id: glAccounts.momoFloat,
          debit_amount: amount,
          credit_amount: 0,
          description: `Cash out for ${customerName} via ${provider}`,
        })

        entries.push({
          account_id: glAccounts.cashInTill,
          debit_amount: 0,
          credit_amount: amount,
          description: `Cash out for ${customerName} via ${provider}`,
        })

        // Record fee income if applicable
        if (fee > 0) {
          entries.push({
            account_id: glAccounts.cashInTill,
            debit_amount: fee,
            credit_amount: 0,
            description: `Fee for cash out - ${customerName} via ${provider}`,
          })

          entries.push({
            account_id: glAccounts.feeIncome,
            debit_amount: 0,
            credit_amount: fee,
            description: `Fee for cash out - ${customerName} via ${provider}`,
          })
        }
      }

      // Create journal entry header
      const journalEntry = await sql`
        INSERT INTO gl_journal_entries (
          transaction_id,
          transaction_type,
          reference_number,
          description,
          total_amount,
          branch_id,
          created_by,
          status
        ) VALUES (
          ${transactionId},
          'momo',
          ${`MOMO-${transactionId}`},
          ${`MoMo ${type} transaction for ${customerName}`},
          ${amount},
          ${branchId},
          ${userId},
          'posted'
        ) RETURNING id
      `

      const journalEntryId = journalEntry[0].id

      // Insert each GL entry line separately to avoid constraint issues
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_entries (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description,
            transaction_date,
            branch_id
          ) VALUES (
            ${journalEntryId},
            ${entry.account_id},
            ${entry.debit_amount},
            ${entry.credit_amount},
            ${entry.description},
            CURRENT_DATE,
            ${branchId}
          )
        `
      }

      console.log("✅ MoMo GL entries created successfully")
      return { success: true, journalEntryId }
    } catch (error) {
      console.error("❌ Error creating MoMo GL entries:", error)
      throw error
    }
  }

  static async createEZwichGLEntries(data: {
    transactionId: string
    type: string
    amount: number
    fee: number
    provider?: string
    cardNumber?: string
    customerName?: string
    reference: string
    processedBy: string
    branchId: string
    branchName: string
  }) {
    try {
      console.log("🔄 [GL] Creating E-Zwich GL entries:", data)

      // Skip GL posting if amounts are zero or invalid
      if (data.amount <= 0 && data.fee <= 0) {
        console.log("⚠️ [GL] Skipping GL posting - no valid amounts")
        return { success: true, message: "No GL posting needed for zero amounts" }
      }

      // Generate proper UUID for GL transaction
      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`
      const glTransactionId = glTransactionIdResult[0].id

      // Create GL transaction record with all required fields
      await sql`
        INSERT INTO gl_transactions (
          id, 
          source_module, 
          source_transaction_id, 
          source_transaction_type,
          reference, 
          description, 
          amount, 
          transaction_date, 
          date,
          status, 
          created_by, 
          metadata
        ) VALUES (
          ${glTransactionId},
          'ezwich',
          ${data.transactionId},
          ${data.type},
          ${data.reference},
          ${`E-Zwich ${data.type} - ${data.customerName || data.cardNumber || "Unknown"}`},
          ${data.amount + data.fee},
          CURRENT_DATE,
          CURRENT_DATE,
          'posted',
          ${data.processedBy},
          ${JSON.stringify({
            source: "ezwich",
            transaction_id: data.transactionId,
            type: data.type,
            card_number: data.cardNumber,
            customer_name: data.customerName,
            provider: data.provider,
            branch_id: data.branchId,
            branch_name: data.branchName,
            fee: data.fee,
            amount: data.amount,
            reference: data.reference,
          })}
        )
      `

      // Get or create GL accounts based on transaction type
      let cashAccount, revenueAccount, settlementAccount

      if (data.type === "withdrawal") {
        cashAccount = await this.ensureGLAccount("1002", "Cash - E-Zwich Float", "Asset")
        revenueAccount = await this.ensureGLAccount("4002", "E-Zwich Fee Revenue", "Revenue")
        settlementAccount = await this.ensureGLAccount("2002", "E-Zwich Settlement Payable", "Liability")

        // For withdrawals: Customer withdraws from card, we give cash
        // Credit: Cash (amount + fee paid out)
        // Debit: Settlement Account (amount we'll recover from GhIPSS)
        // Credit: Revenue (our fee)
        if (data.amount > 0 && data.fee >= 0) {
          await sql`
            INSERT INTO gl_journal_entries (
              id, transaction_id, account_id, account_code, debit, credit, description
            ) VALUES (
              gen_random_uuid(),
              ${glTransactionId},
              ${cashAccount.id},
              ${cashAccount.code},
              0,
              ${data.amount + data.fee},
              ${`E-Zwich withdrawal - Cash paid out`}
            )
          `

          await sql`
            INSERT INTO gl_journal_entries (
              id, transaction_id, account_id, account_code, debit, credit, description
            ) VALUES (
              gen_random_uuid(),
              ${glTransactionId},
              ${settlementAccount.id},
              ${settlementAccount.code},
              ${data.amount},
              0,
              ${`E-Zwich withdrawal - Settlement receivable`}
            )
          `

          if (data.fee > 0) {
            await sql`
              INSERT INTO gl_journal_entries (
                id, transaction_id, account_id, account_code, debit, credit, description
              ) VALUES (
                gen_random_uuid(),
                ${glTransactionId},
                ${revenueAccount.id},
                ${revenueAccount.code},
                0,
                ${data.fee},
                ${`E-Zwich withdrawal - Fee revenue`}
              )
            `
          }
        }
      } else if (data.type === "card_issuance") {
        cashAccount = await this.ensureGLAccount("1002", "Cash - E-Zwich Float", "Asset")
        revenueAccount = await this.ensureGLAccount("4003", "E-Zwich Card Issuance Revenue", "Revenue")

        // For card issuance: Customer pays for card
        // Debit: Cash (amount received)
        // Credit: Revenue (card issuance fee)
        if (data.amount > 0) {
          await sql`
            INSERT INTO gl_journal_entries (
              id, transaction_id, account_id, account_code, debit, credit, description
            ) VALUES (
              gen_random_uuid(),
              ${glTransactionId},
              ${cashAccount.id},
              ${cashAccount.code},
              ${data.amount},
              0,
              ${`E-Zwich card issuance - Cash received`}
            )
          `

          await sql`
            INSERT INTO gl_journal_entries (
              id, transaction_id, account_id, account_code, debit, credit, description
            ) VALUES (
              gen_random_uuid(),
              ${glTransactionId},
              ${revenueAccount.id},
              ${revenueAccount.code},
              0,
              ${data.amount},
              ${`E-Zwich card issuance - Revenue`}
            )
          `
        }
      }

      console.log("✅ [GL] E-Zwich GL entries created successfully")
      return { success: true }
    } catch (error) {
      console.error("❌ [GL] Error creating E-Zwich GL entries:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  static async ensureGLAccount(code: string, name: string, type: string) {
    // Check if account exists
    const existing = await sql`
      SELECT * FROM gl_accounts WHERE code = ${code}
    `

    if (existing.length > 0) {
      return existing[0]
    }

    // Create new account
    const newAccount = await sql`
      INSERT INTO gl_accounts (
        id, code, name, type, is_active, created_at
      ) VALUES (
        gen_random_uuid(),
        ${code},
        ${name},
        ${type},
        true,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `

    return newAccount[0]
  }

  static async getGLAccountMappings() {
    try {
      // Get or create required GL accounts
      const accounts = await sql`
        SELECT account_code, id, name
        FROM gl_accounts 
        WHERE account_code IN ('1001', '2001', '4001', '1002')
      `

      const accountMap: any = {}
      accounts.forEach((account: any) => {
        switch (account.account_code) {
          case "1001":
            accountMap.cashInTill = account.id
            break
          case "2001":
            accountMap.momoFloat = account.id
            break
          case "4001":
            accountMap.feeIncome = account.id
            break
          case "1002":
            accountMap.agencyFloat = account.id
            break
        }
      })

      // Create missing accounts if needed
      if (!accountMap.cashInTill) {
        const result = await sql`
          INSERT INTO gl_accounts (account_code, name, account_type, parent_id, is_active)
          VALUES ('1001', 'Cash in Till', 'asset', NULL, true)
          RETURNING id
        `
        accountMap.cashInTill = result[0].id
      }

      if (!accountMap.momoFloat) {
        const result = await sql`
          INSERT INTO gl_accounts (account_code, name, account_type, parent_id, is_active)
          VALUES ('2001', 'MoMo Float', 'liability', NULL, true)
          RETURNING id
        `
        accountMap.momoFloat = result[0].id
      }

      if (!accountMap.feeIncome) {
        const result = await sql`
          INSERT INTO gl_accounts (account_code, name, account_type, parent_id, is_active)
          VALUES ('4001', 'Fee Income', 'revenue', NULL, true)
          RETURNING id
        `
        accountMap.feeIncome = result[0].id
      }

      if (!accountMap.agencyFloat) {
        const result = await sql`
          INSERT INTO gl_accounts (account_code, name, account_type, parent_id, is_active)
          VALUES ('1002', 'Agency Banking Float', 'asset', NULL, true)
          RETURNING id
        `
        accountMap.agencyFloat = result[0].id
      }

      return accountMap
    } catch (error) {
      console.error("Error getting GL account mappings:", error)
      throw error
    }
  }
}

// Export as UniversalGLPostingService for backward compatibility
export const UniversalGLPostingService = GLPostingService
