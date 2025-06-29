import { neon } from "@neondatabase/serverless"

// Helper function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Float Account interface
export interface FloatAccount {
  id: string
  branch_id: string
  account_type: string
  provider: string
  account_number: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

export interface CreateFloatAccountData {
  branchId: string
  accountType: string
  provider: string
  accountNumber: string
  currentBalance: number
  minThreshold: number
  maxThreshold: number
  createdBy: string
}

export interface UpdateFloatAccountData {
  provider?: string
  account_number?: string
  current_balance?: number
  min_threshold?: number
  max_threshold?: number
  is_active?: boolean
}

export interface FloatAccountStatistics {
  totalAccounts: number
  totalBalance: number
  activeAccounts: number
  inactiveAccounts: number
  lowBalanceAccounts: number
  byAccountType: Record<string, { count: number; balance: number }>
  byProvider: Record<string, { count: number; balance: number }>
  averageBalance: number
  lastUpdated: string
}

/**
 * Get all float accounts
 */
export async function getAllFloatAccounts(): Promise<FloatAccount[]> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, returning empty array")
      return []
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      console.log("Float accounts table does not exist")
      return []
    }

    const accounts = await sql`
      SELECT * FROM float_accounts 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `

    return accounts.map((account) => ({
      ...account,
      current_balance: Number(account.current_balance),
      min_threshold: Number(account.min_threshold),
      max_threshold: Number(account.max_threshold),
    })) as FloatAccount[]
  } catch (error) {
    console.error("Error fetching all float accounts:", error)
    return []
  }
}

/**
 * Get float accounts by branch ID
 */
export async function getFloatAccountsByBranchId(branchId: string): Promise<FloatAccount[]> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, returning empty array")
      return []
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      console.log("Float accounts table does not exist")
      return []
    }

    // Validate UUID format
    if (!isValidUUID(branchId)) {
      console.log(`Invalid UUID format for branch ID: ${branchId}`)
      return []
    }

    const accounts = await sql`
      SELECT * FROM float_accounts 
      WHERE branch_id = ${branchId} AND is_active = true
      ORDER BY created_at DESC
    `

    return accounts.map((account) => ({
      ...account,
      current_balance: Number(account.current_balance),
      min_threshold: Number(account.min_threshold),
      max_threshold: Number(account.max_threshold),
    })) as FloatAccount[]
  } catch (error) {
    console.error("Error fetching float accounts by branch ID:", error)
    return []
  }
}

/**
 * Get float account by ID
 */
export async function getFloatAccountById(id: string): Promise<FloatAccount | null> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, returning null")
      return null
    }

    if (!isValidUUID(id)) {
      console.log(`Invalid UUID format: ${id}`)
      return null
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      console.log("Float accounts table does not exist")
      return null
    }

    const accounts = await sql`
      SELECT * FROM float_accounts 
      WHERE id = ${id}
      LIMIT 1
    `

    if (accounts.length === 0) return null

    const account = accounts[0]
    return {
      ...account,
      current_balance: Number(account.current_balance),
      min_threshold: Number(account.min_threshold),
      max_threshold: Number(account.max_threshold),
    } as FloatAccount
  } catch (error) {
    console.error("Error fetching float account by ID:", error)
    return null
  }
}

/**
 * Create a new float account
 */
export async function createFloatAccount(data: CreateFloatAccountData): Promise<FloatAccount | null> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, cannot create float account")
      return null
    }

    // Validate UUID format for branch ID
    if (!isValidUUID(data.branchId)) {
      console.error(`Invalid UUID format for branch ID: ${data.branchId}`)
      return null
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      console.log("Float accounts table does not exist, cannot create account")
      return null
    }

    const accounts = await sql`
      INSERT INTO float_accounts (
        branch_id, account_type, provider, account_number, 
        current_balance, min_threshold, max_threshold, created_by
      ) VALUES (
        ${data.branchId}, ${data.accountType}, ${data.provider}, ${data.accountNumber},
        ${data.currentBalance}, ${data.minThreshold}, ${data.maxThreshold}, ${data.createdBy}
      )
      RETURNING *
    `

    if (accounts.length === 0) return null

    const account = accounts[0]
    return {
      ...account,
      current_balance: Number(account.current_balance),
      min_threshold: Number(account.min_threshold),
      max_threshold: Number(account.max_threshold),
    } as FloatAccount
  } catch (error) {
    console.error("Error creating float account:", error)
    return null
  }
}

