import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export interface TransactionReversalRequest {
  transactionId: string;
  serviceType: "momo" | "agency-banking" | "e-zwich" | "jumia";
  reversalType: "void" | "reverse";
  reason: string;
  requestedBy: string;
  branchId: string;
}

export interface TransactionReversalResult {
  success: boolean;
  reversalId?: string;
  message: string;
  glEntries?: any[];
  error?: string;
}

export class TransactionReversalService {
  /**
   * Process a transaction reversal with GL consistency
   */
  static async processReversal(
    request: TransactionReversalRequest
  ): Promise<TransactionReversalResult> {
    try {
      // 1. Find the original transaction
      const originalTransaction = await this.findOriginalTransaction(
        request.transactionId,
        request.serviceType
      );

      if (!originalTransaction) {
        return {
          success: false,
          message: "Original transaction not found",
          error: "TRANSACTION_NOT_FOUND",
        };
      }

      // 2. Validate reversal eligibility
      const validationResult = await this.validateReversalEligibility(
        originalTransaction,
        request.reversalType
      );

      if (!validationResult.eligible) {
        return {
          success: false,
          message: validationResult.reason || "Transaction cannot be reversed",
          error: "REVERSAL_NOT_ELIGIBLE",
        };
      }

      // 3. Create reversal record
      const reversalId = await this.createReversalRecord(
        request,
        originalTransaction
      );

      // 4. Process the actual reversal
      const reversalResult = await this.executeReversal(
        request,
        originalTransaction,
        reversalId
      );

      if (!reversalResult.success) {
        // Mark reversal as failed
        await this.updateReversalStatus(
          reversalId,
          "failed",
          reversalResult.error
        );
        return reversalResult;
      }

      // 5. Create GL entries for the reversal
      const glEntries = await this.createReversalGLEntries(
        request,
        originalTransaction,
        reversalId
      );

      // 6. Mark reversal as completed
      await this.updateReversalStatus(reversalId, "completed");

      return {
        success: true,
        reversalId,
        message: `Transaction ${request.reversalType} completed successfully`,
        glEntries,
      };
    } catch (error) {
      console.error("Error processing transaction reversal:", error);
      return {
        success: false,
        message: "Failed to process reversal",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Find original transaction across service tables
   */
  private static async findOriginalTransaction(
    transactionId: string,
    serviceType: string
  ) {
    const tableMap = {
      momo: "momo_transactions",
      "agency-banking": "agency_banking_transactions",
      "e-zwich": "e_zwich_transactions",
      jumia: "jumia_transactions",
    };

    const tableName = tableMap[serviceType];
    if (!tableName) {
      throw new Error(`Unknown service type: ${serviceType}`);
    }

    try {
      const result = await sql.unsafe(
        `
        SELECT * FROM ${tableName} 
        WHERE id = $1 
        LIMIT 1
      `,
        [transactionId]
      );

      return result[0] || null;
    } catch (error) {
      console.error(`Error finding transaction in ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Validate if transaction can be reversed
   */
  private static async validateReversalEligibility(
    transaction: any,
    reversalType: string
  ) {
    // Check if transaction is in a reversible state
    const reversibleStatuses = ["completed", "success", "successful"];

    if (!reversibleStatuses.includes(transaction.status?.toLowerCase())) {
      return {
        eligible: false,
        reason: `Transaction status '${transaction.status}' is not reversible`,
      };
    }

    // Check if transaction is not too old (e.g., within 30 days)
    const transactionDate = new Date(
      transaction.created_at || transaction.transaction_date
    );
    const daysSinceTransaction =
      (Date.now() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceTransaction > 30) {
      return {
        eligible: false,
        reason: "Transaction is too old to be reversed (>30 days)",
      };
    }

    // Check if transaction has already been reversed
    const existingReversal = await sql`
      SELECT id FROM transaction_reversals 
      WHERE transaction_id = ${transaction.id} 
      AND status IN ('pending', 'approved', 'completed')
      LIMIT 1
    `;

    if (existingReversal.length > 0) {
      return {
        eligible: false,
        reason:
          "Transaction has already been reversed or has a pending reversal",
      };
    }

    return { eligible: true };
  }

  /**
   * Create reversal record in database
   */
  private static async createReversalRecord(
    request: TransactionReversalRequest,
    originalTransaction: any
  ) {
    const reversalId = `REV-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    await sql`
      INSERT INTO transaction_reversals (
        id,
        transaction_id,
        service_type,
        reversal_type,
        reason,
        amount,
        fee,
        customer_name,
        phone_number,
        branch_id,
        requested_by,
        requested_at,
        status,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        ${reversalId},
        ${request.transactionId},
        ${request.serviceType},
        ${request.reversalType},
        ${request.reason},
        ${Number(originalTransaction.amount) || 0},
        ${Number(originalTransaction.fee) || 0},
        ${originalTransaction.customer_name || ""},
        ${
          originalTransaction.phone_number ||
          originalTransaction.customer_phone ||
          ""
        },
        ${request.branchId},
        ${request.requestedBy},
        NOW(),
        'processing',
        ${JSON.stringify({
          original_transaction: originalTransaction,
          reversal_request: request,
        })},
        NOW(),
        NOW()
      )
    `;

    return reversalId;
  }

  /**
   * Execute the actual reversal in the service table
   */
  private static async executeReversal(
    request: TransactionReversalRequest,
    originalTransaction: any,
    reversalId: string
  ) {
    try {
      const tableMap = {
        momo: "momo_transactions",
        "agency-banking": "agency_banking_transactions",
        "e-zwich": "e_zwich_transactions",
        jumia: "jumia_transactions",
      };

      const tableName = tableMap[request.serviceType];

      if (request.serviceType === "jumia") {
        // 1. Mark the original Jumia transaction as reversed and set is_reversal, deleted
        await sql`
          UPDATE jumia_transactions
          SET status = 'reversed', delivery_status = 'reversed', is_reversal = true, deleted = true, updated_at = NOW()
          WHERE transaction_id = ${request.transactionId}
        `;
        // 2. Fetch the transaction for float logic
        const result = await sql`
          SELECT * FROM jumia_transactions WHERE transaction_id = ${request.transactionId}
        `;
        const transaction = result[0];
        if (transaction) {
          // 3. Debit the float account
          const { handleFloatAccountUpdates } = await import(
            "../jumia-service"
          );
          await handleFloatAccountUpdates(transaction, "reverse");
        }
        return { success: true };
      }

      if (request.reversalType === "void") {
        // Mark original transaction as voided
        await sql.unsafe(
          `
          UPDATE ${tableName} 
          SET 
            status = 'voided',
            updated_at = NOW(),
            notes = COALESCE(notes, '') || ' [VOIDED: ${request.reason}]'
          WHERE id = $1
        `,
          [request.transactionId]
        );
      } else if (request.reversalType === "reverse") {
        // Create counter-transaction
        const counterTransactionId = `${reversalId}-COUNTER`;
        const counterAmount = -Number(originalTransaction.amount || 0);
        const counterFee = -Number(originalTransaction.fee || 0);

        if (request.serviceType === "momo") {
          await sql`
            INSERT INTO momo_transactions (
              id, amount, fee, customer_name, phone_number, branch_id,
              type, provider, status, reference, notes, created_at, updated_at
            ) VALUES (
              ${counterTransactionId},
              ${counterAmount},
              ${counterFee},
              ${originalTransaction.customer_name},
              ${originalTransaction.phone_number},
              ${originalTransaction.branch_id},
              ${
                originalTransaction.type === "cash-in" ? "cash-out" : "cash-in"
              },
              ${originalTransaction.provider},
              'completed',
              ${`REVERSAL-${
                originalTransaction.reference || request.transactionId
              }`},
              ${`Reversal of transaction ${request.transactionId}: ${request.reason}`},
              NOW(),
              NOW()
            )
          `;
        } else if (request.serviceType === "agency-banking") {
          await sql`
            INSERT INTO agency_banking_transactions (
              id, amount, fee, customer_name, customer_phone, branch_id,
              transaction_type, bank_name, status, reference, notes, created_at, updated_at
            ) VALUES (
              ${counterTransactionId},
              ${counterAmount},
              ${counterFee},
              ${originalTransaction.customer_name},
              ${
                originalTransaction.customer_phone ||
                originalTransaction.phone_number
              },
              ${originalTransaction.branch_id},
              ${
                originalTransaction.transaction_type === "deposit"
                  ? "withdrawal"
                  : "deposit"
              },
              ${originalTransaction.bank_name},
              'completed',
              ${`REVERSAL-${
                originalTransaction.reference || request.transactionId
              }`},
              ${`Reversal of transaction ${request.transactionId}: ${request.reason}`},
              NOW(),
              NOW()
            )
          `;
        } else if (request.serviceType === "e-zwich") {
          await sql`
            INSERT INTO e_zwich_transactions (
              id, amount, fee, customer_name, card_number, branch_id,
              transaction_type, status, reference, notes, created_at, updated_at
            ) VALUES (
              ${counterTransactionId},
              ${counterAmount},
              ${counterFee},
              ${originalTransaction.customer_name},
              ${originalTransaction.card_number},
              ${originalTransaction.branch_id},
              'reversal',
              'completed',
              ${`REVERSAL-${
                originalTransaction.reference || request.transactionId
              }`},
              ${`Reversal of transaction ${request.transactionId}: ${request.reason}`},
              NOW(),
              NOW()
            )
          `;
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error executing reversal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create GL entries for the reversal
   */
  private static async createReversalGLEntries(
    request: TransactionReversalRequest,
    originalTransaction: any,
    reversalId: string
  ) {
    try {
      // Find original GL entries
      const originalGLEntries = await sql`
        SELECT * FROM gl_journal_entries 
        WHERE transaction_id = ${request.transactionId}
        AND transaction_source = ${request.serviceType}
        ORDER BY created_at
      `;

      const reversalGLEntries = [];

      // Create counter GL entries
      for (const originalEntry of originalGLEntries) {
        const reversalEntryId = `${reversalId}-GL-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 4)}`;

        // Swap debit and credit amounts to reverse the effect
        const reversalEntry = await sql`
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
            ${reversalEntryId},
            ${reversalId},
            ${request.serviceType},
            'reversal',
            ${originalEntry.account_id},
            ${
              originalEntry.credit_amount || 0
            }, -- Swap: original credit becomes reversal debit
            ${
              originalEntry.debit_amount || 0
            },  -- Swap: original debit becomes reversal credit
            ${`Reversal: ${originalEntry.description}`},
            ${`REV-${originalEntry.reference}`},
            ${request.branchId},
            ${request.requestedBy},
            'posted',
            NOW(),
            NOW()
          )
          RETURNING *
        `;

        reversalGLEntries.push(reversalEntry[0]);
      }

      return reversalGLEntries;
    } catch (error) {
      console.error("Error creating reversal GL entries:", error);
      return [];
    }
  }

  /**
   * Update reversal status
   */
  private static async updateReversalStatus(
    reversalId: string,
    status: string,
    errorMessage?: string
  ) {
    await sql`
      UPDATE transaction_reversals 
      SET 
        status = ${status},
        updated_at = NOW(),
        review_comments = COALESCE(review_comments, '') || ${
          errorMessage ? ` ERROR: ${errorMessage}` : ""
        }
      WHERE id = ${reversalId}
    `;
  }

  /**
   * Get reversal history for a transaction
   */
  static async getReversalHistory(transactionId: string) {
    return await sql`
      SELECT * FROM transaction_reversals 
      WHERE transaction_id = ${transactionId}
      ORDER BY created_at DESC
    `;
  }

  /**
   * Get pending reversals for approval
   */
  static async getPendingReversals(branchId?: string) {
    let query = sql`
      SELECT 
        tr.*,
        b.name as branch_name
      FROM transaction_reversals tr
      LEFT JOIN branches b ON tr.branch_id = b.id
      WHERE tr.status = 'pending'
    `;

    if (branchId) {
      query = sql`
        SELECT 
          tr.*,
          b.name as branch_name
        FROM transaction_reversals tr
        LEFT JOIN branches b ON tr.branch_id = b.id
        WHERE tr.status = 'pending' AND tr.branch_id = ${branchId}
      `;
    }

    return await query.then((results) =>
      results.concat(sql`ORDER BY tr.requested_at DESC`)
    );
  }
}
