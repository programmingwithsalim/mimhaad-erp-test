import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export interface BranchFloatAccount {
  id: string
  branchId: string
  branchName: string
  provider: string // MTN, Vodafone, AirtelTigo, etc.
  accountType: string // momo, agency_banking, e-zwich, etc.
  currentBalance: number
  glAccountId?: string
  glAccountCode?: string
  glAccountName?: string
}

export interface GLAccountWithBranches {
  id: string
  code: string
  name: string
  type: string
  balance: number
  branchMappings: {
    branchId: string
    branchName: string
    floatAccountId: string
    provider: string
    balance: number
  }[]
  totalBranchBalance: number
}

export class BranchAwareFloatGLService {
  /**
   * Get all float accounts grouped by branch and provider
   */
  static async getFloatAccountsByBranchAndProvider(): Promise<{
    byBranch: Record<string, BranchFloatAccount[]>
    byProvider: Record<string, BranchFloatAccount[]>
    unmapped: BranchFloatAccount[]
  }> {
    try {
      // Get all float accounts with branch and GL mapping info
      const floatAccounts = await sql`
        SELECT 
          fa.id,
          fa.branch_id,
          fa.provider,
          fa.account_type,
          fa.current_balance,
          b.name as branch_name,
          m.gl_account_id,
          gl.code as gl_account_code,
          gl.name as gl_account_name
        FROM float_accounts fa
        LEFT JOIN branches b ON fa.branch_id = b.id
        LEFT JOIN float_account_gl_mapping m ON fa.id = m.float_account_id 
          AND m.mapping_type = 'main_account' 
          AND m.is_active = true
        LEFT JOIN gl_accounts gl ON m.gl_account_id = gl.id
        WHERE fa.is_active = true
        ORDER BY b.name, fa.provider, fa.account_type
      `

      const accounts: BranchFloatAccount[] = floatAccounts.map((account) => ({
        id: account.id,
        branchId: account.branch_id,
        branchName: account.branch_name || "Unknown Branch",
        provider: account.provider || "Unknown Provider",
        accountType: account.account_type || "unknown",
        currentBalance: Number.parseFloat(account.current_balance) || 0,
        glAccountId: account.gl_account_id,
        glAccountCode: account.gl_account_code,
        glAccountName: account.gl_account_name,
      }))

      // Group by branch
      const byBranch: Record<string, BranchFloatAccount[]> = {}
      accounts.forEach((account) => {
        if (!byBranch[account.branchId]) {
          byBranch[account.branchId] = []
        }
        byBranch[account.branchId].push(account)
      })

      // Group by provider
      const byProvider: Record<string, BranchFloatAccount[]> = {}
      accounts.forEach((account) => {
        const key = `${account.accountType}-${account.provider}`
        if (!byProvider[key]) {
          byProvider[key] = []
        }
        byProvider[key].push(account)
      })

      // Find unmapped accounts
      const unmapped = accounts.filter((account) => !account.glAccountId)

      return { byBranch, byProvider, unmapped }
    } catch (error) {
      console.error("Error getting float accounts by branch and provider:", error)
      throw error
    }
  }

  /**
   * Get GL accounts with their branch mappings
   */
  static async getGLAccountsWithBranchMappings(): Promise<GLAccountWithBranches[]> {
    try {
      // Get GL accounts
      const glAccounts = await sql`
        SELECT id, code, name, type, balance
        FROM gl_accounts 
        WHERE is_active = true 
        AND type = 'Asset'
        AND code LIKE '10%'
        ORDER BY code
      `

      const result: GLAccountWithBranches[] = []

      for (const glAccount of glAccounts) {
        // Get branch mappings for this GL account
        const branchMappings = await sql`
          SELECT 
            fa.id as float_account_id,
            fa.branch_id,
            fa.provider,
            fa.current_balance,
            b.name as branch_name
          FROM float_account_gl_mapping m
          JOIN float_accounts fa ON m.float_account_id = fa.id
          JOIN branches b ON fa.branch_id = b.id
          WHERE m.gl_account_id = ${glAccount.id}
          AND m.mapping_type = 'main_account'
          AND m.is_active = true
          AND fa.is_active = true
          ORDER BY b.name
        `

        const mappings = branchMappings.map((mapping) => ({
          branchId: mapping.branch_id,
          branchName: mapping.branch_name,
          floatAccountId: mapping.float_account_id,
          provider: mapping.provider,
          balance: Number.parseFloat(mapping.current_balance) || 0,
        }))

        const totalBranchBalance = mappings.reduce((sum, mapping) => sum + mapping.balance, 0)

        result.push({
          id: glAccount.id,
          code: glAccount.code,
          name: glAccount.name,
          type: glAccount.type,
          balance: Number.parseFloat(glAccount.balance) || 0,
          branchMappings: mappings,
          totalBranchBalance,
        })
      }

      return result
    } catch (error) {
      console.error("Error getting GL accounts with branch mappings:", error)
      throw error
    }
  }