/**
 * Update a float account
 */
export async function updateFloatAccount(id: string, data: UpdateFloatAccountData): Promise<FloatAccount | null> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, cannot update float account")
      return null
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format: ${id}`)
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      throw new Error("Float accounts table does not exist")
    }

    // Get current account data
    const currentAccount = await getFloatAccountById(id)
    if (!currentAccount) {
      throw new Error("Float account not found")
    }

    const accounts = await sql`
      UPDATE float_accounts
      SET 
        provider = ${data.provider !== undefined ? data.provider : currentAccount.provider},
        account_number = ${data.account_number !== undefined ? data.account_number : currentAccount.account_number},
        current_balance = ${data.current_balance !== undefined ? data.current_balance : currentAccount.current_balance},
        min_threshold = ${data.min_threshold !== undefined ? data.min_threshold : currentAccount.min_threshold},
        max_threshold = ${data.max_threshold !== undefined ? data.max_threshold : currentAccount.max_threshold},
        is_active = ${data.is_active !== undefined ? data.is_active : currentAccount.is_active},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (accounts.length === 0) {
      throw new Error("Float account not found")
    }

    const account = accounts[0]
    return {
      ...account,
      current_balance: Number(account.current_balance),
      min_threshold: Number(account.min_threshold),
      max_threshold: Number(account.max_threshold),
    } as FloatAccount
  } catch (error) {
    console.error("Error updating float account:", error)
    throw error
  }
}

/**
 * Check if float account has related transactions
 */
export async function checkFloatAccountDependencies(id: string): Promise<{
  hasTransactions: boolean
  transactionCount: number
  canDelete: boolean
}> {
  try {
    if (!process.env.DATABASE_URL) {
      return { hasTransactions: false, transactionCount: 0, canDelete: false }
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format: ${id}`)
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if float_transactions table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_transactions'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      // If no transactions table, we can safely delete
      return { hasTransactions: false, transactionCount: 0, canDelete: true }
    }

    // Check for related transactions
    const transactionCount = await sql`
      SELECT COUNT(*) as count
      FROM float_transactions 
      WHERE account_id = ${id}
    `

    const count = Number(transactionCount[0]?.count || 0)

    return {
      hasTransactions: count > 0,
      transactionCount: count,
      canDelete: count === 0,
    }
  } catch (error) {
    console.error("Error checking float account dependencies:", error)
    return { hasTransactions: true, transactionCount: 0, canDelete: false }
  }
}

/**
 * Soft delete a float account (mark as inactive)
 */
export async function softDeleteFloatAccount(id: string): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, cannot soft delete float account")
      return false
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format: ${id}`)
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      throw new Error("Float accounts table does not exist")
    }

    const result = await sql`
      UPDATE float_accounts 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `

    return result.count > 0
  } catch (error) {
    console.error("Error soft deleting float account:", error)
    throw error
  }
}

/**
 * Force delete a float account and all related transactions
 */
export async function forceDeleteFloatAccount(id: string): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, cannot force delete float account")
      return false
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format: ${id}`)
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the tables exist first
    const floatAccountsExist = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!floatAccountsExist[0]?.table_exists) {
      throw new Error("Float accounts table does not exist")
    }

    // Check if float_transactions table exists
    const transactionTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_transactions'
      ) as table_exists
    `

    // Check if float_gl_mapping table exists
    const glMappingTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_gl_mapping'
      ) as table_exists
    `

    // Execute transaction using SQL directly instead of using begin()
    await sql`
      BEGIN;
      
      ${
        transactionTableExists[0]?.table_exists
          ? sql`
        DELETE FROM float_transactions 
        WHERE account_id = ${id};
      `
          : sql``
      }
      
      ${
        glMappingTableExists[0]?.table_exists
          ? sql`
        DELETE FROM float_gl_mapping 
        WHERE float_account_id = ${id};
      `
          : sql``
      }
      
      DELETE FROM float_accounts 
      WHERE id = ${id};
      
      COMMIT;
    `

    return true
  } catch (error) {
    console.error("Error force deleting float account:", error)
    throw error
  }
}

/**
 * Delete a float account (original function - now checks dependencies)
 */
export async function deleteFloatAccount(id: string): Promise<boolean> {
  try {
    // Check dependencies first
    const dependencies = await checkFloatAccountDependencies(id)

    if (!dependencies.canDelete) {
      throw new Error(
        `Cannot delete account: ${dependencies.transactionCount} related transactions exist. Use soft delete or force delete instead.`,
      )
    }

    // If no dependencies, proceed with normal delete
    if (!process.env.DATABASE_URL) {
      console.log("No DATABASE_URL, cannot delete float account")
      return false
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID format: ${id}`)
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      throw new Error("Float accounts table does not exist")
    }

    const result = await sql`
      DELETE FROM float_accounts 
      WHERE id = ${id}
    `

    return result.count > 0
  } catch (error) {
    console.error("Error deleting float account:", error)
    throw error
  }
}

