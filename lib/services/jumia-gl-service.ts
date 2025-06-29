import { neon } from "@neondatabase/serverless"
import { auditLogger } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export interface JumiaGLEntry {
  id?: string
  transaction_id: string
  transaction_type: "package_receipt" | "pod_collection" | "settlement"
  amount: number
  customer_name?: string
  tracking_id?: string
  settlement_reference?: string
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

// GL Account mappings for Jumia transactions
const GL_ACCOUNTS = {
  CASH_IN_TILL: { code: "1010-001", name: "Cash in Till" },
  JUMIA_RECEIVABLES: { code: "1200-001", name: "Jumia Receivables" },
  JUMIA_LIABILITY: { code: "2030-001", name: "Jumia Customer Liability" },
  JUMIA_SERVICE_REVENUE: { code: "4010-004", name: "Jumia Service Revenue" },
  JUMIA_COMMISSION_REVENUE: { code: "4020-004", name: "Jumia Commission Revenue" },
  BANK_ACCOUNT: { code: "1020-001", name: "Bank Account - Operations" },
}

// Check if GL tables exist and have required columns (updated to match your schema)
async function checkGLSchema(): Promise<{ exists: boolean; hasColumns: boolean }> {
  try {
    // Check if gl_accounts table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gl_accounts'
      );
    `

    if (!tableCheck[0]?.exists) {
      console.log("GL accounts table does not exist")
      return { exists: false, hasColumns: false }
    }

    // Check if required columns exist (matching your actual schema)
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gl_accounts' 
      AND column_name IN ('code', 'name', 'type');
    `

    const hasRequiredColumns = columnCheck.length >= 3
    console.log(`GL schema check: table exists=${tableCheck[0]?.exists}, columns found=${columnCheck.length}/3`)

    if (!hasRequiredColumns) {
      console.log(
        "Missing required columns. Found columns:",
        columnCheck.map((c) => c.column_name),
      )
    }

    return { exists: true, hasColumns: hasRequiredColumns }
  } catch (error) {
    console.error("Error checking GL schema:", error)
    return { exists: false, hasColumns: false }
  }
}

// Ensure GL accounts exist (updated to match your schema)
async function ensureGLAccounts(): Promise<boolean> {
  try {
    const schemaStatus = await checkGLSchema()

    if (!schemaStatus.exists || !schemaStatus.hasColumns) {
      console.warn("GL accounts table not properly configured. Schema status:", schemaStatus)
      return false
    }

    const accounts = Object.values(GL_ACCOUNTS)
    console.log(`Creating ${accounts.length} GL accounts if they don't exist...`)

    for (const account of accounts) {
      try {
        // Use your actual column names: code, name, type (not account_code, account_name, account_type)
        await sql`
          INSERT INTO gl_accounts (id, code, name, type, is_active)
          VALUES (gen_random_uuid(), ${account.code}, ${account.name}, 'Asset', true)
          ON CONFLICT (code) DO NOTHING
        `
        console.log(`✓ Ensured GL account exists: ${account.code} - ${account.name}`)
      } catch (accountError) {
        console.error(`Error creating account ${account.code}:`, accountError)
      }
    }

    return true
  } catch (error) {
    console.error("Error ensuring Jumia GL accounts:", error)
    return false
  }
}

// Create GL entries for Jumia package receipt
export async function createJumiaPackageReceiptGLEntries(
  transactionId: string,
  trackingId: string,
  customerName: string,
  branchId: string,
  processedBy: string,
  userId: string,
): Promise<JumiaGLEntry> {
  console.log(`Creating GL entries for Jumia package receipt: ${transactionId}`)
  const glAccountsReady = await ensureGLAccounts()

  // Package receipt doesn't involve money, just tracking
  const glEntries = [
    // No GL entries for package receipt - just tracking
  ]

  const glEntry: JumiaGLEntry = {
    transaction_id: transactionId,
    transaction_type: "package_receipt",
    amount: 0,
    customer_name: customerName,
    tracking_id: trackingId,
    branch_id: branchId,
    processed_by: processedBy,
    gl_entries: glEntries,
  }

  // Audit log only (no GL posting for package receipt)
  await auditLogger.log({
    action: "jumia_package_received",
    entity_type: "jumia_transaction",
    entity_id: transactionId,
    user_id: userId || "system",
    branch_id: branchId,
    details: {
      transaction_type: "package_receipt",
      tracking_id: trackingId,
      customer_name: customerName,
      gl_accounts_ready: glAccountsReady,
    },
    severity: "low",
  })

  console.log(`✓ Package receipt GL entry created (no posting required)`)
  return glEntry
}

