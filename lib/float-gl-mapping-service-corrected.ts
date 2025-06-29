import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export interface FloatGLMapping {
  id: string
  floatAccountId: string
  glAccountId: string
  mappingType: "main_account" | "fee_account" | "commission_account"
  isActive: boolean
  createdAt: Date
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
   * Initialize the mapping table with correct structure
   */
  static async initializeMappingTable(): Promise<void> {
    try {
      // Drop existing table if it has wrong structure
      await sql`DROP TABLE IF EXISTS float_account_gl_mapping CASCADE`

      // Create table with correct structure
      await sql`
        CREATE TABLE float_account_gl_mapping (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          float_account_id UUID NOT NULL,
          gl_account_id UUID NOT NULL,
          mapping_type VARCHAR(50) NOT NULL DEFAULT 'main_account',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `

      // Add foreign key constraints if the referenced tables exist
      try {
        await sql`
          ALTER TABLE float_account_gl_mapping 
          ADD CONSTRAINT fk_float_account 
          FOREIGN KEY (float_account_id) REFERENCES float_accounts(id)
        `
      } catch (e) {
        console.log("Float accounts table constraint not added:", e.message)
      }

      try {
        await sql`
          ALTER TABLE float_account_gl_mapping 
          ADD CONSTRAINT fk_gl_account 
          FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
        `
      } catch (e) {
        console.log("GL accounts table constraint not added:", e.message)
      }

      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS idx_float_gl_mapping_float_account 
        ON float_account_gl_mapping(float_account_id)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_float_gl_mapping_gl_account 
        ON float_account_gl_mapping(gl_account_id)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_float_gl_mapping_type 
        ON float_account_gl_mapping(mapping_type)
      `

      console.log("Mapping table initialized successfully")
    } catch (error) {
      console.error("Error initializing mapping table:", error)
      throw error
    }
  }

  /**
   * Get all float accounts with their GL mappings
   */
  static async getFloatAccountsWithMappings(): Promise<FloatAccountWithGL[]> {
    try {
      // Get float accounts first
      const floatAccounts = await sql`
        SELECT 
          fa.id,
          fa.provider as account_name,
          fa.account_type,
          fa.current_balance,
          fa.branch_id
        FROM float_accounts fa
        WHERE fa.is_active = true
        ORDER BY fa.provider
      `

      // Get branches separately to avoid JOIN issues
      const branches = await sql`
        SELECT id, name FROM branches
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
        // Get mappings separately to avoid JOIN issues
        mappings = await sql`
          SELECT 
            m.id,
            m.float_account_id,
            m.gl_account_id,
            m.mapping_type,
            m.is_active,
            m.created_at
          FROM float_account_gl_mapping m
          WHERE m.is_active = true
        `

        // Get GL accounts separately
        const glAccounts = await sql`
          SELECT id, code, name, type, balance FROM gl_accounts WHERE is_active = true
        `

        // Enhance mappings with GL account info
        mappings = mappings.map((mapping) => {
          const glAccount = glAccounts.find((g) => g.id === mapping.gl_account_id)
          return {
            ...mapping,
            account_code: glAccount?.code,
            gl_account_name: glAccount?.name,
            gl_account_type: glAccount?.type,
            gl_balance: glAccount?.balance || 0,
          }
        })
      }

      // Combine the data in JavaScript to avoid SQL JOIN issues
      return floatAccounts.map((account) => {
        // Find branch name
        const branch = branches.find((b) => b.id === account.branch_id)
        const branchName = branch?.name || "Unknown Branch"

        // Find mappings for this account
        const accountMappings = mappings.filter((m) => m.float_account_id === account.id)

        return {
          id: account.id,
          accountName: account.account_name || "Unknown",
          accountType: account.account_type || "unknown",
          currentBalance: Number.parseFloat(account.current_balance) || 0,
          branchId: account.branch_id,
          branchName: branchName,
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
      // Ensure mapping table exists
      await this.ensureMappingTableExists()

      // Validate that the GL account ID is actually a UUID (not a code)
      if (!this.isValidUUID(glAccountId)) {
        // If it's a code, find the actual UUID
        const glAccount = await sql`
          SELECT id FROM gl_accounts WHERE code = ${glAccountId} AND is_active = true
        `

        if (glAccount.length === 0) {
          throw new Error(`GL account with code ${glAccountId} not found`)
        }

        glAccountId = glAccount[0].id
      }

      // Validate float account ID is UUID
      if (!this.isValidUUID(floatAccountId)) {
        throw new Error(`Invalid float account ID: ${floatAccountId}`)
      }

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
              is_active = true
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
   * Check if a string is a valid UUID
   */
  private static isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Ensure mapping table exists
   */
  static async ensureMappingTableExists(): Promise<void> {
    try {
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'float_account_gl_mapping'
        )
      `

      if (!tableExists[0].exists) {
        await this.initializeMappingTable()
      }
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
        SET is_active = false
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

      // Get float accounts
      const floatAccounts = await sql`
        SELECT 
          id,
          provider as account_name,
          account_type
        FROM float_accounts 
        WHERE is_active = true
      `

      // Get GL accounts
      const glAccounts = await sql`
        SELECT id, code, name FROM gl_accounts WHERE is_active = true
      `

      for (const floatAccount of floatAccounts) {
        try {
          const accountType = floatAccount.account_type || "unknown"
          const mappings = this.getDefaultMappingsForAccountType(accountType, glAccounts)

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

  /**
   * Sync float account balances to GL accounts
   */
  static async syncFloatBalancesToGL(): Promise<{ synced: number; errors: string[] }> {
    const results = { synced: 0, errors: [] }

    try {
      // Get mappings without JOINs to avoid UUID issues
      const mappings = await sql`
        SELECT 
          m.id,
          m.float_account_id,
          m.gl_account_id,
          m.mapping_type
        FROM float_account_gl_mapping m
        WHERE m.is_active = true 
        AND m.mapping_type = 'main_account'
      `

      // Get float accounts
      const floatAccounts = await sql`
        SELECT id, current_balance FROM float_accounts WHERE is_active = true
      `

      // Get GL accounts
      const glAccounts = await sql`
        SELECT id, code, name FROM gl_accounts WHERE is_active = true
      `

      for (const mapping of mappings) {
        try {
          // Find the float account
          const floatAccount = floatAccounts.find((fa) => fa.id === mapping.float_account_id)
          const glAccount = glAccounts.find((ga) => ga.id === mapping.gl_account_id)

          if (floatAccount && glAccount) {
            // Update GL account balance to match float account balance
            await sql`
              UPDATE gl_accounts 
              SET balance = ${floatAccount.current_balance}
              WHERE id = ${mapping.gl_account_id}
            `

            results.synced++
          }
        } catch (error) {
          const glAccount = glAccounts.find((ga) => ga.id === mapping.gl_account_id)
          results.errors.push(`Failed to sync ${glAccount?.code || "unknown"}: ${error.message}`)
        }
      }

      return results
    } catch (error) {
      console.error("Error syncing balances:", error)
      throw error
    }
  }

  /**
   * Get variance report between float and GL accounts
   */
  static async getVarianceReport(): Promise<any[]> {
    try {
      // Get mappings
      const mappings = await sql`
        SELECT 
          m.float_account_id,
          m.gl_account_id,
          m.mapping_type
        FROM float_account_gl_mapping m
        WHERE m.is_active = true 
        AND m.mapping_type = 'main_account'
      `

      // Get float accounts
      const floatAccounts = await sql`
        SELECT id, provider, current_balance FROM float_accounts WHERE is_active = true
      `

      // Get GL accounts
      const glAccounts = await sql`
        SELECT id, code, name, balance FROM gl_accounts WHERE is_active = true
      `

      const variances = []

      for (const mapping of mappings) {
        const floatAccount = floatAccounts.find((fa) => fa.id === mapping.float_account_id)
        const glAccount = glAccounts.find((ga) => ga.id === mapping.gl_account_id)

        if (floatAccount && glAccount) {
          const floatBalance = Number.parseFloat(floatAccount.current_balance) || 0
          const glBalance = Number.parseFloat(glAccount.balance) || 0
          const variance = floatBalance - glBalance

          variances.push({
            floatAccountName: floatAccount.provider,
            glAccountCode: glAccount.code,
            glAccountName: glAccount.name,
            floatBalance,
            glBalance,
            variance,
            hasVariance: Math.abs(variance) > 0.01, // Consider variances > 1 cent
          })
        }
      }

      return variances
    } catch (error) {
      console.error("Error getting variance report:", error)
      throw error
    }
  }
}