/**
 * Get float account statistics
 */
export async function getFloatAccountStatistics(): Promise<FloatAccountStatistics> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        totalAccounts: 0,
        totalBalance: 0,
        activeAccounts: 0,
        inactiveAccounts: 0,
        lowBalanceAccounts: 0,
        byAccountType: {},
        byProvider: {},
        averageBalance: 0,
        lastUpdated: new Date().toISOString(),
      }
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      return {
        totalAccounts: 0,
        totalBalance: 0,
        activeAccounts: 0,
        inactiveAccounts: 0,
        lowBalanceAccounts: 0,
        byAccountType: {},
        byProvider: {},
        averageBalance: 0,
        lastUpdated: new Date().toISOString(),
      }
    }

    // Get basic statistics
    const basicStats = await sql`
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(current_balance), 0) as total_balance,
        COUNT(*) FILTER (WHERE is_active = true) as active_accounts,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_accounts,
        COUNT(*) FILTER (WHERE current_balance < min_threshold) as low_balance_accounts
      FROM float_accounts
    `

    // Get statistics by account type
    const typeStats = await sql`
      SELECT 
        account_type,
        COUNT(*) as count,
        COALESCE(SUM(current_balance), 0) as balance
      FROM float_accounts
      WHERE is_active = true
      GROUP BY account_type
    `

    // Get statistics by provider
    const providerStats = await sql`
      SELECT 
        provider,
        COUNT(*) as count,
        COALESCE(SUM(current_balance), 0) as balance
      FROM float_accounts
      WHERE is_active = true
      GROUP BY provider
    `

    const stats = basicStats[0] || {}
    const totalBalance = Number(stats.total_balance || 0)
    const totalAccounts = Number(stats.total_accounts || 0)

    return {
      totalAccounts,
      totalBalance,
      activeAccounts: Number(stats.active_accounts || 0),
      inactiveAccounts: Number(stats.inactive_accounts || 0),
      lowBalanceAccounts: Number(stats.low_balance_accounts || 0),
      byAccountType: typeStats.reduce(
        (acc, row) => {
          acc[row.account_type] = {
            count: Number(row.count),
            balance: Number(row.balance),
          }
          return acc
        },
        {} as Record<string, { count: number; balance: number }>,
      ),
      byProvider: providerStats.reduce(
        (acc, row) => {
          acc[row.provider] = {
            count: Number(row.count),
            balance: Number(row.balance),
          }
          return acc
        },
        {} as Record<string, { count: number; balance: number }>,
      ),
      averageBalance: totalAccounts > 0 ? totalBalance / totalAccounts : 0,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error getting float account statistics:", error)
    return {
      totalAccounts: 0,
      totalBalance: 0,
      activeAccounts: 0,
      inactiveAccounts: 0,
      lowBalanceAccounts: 0,
      byAccountType: {},
      byProvider: {},
      averageBalance: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
}

/**
 * Get existing account types for a branch
 */
export async function getExistingAccountTypesForBranch(branchId: string): Promise<string[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return []
    }

    if (!isValidUUID(branchId)) {
      console.log(`Invalid UUID format for branch ID: ${branchId}`)
      return []
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if the table exists first
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      ) as table_exists
    `

    if (!tableCheck[0]?.table_exists) {
      return []
    }

    const accountTypes = await sql`
      SELECT DISTINCT account_type
      FROM float_accounts
      WHERE branch_id = ${branchId} AND is_active = true
      ORDER BY account_type
    `

    return accountTypes.map((row) => row.account_type)
  } catch (error) {
    console.error("Error getting existing account types for branch:", error)
    return []
  }
}
