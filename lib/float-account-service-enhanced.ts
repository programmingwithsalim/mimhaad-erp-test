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

    console.log(`Retrieved ${accounts.length} float accounts from database`)

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
export async function getFloatAccountsByBranchId(branchId: string, accountType?: string): Promise<FloatAccount[]> {
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

    // Build query based on whether accountType is provided
    let accounts
    if (accountType) {
      console.log(`Fetching float accounts for branch ${branchId} with account_type ${accountType}`)
      accounts = await sql`
        SELECT * FROM float_accounts 
        WHERE branch_id = ${branchId} 
        AND account_type = ${accountType}
        AND is_active = true
        ORDER BY created_at DESC
      `
    } else {
      console.log(`Fetching all float accounts for branch ${branchId}`)
      accounts = await sql`
        SELECT * FROM float_accounts 
        WHERE branch_id = ${branchId} 
        AND is_active = true
        ORDER BY created_at DESC
      `
    }

    console.log(`Retrieved ${accounts.length} float accounts from database`)

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
 * Delete a float account
 */
export async function deleteFloatAccount(id: string): Promise<boolean> {
  try {
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