// Create GL entries for Jumia POD collection
export async function createJumiaPODCollectionGLEntries(
  transactionId: string,
  amount: number,
  trackingId: string,
  customerName: string,
  branchId: string,
  processedBy: string,
  userId: string,
): Promise<JumiaGLEntry> {
  console.log(`Creating GL entries for Jumia POD collection: ${transactionId}, amount: ${amount}`)
  const glAccountsReady = await ensureGLAccounts()

  // Simplified GL entries - only 2 entries for perfect balance
  const glEntries = [
    // Debit: Cash in Till (cash collected from customer)
    {
      account_code: GL_ACCOUNTS.CASH_IN_TILL.code,
      account_name: GL_ACCOUNTS.CASH_IN_TILL.name,
      debit_amount: amount,
      description: `Jumia POD collection - ${trackingId} - ${customerName}`,
    },
    // Credit: Jumia Customer Liability (amount owed to Jumia)
    {
      account_code: GL_ACCOUNTS.JUMIA_LIABILITY.code,
      account_name: GL_ACCOUNTS.JUMIA_LIABILITY.name,
      credit_amount: amount,
      description: `Jumia POD collection - ${trackingId} - ${customerName}`,
    },
  ]

  const glEntry: JumiaGLEntry = {
    transaction_id: transactionId,
    transaction_type: "pod_collection",
    amount,
    customer_name: customerName,
    tracking_id: trackingId,
    branch_id: branchId,
    processed_by: processedBy,
    gl_entries: glEntries,
  }

  // Only post to GL if schema is ready
  if (glAccountsReady) {
    try {
      console.log(`Posting GL entries for transaction ${transactionId}...`)
      console.log(`GL Entries Summary:`)
      console.log(`  Total Debits: ${glEntries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0)}`)
      console.log(`  Total Credits: ${glEntries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0)}`)

      await postGLEntries(glEntry, userId)
      console.log(`✓ GL entries posted successfully for transaction ${transactionId}`)
    } catch (error) {
      console.error("GL posting failed (non-critical):", error)
    }
  } else {
    console.warn("GL schema not ready. Skipping GL posting for transaction:", transactionId)
  }

  // Audit log
  await auditLogger.log({
    action: "jumia_pod_collection_processed",
    entity_type: "jumia_transaction",
    entity_id: transactionId,
    user_id: userId || "system",
    branch_id: branchId,
    details: {
      transaction_type: "pod_collection",
      amount,
      tracking_id: trackingId,
      customer_name: customerName,
      gl_entries_count: glEntries.length,
      gl_posted: glAccountsReady,
      total_debits: glEntries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0),
      total_credits: glEntries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0),
    },
    severity: "low",
  })

  return glEntry
}

// Create GL entries for Jumia settlement
export async function createJumiaSettlementGLEntries(
  transactionId: string,
  amount: number,
  settlementReference: string,
  branchId: string,
  processedBy: string,
  userId: string,
  paymentMethod: "cash" | "bank" = "cash",
): Promise<JumiaGLEntry> {
  console.log(`Creating GL entries for Jumia settlement: ${transactionId}, amount: ${amount}`)
  const glAccountsReady = await ensureGLAccounts()

  const paymentAccount = paymentMethod === "cash" ? GL_ACCOUNTS.CASH_IN_TILL : GL_ACCOUNTS.BANK_ACCOUNT

  // Simplified GL entries - only 2 entries for perfect balance
  const glEntries = [
    // Debit: Jumia Customer Liability (reduce liability - we're paying what we owe)
    {
      account_code: GL_ACCOUNTS.JUMIA_LIABILITY.code,
      account_name: GL_ACCOUNTS.JUMIA_LIABILITY.name,
      debit_amount: amount,
      description: `Jumia settlement - ${settlementReference}`,
    },
    // Credit: Cash/Bank (payment made to Jumia)
    {
      account_code: paymentAccount.code,
      account_name: paymentAccount.name,
      credit_amount: amount,
      description: `Jumia settlement payment - ${settlementReference}`,
    },
  ]

  const glEntry: JumiaGLEntry = {
    transaction_id: transactionId,
    transaction_type: "settlement",
    amount,
    settlement_reference: settlementReference,
    branch_id: branchId,
    processed_by: processedBy,
    gl_entries: glEntries,
  }

  // Only post to GL if schema is ready
  if (glAccountsReady) {
    try {
      console.log(`Posting GL entries for settlement ${transactionId}...`)
      console.log(`GL Entries Summary:`)
      console.log(`  Total Debits: ${glEntries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0)}`)
      console.log(`  Total Credits: ${glEntries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0)}`)

      await postGLEntries(glEntry, userId)
      console.log(`✓ GL entries posted successfully for settlement ${transactionId}`)
    } catch (error) {
      console.error("GL posting failed (non-critical):", error)
    }
  } else {
    console.warn("GL schema not ready. Skipping GL posting for transaction:", transactionId)
  }

  // Audit log
  await auditLogger.log({
    action: "jumia_settlement_processed",
    entity_type: "jumia_transaction",
    entity_id: transactionId,
    user_id: userId || "system",
    branch_id: branchId,
    details: {
      transaction_type: "settlement",
      amount,
      settlement_reference: settlementReference,
      payment_method: paymentMethod,
      gl_entries_count: glEntries.length,
      gl_posted: glAccountsReady,
      total_debits: glEntries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0),
      total_credits: glEntries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0),
    },
    severity: "low",
  })

  return glEntry
}

