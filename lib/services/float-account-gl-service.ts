import { sql } from "@/lib/db";
import { UnifiedGLPostingService } from "@/lib/services/unified-gl-posting-service";

export interface FloatAccountGLOperation {
  floatAccountId: string;
  operationType:
    | "initial_balance"
    | "recharge"
    | "withdrawal"
    | "balance_adjustment"
    | "transfer";
  amount: number;
  userId: string;
  branchId: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class FloatAccountGLService {
  /**
   * Create GL entries for float operations
   */
  static async createGLEntriesForFloatOperation(
    operation: {
      operationType: string;
      floatAccountId: string;
      amount: number;
      fee?: number;
      reference: string;
      description: string;
      processedBy: string;
      branchId: string;
    },
    customEntries?: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transactionId = crypto.randomUUID(); // Use proper UUID format
      const { UnifiedGLPostingService } = await import(
        "./unified-gl-posting-service"
      );

      // If custom entries are provided, use them directly
      if (customEntries) {
        console.log(
          "🔷 [GL] Creating custom GL entries for float_operations transaction:",
          transactionId
        );

        // Create GL transaction and entries using the existing createGLEntries method
        const result = await UnifiedGLPostingService.createGLEntries({
          transactionId,
          sourceModule: "float_operations",
          transactionType: operation.operationType,
          amount: operation.amount,
          fee: operation.fee || 0,
          reference: operation.reference,
          processedBy: operation.processedBy,
          branchId: operation.branchId,
          metadata: {
            floatAccountId: operation.floatAccountId,
            operationType: operation.operationType,
            description: operation.description,
            customEntries: customEntries,
          },
        });

        if (result.success) {
          console.log("✅ [GL] Custom GL entries created successfully");
          return { success: true };
        } else {
          throw new Error(`Failed to create GL entries: ${result.error}`);
        }
      }

      // Otherwise, use the existing logic for automatic GL entry creation
      console.log(
        "🔷 [GL] Creating GL entries for float_operations transaction:",
        transactionId
      );

      const result = await UnifiedGLPostingService.createGLEntries({
        transactionId,
        sourceModule: "float_operations",
        transactionType: operation.operationType,
        amount: operation.amount,
        fee: operation.fee || 0,
        reference: operation.reference,
        processedBy: operation.processedBy,
        branchId: operation.branchId,
        metadata: {
          floatAccountId: operation.floatAccountId,
          operationType: operation.operationType,
          description: operation.description,
        },
      });

      if (result.success) {
        console.log("✅ [GL] GL entries created successfully");
        return { success: true };
      } else {
        console.error("❌ [GL] Error creating GL entries:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ [GL] Error creating GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get GL account ID for a specific float account and mapping type
   */
  private static async getFloatAccountGLAccount(
    floatAccountId: string,
    mappingType: string
  ): Promise<string> {
    try {
      const mapping = await sql`
        SELECT gl_account_id
        FROM gl_mappings
        WHERE float_account_id = ${floatAccountId}
          AND mapping_type = ${mappingType}
          AND is_active = true
      `;

      if (mapping.length === 0) {
        throw new Error(
          `No GL mapping found for float account ${floatAccountId} and mapping type ${mappingType}`
        );
      }

      return mapping[0].gl_account_id;
    } catch (error) {
      console.error(
        `❌ [FLOAT-GL] Error getting GL account for float account ${floatAccountId}, mapping type ${mappingType}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create GL entries for initial balance
   */
  static async createInitialBalanceGLEntries(
    floatAccountId: string,
    amount: number,
    processedBy: string,
    branchId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("🔷 [FLOAT-GL] Creating GL entries for initial_balance:", {
        floatAccountId,
        amount,
        reference: `INIT-BAL-${Date.now()}`,
      });

      // Get float account details
      const floatAccount = await sql`
        SELECT fa.*, b.code as branch_code, b.name as branch_name
        FROM float_accounts fa
        LEFT JOIN branches b ON fa.branch_id = b.id
        WHERE fa.id = ${floatAccountId}
      `;

      if (floatAccount.length === 0) {
        return { success: false, error: "Float account not found" };
      }

      const account = floatAccount[0];
      const transactionType = `${account.account_type}_float`;
      const reference = `INIT-BAL-${Date.now()}`;

      // Create balanced GL entries
      const entries = [
        {
          accountId: await this.getFloatAccountGLAccount(
            floatAccountId,
            "main"
          ),
          debit: amount,
          credit: 0,
          description: `Initial balance for ${account.provider} float account`,
        },
        {
          accountId: await this.getFloatAccountGLAccount(
            floatAccountId,
            "liability"
          ),
          debit: 0,
          credit: amount,
          description: `Initial balance liability for ${account.provider} float account`,
        },
      ];

      // Create GL transaction and entries
      const result = await this.createGLEntriesForFloatOperation(
        {
          operationType: "initial_balance",
          floatAccountId,
          amount,
          fee: 0,
          reference,
          description: `Initial balance setup for ${account.provider} float account`,
          processedBy,
          branchId,
        },
        entries
      );

      if (result.success) {
        console.log(
          "✅ [FLOAT-GL] Initial balance GL entries created successfully"
        );
        return { success: true };
      } else {
        console.error(
          "❌ [FLOAT-GL] Failed to create initial balance GL entries:",
          result.error
        );
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(
        "❌ [FLOAT-GL] Error creating initial balance GL entries:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create GL entries for float account recharge/deposit
   */
  static async createRechargeGLEntries(
    floatAccountId: string,
    amount: number,
    rechargeMethod: string,
    userId: string,
    branchId: string,
    reference?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.createGLEntriesForFloatOperation({
      floatAccountId,
      operationType: "recharge",
      amount: amount,
      userId,
      branchId,
      reference: reference || `RECHARGE-${Date.now()}`,
      description: `Float recharge via ${rechargeMethod}`,
      metadata: { rechargeMethod },
    });
  }

  /**
   * Create GL entries for float account withdrawal
   */
  static async createWithdrawalGLEntries(
    floatAccountId: string,
    amount: number,
    withdrawalMethod: string,
    userId: string,
    branchId: string,
    reference?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.createGLEntriesForFloatOperation({
      floatAccountId,
      operationType: "withdrawal",
      amount: -Math.abs(amount), // Ensure negative for withdrawal
      userId,
      branchId,
      reference: reference || `WITHDRAWAL-${Date.now()}`,
      description: `Float withdrawal via ${withdrawalMethod}`,
      metadata: { withdrawalMethod },
    });
  }

  /**
   * Create GL entries for float account balance adjustment
   */
  static async createBalanceAdjustmentGLEntries(
    floatAccountId: string,
    adjustmentAmount: number,
    reason: string,
    userId: string,
    branchId: string,
    reference?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.createGLEntriesForFloatOperation({
      floatAccountId,
      operationType: "balance_adjustment",
      amount: adjustmentAmount,
      userId,
      branchId,
      reference: reference || `ADJUSTMENT-${Date.now()}`,
      description: `Balance adjustment: ${reason}`,
      metadata: { reason },
    });
  }

  /**
   * Create GL entries for float account transfer
   */
  static async createTransferGLEntries(
    sourceAccountId: string,
    destinationAccountId: string,
    amount: number,
    userId: string,
    branchId: string,
    reference?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔷 [FLOAT-GL] Creating GL entries for transfer:`, {
        sourceAccountId,
        destinationAccountId,
        amount,
        reference,
      });

      // Create withdrawal GL entries for source account
      const sourceResult = await this.createWithdrawalGLEntries(
        sourceAccountId,
        amount,
        "transfer_out",
        userId,
        branchId,
        `${reference}-FROM`
      );

      if (!sourceResult.success) {
        return sourceResult;
      }

      // Create recharge GL entries for destination account
      const destinationResult = await this.createRechargeGLEntries(
        destinationAccountId,
        amount,
        "transfer_in",
        userId,
        branchId,
        `${reference}-TO`
      );

      if (!destinationResult.success) {
        return destinationResult;
      }

      console.log(`✅ [FLOAT-GL] Transfer GL entries created successfully`);
      return { success: true };
    } catch (error) {
      console.error(`❌ [FLOAT-GL] Error creating transfer GL entries:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Ensure GL entries exist for a float account operation
   * This method can be called after any float account operation to ensure GL entries are created
   */
  static async ensureGLEntriesForOperation(
    operation: FloatAccountGLOperation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if GL entries already exist for this operation
      const existingEntries = await sql`
        SELECT COUNT(*) as count
        FROM gl_transactions
        WHERE source_module = 'float_operations'
        AND source_transaction_type = ${operation.operationType}
        AND source_transaction_id = ${operation.floatAccountId}
        AND reference = ${
          operation.reference ||
          `${operation.operationType.toUpperCase()}-${Date.now()}`
        }
      `;

      if (existingEntries[0]?.count > 0) {
        console.log(
          `ℹ️ [FLOAT-GL] GL entries already exist for operation: ${operation.operationType}`
        );
        return { success: true };
      }

      // Create GL entries if they don't exist
      return await this.createGLEntriesForFloatOperation(operation);
    } catch (error) {
      console.error(`❌ [FLOAT-GL] Error ensuring GL entries:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get GL balance for a float account
   */
  static async getFloatAccountGLBalance(
    floatAccountId: string
  ): Promise<number> {
    try {
      const result = await sql`
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN glje.debit > 0 THEN glje.debit
              ELSE 0 
            END
          ), 0) as total_debits,
          COALESCE(SUM(
            CASE 
              WHEN glje.credit > 0 THEN glje.credit
              ELSE 0 
            END
          ), 0) as total_credits
        FROM gl_journal_entries glje
        JOIN gl_transactions glt ON glje.transaction_id = glt.id
        JOIN gl_mappings gm ON glje.account_id = gm.gl_account_id
        WHERE gm.float_account_id = ${floatAccountId}
        AND gm.is_active = true
        AND glt.source_module = 'float_operations'
      `;

      const totalDebits = Number(result[0]?.total_debits || 0);
      const totalCredits = Number(result[0]?.total_credits || 0);
      const balance = totalDebits - totalCredits;

      console.log(
        `🔷 [FLOAT-GL] GL balance for float account ${floatAccountId}:`,
        {
          totalDebits,
          totalCredits,
          balance,
        }
      );

      return balance;
    } catch (error) {
      console.error(`❌ [FLOAT-GL] Error getting GL balance:`, error);
      return 0;
    }
  }

  /**
   * Reconcile float account balance with GL balance
   */
  static async reconcileFloatAccountBalance(floatAccountId: string): Promise<{
    success: boolean;
    floatBalance: number;
    glBalance: number;
    difference: number;
  }> {
    try {
      // Get float account balance
      const floatAccount = await sql`
        SELECT current_balance FROM float_accounts WHERE id = ${floatAccountId}
      `;

      if (floatAccount.length === 0) {
        return {
          success: false,
          floatBalance: 0,
          glBalance: 0,
          difference: 0,
        };
      }

      const floatBalance = Number(floatAccount[0].current_balance);
      const glBalance = await this.getFloatAccountGLBalance(floatAccountId);
      const difference = floatBalance - glBalance;

      console.log(
        `🔷 [FLOAT-GL] Reconciliation for float account ${floatAccountId}:`,
        {
          floatBalance,
          glBalance,
          difference,
        }
      );

      return {
        success: true,
        floatBalance,
        glBalance,
        difference,
      };
    } catch (error) {
      console.error(`❌ [FLOAT-GL] Error reconciling balance:`, error);
      return {
        success: false,
        floatBalance: 0,
        glBalance: 0,
        difference: 0,
      };
    }
  }
}
