import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface SettlementRequest {
  branchId: string
  partnerAccountId: string
  amount: number
  reference?: string
  processedBy: string
  userId: string
}

export interface SettlementResult {
  success: boolean
  settlementId?: string
  withdrawalsSettled?: number
  totalAmount?: number
  message: string
  error?: string
}

export class EZwichSettlementService {
  /**
   * Process end-of-day settlement for E-Zwich withdrawals
   */
  static async processEndOfDaySettlement(request: SettlementRequest): Promise<SettlementResult> {
    try {
      // 1. Get all pending withdrawals for the branch
      const pendingWithdrawals = await this.getPendingWithdrawals(request.branchId)

      if (pendingWithdrawals.length === 0) {
        return {
          success: false,
          message: "No pending withdrawals found for settlement",
          error: "NO_PENDING_WITHDRAWALS",
        }
      }

      // 2. Calculate total settlement amount
      const totalWithdrawalAmount = pendingWithdrawals.reduce(
        (sum, w) => sum + Number(w.withdrawal_amount || w.amount || 0),
        0,
      )

      // 3. Validate settlement amount
      if (request.amount !== totalWithdrawalAmount) {
        return {
          success: false,
          message: `Settlement amount (${request.amount}) does not match total withdrawals (${totalWithdrawalAmount})`,
          error: "AMOUNT_MISMATCH",
        }
      }

      // 4. Verify partner account exists and is active
      const partnerAccount = await this.getPartnerAccount(request.partnerAccountId, request.branchId)

      if (!partnerAccount) {
        return {
          success: false,
          message: "Partner account not found or inactive",
          error: "PARTNER_ACCOUNT_NOT_FOUND",
        }
      }

      // 5. Create settlement record
      const settlementId = await this.createSettlementRecord(request, partnerAccount, totalWithdrawalAmount)

      // 6. Update withdrawals as settled
      await this.markWithdrawalsAsSettled(pendingWithdrawals, settlementId)

      // 7. Update float accounts (debit cash in till, credit settlement account)
      await this.updateFloatAccountsForSettlement(request.branchId, totalWithdrawalAmount)

      // 8. Create GL entries for settlement
      await this.createSettlementGLEntries(request, settlementId, totalWithdrawalAmount, partnerAccount)

      return {
        success: true,
        settlementId,
        withdrawalsSettled: pendingWithdrawals.length,
        totalAmount: totalWithdrawalAmount,
        message: `Successfully settled ${pendingWithdrawals.length} withdrawals totaling GHS ${totalWithdrawalAmount.toFixed(2)}`,
      }
    } catch (error) {
      console.error("Error processing E-Zwich settlement:", error)
      return {
        success: false,
        message: "Failed to process settlement",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Get pending withdrawals for a branch
   */
  private static async getPendingWithdrawals(branchId: string) {
    // Try multiple table names for E-Zwich withdrawals
    const possibleTables = ["e_zwich_withdrawals", "ezwich_withdrawals", "e_zwich_transactions"]

    for (const tableName of possibleTables) {
      try {
        // Check if table exists
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = ${tableName}
          )
        `

        if (!tableExists[0]?.exists) continue

        // Try to get pending withdrawals
        const withdrawals = await sql.unsafe(
          `
          SELECT * FROM ${tableName}
          WHERE branch_id = $1 
          AND (settlement_status IS NULL OR settlement_status = 'pending')
          AND (status = 'completed' OR status = 'success')
          AND (transaction_type = 'withdrawal' OR type = 'withdrawal')
          ORDER BY created_at ASC
        `,
          [branchId],
        )

        if (withdrawals.length > 0) {
          console.log(`Found ${withdrawals.length} pending withdrawals in ${tableName}`)
          return withdrawals
        }
      } catch (error) {
        console.error(`Error checking table ${tableName}:`, error)
        continue
      }
    }

    return []
  }

  /**
   * Get partner account details
   */
  private static async getPartnerAccount(partnerAccountId: string, branchId: string) {
    try {
      const result = await sql`
        SELECT * FROM e_zwich_partner_accounts 
        WHERE id = ${partnerAccountId} 
        AND branch_id = ${branchId}
        AND is_active = true
        LIMIT 1
      `
      return result[0] || null
    } catch (error) {
      console.error("Error getting partner account:", error)
      return null
    }
  }

  /**
   * Create settlement record
   */
  private static async createSettlementRecord(request: SettlementRequest, partnerAccount: any, totalAmount: number) {
    const settlementId = `SETT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    await sql`
      INSERT INTO e_zwich_settlements (
        id,
        partner_account_id,
        branch_id,
        amount,
        reference,
        processed_by,
        user_id,
        status,
        settlement_date,
        created_at,
        metadata
      ) VALUES (
        ${settlementId},
        ${request.partnerAccountId},
        ${request.branchId},
        ${totalAmount},
        ${request.reference || `End-of-day settlement ${new Date().toISOString().split("T")[0]}`},
        ${request.processedBy},
        ${request.userId},
        'completed',
        NOW(),
        NOW(),
        ${JSON.stringify({
          partner_account: {
            bank_name: partnerAccount.bank_name,
            account_number: partnerAccount.account_number,
            account_name: partnerAccount.account_name,
          },
          settlement_type: "end_of_day",
        })}
      )
    `

    return settlementId
  }

  /**
   * Mark withdrawals as settled
   */
  private static async markWithdrawalsAsSettled(withdrawals: any[], settlementId: string) {
    const withdrawalIds = withdrawals.map((w) => w.id)

    // Try to update in the table where we found the withdrawals
    const possibleTables = ["e_zwich_withdrawals", "ezwich_withdrawals", "e_zwich_transactions"]

    for (const tableName of possibleTables) {
      try {
        const result = await sql.unsafe(
          `
          UPDATE ${tableName}
          SET 
            settlement_status = 'settled',
            settlement_id = $1,
            settlement_date = NOW(),
            updated_at = NOW()
          WHERE id = ANY($2::text[])
        `,
          [settlementId, withdrawalIds],
        )

        if (result.count > 0) {
          console.log(`Updated ${result.count} withdrawals in ${tableName}`)
          break
        }
      } catch (error) {
        console.error(`Error updating withdrawals in ${tableName}:`, error)
        continue
      }
    }
  }

  /**
   * Update float accounts for settlement
   */
  private static async updateFloatAccountsForSettlement(branchId: string, totalAmount: number) {
    try {
      // 1. Debit cash in till (money going out)
      await sql`
        UPDATE float_accounts 
        SET 
          current_balance = current_balance - ${totalAmount},
          last_updated = NOW()
        WHERE branch_id = ${branchId}
        AND account_type = 'cash-in-till'
        AND is_active = true
      `

      // 2. Credit E-Zwich settlement account (amount we're owed by partner bank)
      await sql`
        UPDATE float_accounts 
        SET 
          current_balance = current_balance + ${totalAmount},
          last_updated = NOW()
        WHERE branch_id = ${branchId}
        AND account_type = 'e-zwich-settlement'
        AND is_active = true
      `

      console.log(`Updated float accounts for settlement: -${totalAmount} from cash, +${totalAmount} to settlement`)
    } catch (error) {
      console.error("Error updating float accounts for settlement:", error)
      // Don't throw error to prevent blocking settlement
    }
  }

  /**
   * Create GL entries for settlement
   */
  private static async createSettlementGLEntries(
    request: SettlementRequest,
    settlementId: string,
    totalAmount: number,
    partnerAccount: any,
  ) {
    try {
      const entryId1 = `${settlementId}-GL-1`
      const entryId2 = `${settlementId}-GL-2`

      // Debit: Bank Settlement Receivable (we're owed money by partner bank)
      await sql`
        INSERT INTO gl_journal_entries (
          id,
          transaction_id,
          transaction_source,
          transaction_type,
          account_id,
          debit_amount,
          credit_amount,
          description,
          reference,
          branch_id,
          created_by,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${entryId1},
          ${settlementId},
          'e-zwich',
          'settlement',
          '1006', -- Bank Settlement Receivable
          ${totalAmount},
          0,
          ${`E-Zwich settlement to ${partnerAccount.bank_name}`},
          ${settlementId},
          ${request.branchId},
          ${request.userId},
          'posted',
          NOW(),
          NOW()
        )
      `

      // Credit: Cash in Till (cash going out)
      await sql`
        INSERT INTO gl_journal_entries (
          id,
          transaction_id,
          transaction_source,
          transaction_type,
          account_id,
          debit_amount,
          credit_amount,
          description,
          reference,
          branch_id,
          created_by,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${entryId2},
          ${settlementId},
          'e-zwich',
          'settlement',
          '1001', -- Cash in Till
          0,
          ${totalAmount},
          ${`E-Zwich settlement to ${partnerAccount.bank_name}`},
          ${settlementId},
          ${request.branchId},
          ${request.userId},
          'posted',
          NOW(),
          NOW()
        )
      `

      console.log(`Created GL entries for settlement: ${totalAmount}`)
    } catch (error) {
      console.error("Error creating settlement GL entries:", error)
      // Don't throw error to prevent blocking settlement
    }
  }

  /**
   * Get settlement history for a branch
   */
  static async getSettlementHistory(branchId: string, limit = 50) {
    try {
      return await sql`
        SELECT 
          s.*,
          pa.bank_name,
          pa.account_number,
          pa.account_name
        FROM e_zwich_settlements s
        JOIN e_zwich_partner_accounts pa ON s.partner_account_id = pa.id
        WHERE s.branch_id = ${branchId}
        ORDER BY s.settlement_date DESC
        LIMIT ${limit}
      `
    } catch (error) {
      console.error("Error getting settlement history:", error)
      return []
    }
  }

  /**
   * Get settlement statistics for a branch
   */
  static async getSettlementStatistics(branchId: string) {
    try {
      const [todayStats] = await sql`
        SELECT 
          COUNT(*) as settlements_today,
          COALESCE(SUM(amount), 0) as total_settled_today
        FROM e_zwich_settlements
        WHERE branch_id = ${branchId}
        AND DATE(settlement_date) = CURRENT_DATE
      `

      const [monthStats] = await sql`
        SELECT 
          COUNT(*) as settlements_this_month,
          COALESCE(SUM(amount), 0) as total_settled_this_month
        FROM e_zwich_settlements
        WHERE branch_id = ${branchId}
        AND DATE_TRUNC('month', settlement_date) = DATE_TRUNC('month', CURRENT_DATE)
      `

      return {
        today: {
          count: Number(todayStats?.settlements_today || 0),
          amount: Number(todayStats?.total_settled_today || 0),
        },
        thisMonth: {
          count: Number(monthStats?.settlements_this_month || 0),
          amount: Number(monthStats?.total_settled_this_month || 0),
        },
      }
    } catch (error) {
      console.error("Error getting settlement statistics:", error)
      return {
        today: { count: 0, amount: 0 },
        thisMonth: { count: 0, amount: 0 },
      }
    }
  }
}
