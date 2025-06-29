import { neon } from "@neondatabase/serverless";
import { UnifiedGLPostingService } from "./unified-gl-posting-service";
import { AuditLoggerService } from "./audit-logger-service";

const sql = neon(process.env.DATABASE_URL!);

export interface TransactionEditData {
  id: string;
  sourceModule: "momo" | "agency_banking" | "e_zwich" | "power" | "jumia";
  amount: number;
  fee: number;
  customerName?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface TransactionDeleteData {
  id: string;
  sourceModule: "momo" | "agency_banking" | "e_zwich" | "power" | "jumia";
  processedBy: string;
  branchId: string;
  reason?: string;
}

export class TransactionManagementService {
  /**
   * Edit a transaction and adjust float balances and GL entries accordingly
   */
  static async editTransaction(data: TransactionEditData) {
    const { id, sourceModule, amount, fee, customerName, reference, metadata } =
      data;

    try {
      // Get the original transaction
      const originalTransaction = await this.getOriginalTransaction(
        id,
        sourceModule
      );
      if (!originalTransaction) {
        return { success: false, error: "Transaction not found" };
      }

      // Calculate differences
      const amountDifference = amount - originalTransaction.amount;
      const feeDifference =
        fee - (originalTransaction.fee || originalTransaction.commission || 0);

      // Update the transaction
      const updateResult = await this.updateTransaction(id, sourceModule, {
        amount,
        fee,
        customerName,
        reference,
        metadata,
      });

      if (!updateResult.success) {
        return updateResult;
      }

      // Adjust float balances
      const floatAdjustmentResult = await this.adjustFloatBalances(
        sourceModule,
        originalTransaction,
        amountDifference,
        feeDifference
      );

      if (!floatAdjustmentResult.success) {
        return floatAdjustmentResult;
      }

      // Update GL entries
      const glUpdateResult = await this.updateGLEntries(
        sourceModule,
        originalTransaction,
        amountDifference,
        feeDifference
      );

      if (!glUpdateResult.success) {
        return glUpdateResult;
      }

      // Log the edit
      await this.logTransactionEdit(data, originalTransaction);

      return {
        success: true,
        updatedTransaction: updateResult.transaction,
        message: "Transaction updated successfully",
      };
    } catch (error) {
      console.error("Error editing transaction:", error);
      return { success: false, error: "Failed to edit transaction" };
    }
  }

