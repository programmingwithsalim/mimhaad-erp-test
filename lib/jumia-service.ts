import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface JumiaTransaction {
  id?: number
  transaction_id: string
  branch_id: string
  user_id: string
  transaction_type: "package_receipt" | "pod_collection" | "settlement"
  tracking_id?: string
  customer_name?: string
  customer_phone?: string
  amount: number
  settlement_reference?: string
  settlement_from_date?: string
  settlement_to_date?: string
  status: string
  delivery_status?: string
  notes?: string
  float_account_id?: string // For settlements - which account was used to pay
  created_at?: string
  updated_at?: string
}

export interface JumiaLiability {
  branch_id: string
  amount: number
  last_updated?: string
}

export interface JumiaStatistics {
  total_packages: number
  packages_collected: number
  total_pod_amount: number
  unsettled_amount: number
  total_settlements: number
}

// Check if tables exist
async function tablesExist(): Promise<boolean> {
  try {
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('jumia_transactions', 'jumia_liability')
    `
    return Array.isArray(result) && result.length >= 2
  } catch (error) {
    console.error("Error checking Jumia tables:", error)
    return false
  }
}

// Check if float accounts table exists
async function floatAccountsTableExists(): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `
    return result[0]?.table_exists || false
  } catch (error) {
    console.error("Error checking float_accounts table:", error)
    return false
  }
}

// Update float account balance directly in database
async function updateFloatAccountBalance(
  accountId: string,
  amount: number,
  transactionType: string,
  description: string,
): Promise<void> {
  try {
    const tableExists = await floatAccountsTableExists()
    if (!tableExists) {
      console.log("Float accounts table does not exist, skipping balance update")
      return
    }

    // Get current balance
    const accountResult = await sql`
      SELECT current_balance FROM float_accounts 
      WHERE id = ${accountId}
    `

    if (!Array.isArray(accountResult) || accountResult.length === 0) {
      console.log(`Float account ${accountId} not found`)
      return
    }

    // Ensure we get a proper number
    const currentBalanceRaw = accountResult[0].current_balance
    const currentBalance = Number.parseFloat(String(currentBalanceRaw || "0"))

    // Ensure amount is also a proper number
    const adjustmentAmount = Number.parseFloat(String(amount || "0"))
    const newBalance = currentBalance + adjustmentAmount

    // Check for negative balance (only for debits)
    if (amount < 0 && newBalance < 0) {
      console.log(
        `Insufficient balance in account ${accountId}. Current: ${currentBalance}, Requested: ${Math.abs(amount)}`,
      )
      throw new Error(
        `Insufficient balance. Current: GHS ${currentBalance.toFixed(2)}, Required: GHS ${Math.abs(amount).toFixed(2)}`,
      )
    }

    // Update the account balance
    await sql`
      UPDATE float_accounts 
      SET 
        current_balance = ${newBalance}::numeric,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${accountId}
    `

    // Keep only essential logging:
    console.log(`Updated float account ${accountId}: ${currentBalance} -> ${newBalance}`)

    // Log transaction if float_transactions table exists
    await logFloatTransaction(accountId, transactionType, adjustmentAmount, currentBalance, newBalance, description)
  } catch (error) {
    console.error("Error updating float account balance:", error)
    throw error // Throw error for settlements to prevent processing with insufficient funds
  }
}

