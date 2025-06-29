import { neon } from "@neondatabase/serverless"
import { auditLogger } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export interface PowerGLEntry {
  id?: string
  transaction_id: string
  transaction_type: "sale" | "purchase" | "recharge"
  amount: number
  provider: "ecg" | "nedco"
  meter_number?: string
  customer_name?: string
  branch_id: string
  processed_by: string
  gl_entries: Array<{
    account_code: string
    account_name: string
    debit_amount?: number
    credit_amount?: number
    description: string
  }>
  created_at?: string
}

// GL Account mappings for Power transactions
const GL_ACCOUNTS = {
  POWER_INVENTORY_ECG: { code: "1300-001", name: "ECG Power Inventory" },
  POWER_INVENTORY_NEDCO: { code: "1300-002", name: "NEDCo Power Inventory" },
  POWER_SALES_REVENUE: { code: "4010-001", name: "Power Sales Revenue" },
  CASH_IN_TILL: { code: "1010-001", name: "Cash in Till" },
  ACCOUNTS_PAYABLE_ECG: { code: "2020-001", name: "Accounts Payable - ECG" },
  ACCOUNTS_PAYABLE_NEDCO: { code: "2020-002", name: "Accounts Payable - NEDCo" },
  POWER_PURCHASE_EXPENSE: { code: "5010-001", name: "Power Purchase Expense" },
  COST_OF_GOODS_SOLD: { code: "5020-001", name: "Cost of Goods Sold - Power" },
}

// Ensure GL accounts exist using correct column names
async function ensureGLAccounts() {
  try {
    const accounts = Object.values(GL_ACCOUNTS)

    for (const account of accounts) {
      // Check if account exists first
      const existing = await sql`
        SELECT id FROM gl_accounts WHERE code = ${account.code}
      `

      if (existing.length === 0) {
        // Generate UUID for new account
        const accountId = await sql`SELECT gen_random_uuid() as id`

        // Determine account type based on code prefix
        let accountType = "Asset"
        if (account.code.startsWith("1")) accountType = "Asset"
        else if (account.code.startsWith("2")) accountType = "Liability"
        else if (account.code.startsWith("4")) accountType = "Revenue"
        else if (account.code.startsWith("5")) accountType = "Expense"

        await sql`
          INSERT INTO gl_accounts (
            id, 
            code, 
            name, 
            type, 
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            ${accountId[0].id}, 
            ${account.code}, 
            ${account.name}, 
            ${accountType}, 
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `
        console.log(`Created GL account: ${account.code} - ${account.name}`)
      }
    }
  } catch (error) {
    console.error("Error ensuring Power GL accounts:", error)
    throw error
  }
}

// Create GL entries for Power sale
export async function createPowerSaleGLEntries(
  transactionId: string,
  amount: number,
  provider: "ecg" | "nedco",
  meterNumber: string,
  customerName: string,
  branchId: string,
  processedBy: string,
  userId: string,
): Promise<PowerGLEntry> {
  try {
    await ensureGLAccounts()

    const powerInventoryAccount =
      provider === "ecg" ? GL_ACCOUNTS.POWER_INVENTORY_ECG : GL_ACCOUNTS.POWER_INVENTORY_NEDCO

    // Correct GL entries for a power sale:
    // 1. Debit Cash (Asset increases) = +200
    // 2. Credit Revenue (Revenue increases) = +200
    // Total: Debits = Credits = 200 (BALANCED)

    const glEntries = [
      // Debit: Cash in Till (cash received from customer)
      {
        account_code: GL_ACCOUNTS.CASH_IN_TILL.code,
        account_name: GL_ACCOUNTS.CASH_IN_TILL.name,
        debit_amount: amount,
        description: `Power sale - ${provider.toUpperCase()} - ${meterNumber} - ${customerName}`,
      },
      // Credit: Power Sales Revenue
      {
        account_code: GL_ACCOUNTS.POWER_SALES_REVENUE.code,
        account_name: GL_ACCOUNTS.POWER_SALES_REVENUE.name,
        credit_amount: amount,
        description: `Power sale - ${provider.toUpperCase()} - ${meterNumber} - ${customerName}`,
      },
    ]

    const glEntry: PowerGLEntry = {
      transaction_id: transactionId,
      transaction_type: "sale",
      amount,
      provider,
      meter_number: meterNumber,
      customer_name: customerName,
      branch_id: branchId,
      processed_by: processedBy,
      gl_entries: glEntries,
    }

    // Post to GL using the correct schema
    await postGLEntries(glEntry, userId)

    // Audit log - fix severity to use valid values
    await auditLogger.log({
      action: "power_sale_gl_posted",
      entity_type: "power_transaction",
      entity_id: transactionId,
      user_id: userId,
      branch_id: branchId,
      details: {
        transaction_type: "sale",
        amount,
        provider,
        meter_number: meterNumber,
        customer_name: customerName,
        gl_entries_count: glEntries.length,
      },
      severity: "low", // Changed from "info" to "low"
    })

    return glEntry
  } catch (error) {
    console.error("Error creating Power sale GL entries:", error)
    throw error
  }
}