// Post GL entries to the database (updated to match your schema)
async function postGLEntries(glEntry: JumiaGLEntry, userId: string) {
  try {
    console.log(`Posting GL entries for transaction ${glEntry.transaction_id}...`)

    // Check if GL transaction tables exist
    const transactionTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gl_transactions'
      );
    `

    // Check for journal entries table (could be gl_journal_entries or gl_transaction_entries)
    const journalTableCheck = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('gl_journal_entries', 'gl_transaction_entries')
    `

    if (!transactionTableCheck[0]?.exists) {
      console.warn("GL transactions table not found")
      return
    }

    const journalTableName = journalTableCheck[0]?.table_name || "gl_journal_entries"
    console.log(`Using journal table: ${journalTableName}`)

    // Create GL transaction header (using your actual table structure)
    const transactionResult = await sql`
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
        gen_random_uuid(),
        CURRENT_DATE,
        'jumia',
        ${glEntry.transaction_id},
        ${glEntry.transaction_type},
        ${`Jumia ${glEntry.transaction_type} - ${glEntry.amount}`},
        'posted',
        ${userId}
      )
      RETURNING id
    `

    const glTransactionId = transactionResult[0].id
    console.log(`✓ GL transaction header created: ${glTransactionId}`)

    // Create GL journal entries (using the correct journal table)
    for (const entry of glEntry.gl_entries) {
      // Get the account ID for this account code
      const accountResult = await sql`
        SELECT id FROM gl_accounts WHERE code = ${entry.account_code}
      `

      if (accountResult.length === 0) {
        console.warn(`Account not found for code: ${entry.account_code}`)
        continue
      }

      const accountId = accountResult[0].id

      // Insert into the journal entries table (not gl_transactions)
      if (journalTableName === "gl_journal_entries") {
        await sql`
          INSERT INTO gl_journal_entries (
            id,
            transaction_id,
            account_id,
            account_code,
            debit,
            credit,
            description
          ) VALUES (
            gen_random_uuid(),
            ${glTransactionId},
            ${accountId},
            ${entry.account_code},
            ${entry.debit_amount || 0},
            ${entry.credit_amount || 0},
            ${entry.description}
          )
        `
      } else {
        await sql`
          INSERT INTO gl_transaction_entries (
            id,
            transaction_id,
            account_id,
            account_code,
            debit,
            credit,
            description
          ) VALUES (
            gen_random_uuid(),
            ${glTransactionId},
            ${accountId},
            ${entry.account_code},
            ${entry.debit_amount || 0},
            ${entry.credit_amount || 0},
            ${entry.description}
          )
        `
      }

      console.log(
        `✓ GL entry created: ${entry.account_code} - Debit: ${entry.debit_amount || 0}, Credit: ${entry.credit_amount || 0}`,
      )

      // Update account balance (if balance table exists)
      try {
        const balanceChange = (entry.debit_amount || 0) - (entry.credit_amount || 0)
        await sql`
          INSERT INTO gl_account_balances (account_id, current_balance, last_updated)
          VALUES (${entry.account_code}, ${balanceChange}, CURRENT_TIMESTAMP)
          ON CONFLICT (account_id)
          DO UPDATE SET 
            current_balance = gl_account_balances.current_balance + ${balanceChange},
            last_updated = CURRENT_TIMESTAMP
        `
        console.log(`✓ Account balance updated for ${entry.account_code}`)
      } catch (balanceError) {
        console.warn("Could not update account balance (table may not exist):", balanceError)
      }
    }

    console.log(`✓ All GL entries posted successfully for transaction ${glEntry.transaction_id}`)
  } catch (error) {
    console.error("Error posting Jumia GL entries:", error)
    throw error
  }
}

// Get GL entries for a transaction (updated to match your schema)
export async function getJumiaGLEntries(transactionId: string) {
  try {
    const schemaStatus = await checkGLSchema()

    if (!schemaStatus.exists || !schemaStatus.hasColumns) {
      return null
    }

    const result = await sql`
      SELECT 
        gt.id,
        gt.source_transaction_id,
        gt.description,
        gt.date,
        gt.status,
        json_agg(
          json_build_object(
            'account_code', gte.account_code,
            'debit', gte.debit,
            'credit', gte.credit,
            'description', gte.description
          )
        ) as gl_entries
      FROM gl_transactions gt
      LEFT JOIN gl_transaction_entries gte ON gt.id = gte.transaction_id
      WHERE gt.source_module = 'jumia' AND gt.source_transaction_id = ${transactionId}
      GROUP BY gt.id, gt.source_transaction_id, gt.description, gt.date, gt.status
    `

    return result[0] || null
  } catch (error) {
    console.error("Error fetching Jumia GL entries:", error)
    return null
  }
}

// Check GL schema status
export async function getGLSchemaStatus() {
  return await checkGLSchema()
}