  /**
   * Auto-map float accounts to GL accounts based on provider and account type
   */
  static async autoMapByProvider(): Promise<{
    success: number
    failed: number
    details: string[]
  }> {
    const results = { success: 0, failed: 0, details: [] }

    try {
      // Get unmapped float accounts
      const { unmapped } = await this.getFloatAccountsByBranchAndProvider()

      // Get available GL accounts
      const glAccounts = await sql`
        SELECT id, code, name FROM gl_accounts WHERE is_active = true
      `

      for (const floatAccount of unmapped) {
        try {
          const glAccountCode = this.getGLAccountCodeForProvider(floatAccount.accountType, floatAccount.provider)

          const glAccount = glAccounts.find((gl) => gl.code === glAccountCode)

          if (glAccount) {
            // Create the mapping
            await sql`
              INSERT INTO float_account_gl_mapping 
              (float_account_id, gl_account_id, mapping_type, is_active)
              VALUES (${floatAccount.id}, ${glAccount.id}, 'main_account', true)
              ON CONFLICT (float_account_id, mapping_type) 
              DO UPDATE SET gl_account_id = ${glAccount.id}, is_active = true
            `

            results.success++
            results.details.push(
              `Mapped ${floatAccount.branchName} - ${floatAccount.provider} ${floatAccount.accountType} → ${glAccount.code}`,
            )
          } else {
            results.failed++
            results.details.push(
              `No GL account found for ${floatAccount.provider} ${floatAccount.accountType} (expected: ${glAccountCode})`,
            )
          }
        } catch (error) {
          results.failed++
          results.details.push(`Error mapping ${floatAccount.branchName} - ${floatAccount.provider}: ${error.message}`)
        }
      }

      return results
    } catch (error) {
      console.error("Error in auto-mapping by provider:", error)
      throw error
    }
  }

  /**
   * Get the appropriate GL account code for a provider and account type
   */
  private static getGLAccountCodeForProvider(accountType: string, provider: string): string {
    const type = accountType.toLowerCase()

    switch (type) {
      case "momo":
        return "1003" // MoMo Float Account
      case "e-zwich":
        return "1002" // E-Zwich Settlement Account
      case "power":
        return "1004" // Power Float Account
      case "agency_banking":
        return "1005" // Agency Banking Float
      case "jumia":
        return "1006" // Jumia Float Account
      case "cash_till":
        return "1001" // Cash
      default:
        return "1003" // Default to MoMo Float Account
    }
  }

  /**
   * Sync balances from float accounts to GL accounts (aggregated by provider)
   */
  static async syncAggregatedBalances(): Promise<{
    synced: number
    errors: string[]
  }> {
    const results = { synced: 0, errors: [] }

    try {
      // Get GL accounts with their branch mappings
      const glAccountsWithMappings = await this.getGLAccountsWithBranchMappings()

      for (const glAccount of glAccountsWithMappings) {
        try {
          // Update GL account balance to sum of all branch balances
          await sql`
            UPDATE gl_accounts 
            SET balance = ${glAccount.totalBranchBalance},
                updated_at = NOW()
            WHERE id = ${glAccount.id}
          `

          results.synced++
        } catch (error) {
          results.errors.push(`Failed to sync ${glAccount.code}: ${error.message}`)
        }
      }

      return results
    } catch (error) {
      console.error("Error syncing aggregated balances:", error)
      throw error
    }
  }

  /**
   * Get branch performance report
   */
  static async getBranchPerformanceReport(): Promise<{
    branches: {
      branchId: string
      branchName: string
      totalFloat: number
      accountsByProvider: Record<string, number>
      glMappingStatus: {
        mapped: number
        unmapped: number
        total: number
      }
    }[]
  }> {
    try {
      const { byBranch } = await this.getFloatAccountsByBranchAndProvider()

      const branches = Object.entries(byBranch).map(([branchId, accounts]) => {
        const totalFloat = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0)

        const accountsByProvider: Record<string, number> = {}
        accounts.forEach((acc) => {
          const key = `${acc.provider} ${acc.accountType}`
          accountsByProvider[key] = (accountsByProvider[key] || 0) + acc.currentBalance
        })

        const mapped = accounts.filter((acc) => acc.glAccountId).length
        const total = accounts.length

        return {
          branchId,
          branchName: accounts[0]?.branchName || "Unknown",
          totalFloat,
          accountsByProvider,
          glMappingStatus: {
            mapped,
            unmapped: total - mapped,
            total,
          },
        }
      })

      return { branches }
    } catch (error) {
      console.error("Error getting branch performance report:", error)
      throw error
    }
  }
}