// Create GL entries for Power purchase/recharge
export async function createPowerPurchaseGLEntries(
  transactionId: string,
  amount: number,
  provider: "ecg" | "nedco",
  branchId: string,
  processedBy: string,
  userId: string,
): Promise<PowerGLEntry> {
  try {
    await ensureGLAccounts()

    const powerInventoryAccount =
      provider === "ecg" ? GL_ACCOUNTS.POWER_INVENTORY_ECG : GL_ACCOUNTS.POWER_INVENTORY_NEDCO

    const accountsPayableAccount =
      provider === "ecg" ? GL_ACCOUNTS.ACCOUNTS_PAYABLE_ECG : GL_ACCOUNTS.ACCOUNTS_PAYABLE_NEDCO

    const glEntries = [
      // Debit: Power Inventory (increase inventory)
      {
        account_code: powerInventoryAccount.code,
        account_name: powerInventoryAccount.name,
        debit_amount: amount,
        description: `Power purchase - ${provider.toUpperCase()} - Inventory recharge`,
      },
      // Credit: Accounts Payable (liability to provider)
      {
        account_code: accountsPayableAccount.code,
        account_name: accountsPayableAccount.name,
        credit_amount: amount,
        description: `Power purchase - ${provider.toUpperCase()} - Amount owed`,
      },
    ]

    const glEntry: PowerGLEntry = {
      transaction_id: transactionId,
      transaction_type: "purchase",
      amount,
      provider,
      branch_id: branchId,
      processed_by: processedBy,
      gl_entries: glEntries,
    }

    // Post to GL
    await postGLEntries(glEntry, userId)

    // Audit log - fix severity to use valid values
    await auditLogger.log({
      action: "power_purchase_gl_posted",
      entity_type: "power_transaction",
      entity_id: transactionId,
      user_id: userId,
      branch_id: branchId,
      details: {
        transaction_type: "purchase",
        amount,
        provider,
        gl_entries_count: glEntries.length,
      },
      severity: "low", // Changed from "info" to "low"
    })

    return glEntry
  } catch (error) {
    console.error("Error creating Power purchase GL entries:", error)
    throw error
  }
}

// Post GL entries to the database using correct schema
async function postGLEntries(glEntry: PowerGLEntry, userId: string) {
  try {
    // Generate UUID for the GL transaction
    const transactionUuid = await sql`SELECT gen_random_uuid() as id`
    const glTransactionId = transactionUuid[0].id

    console.log(`Creating GL transaction with ID: ${glTransactionId}`)

    // Create main GL transaction record
    await sql`
      INSERT INTO gl_transactions (
        id,
        date,
        source_module,
        source_transaction_id,
        source_transaction_type,
        description,
        status,
        created_by,
        metadata
      ) VALUES (
        ${glTransactionId},
        CURRENT_DATE,
        'power',
        ${glEntry.transaction_id},
        ${glEntry.transaction_type},
        ${`Power ${glEntry.transaction_type} - ${glEntry.provider.toUpperCase()} - ${glEntry.amount}`},
        'posted',
        ${userId},
        ${JSON.stringify({
          provider: glEntry.provider,
          meter_number: glEntry.meter_number || null,
          customer_name: glEntry.customer_name || null,
          branch_id: glEntry.branch_id,
        })}
      )
    `

    console.log(`GL transaction record created: ${glTransactionId}`)

    // Create GL transaction entries for each entry
    for (const entry of glEntry.gl_entries) {
      // Get the account ID for this account code
      const accountResult = await sql`
        SELECT id FROM gl_accounts WHERE code = ${entry.account_code}
      `

      if (accountResult.length === 0) {
        console.error(`GL account not found for code: ${entry.account_code}`)
        continue
      }

      const accountId = accountResult[0].id

      console.log(`Creating GL entry for account: ${entry.account_code} (${accountId})`)

      // Generate UUID for the journal entry
      const entryUuid = await sql`SELECT gen_random_uuid() as id`
      const entryId = entryUuid[0].id

      await sql`
        INSERT INTO gl_journal_entries (
          id,
          transaction_id,
          account_id,
          account_code,
          debit,
          credit,
          description,
          created_at
        ) VALUES (
          ${entryId},
          ${glTransactionId},
          ${accountId},
          ${entry.account_code},
          ${entry.debit_amount || 0},
          ${entry.credit_amount || 0},
          ${entry.description},
          CURRENT_TIMESTAMP
        )
      `

      // Update account balance
      const balanceChange = (entry.debit_amount || 0) - (entry.credit_amount || 0)

      await sql`
        INSERT INTO gl_account_balances (account_id, current_balance)
        VALUES (${accountId}, ${balanceChange})
        ON CONFLICT (account_id)
        DO UPDATE SET 
          current_balance = gl_account_balances.current_balance + ${balanceChange},
          last_updated = CURRENT_TIMESTAMP
      `

      console.log(`Updated balance for account ${entry.account_code}: ${balanceChange > 0 ? "+" : ""}${balanceChange}`)
    }

    console.log(`Power GL entries posted successfully for transaction ${glEntry.transaction_id}`)
  } catch (error) {
    console.error("Error posting Power GL entries:", error)
    throw error
  }
}

// Get GL entries for a transaction
export async function getPowerGLEntries(transactionId: string) {
  try {
    const result = await sql`
      SELECT 
        t.id,
        t.date,
        t.source_module,
        t.source_transaction_id,
        t.description,
        t.status,
        t.created_at,
        json_agg(
          json_build_object(
            'account_code', e.account_code,
            'debit', e.debit,
            'credit', e.credit,
            'description', e.description
          )
        ) as gl_entries
      FROM gl_transactions t
      LEFT JOIN gl_journal_entries e ON t.id = e.transaction_id
      WHERE t.source_module = 'power' AND t.source_transaction_id = ${transactionId}
      GROUP BY t.id, t.date, t.source_module, t.source_transaction_id, t.description, t.status, t.created_at
    `

    return result[0] || null
  } catch (error) {
    console.error("Error fetching Power GL entries:", error)
    return null
  }
}
