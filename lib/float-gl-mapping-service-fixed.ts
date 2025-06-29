import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export interface FloatGLMapping {
  id: string
  floatAccountId: string
  glAccountId: string
  mappingType: "main_account" | "fee_account" | "commission_account"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  floatAccount?: any
  glAccount?: any
}

export interface FloatAccountWithGL {
  id: string
  accountName: string
  accountType: string
  currentBalance: number
  branchId: string
  branchName?: string
  glMappings: FloatGLMapping[]
  mainGLAccount?: any
  feeGLAccount?: any
  commissionGLAccount?: any
}

export class FloatGLMappingService {
  /**
   * Get all float accounts with their GL mappings
   */
  static async getFloatAccountsWithMappings(): Promise<FloatAccountWithGL[]> {
    try {
      // Fixed: Use 'name' instead of 'branch_name'
      const floatAccounts = await sql`
        SELECT 
          fa.*,
          COALESCE(b.name, 'Unknown Branch') as branch_name
        FROM float_accounts fa
        LEFT JOIN branches b ON fa.branch_id = b.id
        WHERE fa.is_active = true
        ORDER BY fa.account_name
      `

      // Check if mapping table exists
      const mappingTableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'float_account_gl_mapping'
        )
      `

      let mappings = []
      if (mappingTableExists[0].exists) {
        mappings = await sql`
          SELECT 
            m.*,
            g.code as account_code,
            g.name as gl_account_name,
            g.type as gl_account_type,
            g.balance as gl_balance
          FROM float_account_gl_mapping m
          JOIN gl_accounts g ON m.gl_account_id = g.id
          WHERE m.is_active = true
        `
      }

      return floatAccounts.map((account) => {
        const accountMappings = mappings.filter((m) => m.float_account_id === account.id)

        return {
          id: account.id,
          accountName: account.account_name,
          accountType: account.account_type,
          currentBalance: Number.parseFloat(account.current_balance || "0"),
          branchId: account.branch_id,
          branchName: account.branch_name,
          glMappings: accountMappings,
          mainGLAccount: accountMappings.find((m) => m.mapping_type === "main_account"),
          feeGLAccount: accountMappings.find((m) => m.mapping_type === "fee_account"),
          commissionGLAccount: accountMappings.find((m) => m.mapping_type === "commission_account"),
        }
      })
    } catch (error) {
      console.error("Error getting float accounts with mappings:", error)
      throw error
    }
  }

  /**
   * Create or update a float-to-GL mapping
   */
  static async createOrUpdateMapping(
    floatAccountId: string,
    glAccountId: string,
    mappingType: "main_account" | "fee_account" | "commission_account",
  ): Promise<boolean> {
    try {
      // First ensure the mapping table exists
      await this.ensureMappingTableExists()

      // Check if mapping exists
      const existing = await sql`
        SELECT id FROM float_account_gl_mapping
        WHERE float_account_id = ${floatAccountId}
        AND mapping_type = ${mappingType}
      `

      if (existing.length > 0) {
        // Update existing mapping
        await sql`
          UPDATE float_account_gl_mapping
          SET gl_account_id = ${glAccountId},
              is_active = true,
              updated_at = NOW()
          WHERE float_account_id = ${floatAccountId}
          AND mapping_type = ${mappingType}
        `
      } else {
        // Create new mapping
        await sql`
          INSERT INTO float_account_gl_mapping
          (float_account_id, gl_account_id, mapping_type, is_active)
          VALUES (${floatAccountId}, ${glAccountId}, ${mappingType}, true)
        `
      }

      return true
    } catch (error) {
      console.error("Error creating/updating mapping:", error)
      return false
    }
  }

  /**
   * Ensure mapping table exists
   */
  static async ensureMappingTableExists(): Promise<void> {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS float_account_gl_mapping (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          float_account_id UUID NOT NULL,
          gl_account_id UUID NOT NULL,
          mapping_type VARCHAR(50) NOT NULL DEFAULT 'main_account',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `

      // Create indexes if they don't exist
      await sql`
        CREATE INDEX IF NOT EXISTS idx_float_gl_mapping_float_account 
        ON float_account_gl_mapping(float_account_id)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_float_gl_mapping_gl_account 
        ON float_account_gl_mapping(gl_account_id)
      `
    } catch (error) {
      console.error("Error ensuring mapping table exists:", error)
    }
  }

  /**
   * Remove a mapping
   */
  static async removeMapping(floatAccountId: string, mappingType: string): Promise<boolean> {
    try {
      await sql`
        UPDATE float_account_gl_mapping
        SET is_active = false,
            updated_at = NOW()
        WHERE float_account_id = ${floatAccountId}
        AND mapping_type = ${mappingType}
      `
      return true
    } catch (error) {
      console.error("Error removing mapping:", error)
      return false
    }
  }

  /**
   * Auto-map float accounts to GL accounts based on account type
   */
  static async autoMapFloatAccounts(): Promise<{ success: number; failed: number; details: string[] }> {
    const results = { success: 0, failed: 0, details: [] }

    try {
      await this.ensureMappingTableExists()

      const floatAccounts = await sql`
        SELECT * FROM float_accounts WHERE is_active = true
      `

      const glAccounts = await sql`
        SELECT * FROM gl_accounts WHERE is_active = true
      `

      for (const floatAccount of floatAccounts) {
        try {
          const mappings = this.getDefaultMappingsForAccountType(floatAccount.account_type, glAccounts)

          for (const mapping of mappings) {
            if (mapping.glAccountId) {
              const success = await this.createOrUpdateMapping(floatAccount.id, mapping.glAccountId, mapping.type)

              if (success) {
                results.success++
                results.details.push(
                  `Mapped ${floatAccount.account_name} (${mapping.type}) to ${mapping.glAccountCode}`,
                )
              } else {
                results.failed++
                results.details.push(`Failed to map ${floatAccount.account_name} (${mapping.type})`)
              }
            } else {
              results.failed++
              results.details.push(`GL account ${mapping.glAccountCode} not found for ${floatAccount.account_name}`)
            }
          }
        } catch (error) {
          results.failed++
          results.details.push(`Error mapping ${floatAccount.account_name}: ${error.message}`)
        }
      }

      return results
    } catch (error) {
      console.error("Error in auto-mapping:", error)
      throw error
    }
  }

  /**
   * Sync float account balances to GL accounts
   */
  static async syncFloatBalancesToGL(): Promise<{ success: number; failed: number; details: string[] }> {
    const results = { success: 0, failed: 0, details: [] }

    try {
      // Get all float accounts with their main GL mappings
      const floatAccountsWithMappings = await sql`
        SELECT 
          fa.id as float_id,
          fa.account_name,
          fa.current_balance,
          m.gl_account_id,
          g.code as gl_code,
          g.name as gl_name,
          g.balance as gl_balance
        FROM float_accounts fa
        JOIN float_account_gl_mapping m ON fa.id = m.float_account_id
        JOIN gl_accounts g ON m.gl_account_id = g.id
        WHERE fa.is_active = true 
        AND m.is_active = true 
        AND m.mapping_type = 'main_account'
      `

      for (const account of floatAccountsWithMappings) {
        try {
          const floatBalance = Number.parseFloat(account.current_balance || "0")
          const glBalance = Number.parseFloat(account.gl_balance || "0")
          const difference = floatBalance - glBalance

          if (Math.abs(difference) > 0.01) {
            // Update GL account balance to match float balance
            await sql`
              UPDATE gl_accounts 
              SET balance = ${floatBalance},
                  updated_at = NOW()
              WHERE id = ${account.gl_account_id}
            `

            results.success++
            results.details.push(
              `Synced ${account.account_name}: GL ${account.gl_code} updated from ${glBalance} to ${floatBalance}`,
            )
          } else {
            results.details.push(`${account.account_name}: Already in sync (${floatBalance})`)
          }
        } catch (error) {
          results.failed++
          results.details.push(`Failed to sync ${account.account_name}: ${error.message}`)
        }
      }

      return results
    } catch (error) {
      console.error("Error syncing float balances to GL:", error)
      throw error
    }
  }

  /**
   * Get variance report between float and GL balances
   */
  static async getVarianceReport(): Promise<{
    variances: Array<{
      floatAccountName: string
      floatBalance: number
      glAccountCode: string
      glBalance: number
      variance: number
      variancePercentage: number
    }>
    totalVariance: number
  }> {
    try {
      const accountsWithMappings = await sql`
        SELECT 
          fa.account_name,
          fa.current_balance as float_balance,
          g.code as gl_code,
          g.name as gl_name,
          g.balance as gl_balance
        FROM float_accounts fa
        JOIN float_account_gl_mapping m ON fa.id = m.float_account_id
        JOIN gl_accounts g ON m.gl_account_id = g.id
        WHERE fa.is_active = true 
        AND m.is_active = true 
        AND m.mapping_type = 'main_account'
      `

      const variances = accountsWithMappings.map((account) => {
        const floatBalance = Number.parseFloat(account.float_balance || "0")
        const glBalance = Number.parseFloat(account.gl_balance || "0")
        const variance = floatBalance - glBalance
        const variancePercentage = floatBalance !== 0 ? (variance / floatBalance) * 100 : 0

        return {
          floatAccountName: account.account_name,
          floatBalance,
          glAccountCode: account.gl_code,
          glBalance,
          variance,
          variancePercentage,
        }
      })

      const totalVariance = variances.reduce((sum, v) => sum + Math.abs(v.variance), 0)

      return {
        variances: variances.filter((v) => Math.abs(v.variance) > 0.01), // Only show significant variances
        totalVariance,
      }
    } catch (error) {
      console.error("Error getting variance report:", error)
      return { variances: [], totalVariance: 0 }
    }
  }

  /**
   * Get default GL account mappings for a float account type
   */
  private static getDefaultMappingsForAccountType(accountType: string, glAccounts: any[]) {
    const mappings = []

    switch (accountType.toLowerCase()) {
      case "momo":
        mappings.push({
          type: "main_account",
          glAccountCode: "1003",
          glAccountId: glAccounts.find((g) => g.code === "1003")?.id,
        })
        mappings.push({
          type: "fee_account",
          glAccountCode: "4003",
          glAccountId: glAccounts.find((g) => g.code === "4003")?.id,
        })
        mappings.push({
          type: "commission_account",
          glAccountCode: "4001",
          glAccountId: glAccounts.find((g) => g.code === "4001")?.id,
        })
        break

      case "e-zwich":
        mappings.push({
          type: "main_account",
          glAccountCode: "1002",
          glAccountId: glAccounts.find((g) => g.code === "1002")?.id,
        })
        mappings.push({
          type: "fee_account",
          glAccountCode: "4003",
          glAccountId: glAccounts.find((g) => g.code === "4003")?.id,
        })
        break

      case "power":
        mappings.push({
          type: "main_account",
          glAccountCode: "1004",
          glAccountId: glAccounts.find((g) => g.code === "1004")?.id,
        })
        mappings.push({
          type: "fee_account",
          glAccountCode: "4003",
          glAccountId: glAccounts.find((g) => g.code === "4003")?.id,
        })
        break

      case "agency_banking":
        mappings.push({
          type: "main_account",
          glAccountCode: "1005",
          glAccountId: glAccounts.find((g) => g.code === "1005")?.id,
        })
        mappings.push({
          type: "fee_account",
          glAccountCode: "4002",
          glAccountId: glAccounts.find((g) => g.code === "4002")?.id,
        })
        break

      case "cash_till":
        mappings.push({
          type: "main_account",
          glAccountCode: "1001",
          glAccountId: glAccounts.find((g) => g.code === "1001")?.id,
        })
        break

      default:
        mappings.push({
          type: "main_account",
          glAccountCode: "1003",
          glAccountId: glAccounts.find((g) => g.code === "1003")?.id,
        })
    }

    return mappings.filter((m) => m.glAccountId) // Only return mappings where GL account exists
  }
}
