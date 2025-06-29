import { neon } from "@neondatabase/serverless"
import { auditLogger } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export interface EZwichGLEntry {
  id?: string
  transaction_id: string
  transaction_type: "withdrawal" | "card_issuance" | "fee_collection"
  amount: number
  fee_amount?: number
  customer_name: string
  card_number?: string
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

// GL Account mappings for E-Zwich transactions with proper types
const GL_ACCOUNTS = {
  EZWICH_CASH_ACCOUNT: { code: "1010-003", name: "E-Zwich Cash Account", type: "Asset" },
  EZWICH_REVENUE: { code: "4010-003", name: "E-Zwich Service Revenue", type: "Revenue" },
  EZWICH_FEE_REVENUE: { code: "4020-003", name: "E-Zwich Fee Revenue", type: "Revenue" },
  EZWICH_CARD_INVENTORY: { code: "1300-003", name: "E-Zwich Card Inventory", type: "Asset" },
  EZWICH_CARD_SALES: { code: "4030-003", name: "E-Zwich Card Sales Revenue", type: "Revenue" },
  CASH_IN_TILL: { code: "1010-001", name: "Cash in Till", type: "Asset" },
  CUSTOMER_DEPOSITS: { code: "2010-003", name: "Customer E-Zwich Deposits", type: "Liability" },
  CARD_COST_EXPENSE: { code: "5010-003", name: "E-Zwich Card Cost", type: "Expense" },
}

// Ensure GL accounts exist with correct types
async function ensureGLAccounts() {
  try {
    const accounts = Object.values(GL_ACCOUNTS)

    for (const account of accounts) {
      // Check if account already exists
      const existing = await sql`
        SELECT id, type FROM gl_accounts WHERE code = ${account.code} LIMIT 1
      `

      if (existing.length === 0) {
        // Create account with proper type
        await sql`
          INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active)
          VALUES (gen_random_uuid(), ${account.code}, ${account.name}, ${account.type}, null, 0, true)
        `
        console.log(`Created GL account: ${account.code} - ${account.name} (${account.type})`)
      } else if (existing[0].type !== account.type) {
        // Update account type if it's wrong
        await sql`
          UPDATE gl_accounts 
          SET type = ${account.type}, updated_at = CURRENT_TIMESTAMP
          WHERE code = ${account.code}
        `
        console.log(`Updated GL account type: ${account.code} from ${existing[0].type} to ${account.type}`)
      }
    }
  } catch (error) {
    console.error("Error ensuring E-Zwich GL accounts:", error)
    throw error
  }
}

// Create GL entries for E-Zwich withdrawal
export async function createEZwichWithdrawalGLEntries(
  transactionId: string,
  amount: number,
  feeAmount: number,
  customerName: string,
  cardNumber: string,
  branchId: string,
  processedBy: string,
  userId: string,
): Promise<EZwichGLEntry> {
  try {
    await ensureGLAccounts()

    const glEntries = [
      // Debit: E-Zwich Cash Account (amount we're owed by E-Zwich)
      {
        account_code: GL_ACCOUNTS.EZWICH_CASH_ACCOUNT.code,
        account_name: GL_ACCOUNTS.EZWICH_CASH_ACCOUNT.name,
        debit_amount: amount,
        description: `E-Zwich withdrawal - ${cardNumber} - ${customerName}`,
      },
      // Credit: Cash in Till (cash paid to customer)
      {
        account_code: GL_ACCOUNTS.CASH_IN_TILL.code,
        account_name: GL_ACCOUNTS.CASH_IN_TILL.name,
        credit_amount: amount,
        description: `E-Zwich withdrawal - ${cardNumber} - ${customerName}`,
      },
    ]

    // Add fee entries if applicable
    if (feeAmount > 0) {
      glEntries.push(
        // Debit: Cash in Till (fee collected)
        {
          account_code: GL_ACCOUNTS.CASH_IN_TILL.code,
          account_name: GL_ACCOUNTS.CASH_IN_TILL.name,
          debit_amount: feeAmount,
          description: `E-Zwich withdrawal fee - ${cardNumber}`,
        },
        // Credit: E-Zwich Fee Revenue (THIS IS THE KEY - Revenue account)
        {
          account_code: GL_ACCOUNTS.EZWICH_FEE_REVENUE.code,
          account_name: GL_ACCOUNTS.EZWICH_FEE_REVENUE.name,
          credit_amount: feeAmount,
          description: `E-Zwich withdrawal fee - ${cardNumber}`,
        },
      )
    }

    const glEntry: EZwichGLEntry = {
      transaction_id: transactionId,
      transaction_type: "withdrawal",
      amount,
      fee_amount: feeAmount,
      customer_name: customerName,
      card_number: cardNumber,
      branch_id: branchId,
      processed_by: processedBy,
      gl_entries: glEntries,
    }

    // Post to GL
    await postGLEntries(glEntry, userId)

    // Audit log
    await auditLogger.log({
      action: "ezwich_withdrawal_gl_posted",
      entity_type: "ezwich_transaction",
      entity_id: transactionId,
      user_id: userId,
      branch_id: branchId,
      details: {
        transaction_type: "withdrawal",
        amount,
        fee_amount: feeAmount,
        customer_name: customerName,
        card_number: cardNumber,
        gl_entries_count: glEntries.length,
      },
      severity: "low",
    })

    console.log(`E-Zwich withdrawal GL entries created successfully for transaction ${transactionId}`)
    return glEntry
  } catch (error) {
    console.error("Error creating E-Zwich withdrawal GL entries:", error)
    throw error
  }
}

// Create GL entries for E-Zwich card issuance
export async function createEZwichCardIssuanceGLEntries(
  transactionId: string,
  cardFee: number,
  customerName: string,
  cardNumber: string,
  branchId: string,
  processedBy: string,
  userId: string,
): Promise<EZwichGLEntry> {
  try {
    await ensureGLAccounts()

    const cardCost = 10 // Assumed cost per card

    const glEntries = [
      // Debit: Cash in Till (card fee collected)
      {
        account_code: GL_ACCOUNTS.CASH_IN_TILL.code,
        account_name: GL_ACCOUNTS.CASH_IN_TILL.name,
        debit_amount: cardFee,
        description: `E-Zwich card issuance fee - ${cardNumber} - ${customerName}`,
      },
      // Credit: E-Zwich Card Sales Revenue (THIS IS THE KEY - Revenue account)
      {
        account_code: GL_ACCOUNTS.EZWICH_CARD_SALES.code,
        account_name: GL_ACCOUNTS.EZWICH_CARD_SALES.name,
        credit_amount: cardFee,
        description: `E-Zwich card issuance fee - ${cardNumber} - ${customerName}`,
      },
      // Debit: Card Cost Expense (cost of card)
      {
        account_code: GL_ACCOUNTS.CARD_COST_EXPENSE.code,
        account_name: GL_ACCOUNTS.CARD_COST_EXPENSE.name,
        debit_amount: cardCost,
        description: `E-Zwich card cost - ${cardNumber}`,
      },
      // Credit: E-Zwich Card Inventory (reduce inventory)
      {
        account_code: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.code,
        account_name: GL_ACCOUNTS.EZWICH_CARD_INVENTORY.name,
        credit_amount: cardCost,
        description: `E-Zwich card inventory reduction - ${cardNumber}`,
      },
    ]

    const glEntry: EZwichGLEntry = {
      transaction_id: transactionId,
      transaction_type: "card_issuance",
      amount: cardFee,
      customer_name: customerName,
      card_number: cardNumber,
      branch_id: branchId,
      processed_by: processedBy,
      gl_entries: glEntries,
    }

    // Post to GL
    await postGLEntries(glEntry, userId)

    // Audit log
    await auditLogger.log({
      action: "ezwich_card_issuance_gl_posted",
      entity_type: "ezwich_transaction",
      entity_id: transactionId,
      user_id: userId,
      branch_id: branchId,
      details: {
        transaction_type: "card_issuance",
        card_fee: cardFee,
        customer_name: customerName,
        card_number: cardNumber,
        gl_entries_count: glEntries.length,
      },
      severity: "low",
    })

    console.log(`E-Zwich card issuance GL entries created successfully for transaction ${transactionId}`)
    return glEntry
  } catch (error) {
    console.error("Error creating E-Zwich card issuance GL entries:", error)
    throw error
  }
}

// Post GL entries to the database
async function postGLEntries(glEntry: EZwichGLEntry, userId: string) {
  try {
    // Generate proper UUID for transaction
    const uuidResult = await sql`SELECT gen_random_uuid() as id`
    const glTransactionId = uuidResult[0].id

    console.log(`Creating GL transaction with ID: ${glTransactionId}`)

    // Create GL transaction
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
        ${glTransactionId},
        CURRENT_DATE,
        'ezwich',
        ${glEntry.transaction_id},
        ${glEntry.transaction_type},
        ${`E-Zwich ${glEntry.transaction_type} - ${glEntry.customer_name}`},
        'posted',
        ${userId}
      )
      RETURNING id
    `

    console.log(`GL transaction created with ID: ${transactionResult[0].id}`)

    // Create journal entry lines
    for (const entry of glEntry.gl_entries) {
      // Get or create the GL account with proper type
      let account = await sql`
        SELECT id FROM gl_accounts WHERE code = ${entry.account_code} LIMIT 1
      `

      if (account.length === 0) {
        // Find the account definition to get the correct type
        const accountDef = Object.values(GL_ACCOUNTS).find((acc) => acc.code === entry.account_code)
        const accountType = accountDef?.type || "Asset"

        console.log(`Creating missing GL account: ${entry.account_code} as ${accountType}`)
        account = await sql`
          INSERT INTO gl_accounts (id, code, name, type, balance, is_active)
          VALUES (gen_random_uuid(), ${entry.account_code}, ${entry.account_name}, ${accountType}, 0, true)
          RETURNING id
        `
      }

      console.log(`Creating journal entry for account: ${entry.account_code} (${account[0].id})`)

      // Generate UUID for journal entry
      const journalEntryUuid = await sql`SELECT gen_random_uuid() as id`
      const journalEntryId = journalEntryUuid[0].id

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
          ${journalEntryId},
          ${glTransactionId},
          ${account[0].id},
          ${entry.account_code},
          ${entry.debit_amount || 0},
          ${entry.credit_amount || 0},
          ${entry.description}
        )
      `

      // Update account balance
      const balanceChange = (entry.debit_amount || 0) - (entry.credit_amount || 0)
      if (balanceChange !== 0) {
        await sql`
          UPDATE gl_accounts 
          SET balance = COALESCE(balance, 0) + ${balanceChange},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${account[0].id}
        `
        console.log(`Updated account ${entry.account_code} balance by ${balanceChange}`)
      }
    }

    console.log(`E-Zwich GL entries posted successfully for transaction ${glEntry.transaction_id}`)
  } catch (error) {
    console.error("Error posting E-Zwich GL entries:", error)
    console.error("GL Entry data:", JSON.stringify(glEntry, null, 2))
    throw error
  }
}