  /**
   * Delete a transaction and reverse all float balances and GL entries
   */
  static async deleteTransaction(data: TransactionDeleteData) {
    const { id, sourceModule, processedBy, branchId, reason } = data;

    try {
      // Get the original transaction
      const originalTransaction = await this.getOriginalTransaction(
        id,
        sourceModule
      );
      if (!originalTransaction) {
        return { success: false, error: "Transaction not found" };
      }

      // Reverse float balances
      const floatReversalResult = await this.reverseFloatBalances(
        sourceModule,
        originalTransaction
      );

      if (!floatReversalResult.success) {
        return floatReversalResult;
      }

      // Reverse GL entries
      const glReversalResult = await this.reverseGLEntries(
        sourceModule,
        originalTransaction
      );

      if (!glReversalResult.success) {
        return glReversalResult;
      }

      // Mark transaction as deleted (soft delete)
      const deleteResult = await this.markTransactionDeleted(id, sourceModule, {
        processedBy,
        branchId,
        reason,
      });

      if (!deleteResult.success) {
        return deleteResult;
      }

      // Log the deletion
      await this.logTransactionDeletion(data, originalTransaction);

      return {
        success: true,
        message: "Transaction deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return { success: false, error: "Failed to delete transaction" };
    }
  }

  private static async getOriginalTransaction(
    id: string,
    sourceModule: string
  ) {
    try {
      let result;

      switch (sourceModule) {
        case "momo":
          result = await sql`
            SELECT * FROM momo_transactions 
            WHERE id = ${id}
          `;
          break;
        case "agency_banking":
          result = await sql`
            SELECT * FROM agency_banking_transactions 
            WHERE id = ${id}
          `;
          break;
        case "e_zwich":
          result = await sql`
            SELECT * FROM e_zwich_transactions 
            WHERE id = ${id}
          `;
          break;
        case "power":
          result = await sql`
            SELECT * FROM power_transactions 
            WHERE id = ${id}
          `;
          break;
        case "jumia":
          result = await sql`
            SELECT * FROM jumia_transactions 
            WHERE id = ${id}
          `;
          break;
        default:
          throw new Error(`Invalid source module: ${sourceModule}`);
      }

      return result[0] || null;
    } catch (error) {
      console.error("Error getting original transaction:", error);
      return null;
    }
  }

  private static async updateTransaction(
    id: string,
    sourceModule: string,
    data: any
  ) {
    try {
      let result;

      switch (sourceModule) {
        case "momo":
          result = await sql`
            UPDATE momo_transactions
            SET 
              amount = ${data.amount},
              fee = ${data.fee},
              customer_name = ${data.customerName || null},
              reference = ${data.reference || null},
              metadata = ${
                data.metadata ? JSON.stringify(data.metadata) : null
              },
              updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
          `;
          break;
        case "agency_banking":
          result = await sql`
            UPDATE agency_banking_transactions
            SET 
              amount = ${data.amount},
              fee = ${data.fee},
              customer_name = ${data.customerName || null},
              reference = ${data.reference || null},
              metadata = ${
                data.metadata ? JSON.stringify(data.metadata) : null
              },
              updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
          `;
          break;
        case "e_zwich":
          result = await sql`
            UPDATE e_zwich_transactions
            SET 
              amount = ${data.amount},
              fee = ${data.fee},
              customer_name = ${data.customerName || null},
              reference = ${data.reference || null},
              metadata = ${
                data.metadata ? JSON.stringify(data.metadata) : null
              },
              updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
          `;
          break;
        case "power":
          result = await sql`
            UPDATE power_transactions
            SET 
              amount = ${data.amount},
              commission = ${data.fee},
              customer_name = ${data.customerName || null},
              reference = ${data.reference || null},
              metadata = ${
                data.metadata ? JSON.stringify(data.metadata) : null
              },
              updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
          `;
          break;
        case "jumia":
          result = await sql`
            UPDATE jumia_transactions
            SET 
              amount = ${data.amount},
              customer_name = ${data.customerName || null},
              reference = ${data.reference || null},
              metadata = ${
                data.metadata ? JSON.stringify(data.metadata) : null
              },
              updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
          `;
          break;
        default:
          return {
            success: false,
            error: `Invalid source module: ${sourceModule}`,
          };
      }

      return {
        success: true,
        transaction: result[0],
      };
    } catch (error) {
      console.error("Error updating transaction:", error);
      return { success: false, error: "Failed to update transaction" };
    }
  }

  private static async adjustFloatBalances(
    sourceModule: string,
    originalTransaction: any,
    amountDifference: number,
    feeDifference: number
  ) {
    try {
      // Get the float account used for this transaction
      const floatAccount = await this.getFloatAccountForTransaction(
        sourceModule,
        originalTransaction
      );
      if (!floatAccount) {
        return { success: false, error: "Float account not found" };
      }

      // Adjust the float balance
      const newBalance =
        floatAccount.current_balance + amountDifference + feeDifference;

      await sql`
        UPDATE float_accounts
        SET 
          current_balance = ${newBalance},
          updated_at = NOW()
        WHERE id = ${floatAccount.id}
      `;

      // Log the float adjustment - using correct column names from schema
      await sql`
        INSERT INTO float_transactions (
          account_id,
          transaction_type,
          amount,
          balance_before,
          balance_after,
          reference,
          description,
          created_at
        ) VALUES (
          ${floatAccount.id},
          'adjustment',
          ${amountDifference + feeDifference},
          ${floatAccount.current_balance},
          ${newBalance},
          ${`EDIT-${originalTransaction.id}`},
          ${`Transaction edit adjustment for ${sourceModule} transaction ${originalTransaction.id}`},
          NOW()
        )
      `;

      return { success: true };
    } catch (error) {
      console.error("Error adjusting float balances:", error);
      return { success: false, error: "Failed to adjust float balances" };
    }
  }

  private static async updateGLEntries(
    sourceModule: string,
    originalTransaction: any,
    amountDifference: number,
    feeDifference: number
  ) {
    try {
      // Create reversal entries for the original amounts
      const reversalEntries = await this.createGLReversalEntries(
        sourceModule,
        originalTransaction
      );
      if (!reversalEntries.success) {
        return reversalEntries;
      }

      // Create new entries for the updated amounts using the correct method
      const newEntries = await UnifiedGLPostingService.createGLEntries({
        transactionId: `EDIT-${originalTransaction.id}`,
        sourceModule: sourceModule as
          | "momo"
          | "agency_banking"
          | "e_zwich"
          | "power"
          | "jumia",
        transactionType:
          originalTransaction.type || originalTransaction.transaction_type,
        amount: originalTransaction.amount + amountDifference,
        fee:
          (originalTransaction.fee || originalTransaction.commission || 0) +
          feeDifference,
        customerName: originalTransaction.customer_name,
        reference: `EDIT-${originalTransaction.id}`,
        processedBy: originalTransaction.user_id,
        branchId: originalTransaction.branch_id,
        metadata: {
          originalTransactionId: originalTransaction.id,
          editReason: "Transaction amount/fee adjustment",
        },
      });

      if (!newEntries.success) {
        return newEntries;
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating GL entries:", error);
      return { success: false, error: "Failed to update GL entries" };
    }
  }

  private static async reverseFloatBalances(
    sourceModule: string,
    originalTransaction: any
  ) {
    try {
      // Get the float account used for this transaction
      const floatAccount = await this.getFloatAccountForTransaction(
        sourceModule,
        originalTransaction
      );
      if (!floatAccount) {
        return { success: false, error: "Float account not found" };
      }

      // Calculate the reversal amount
      const reversalAmount = -(
        originalTransaction.amount +
        (originalTransaction.fee || originalTransaction.commission || 0)
      );
      const newBalance = floatAccount.current_balance + reversalAmount;

      // Update the float balance
      await sql`
        UPDATE float_accounts
        SET 
          current_balance = ${newBalance},
          updated_at = NOW()
        WHERE id = ${floatAccount.id}
      `;

      // Log the float reversal
      await sql`
        INSERT INTO float_transactions (
          account_id,
          transaction_type,
          amount,
          balance_before,
          new_balance,
          reference,
          description,
          created_at
        ) VALUES (
          ${floatAccount.id},
          'reversal',
          ${reversalAmount},
          ${floatAccount.current_balance},
          ${newBalance},
          ${`DELETE-${originalTransaction.id}`},
          ${`Transaction deletion reversal for ${sourceModule} transaction ${originalTransaction.id}`},
          NOW()
        )
      `;

      return { success: true };
    } catch (error) {
      console.error("Error reversing float balances:", error);
      return { success: false, error: "Failed to reverse float balances" };
    }
  }

  private static async reverseGLEntries(
    sourceModule: string,
    originalTransaction: any
  ) {
    try {
      // Create reversal entries
      const reversalEntries = await this.createGLReversalEntries(
        sourceModule,
        originalTransaction
      );
      if (!reversalEntries.success) {
        return reversalEntries;
      }

      return { success: true };
    } catch (error) {
      console.error("Error reversing GL entries:", error);
      return { success: false, error: "Failed to reverse GL entries" };
    }
  }

  private static async createGLReversalEntries(
    sourceModule: string,
    originalTransaction: any
  ) {
    try {
      // Get the original GL entries for this transaction
      const originalGLEntries = await sql`
        SELECT * FROM gl_journal_entries
        WHERE source_module = ${sourceModule}
        AND source_transaction_id = ${originalTransaction.id}
        AND is_reversal = false
      `;

      if (originalGLEntries.length === 0) {
        return { success: true }; // No GL entries to reverse
      }

      // Create reversal entries
      for (const entry of originalGLEntries) {
        await sql`
          INSERT INTO gl_journal_entries (
            account_id,
            debit_amount,
            credit_amount,
            description,
            reference,
            source_module,
            source_transaction_id,
            branch_id,
            user_id,
            is_reversal,
            reversal_of_entry_id,
            created_at
          ) VALUES (
            ${entry.account_id},
            ${entry.credit_amount}, -- Reverse debit/credit
            ${entry.debit_amount},
            ${`Reversal: ${entry.description}`},
            ${`REV-${entry.reference}`},
            ${sourceModule},
            ${originalTransaction.id},
            ${entry.branch_id},
            ${entry.user_id},
            true,
            ${entry.id},
            NOW()
          )
        `;
      }

      return { success: true };
    } catch (error) {
      console.error("Error creating GL reversal entries:", error);
      return { success: false, error: "Failed to create GL reversal entries" };
    }
  }

  private static async getFloatAccountForTransaction(
    sourceModule: string,
    transaction: any
  ) {
    try {
      console.log(
        `🔍 [FLOAT] Looking for float account for ${sourceModule} transaction:`,
        {
          id: transaction.id,
          float_account_id: transaction.float_account_id,
          branch_id: transaction.branch_id,
        }
      );

      // Check if transaction has float_account_id (only momo_transactions and jumia_transactions have this)
      let floatAccountId = transaction.float_account_id;

      if (!floatAccountId) {
        console.log(
          `⚠️ [FLOAT] No float_account_id found for ${sourceModule} transaction:`,
          transaction.id
        );

        // For transactions without float_account_id, find a default float account for this service and branch
        const defaultAccount = await this.findDefaultFloatAccount(
          sourceModule,
          transaction.branch_id
        );
        if (defaultAccount) {
          console.log(
            `✅ [FLOAT] Using default float account:`,
            defaultAccount.id
          );
          return defaultAccount;
        }

        return null;
      }

      const result = await sql`
        SELECT * FROM float_accounts WHERE id = ${floatAccountId}
      `;

      if (result.length === 0) {
        console.log(
          `❌ [FLOAT] Float account not found for ID: ${floatAccountId}`
        );
        return null;
      }

      console.log(`✅ [FLOAT] Found float account:`, result[0].id);
      return result[0];
    } catch (error) {
      console.error("❌ [FLOAT] Error getting float account:", error);
      return null;
    }
  }
}
