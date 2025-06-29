import { neon } from "@neondatabase/serverless"
import { GLDatabase } from "./gl-database"
import type { FloatAccount } from "./float-account-service"

const sql = neon(process.env.CONNECTION_STRING!)

/**
 * This service handles the integration between float accounts and GL accounts
 */
export class FloatGLIntegration {
  /**
   * Map a float account to a GL account
   */
  static async mapFloatAccountToGL(
    floatAccountId: string,
    glAccountCode: string,
    mappingType = "main_account",
  ): Promise<boolean> {
    try {
      // Get the GL account by code
      const glAccount = await GLDatabase.getGLAccountByCode(glAccountCode)
      if (!glAccount) {
        throw new Error(`GL account with code ${glAccountCode} not found`)
      }

      // Check if mapping already exists
      const existingMapping = await sql`
        SELECT * FROM float_account_gl_mapping
        WHERE float_account_id = ${floatAccountId}
        AND mapping_type = ${mappingType}
      `

      if (existingMapping.length > 0) {
        // Update existing mapping
        await sql`
          UPDATE float_account_gl_mapping
          SET gl_account_id = ${glAccount.id},
              is_active = true
          WHERE float_account_id = ${floatAccountId}
          AND mapping_type = ${mappingType}
        `
      } else {
        // Create new mapping
        await sql`
          INSERT INTO float_account_gl_mapping
          (float_account_id, gl_account_id, mapping_type)
          VALUES (${floatAccountId}, ${glAccount.id}, ${mappingType})
        `
      }

      return true
    } catch (error) {
      console.error(`Error mapping float account ${floatAccountId} to GL account ${glAccountCode}:`, error)
      return false
    }
  }

  /**
   * Get GL account for a float account
   */
  static async getGLAccountForFloat(floatAccountId: string, mappingType = "main_account"): Promise<any | null> {
    try {
      const mapping = await sql`
        SELECT g.* 
        FROM float_account_gl_mapping m
        JOIN gl_accounts g ON m.gl_account_id = g.id
        WHERE m.float_account_id = ${floatAccountId}
        AND m.mapping_type = ${mappingType}
        AND m.is_active = true
      `

      if (mapping.length === 0) {
        return null
      }

      return mapping[0]
    } catch (error) {
      console.error(`Error getting GL account for float account ${floatAccountId}:`, error)
      return null
    }
  }

  /**
   * Sync float account balance to GL
   */
  static async syncFloatBalanceToGL(floatAccount: FloatAccount): Promise<boolean> {
    try {
      // Get the GL account for this float account
      const glAccount = await this.getGLAccountForFloat(floatAccount.id)
      if (!glAccount) {
        console.log(`No GL account mapping found for float account ${floatAccount.id}`)
        return false
      }

      // Update the GL account balance
      await sql`
        UPDATE gl_accounts
        SET balance = ${floatAccount.current_balance},
            updated_at = NOW()
        WHERE id = ${glAccount.id}
      `

      return true
    } catch (error) {
      console.error(`Error syncing float account ${floatAccount.id} balance to GL:`, error)
      return false
    }
  }

  /**
   * Create default GL mappings for a float account
   */
  static async createDefaultGLMappingsForFloat(floatAccount: FloatAccount): Promise<boolean> {
    try {
      // Determine the appropriate GL account code based on account type
      let mainAccountCode: string
      const feeAccountCode = "4003" // Default fee income account

      switch (floatAccount.account_type.toLowerCase()) {
        case "momo":
          mainAccountCode = "1003" // Petty Cash / Float Account
          break
        case "e-zwich":
          mainAccountCode = "1002" // E-Zwich Settlement Account
          break
        case "power":
          mainAccountCode = "1004" // Power Float Account
          break
        case "cash_till":
          mainAccountCode = "1001" // Cash
          break
        default:
          mainAccountCode = "1003" // Default to Petty Cash / Float Account
      }

      // Create mappings
      await this.mapFloatAccountToGL(floatAccount.id, mainAccountCode, "main_account")
      await this.mapFloatAccountToGL(floatAccount.id, feeAccountCode, "fee_account")

      return true
    } catch (error) {
      console.error(`Error creating default GL mappings for float account ${floatAccount.id}:`, error)
      return false
    }
  }
}