// Get GL entries for a transaction
export async function getEZwichGLEntries(transactionId: string) {
  try {
    const result = await sql`
      SELECT 
        gt.id,
        gt.description,
        gt.date as transaction_date,
        gt.status,
        json_agg(
          json_build_object(
            'account_code', gje.account_code,
            'debit_amount', gje.debit,
            'credit_amount', gje.credit,
            'description', gje.description
          )
        ) as gl_entries
      FROM gl_transactions gt
      LEFT JOIN gl_journal_entries gje ON gt.id = gje.transaction_id
      WHERE gt.source_module = 'ezwich' AND gt.source_transaction_id = ${transactionId}
      GROUP BY gt.id, gt.description, gt.date, gt.status
    `

    return result[0] || null
  } catch (error) {
    console.error("Error fetching E-Zwich GL entries:", error)
    return null
  }
}

// Check GL schema and create tables if needed
export async function ensureGLSchema() {
  try {
    // Ensure gl_accounts table exists
    await sql`
      CREATE TABLE IF NOT EXISTS gl_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        parent_id UUID REFERENCES gl_accounts(id),
        balance DECIMAL(15,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Ensure gl_transactions table exists
    await sql`
      CREATE TABLE IF NOT EXISTS gl_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        source_module VARCHAR(50) NOT NULL,
        source_transaction_id VARCHAR(255) NOT NULL,
        source_transaction_type VARCHAR(50) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        posted_by VARCHAR(255),
        posted_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB
      )
    `

    // Ensure gl_journal_entries table exists
    await sql`
      CREATE TABLE IF NOT EXISTS gl_journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL REFERENCES gl_transactions(id),
        account_id UUID NOT NULL REFERENCES gl_accounts(id),
        account_code VARCHAR(50) NOT NULL,
        debit DECIMAL(15,2) DEFAULT 0,
        credit DECIMAL(15,2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Also ensure the table has the proper structure if it already exists
    await sql`
      DO $
      BEGIN
        -- Add id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'gl_journal_entries' AND column_name = 'id') THEN
          ALTER TABLE gl_journal_entries ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        END IF;

        -- Add default value if column exists but doesn't have default
        BEGIN
          ALTER TABLE gl_journal_entries ALTER COLUMN id SET DEFAULT gen_random_uuid();
        EXCEPTION
          WHEN others THEN NULL;
        END;
      END $;
    `

    console.log("GL schema ensured successfully")
  } catch (error) {
    console.error("Error ensuring GL schema:", error)
    throw error
  }
}

// Fix existing account types
export async function fixExistingAccountTypes() {
  try {
    console.log("Fixing existing E-Zwich GL account types...")

    const accounts = Object.values(GL_ACCOUNTS)

    for (const account of accounts) {
      const result = await sql`
        UPDATE gl_accounts 
        SET type = ${account.type}, updated_at = CURRENT_TIMESTAMP
        WHERE code = ${account.code} AND type != ${account.type}
        RETURNING code, name, type
      `

      if (result.length > 0) {
        console.log(`Fixed account type: ${result[0].code} - ${result[0].name} -> ${result[0].type}`)
      }
    }

    console.log("Account types fixed successfully")
  } catch (error) {
    console.error("Error fixing account types:", error)
    throw error
  }
}