// Log float transaction (optional)
async function logFloatTransaction(
  accountId: string,
  transactionType: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  description: string,
): Promise<void> {
  try {
    // Check if float_transactions table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_transactions'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      console.log("float_transactions table doesn't exist, skipping transaction log")
      return
    }

    // Check which columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'float_transactions' 
      AND table_schema = 'public'
    `

    const columnNames = columns.map((col) => col.column_name)
    const hasBalanceColumns = columnNames.includes("balance_before") && columnNames.includes("balance_after")

    if (hasBalanceColumns) {
      // Use full schema with balance columns
      await sql`
        INSERT INTO float_transactions (
          account_id,
          transaction_type,
          amount,
          balance_before,
          balance_after,
          description,
          reference,
          created_at
        ) VALUES (
          ${accountId},
          ${transactionType},
          ${Math.abs(Number.parseFloat(String(amount || "0")))}::numeric,
          ${Number.parseFloat(String(balanceBefore || "0"))}::numeric,
          ${Number.parseFloat(String(balanceAfter || "0"))}::numeric,
          ${description},
          ${`JUMIA-${Date.now()}`},
          CURRENT_TIMESTAMP
        )
      `
    } else {
      // Use basic schema without balance columns
      await sql`
        INSERT INTO float_transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference,
          created_at
        ) VALUES (
          ${accountId},
          ${transactionType},
          ${Math.abs(Number.parseFloat(String(amount || "0")))}::numeric,
          ${description},
          ${`JUMIA-${Date.now()}`},
          CURRENT_TIMESTAMP
        )
      `
    }

    console.log("Float transaction logged successfully")
  } catch (error) {
    console.error("Error logging float transaction (non-critical):", error)
    // Don't throw error - transaction logging is optional
  }
}

// Create a new Jumia transaction
export async function createJumiaTransaction(
  transaction: Omit<JumiaTransaction, "id" | "created_at" | "updated_at">,
): Promise<JumiaTransaction> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    const result = await sql`
      INSERT INTO jumia_transactions (
        transaction_id, branch_id, user_id, transaction_type,
        tracking_id, customer_name, customer_phone, amount,
        settlement_reference, settlement_from_date, settlement_to_date,
        status, delivery_status, notes, float_account_id
      ) VALUES (
        ${transaction.transaction_id}, ${transaction.branch_id}, ${transaction.user_id}, ${transaction.transaction_type},
        ${transaction.tracking_id || null}, ${transaction.customer_name || null}, ${transaction.customer_phone || null}, ${transaction.amount},
        ${transaction.settlement_reference || null}, ${transaction.settlement_from_date || null}, ${transaction.settlement_to_date || null},
        ${transaction.status}, ${transaction.delivery_status || null}, ${transaction.notes || null}, ${transaction.float_account_id || null}
      )
      RETURNING *
    `

    if (Array.isArray(result) && result.length > 0) {
      const createdTransaction = result[0] as JumiaTransaction

      // If this is a settlement, mark POD collections as settled
      if (createdTransaction.transaction_type === "settlement") {
        await sql`
          UPDATE jumia_transactions 
          SET status = 'settled', updated_at = CURRENT_TIMESTAMP
          WHERE branch_id = ${createdTransaction.branch_id} 
          AND transaction_type = 'pod_collection' 
          AND status = 'active'
        `
      }

      // Handle float account updates based on transaction type
      await handleFloatAccountUpdates(createdTransaction, "create")

      return createdTransaction
    }

    throw new Error("Failed to create transaction")
  } catch (error) {
    console.error("Error creating Jumia transaction in database:", error)
    throw error
  }
}

// Handle float account updates for transactions
async function handleFloatAccountUpdates(transaction: JumiaTransaction, operation: "create" | "delete"): Promise<void> {
  try {
    if (transaction.transaction_type === "pod_collection" && transaction.amount > 0) {
      // POD Collection: Increase cash-in-till, increase Jumia liability
      const cashAccountId = await findCashInTillAccount(transaction.branch_id)
      if (cashAccountId) {
        const amount = operation === "create" ? transaction.amount : -transaction.amount
        await updateFloatAccountBalance(
          cashAccountId,
          amount,
          "jumia_pod_collection",
          `Jumia POD collection - ${transaction.transaction_id}`,
        )
      }

      const liabilityAmount = operation === "create" ? transaction.amount : -transaction.amount
      await updateJumiaLiability(
        transaction.branch_id,
        liabilityAmount,
        operation === "create" ? "increase" : "decrease",
      )
    } else if (transaction.transaction_type === "settlement" && transaction.amount > 0) {
      // Settlement: Use specified float account or default to cash-in-till
      const accountId = transaction.float_account_id || (await findCashInTillAccount(transaction.branch_id))

      if (accountId) {
        const amount = operation === "create" ? -transaction.amount : transaction.amount
        await updateFloatAccountBalance(
          accountId,
          amount,
          "jumia_settlement",
          `Jumia settlement - ${transaction.transaction_id}`,
        )
      }

      const liabilityAmount = operation === "create" ? transaction.amount : -transaction.amount
      await updateJumiaLiability(
        transaction.branch_id,
        liabilityAmount,
        operation === "create" ? "decrease" : "increase",
      )
    }
  } catch (error) {
    console.error("Error handling float account updates:", error)
    throw error // Throw error to prevent transaction completion if float updates fail
  }
}

// Find cash-in-till account for a branch
async function findCashInTillAccount(branchId: string): Promise<string | null> {
  try {
    const tableExists = await floatAccountsTableExists()
    if (!tableExists) {
      console.log("Float accounts table does not exist")
      return null
    }

    const result = await sql`
      SELECT id FROM float_accounts 
      WHERE branch_id = ${branchId} 
      AND account_type = 'cash-in-till'
      AND is_active = true
      LIMIT 1
    `

    if (Array.isArray(result) && result.length > 0) {
      return result[0].id
    }

    console.log(`No active cash-in-till account found for branch ${branchId}`)
    return null
  } catch (error) {
    console.error("Error finding cash-in-till account:", error)
    return null
  }
}

// Get Jumia transactions
export async function getJumiaTransactions(branchId: string, limit = 50): Promise<JumiaTransaction[]> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    const result = await sql`
      SELECT * FROM jumia_transactions 
      WHERE branch_id = ${branchId}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `

    if (Array.isArray(result)) {
      return result as JumiaTransaction[]
    }

    return []
  } catch (error) {
    console.error("Error getting Jumia transactions from database:", error)
    throw error
  }
}

// Get all Jumia transactions (for admin purposes)
export async function getAllJumiaTransactions(limit = 100): Promise<JumiaTransaction[]> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    const result = await sql`
      SELECT * FROM jumia_transactions 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `

    if (Array.isArray(result)) {
      return result as JumiaTransaction[]
    }

    return []
  } catch (error) {
    console.error("Error getting all Jumia transactions from database:", error)
    throw error
  }
}

// Get single transaction by ID
export async function getJumiaTransactionById(transactionId: string): Promise<JumiaTransaction | null> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    const result = await sql`
      SELECT * FROM jumia_transactions 
      WHERE transaction_id = ${transactionId}
    `

    if (Array.isArray(result) && result.length > 0) {
      return result[0] as JumiaTransaction
    }

    return null
  } catch (error) {
    console.error("Error getting Jumia transaction by ID:", error)
    throw error
  }
}

// Update transaction
export async function updateJumiaTransaction(
  transactionId: string,
  updateData: Partial<JumiaTransaction>,
): Promise<JumiaTransaction> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    // Get current transaction for comparison
    const currentTransaction = await getJumiaTransactionById(transactionId)
    if (!currentTransaction) {
      throw new Error("Transaction not found")
    }

    console.log("Updating transaction:", transactionId, "with data:", updateData)

    // Build update object with current values as defaults
    const updatedTransaction = {
      branch_id: updateData.branch_id ?? currentTransaction.branch_id,
      user_id: updateData.user_id ?? currentTransaction.user_id,
      transaction_type: updateData.transaction_type ?? currentTransaction.transaction_type,
      tracking_id: updateData.tracking_id ?? currentTransaction.tracking_id,
      customer_name: updateData.customer_name ?? currentTransaction.customer_name,
      customer_phone: updateData.customer_phone ?? currentTransaction.customer_phone,
      amount: updateData.amount ?? currentTransaction.amount,
      settlement_reference: updateData.settlement_reference ?? currentTransaction.settlement_reference,
      settlement_from_date: updateData.settlement_from_date ?? currentTransaction.settlement_from_date,
      settlement_to_date: updateData.settlement_to_date ?? currentTransaction.settlement_to_date,
      status: updateData.status ?? currentTransaction.status,
      delivery_status: updateData.delivery_status ?? currentTransaction.delivery_status,
      notes: updateData.notes ?? currentTransaction.notes,
      float_account_id: updateData.float_account_id ?? currentTransaction.float_account_id,
    }

    const result = await sql`
      UPDATE jumia_transactions 
      SET 
        branch_id = ${updatedTransaction.branch_id},
        user_id = ${updatedTransaction.user_id},
        transaction_type = ${updatedTransaction.transaction_type},
        tracking_id = ${updatedTransaction.tracking_id},
        customer_name = ${updatedTransaction.customer_name},
        customer_phone = ${updatedTransaction.customer_phone},
        amount = ${updatedTransaction.amount},
        settlement_reference = ${updatedTransaction.settlement_reference},
        settlement_from_date = ${updatedTransaction.settlement_from_date},
        settlement_to_date = ${updatedTransaction.settlement_to_date},
        status = ${updatedTransaction.status},
        delivery_status = ${updatedTransaction.delivery_status},
        notes = ${updatedTransaction.notes},
        float_account_id = ${updatedTransaction.float_account_id},
        updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = ${transactionId}
      RETURNING *
    `

    if (Array.isArray(result) && result.length > 0) {
      console.log("Transaction updated successfully:", result[0])
      return result[0] as JumiaTransaction
    }

    throw new Error("Transaction not found or update failed")
  } catch (error) {
    console.error("Error updating Jumia transaction:", error)
    throw error
  }
}

// Delete transaction
export async function deleteJumiaTransaction(transactionId: string): Promise<JumiaTransaction> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    const result = await sql`
      DELETE FROM jumia_transactions 
      WHERE transaction_id = ${transactionId}
      RETURNING *
    `

    if (Array.isArray(result) && result.length > 0) {
      const deletedTransaction = result[0] as JumiaTransaction

      // Reverse float account updates
      await handleFloatAccountUpdates(deletedTransaction, "delete")

      return deletedTransaction
    }

    throw new Error("Transaction not found")
  } catch (error) {
    console.error("Error deleting Jumia transaction:", error)
    throw error
  }
}

// Get Jumia statistics - Fixed to handle proper UUID format
export async function getJumiaStatistics(branchId: string): Promise<JumiaStatistics> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    // Validate branchId format - if it's not a UUID, try to find the actual branch ID
    let actualBranchId = branchId

    // If branchId looks like "branch-1", try to find the actual UUID
    if (branchId && !branchId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const branchResult = await sql`
        SELECT id FROM branches WHERE name ILIKE ${`%${branchId}%`} OR id = ${branchId} LIMIT 1
      `
      if (branchResult.length > 0) {
        actualBranchId = branchResult[0].id
      } else {
        console.warn("Could not find branch, using original branchId")
      }
    }

    const result = await sql`
      SELECT 
        COUNT(CASE WHEN transaction_type = 'package_receipt' THEN 1 END) as total_packages,
        COUNT(CASE WHEN transaction_type = 'pod_collection' THEN 1 END) as packages_collected,
        COALESCE(SUM(CASE WHEN transaction_type = 'pod_collection' THEN amount END), 0) as total_pod_amount,
        COALESCE(SUM(CASE WHEN transaction_type = 'pod_collection' AND status = 'active' THEN amount END), 0) as unsettled_amount,
        COUNT(CASE WHEN transaction_type = 'settlement' THEN 1 END) as total_settlements
      FROM jumia_transactions 
      WHERE branch_id = ${actualBranchId}
    `

    if (Array.isArray(result) && result.length > 0) {
      const stats = result[0] as any
      return {
        total_packages: Number.parseInt(stats.total_packages) || 0,
        packages_collected: Number.parseInt(stats.packages_collected) || 0,
        total_pod_amount: Number.parseFloat(stats.total_pod_amount) || 0,
        unsettled_amount: Number.parseFloat(stats.unsettled_amount) || 0,
        total_settlements: Number.parseInt(stats.total_settlements) || 0,
      }
    }

    return {
      total_packages: 0,
      packages_collected: 0,
      total_pod_amount: 0,
      unsettled_amount: 0,
      total_settlements: 0,
    }
  } catch (error) {
    console.error("Error getting Jumia statistics from database:", error)
    throw error
  }
}

// Update Jumia liability
async function updateJumiaLiability(
  branchId: string,
  amount: number,
  operation: "increase" | "decrease",
): Promise<void> {
  const useDatabase = await tablesExist()

  if (useDatabase) {
    try {
      const adjustedAmount = operation === "increase" ? amount : -amount

      await sql`
        INSERT INTO jumia_liability (branch_id, amount, last_updated)
        VALUES (${branchId}, ${adjustedAmount}, CURRENT_TIMESTAMP)
        ON CONFLICT (branch_id)
        DO UPDATE SET 
          amount = jumia_liability.amount + ${adjustedAmount},
          last_updated = CURRENT_TIMESTAMP
      `
    } catch (error) {
      console.error("Error updating Jumia liability:", error)
    }
  }
}

// Get Jumia liability
export async function getJumiaLiability(branchId: string): Promise<number> {
  const useDatabase = await tablesExist()

  if (!useDatabase) {
    throw new Error("Jumia database tables not found. Please initialize the database first.")
  }

  try {
    const result = await sql`
      SELECT amount FROM jumia_liability WHERE branch_id = ${branchId}
    `

    if (Array.isArray(result) && result.length > 0) {
      return Number.parseFloat(result[0].amount) || 0
    }

    return 0
  } catch (error) {
    console.error("Error getting Jumia liability:", error)
    throw error
  }
}
