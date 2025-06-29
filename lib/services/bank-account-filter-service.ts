import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface BankAccount {
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
}

export class BankAccountFilterService {
  /**
   * Get bank accounts excluding MoMo float accounts
   */
  static async getBankAccountsOnly(branchId?: string): Promise<BankAccount[]> {
    try {
      let query = sql`
        SELECT * FROM float_accounts 
        WHERE is_active = true 
        AND account_type != 'momo'
        AND account_type != 'mobile-money'
        AND provider NOT IN ('mtn', 'vodafone', 'airteltigo', 'telecel')
        AND provider NOT ILIKE '%momo%'
        AND provider NOT ILIKE '%mobile%money%'
      `

      if (branchId) {
        query = sql`
          SELECT * FROM float_accounts 
          WHERE is_active = true 
          AND branch_id = ${branchId}
          AND account_type != 'momo'
          AND account_type != 'mobile-money'
          AND provider NOT IN ('mtn', 'vodafone', 'airteltigo', 'telecel')
          AND provider NOT ILIKE '%momo%'
          AND provider NOT ILIKE '%mobile%money%'
        `
      }

      const accounts = await query

      return accounts.map((account) => ({
        ...account,
        current_balance: Number(account.current_balance),
        min_threshold: Number(account.min_threshold),
        max_threshold: Number(account.max_threshold),
      })) as BankAccount[]
    } catch (error) {
      console.error("Error fetching bank accounts:", error)
      return []
    }
  }

  /**
   * Get agency banking accounts only
   */
  static async getAgencyBankingAccounts(branchId?: string): Promise<BankAccount[]> {
    try {
      let query = sql`
        SELECT * FROM float_accounts 
        WHERE is_active = true 
        AND account_type = 'agency-banking'
      `

      if (branchId) {
        query = sql`
          SELECT * FROM float_accounts 
          WHERE is_active = true 
          AND branch_id = ${branchId}
          AND account_type = 'agency-banking'
        `
      }

      const accounts = await query

      return accounts.map((account) => ({
        ...account,
        current_balance: Number(account.current_balance),
        min_threshold: Number(account.min_threshold),
        max_threshold: Number(account.max_threshold),
      })) as BankAccount[]
    } catch (error) {
      console.error("Error fetching agency banking accounts:", error)
      return []
    }
  }

  /**
   * Get partner banks for agency banking
   */
  static async getPartnerBanks(): Promise<
    Array<{
      id: string
      name: string
      code: string
      status: string
    }>
  > {
    try {
      const banks = await sql`
        SELECT id, name, code, status
        FROM partner_banks 
        WHERE status = 'active'
        ORDER BY name
      `

      return banks
    } catch (error) {
      console.error("Error fetching partner banks:", error)

      // Return hardcoded fallback
      return [
        { id: "gcb-001", name: "Ghana Commercial Bank", code: "GCB", status: "active" },
        { id: "eco-001", name: "Ecobank Ghana", code: "ECO", status: "active" },
        { id: "cal-001", name: "Cal Bank", code: "CAL", status: "active" },
        { id: "stb-001", name: "Stanbic Bank", code: "STB", status: "active" },
        { id: "zen-001", name: "Zenith Bank", code: "ZEN", status: "active" },
      ]
    }
  }

  /**
   * Check if an account is a MoMo account
   */
  static isMoMoAccount(account: BankAccount): boolean {
    const momoProviders = ["mtn", "vodafone", "airteltigo", "telecel"]
    const momoAccountTypes = ["momo", "mobile-money"]

    return (
      momoAccountTypes.includes(account.account_type.toLowerCase()) ||
      momoProviders.includes(account.provider.toLowerCase()) ||
      account.provider.toLowerCase().includes("momo") ||
      account.provider.toLowerCase().includes("mobile") ||
      account.provider.toLowerCase().includes("money")
    )
  }
}
