import { neon } from "@neondatabase/serverless";
import { UnifiedGLTransactionData } from "./unified-gl-posting-service";
import { AuditLoggerService } from "./audit-logger-service";

const sql = neon(process.env.DATABASE_URL!);

export class MissingGLMethods {
  static async createReversalGLEntries(
    data: UnifiedGLTransactionData
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(
        "🔷 [GL] Creating reversal GL entries for transaction:",
        data.transactionId
      );

      // Check if reversal already exists
      const existingReversal = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_transaction_id = ${data.transactionId} 
        AND source_module = ${data.sourceModule}
        AND source_transaction_type LIKE '%reversal%'
      `;

      if (existingReversal.length > 0) {
        console.log(
          "🔷 [GL] Reversal already exists for transaction:",
          data.transactionId
        );
        return { success: true, glTransactionId: existingReversal[0].id };
      }

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get the same accounts used for the original transaction
      const accounts = await this.getGLAccountsForTransaction(
        data.sourceModule,
        data.transactionType,
        data.branchId,
        data
      );

      console.log(`🔷 [GL] Reversal accounts:`, accounts);

      // Create reversal entries (opposite of original entries)
      const entries = await this.createGLEntriesForTransaction(
        {
          ...data,
          transactionType: `reversal_${data.transactionType}`,
          amount: data.amount,
          fee: data.fee,
        },
        accounts
      );

      // Reverse the debit/credit amounts
      const reversedEntries = entries.map((entry) => ({
        ...entry,
        debit: entry.credit,
        credit: entry.debit,
        description: `Reversal: ${entry.description}`,
        metadata: {
          ...entry.metadata,
          reversalReason: data.metadata?.reason || "Transaction reversed",
          originalTransactionId: data.transactionId,
        },
      }));

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (
          id, date, source_module, source_transaction_id,
          source_transaction_type, reference, description, status, created_by, created_at,
          branch_id, branch_name, metadata
        ) VALUES (
          ${glTransactionId}, CURRENT_DATE, ${data.sourceModule}, ${
        data.transactionId
      },
          ${`reversal_${data.transactionType}`}, ${data.reference}, 
          ${`Reversal of ${data.sourceModule} transaction: ${data.reference}`}, 'posted', ${
        data.processedBy
      }, CURRENT_TIMESTAMP,
          ${data.branchId}, ${data.branchName || "Branch"}, ${JSON.stringify(
        data.metadata || {}
      )}
        )
      `;

      // Create journal entries
      for (const entry of reversedEntries) {
        await sql`
          INSERT INTO gl_journal_entries (
            transaction_id, account_id, account_code, debit, credit, description, metadata
          ) VALUES (
            ${glTransactionId}, ${entry.accountId}, ${entry.accountCode}, ${
          entry.debit
        }, ${entry.credit},
            ${entry.description}, ${JSON.stringify(entry.metadata || {})}
          )
        `;
      }

      console.log(
        "🔷 [GL] Reversal GL entries created successfully for transaction:",
        data.transactionId
      );

      return { success: true, glTransactionId };
    } catch (error) {
      console.error("[GL] Error creating reversal GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createAdjustmentGLEntries(
    data: UnifiedGLTransactionData
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(
        "🔷 [GL] Creating adjustment GL entries for transaction:",
        data.transactionId
      );

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get the same accounts used for the original transaction
      const accounts = await this.getGLAccountsForTransaction(
        data.sourceModule,
        data.transactionType,
        data.branchId,
        data
      );

      console.log(`🔷 [GL] Adjustment accounts:`, accounts);

      // Create adjustment entries
      const entries = await this.createGLEntriesForTransaction(
        {
          ...data,
          transactionType: `adjustment_${data.transactionType}`,
          amount: data.amount,
          fee: data.fee,
        },
        accounts
      );

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (
          id, date, source_module, source_transaction_id,
          source_transaction_type, reference, status, created_by, created_at,
          branch_id, branch_name, metadata
        ) VALUES (
          ${glTransactionId}, CURRENT_DATE, ${data.sourceModule}, ${
        data.transactionId
      },
          ${`adjustment_${data.transactionType}`}, ${
        data.reference
      }, 'posted', ${data.processedBy}, CURRENT_TIMESTAMP,
          ${data.branchId}, ${data.branchName || "Branch"}, ${JSON.stringify(
        data.metadata || {}
      )}
        )
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (
            transaction_id, account_id, account_code, debit, credit, description, metadata
          ) VALUES (
            ${glTransactionId}, ${entry.accountId}, ${entry.accountCode}, ${
          entry.debit
        }, ${entry.credit},
            ${entry.description}, ${JSON.stringify(entry.metadata || {})}
          )
        `;
      }

      console.log(
        "🔷 [GL] Adjustment GL entries created successfully for transaction:",
        data.transactionId
      );

      return { success: true, glTransactionId };
    } catch (error) {
      console.error("[GL] Error creating adjustment GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private static async getGLAccountsForTransaction(
    sourceModule: string,
    transactionType: string,
    branchId: string,
    data: UnifiedGLTransactionData
  ): Promise<Record<string, any>> {
    let glMappingTransactionType = transactionType;
    const originalTransactionType = transactionType;

    // Map service-specific transaction types to their GL mapping equivalents
    switch (sourceModule) {
      case "momo":
        if (
          ["cash-in", "cash-out", "deposit", "withdrawal"].includes(
            originalTransactionType
          )
        ) {
          glMappingTransactionType = "momo_float";
        }
        break;
      case "agency_banking":
        if (
          ["deposit", "withdrawal", "interbank", "commission"].includes(
            originalTransactionType
          )
        ) {
          glMappingTransactionType = "agency_banking_float";
        }
        break;
      case "e_zwich":
        if (
          ["withdrawal", "card_issuance", "settlement"].includes(
            originalTransactionType
          )
        ) {
          glMappingTransactionType = "e_zwich_float";
        }
        break;
      case "power":
        if (["sale", "recharge"].includes(originalTransactionType)) {
          glMappingTransactionType = "power_float";
        }
        break;
      case "cash":
        if (
          ["cash_in_till", "cash_out_till"].includes(originalTransactionType)
        ) {
          glMappingTransactionType = "cash_in_till";
        }
        break;
      case "expenses":
        // Keep expense transaction types as they are
        break;
      default:
        // For unknown modules, try to use the original transaction type
        glMappingTransactionType = originalTransactionType;
    }

    // Get GL mappings for the mapped transaction type
    // With the new single-float-per-branch approach, we don't need complex filtering
    const mappings = await sql`
      SELECT mapping_type, gl_account_id, float_account_id
      FROM gl_mappings
      WHERE transaction_type = ${glMappingTransactionType}
        AND branch_id = ${branchId}
        AND is_active = true
    `;

    if (mappings.length === 0) {
      throw new Error(
        `No GL mappings found for ${glMappingTransactionType} (original: ${originalTransactionType})`
      );
    }

    // Get account codes and names for the mapped accounts
    const accountIds = mappings.map((m: any) => m.gl_account_id);
    const accounts = await sql`
      SELECT id, code, name FROM gl_accounts 
      WHERE id = ANY(${accountIds})
    `;

    // Build accounts mapping - with single-float-per-branch, this is much simpler
    const accountMap: Record<string, any> = {};
    
    for (const mapping of mappings) {
      const account = accounts.find((a: any) => a.id === mapping.gl_account_id);
      
      // Simply use the first mapping of each type (there should only be one per type now)
      if (!accountMap[mapping.mapping_type]) {
        accountMap[mapping.mapping_type] = mapping.gl_account_id;
        accountMap[`${mapping.mapping_type}Code`] = account?.code || "0000";
        accountMap[`${mapping.mapping_type}Name`] = account?.name || "Unknown Account";
      }
    }

    // Validate required mappings based on source module and transaction type
    const missingMappings = this.validateRequiredMappings(
      sourceModule,
      originalTransactionType,
      accountMap
    );

    if (missingMappings.length > 0) {
      throw new Error(
        `Missing required GL mappings for ${glMappingTransactionType} (${sourceModule}/${originalTransactionType}): ${missingMappings.join(
          ", "
        )}. Branch: ${branchId}`
      );
    }

    return accountMap;
  }

  private static async createGLEntriesForTransaction(
    data: UnifiedGLTransactionData,
    accounts: Record<string, any>
  ): Promise<
    Array<{
      accountId: string;
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
      metadata?: Record<string, any>;
    }>
  > {
    const entries: Array<{
      accountId: string;
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
      metadata?: Record<string, any>;
    }> = [];

    // Create entries based on transaction type
    switch (data.sourceModule) {
      case "momo":
      case "agency_banking":
      case "e_zwich":
      case "power":
      case "jumia":
        // Standard transaction GL entries: Debit main account, Credit float account
        entries.push({
          accountId: accounts.main,
          accountCode: accounts.mainCode,
          debit: data.amount,
          credit: 0,
          description: `${data.sourceModule.toUpperCase()} Transaction - ${
            data.customerName || data.reference
          }`,
          metadata: {
            transactionId: data.transactionId,
            customerName: data.customerName,
          },
        });
        entries.push({
          accountId: accounts.float,
          accountCode: accounts.floatCode,
          debit: 0,
          credit: data.amount,
          description: `${data.sourceModule.toUpperCase()} Transaction - ${
            data.customerName || data.reference
          }`,
          metadata: {
            transactionId: data.transactionId,
            customerName: data.customerName,
          },
        });
        break;

      case "expenses":
        // Expense GL entries: Debit expense account, Credit payment account
        entries.push({
          accountId: accounts.expense,
          accountCode: accounts.expenseCode,
          debit: data.amount,
          credit: 0,
          description: `Expense - ${data.reference}`,
          metadata: {
            transactionId: data.transactionId,
            expenseType: data.transactionType,
            expenseHead: data.metadata?.expenseHead || "General",
          },
        });
        entries.push({
          accountId: accounts.payment,
          accountCode: accounts.paymentCode,
          debit: 0,
          credit: data.amount,
          description: `Expense Payment - ${data.reference}`,
          metadata: {
            transactionId: data.transactionId,
            paymentMethod: data.transactionType,
            expenseHead: data.metadata?.expenseHead || "General",
          },
        });
        break;

      case "commissions":
        // Commission GL entries: Debit main account (float), Credit commission account
        entries.push({
          accountId: accounts.main,
          accountCode: accounts.mainCode,
          debit: data.amount,
          credit: 0,
          description: `Commission Received - ${data.reference}`,
          metadata: {
            transactionId: data.transactionId,
            source: data.metadata?.source || "Unknown",
            sourceName: data.metadata?.sourceName || "Unknown Partner",
            month: data.metadata?.month || "",
          },
        });
        entries.push({
          accountId: accounts.commission,
          accountCode: accounts.commissionCode,
          debit: 0,
          credit: data.amount,
          description: `Commission Revenue - ${data.reference}`,
          metadata: {
            transactionId: data.transactionId,
            source: data.metadata?.source || "Unknown",
            sourceName: data.metadata?.sourceName || "Unknown Partner",
            month: data.metadata?.month || "",
          },
        });
        break;
    }

    if (data.fee > 0 && data.transactionType !== "card_issuance") {
      entries.push({
        accountId: accounts.main,
        accountCode: accounts.mainCode,
        debit: data.fee,
        credit: 0,
        description:
          "Transaction Fee - " +
          data.sourceModule +
          " - " +
          (data.customerName || data.reference),
        metadata: { transactionId: data.transactionId, feeAmount: data.fee },
      });
      entries.push({
        accountId: accounts.fee,
        accountCode: accounts.feeCode,
        debit: 0,
        credit: data.fee,
        description:
          "Transaction Fee Revenue - " +
          data.sourceModule +
          " - " +
          (data.customerName || data.reference),
        metadata: { transactionId: data.transactionId, feeAmount: data.fee },
      });
    }

    return entries;
  }

  private static validateRequiredMappings(
    sourceModule: string,
    transactionType: string,
    accountMap: Record<string, any>
  ): string[] {
    const requiredMappings = this.getRequiredMappings(
      sourceModule,
      transactionType
    );
    const missingMappings = requiredMappings.filter(
      (mapping) => !accountMap[mapping]
    );
    return missingMappings;
  }

  private static getRequiredMappings(
    sourceModule: string,
    transactionType: string
  ): string[] {
    switch (sourceModule) {
      case "momo":
      case "agency_banking":
      case "e_zwich":
      case "power":
      case "jumia":
        // These modules require main and float mappings for basic transactions
        return ["main", "float"];

      case "expenses":
        // Expenses require expense and payment mappings
        return ["expense", "payment"];

      case "commissions":
        // Commissions require main and commission mappings
        return ["main", "commission"];

      case "cash":
        // Cash transactions require main mapping
        return ["main"];

      default:
        // For unknown modules, require at least main
        return ["main"];
    }
  }
}
