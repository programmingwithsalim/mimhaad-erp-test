import { neon } from "@neondatabase/serverless"
import { v4 as uuidv4 } from "uuid"
import { GLPostingService } from "./gl-posting-service"

const sql = neon(process.env.DATABASE_URL!)

export interface AgencyBankingGLData {
  transactionId: string
  type: "deposit" | "withdrawal" | "interbank" | "commission"
  amount: number
  fee: number
  customerName: string
  accountNumber: string
  partnerBank: string
  partnerBankCode: string
  reference?: string
  userId: string
  username: string
  branchId: string
  branchName?: string
}

export class AgencyBankingGLService {
  /**
   * Create GL entries for agency banking transaction
   */
  static async createGLEntries(
    data: AgencyBankingGLData,
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(`Creating GL entries for agency banking transaction: ${data.transactionId}`)

      // Get GL accounts
      const cashAccount = await this.getOrCreateGLAccount("1001", "Cash", "Asset")
      const partnerBankAccount = await this.getOrCreateGLAccount(
        `2100-${data.partnerBankCode}`,
        `${data.partnerBank} Float`,
        "Liability",
      )
      const feeRevenueAccount = await this.getOrCreateGLAccount("4002", "Agency Banking Fee Income", "Revenue")

      // Prepare GL entries based on transaction type
      const entries = []

      switch (data.type) {
        case "deposit":
          // Customer deposits cash, we credit their account with partner bank
          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: data.amount,
            credit: 0,
            description: `Agency Banking Deposit - ${data.partnerBank} - ${data.accountNumber}`,
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
              partnerBank: data.partnerBank,
            },
          })

          entries.push({
            accountId: partnerBankAccount.id,
            accountCode: partnerBankAccount.code,
            debit: 0,
            credit: data.amount,
            description: `Agency Banking Deposit - ${data.partnerBank} - ${data.accountNumber}`,
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
              partnerBank: data.partnerBank,
            },
          })
          break

        case "withdrawal":
          // Customer withdraws from their account, we pay cash
          entries.push({
            accountId: partnerBankAccount.id,
            accountCode: partnerBankAccount.code,
            debit: data.amount,
            credit: 0,
            description: `Agency Banking Withdrawal - ${data.partnerBank} - ${data.accountNumber}`,
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
              partnerBank: data.partnerBank,
            },
          })

          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: 0,
            credit: data.amount,
            description: `Agency Banking Withdrawal - ${data.partnerBank} - ${data.accountNumber}`,
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
              partnerBank: data.partnerBank,
            },
          })
          break

        case "interbank":
          // Transfer between banks - no cash movement, just liability transfer
          entries.push({
            accountId: partnerBankAccount.id,
            accountCode: partnerBankAccount.code,
            debit: data.amount,
            credit: 0,
            description: `Interbank Transfer - ${data.partnerBank} - ${data.accountNumber}`,
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
              partnerBank: data.partnerBank,
            },
          })

          // This would credit another bank's account (simplified for now)
          entries.push({
            accountId: cashAccount.id, // Placeholder - should be destination bank account
            accountCode: cashAccount.code,
            debit: 0,
            credit: data.amount,
            description: `Interbank Transfer - ${data.partnerBank} - ${data.accountNumber}`,
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
              partnerBank: data.partnerBank,
            },
          })
          break

        case "commission":
          // Commission earned
          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: data.amount,
            credit: 0,
            description: `Agency Banking Commission - ${data.partnerBank}`,
            metadata: {
              transactionId: data.transactionId,
              partnerBank: data.partnerBank,
            },
          })

          entries.push({
            accountId: feeRevenueAccount.id,
            accountCode: feeRevenueAccount.code,
            debit: 0,
            credit: data.amount,
            description: `Agency Banking Commission - ${data.partnerBank}`,
            metadata: {
              transactionId: data.transactionId,
              partnerBank: data.partnerBank,
            },
          })
          break
      }

      // Fee entries (if applicable)
      if (data.fee > 0) {
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: data.fee,
          credit: 0,
          description: `Agency Banking Fee - ${data.partnerBank}`,
          metadata: {
            transactionId: data.transactionId,
            feeAmount: data.fee,
            partnerBank: data.partnerBank,
          },
        })

        entries.push({
          accountId: feeRevenueAccount.id,
          accountCode: feeRevenueAccount.code,
          debit: 0,
          credit: data.fee,
          description: `Agency Banking Fee Revenue - ${data.partnerBank}`,
          metadata: {
            transactionId: data.transactionId,
            feeAmount: data.fee,
            partnerBank: data.partnerBank,
          },
        })
      }

      // Create GL transaction
      const glResult = await GLPostingService.createAndPostTransaction({
        date: new Date().toISOString().split("T")[0],
        sourceModule: "agency_banking",
        sourceTransactionId: data.transactionId,
        sourceTransactionType: data.type,
        description: `Agency Banking ${data.type} - ${data.partnerBank} - ${data.accountNumber}`,
        entries,
        createdBy: data.userId,
        branchId: data.branchId,
        branchName: data.branchName,
        metadata: {
          partnerBank: data.partnerBank,
          partnerBankCode: data.partnerBankCode,
          customerName: data.customerName,
          accountNumber: data.accountNumber,
          amount: data.amount,
          fee: data.fee,
          reference: data.reference,
        },
      })

      return glResult
    } catch (error) {
      console.error("Error creating GL entries for agency banking transaction:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get or create GL account
   */
  private static async getOrCreateGLAccount(code: string, name: string, type: string): Promise<any> {
    try {
      // Try to get existing account
      const existing = await sql`
        SELECT id, code, name, type
        FROM gl_accounts
        WHERE code = ${code} AND is_active = true
      `

      if (existing.length > 0) {
        return existing[0]
      }

      // Create new account
      const accountId = uuidv4()
      const result = await sql`
        INSERT INTO gl_accounts (id, code, name, type, balance, is_active)
        VALUES (${accountId}, ${code}, ${name}, ${type}, 0, true)
        RETURNING id, code, name, type
      `

      console.log(`Created GL account: ${code} - ${name}`)
      return result[0]
    } catch (error) {
      console.error(`Failed to get or create GL account ${code}:`, error)
      throw error
    }
  }
}
