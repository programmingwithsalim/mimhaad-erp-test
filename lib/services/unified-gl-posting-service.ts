import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import { AuditLoggerService } from "./audit-logger-service";

const sql = neon(process.env.DATABASE_URL!);

export interface UnifiedGLTransactionData {
  transactionId: string;
  sourceModule:
    | "momo"
    | "agency_banking"
    | "e_zwich"
    | "power"
    | "jumia"
    | "expenses"
    | "commissions";
  transactionType: string;
  amount: number;
  fee: number;
  customerName?: string;
  reference: string;
  processedBy: string;
  branchId: string;
  branchName?: string;
  metadata?: Record<string, any>;
}

export interface ReceiptData {
  transactionId: string;
  sourceModule: string;
  transactionType: string;
  amount: number;
  fee: number;
  customerName?: string;
  reference: string;
  branchName: string;
  date: string;
  additionalData?: Record<string, any>;
}

export class UnifiedGLPostingService {
  static async createGLEntries(
    data: UnifiedGLTransactionData
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(
        "🔷 [GL] Creating GL entries for " +
          data.sourceModule +
          " transaction:",
        data.transactionId
      );

      const existingTransaction = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_transaction_id = ${data.transactionId} 
        AND source_module = ${data.sourceModule}
      `;

      if (existingTransaction.length > 0) {
        console.log(
          "🔷 [GL] Transaction already exists for " +
            data.sourceModule +
            " transaction " +
            data.transactionId
        );
        return { success: true, glTransactionId: existingTransaction[0].id };
      }

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      const accounts = await this.getGLAccountsForTransaction(
        data.sourceModule,
        data.transactionType,
        data.branchId,
        data
      );
      const entries = await this.createGLEntriesForTransaction(data, accounts);

      const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredits = entries.reduce(
        (sum, entry) => sum + entry.credit,
        0
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          "GL entries do not balance: Debits " +
            totalDebits +
            ", Credits " +
            totalCredits
        );
      }

      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${data.sourceModule}, ${
        data.transactionId
      }, ${data.transactionType}, ${data.reference}, 'posted', ${
        data.processedBy
      }, ${JSON.stringify(data.metadata || {})})
      `;

      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      await this.updateAccountBalances(entries);

      console.log(
        "🔷 [GL] GL entries created successfully for " +
          data.sourceModule +
          " transaction: " +
          data.transactionId
      );

      await AuditLoggerService.log({
        userId: data.processedBy,
        username: data.processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description:
          "GL entries created for " +
          data.sourceModule +
          " " +
          data.transactionType,
        details: {
          sourceTransactionId: data.transactionId,
          sourceModule: data.sourceModule,
          transactionType: data.transactionType,
          amount: data.amount,
          fee: data.fee,
          entriesCount: entries.length,
        },
        severity: "low",
        branchId: data.branchId,
        branchName: data.branchName || "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error(
        "🔷 [GL] Error creating GL entries for " +
          data.sourceModule +
          " transaction:",
        error
      );
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
    // For MoMo, Jumia, and Agency Banking, always use their respective float types for mapping lookup
    let lookupType = transactionType;
    if (sourceModule === "momo") {
      lookupType = "momo_float";
    } else if (sourceModule === "jumia") {
      lookupType = "jumia_float";
    } else if (sourceModule === "agency_banking") {
      lookupType = "agency_banking_float";
    } else if (sourceModule === "e_zwich") {
      lookupType = "e_zwich_float";
    } else if (sourceModule === "power") {
      lookupType = "power_float";
    }

    // For expenses, we need to get both expense category and payment method mappings
    if (sourceModule === "expenses") {
      // Extract expense category from metadata or use default
      const expenseCategory = data.metadata?.expenseCategory || "expense_other"; // Get from metadata
      const paymentMethod = transactionType; // This is the payment method

      const mappings = await sql`
        SELECT mapping_type, gl_account_id
        FROM gl_mappings
        WHERE transaction_type IN (${expenseCategory}, ${paymentMethod})
          AND branch_id = ${branchId}
          AND is_active = true
      `;

      // Build a mapping object: { expense, payment }
      const result: Record<string, string> = {};
      for (const row of mappings) {
        if (row.mapping_type === "expense") {
          result.expense = row.gl_account_id;
        } else if (row.mapping_type === "payment") {
          result.payment = row.gl_account_id;
        }
      }

      return result;
    }

    // For commissions, we need to get main and commission mappings
    if (sourceModule === "commissions") {
      // For commissions, use the transaction type directly (e.g., "momo_float", "agency_banking_float")
      const commissionType = transactionType;

      // Get the float account ID from metadata if available
      const floatAccountId = data.metadata?.source;

      let mappings;
      if (floatAccountId) {
        // Filter by both transaction type and float account ID
        mappings = await sql`
          SELECT mapping_type, gl_account_id
          FROM gl_mappings
          WHERE transaction_type = ${commissionType}
            AND branch_id = ${branchId}
            AND float_account_id = ${floatAccountId}
            AND is_active = true
        `;
      } else {
        // Fallback to just transaction type
        mappings = await sql`
          SELECT mapping_type, gl_account_id
          FROM gl_mappings
          WHERE transaction_type = ${commissionType}
            AND branch_id = ${branchId}
            AND is_active = true
        `;
      }

      console.log(
        `🔷 [GL] Found ${mappings.length} mappings for commission type: ${commissionType}`
      );
      console.log(
        `🔷 [GL] Float account ID: ${floatAccountId || "not specified"}`
      );
      console.log(`🔷 [GL] Mappings:`, mappings);

      // Build a mapping object: { main, commission }
      const result: Record<string, string> = {};
      for (const row of mappings) {
        if (row.mapping_type === "revenue") {
          result.main = row.gl_account_id;
        } else if (row.mapping_type === "commission") {
          result.commission = row.gl_account_id;
        }
      }

      console.log(`🔷 [GL] Processed mappings:`, result);

      return result;
    }

    // For other modules, use the original logic
    const mappings = await sql`
      SELECT mapping_type, gl_account_id
      FROM gl_mappings
      WHERE transaction_type = ${lookupType}
        AND branch_id = ${branchId}
        AND is_active = true
    `;

    // Build a mapping object: { main_account, fee_account, ... }
    const result: Record<string, string> = {};
    for (const row of mappings) {
      result[row.mapping_type] = row.gl_account_id;
    }

    return result;
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

    // Check for required mappings before proceeding
    let requiredMappings: string[] = [];
    switch (data.sourceModule) {
      case "momo":
        requiredMappings = ["main", "fee"]; // Add more as needed (e.g., 'expense', 'commission')
        break;
      case "agency_banking":
        requiredMappings = ["main", "fee"];
        break;
      case "e_zwich":
        requiredMappings = ["main", "fee"];
        break;
      case "power":
        requiredMappings = ["main", "fee"];
        break;
      case "jumia":
        requiredMappings = ["main", "fee"];
        break;
      case "expenses":
        requiredMappings = ["expense", "payment"];
        break;
      case "commissions":
        requiredMappings = ["main", "commission"];
        break;
      // Add more as needed
    }
    for (const key of requiredMappings) {
      if (!accounts[key]) {
        throw new Error(
          `Missing GL mapping for ${key} (module: ${data.sourceModule}, type: ${data.transactionType}, branch: ${data.branchId})`
        );
      }
    }

    switch (data.sourceModule) {
      case "momo":
        if (data.transactionType === "cash-in") {
          entries.push({
            accountId: accounts.main,
            accountCode: accounts.main,
            debit: data.amount,
            credit: 0,
            description:
              "MoMo Cash-in - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: 0,
            credit: data.amount,
            description:
              "MoMo Cash-in - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
        } else if (data.transactionType === "cash-out") {
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: data.amount,
            credit: 0,
            description:
              "MoMo Cash-out - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.main,
            accountCode: accounts.main,
            debit: 0,
            credit: data.amount,
            description:
              "MoMo Cash-out - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
        }
        break;

      case "agency_banking":
        if (data.transactionType === "deposit") {
          entries.push({
            accountId: accounts.main,
            accountCode: accounts.main,
            debit: data.amount,
            credit: 0,
            description:
              "Agency Banking Deposit - " +
              (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: 0,
            credit: data.amount,
            description:
              "Agency Banking Deposit - " +
              (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
        } else if (data.transactionType === "withdrawal") {
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: data.amount,
            credit: 0,
            description:
              "Agency Banking Withdrawal - " +
              (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.main,
            accountCode: accounts.main,
            debit: 0,
            credit: data.amount,
            description:
              "Agency Banking Withdrawal - " +
              (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
        }
        break;

      case "e_zwich":
        if (data.transactionType === "withdrawal") {
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: data.amount,
            credit: 0,
            description:
              "E-Zwich Withdrawal - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.main,
            accountCode: accounts.main,
            debit: 0,
            credit: data.amount,
            description:
              "E-Zwich Withdrawal - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
        } else if (data.transactionType === "card_issuance") {
          entries.push({
            accountId: accounts.main,
            accountCode: accounts.main,
            debit: data.amount,
            credit: 0,
            description:
              "E-Zwich Card Issuance - " +
              (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: 0,
            credit: data.amount,
            description:
              "E-Zwich Card Issuance - " +
              (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
        }
        break;

      case "power":
        entries.push({
          accountId: accounts.main,
          accountCode: accounts.main,
          debit: data.amount + data.fee,
          credit: 0,
          description:
            "Power Payment - " + (data.customerName || data.reference),
          metadata: {
            transactionId: data.transactionId,
            customerName: data.customerName,
          },
        });
        entries.push({
          accountId: accounts.fee,
          accountCode: accounts.fee,
          debit: 0,
          credit: data.amount,
          description:
            "Power Payment - " + (data.customerName || data.reference),
          metadata: {
            transactionId: data.transactionId,
            customerName: data.customerName,
          },
        });
        if (data.fee > 0) {
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: 0,
            credit: data.fee,
            description:
              "Power Service Fee - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              feeAmount: data.fee,
            },
          });
        }
        break;

      case "jumia":
        if (data.transactionType === "jumia_float") {
          entries.push({
            accountId: accounts.main,
            accountCode: accounts.main,
            debit: data.amount,
            credit: 0,
            description:
              "Jumia POD Collection - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.fee,
            accountCode: accounts.fee,
            debit: 0,
            credit: data.amount,
            description:
              "Jumia POD Collection - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
        }
        break;

      case "expenses":
        // Expense GL entries: Debit expense account, Credit payment account
        entries.push({
          accountId: accounts.expense,
          accountCode: accounts.expense,
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
          accountCode: accounts.payment,
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
          accountCode: accounts.main,
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
          accountCode: accounts.commission,
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
        accountCode: accounts.main,
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
        accountCode: accounts.fee,
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

  private static async updateAccountBalances(
    entries: Array<{ accountId: string; debit: number; credit: number }>
  ): Promise<void> {
    for (const entry of entries) {
      const balanceChange = entry.debit - entry.credit;
      await sql`
        INSERT INTO gl_account_balances (account_id, current_balance, last_updated)
        VALUES (${entry.accountId}, ${balanceChange}, CURRENT_TIMESTAMP)
        ON CONFLICT (account_id) DO UPDATE SET
          current_balance = gl_account_balances.current_balance + ${balanceChange},
          last_updated = CURRENT_TIMESTAMP
      `;
    }
  }

  static generateReceipt(data: ReceiptData): string {
    // Ensure amount and fee are numbers
    const amount =
      typeof data.amount === "string" ? parseFloat(data.amount) : data.amount;
    const fee = typeof data.fee === "string" ? parseFloat(data.fee) : data.fee;
    const totalAmount = amount + fee;
    const date = new Date(data.date).toLocaleString();
    
    // Handle undefined values
    const transactionType = data.transactionType || "Transaction";
    const reference = data.reference || data.transactionId || "N/A";
    const transactionId = data.transactionId || "N/A";

    return `<!DOCTYPE html>
<html>
<head>
  <title>Transaction Receipt</title>
  <style>
    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 20px; max-width: 300px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .logo { width: 60px; height: 60px; margin: 0 auto 10px; }
    .line { border-bottom: 1px dashed #000; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid #000; padding-top: 10px; }
    .title { font-size: 14px; font-weight: bold; text-align: center; margin: 10px 0; }
  </style>
</head>
<body>
  <div class='header'>
    <img src='/logo.png' alt='MIMHAAD Logo' class='logo' />
    <h3>MIMHAAD FINANCIAL SERVICES</h3>
    <p>${data.branchName}</p>
    <p>Tel: 0241378880</p>
    <p>${date}</p>
  </div>
  <div class='title'>${data.sourceModule.toUpperCase()} TRANSACTION RECEIPT</div>
  <div class='line'></div>
  <div class='row'>
    <span>Transaction ID:</span>
    <span>${transactionId}</span>
  </div>
  <div class='row'>
    <span>Type:</span>
    <span>${transactionType}</span>
  </div>
  ${
    amount
      ? `<div class='row'><span>Amount:</span><span>GHS ${amount.toFixed(
          2
        )}</span></div>`
      : ""
  }
  <div class='row'>
    <span>Reference:</span>
    <span>${reference}</span>
  </div>
  <div class='line'></div>
  <div class='row' style='font-weight: bold; font-size: 14px;'>
    <span>TOTAL:</span>
    <span>GHS ${totalAmount.toFixed(2)}</span>
  </div>
  <div class='footer'>
    <p>Thank you for using our service!</p>
    <p>For inquiries, please call 0241378880</p>
    <p>Powered by MIMHAAD Financial Services</p>
  </div>
</body>
</html>`;
  }

  static printReceipt(data: ReceiptData): void {
    const receiptContent = this.generateReceipt(data);
    const printWindow = window.open("", "_blank", "width=350,height=600");

    if (!printWindow) {
      console.error("Failed to open print window");
      return;
    }

    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  }

  static async deleteGLEntries({
    transactionId,
    sourceModule,
  }: {
    transactionId: string;
    sourceModule: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the GL transaction
      const glTxRows = await sql`
        SELECT id FROM gl_transactions WHERE source_transaction_id = ${transactionId} AND source_module = ${sourceModule}
      `;
      if (!glTxRows.length) {
        return { success: true };
      }
      const glTransactionId = glTxRows[0].id;
      // Delete journal entries
      await sql`DELETE FROM gl_journal_entries WHERE transaction_id = ${glTransactionId}`;
      // Delete the GL transaction
      await sql`DELETE FROM gl_transactions WHERE id = ${glTransactionId}`;
      return { success: true };
    } catch (error) {
      console.error("[GL] Error deleting GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createCommissionReversalGLEntries({
    transactionId,
    sourceModule,
    transactionType,
    amount,
    fee,
    customerName,
    reference,
    processedBy,
    branchId,
    branchName,
    metadata,
  }: UnifiedGLTransactionData): Promise<{
    success: boolean;
    glTransactionId?: string;
    error?: string;
  }> {
    try {
      console.log(
        "🔷 [GL] Creating commission reversal GL entries for transaction:",
        transactionId
      );

      // Check if reversal already exists
      const existingReversal = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_transaction_id = ${transactionId} 
        AND source_module = ${sourceModule}
        AND source_transaction_type = 'commission_reversal'
      `;

      if (existingReversal.length > 0) {
        console.log(
          "🔷 [GL] Commission reversal already exists for transaction:",
          transactionId
        );
        return { success: true, glTransactionId: existingReversal[0].id };
      }

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get the same accounts used for the original commission posting
      const accounts = await this.getGLAccountsForTransaction(
        sourceModule,
        transactionType,
        branchId,
        {
          transactionId,
          sourceModule,
          transactionType,
          amount,
          fee,
          customerName,
          reference,
          processedBy,
          branchId,
          branchName,
          metadata,
        }
      );

      console.log(`🔷 [GL] Commission reversal accounts:`, accounts);

      // Create reversal entries (opposite of original entries)
      const entries = [
        {
          accountId: accounts.commission,
          accountCode: accounts.commission,
          debit: amount, // Debit commission account (reduce revenue)
          credit: 0,
          description: `Commission Revenue Reversal - ${reference}`,
          metadata: {
            transactionId,
            source: metadata?.source || "Unknown",
            sourceName: metadata?.sourceName || "Unknown Partner",
            month: metadata?.month || "",
            reversalReason: metadata?.reversalReason || "Commission deleted",
            originalTransactionType: transactionType,
          },
        },
        {
          accountId: accounts.main,
          accountCode: accounts.main,
          debit: 0,
          credit: amount, // Credit main account (reduce receivable)
          description: `Commission Receivable Reversal - ${reference}`,
          metadata: {
            transactionId,
            source: metadata?.source || "Unknown",
            sourceName: metadata?.sourceName || "Unknown Partner",
            month: metadata?.month || "",
            reversalReason: metadata?.reversalReason || "Commission deleted",
            originalTransactionType: transactionType,
          },
        },
      ];

      // Verify entries balance
      const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredits = entries.reduce(
        (sum, entry) => sum + entry.credit,
        0
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          "Commission reversal GL entries do not balance: Debits " +
            totalDebits +
            ", Credits " +
            totalCredits
        );
      }

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${sourceModule}, ${transactionId}, 'commission_reversal', ${`Commission Reversal - ${reference}`}, 'posted', ${processedBy}, ${JSON.stringify(
        metadata || {}
      )})
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      // Update account balances
      await this.updateAccountBalances(entries);

      console.log(
        "🔷 [GL] Commission reversal GL entries created successfully for transaction:",
        transactionId
      );

      // Log audit trail
      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: `Commission reversal GL entries created for ${sourceModule} transaction`,
        details: {
          sourceTransactionId: transactionId,
          sourceModule,
          transactionType: "commission_reversal",
          amount,
          fee,
          entriesCount: entries.length,
          reversalReason: metadata?.reversalReason || "Commission deleted",
        },
        severity: "medium",
        branchId,
        branchName: branchName || "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error(
        "🔷 [GL] Error creating commission reversal GL entries:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createCommissionGLEntries({
    transactionId,
    sourceModule,
    transactionType,
    amount,
    fee,
    customerName,
    reference,
    processedBy,
    branchId,
    branchName,
    metadata,
  }: UnifiedGLTransactionData): Promise<{
    success: boolean;
    glTransactionId?: string;
    error?: string;
  }> {
    try {
      console.log(
        "🔷 [GL] Creating commission GL entries for transaction:",
        transactionId
      );

      // Check if commission GL entries already exist
      const existingCommission = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_transaction_id = ${transactionId} 
        AND source_module = ${sourceModule}
        AND source_transaction_type = 'commission'
      `;

      if (existingCommission.length > 0) {
        console.log(
          "🔷 [GL] Commission GL entries already exist for transaction:",
          transactionId
        );
        return { success: true, glTransactionId: existingCommission[0].id };
      }

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get GL accounts for commission posting
      const accounts = await this.getGLAccountsForTransaction(
        sourceModule,
        transactionType,
        branchId,
        {
          transactionId,
          sourceModule,
          transactionType,
          amount,
          fee,
          customerName,
          reference,
          processedBy,
          branchId,
          branchName,
          metadata,
        }
      );

      console.log(`🔷 [GL] Commission accounts:`, accounts);

      // Create commission entries
      const entries = [
        {
          accountId: accounts.commission,
          accountCode: accounts.commission,
          debit: 0,
          credit: amount, // Credit commission account (increase revenue)
          description: `Commission Revenue - ${reference}`,
          metadata: {
            transactionId,
            source: metadata?.source || "Unknown",
            sourceName: metadata?.sourceName || "Unknown Partner",
            month: metadata?.month || "",
            status: metadata?.status || "pending",
            originalTransactionType: transactionType,
          },
        },
        {
          accountId: accounts.main,
          accountCode: accounts.main,
          debit: amount, // Debit main account (increase receivable)
          credit: 0,
          description: `Commission Receivable - ${reference}`,
          metadata: {
            transactionId,
            source: metadata?.source || "Unknown",
            sourceName: metadata?.sourceName || "Unknown Partner",
            month: metadata?.month || "",
            status: metadata?.status || "pending",
            originalTransactionType: transactionType,
          },
        },
      ];

      // Verify entries balance
      const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredits = entries.reduce(
        (sum, entry) => sum + entry.credit,
        0
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          "Commission GL entries do not balance: Debits " +
            totalDebits +
            ", Credits " +
            totalCredits
        );
      }

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${sourceModule}, ${transactionId}, 'commission', ${`Commission - ${reference}`}, 'posted', ${processedBy}, ${JSON.stringify(
        metadata || {}
      )})
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      // Update account balances
      await this.updateAccountBalances(entries);

      console.log(
        "🔷 [GL] Commission GL entries created successfully for transaction:",
        transactionId
      );

      // Log audit trail
      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: `Commission GL entries created for ${sourceModule} transaction`,
        details: {
          sourceTransactionId: transactionId,
          sourceModule,
          transactionType: "commission",
          amount,
          fee,
          entriesCount: entries.length,
        },
        severity: "low",
        branchId,
        branchName: branchName || "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error("🔷 [GL] Error creating commission GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createCommissionPaymentGLEntries({
    transactionId,
    sourceModule,
    transactionType,
    amount,
    fee,
    customerName,
    reference,
    processedBy,
    branchId,
    branchName,
    metadata,
    paymentMethod,
  }: UnifiedGLTransactionData & { paymentMethod?: string }): Promise<{
    success: boolean;
    glTransactionId?: string;
    error?: string;
  }> {
    try {
      console.log(
        "🔷 [GL] Creating commission payment GL entries for transaction:",
        transactionId
      );

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get GL mappings for commission payment
      const mappings = await sql`
        SELECT mapping_type, gl_account_id, gl_account_code
        FROM gl_mappings
        WHERE transaction_type = 'commission_payment'
          AND branch_id = ${branchId}
          AND is_active = true
      `;

      if (mappings.length === 0) {
        throw new Error("No GL mappings found for commission payment");
      }

      // Build accounts mapping
      const accounts: Record<string, any> = {};
      for (const mapping of mappings) {
        if (mapping.mapping_type === "payment") {
          accounts.payment = mapping.gl_account_id;
          accounts.paymentCode = mapping.gl_account_code;
        } else if (mapping.mapping_type === "receivable") {
          accounts.receivable = mapping.gl_account_id;
          accounts.receivableCode = mapping.gl_account_code;
        }
      }

      if (!accounts.payment || !accounts.receivable) {
        throw new Error("Missing required GL accounts for commission payment");
      }

      // Create GL entries
      const entries = [
        {
          accountId: accounts.payment,
          accountCode: accounts.paymentCode,
          debit: amount + fee,
          credit: 0,
          description: `Commission payment to ${customerName}`,
          metadata: { paymentMethod, customerName },
        },
        {
          accountId: accounts.receivable,
          accountCode: accounts.receivableCode,
          debit: 0,
          credit: amount + fee,
          description: `Commission payment to ${customerName}`,
          metadata: { paymentMethod, customerName },
        },
      ];

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${sourceModule}, ${transactionId}, ${transactionType}, ${reference}, 'posted', ${processedBy}, ${JSON.stringify(
        metadata || {}
      )})
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      await this.updateAccountBalances(entries);

      console.log("🔷 [GL] Commission payment GL entries created successfully");

      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: "GL entries created for commission payment",
        details: {
          sourceTransactionId: transactionId,
          sourceModule,
          transactionType,
          amount,
          fee,
          paymentMethod,
          customerName,
        },
        severity: "medium",
        branchId,
        branchName: branchName || "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error(
        "🔷 [GL] Error creating commission payment GL entries:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createCardIssuanceGLEntries(
    cardData: {
      id: string;
      card_number: string;
      fee_charged: number;
      payment_method: string;
      partner_bank?: string;
    },
    processedBy: string,
    branchId: string
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(
        "🔷 [GL] Creating card issuance GL entries for card:",
        cardData.card_number
      );

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get GL mappings for card issuance
      const mappings = await sql`
        SELECT mapping_type, gl_account_id
        FROM gl_mappings
        WHERE transaction_type = 'card_issuance'
          AND branch_id = ${branchId}
          AND is_active = true
      `;

      if (mappings.length === 0) {
        throw new Error("No GL mappings found for card issuance");
      }

      // Get account codes and names for the mapped accounts
      const accountIds = mappings.map((m: any) => m.gl_account_id);
      const accounts = await sql`
        SELECT id, code, name FROM gl_accounts 
        WHERE id = ANY(${accountIds})
      `;

      // Build accounts mapping
      const accountsMap: Record<string, any> = {};
      for (const mapping of mappings) {
        const account = accounts.find(
          (a: any) => a.id === mapping.gl_account_id
        );
        if (mapping.mapping_type === "revenue") {
          accountsMap.revenue = mapping.gl_account_id;
          accountsMap.revenueCode = account?.code || "4000";
          accountsMap.revenueName = account?.name || "Revenue";
        } else if (mapping.mapping_type === "payment") {
          accountsMap.payment = mapping.gl_account_id;
          accountsMap.paymentCode = account?.code || "1000";
          accountsMap.paymentName = account?.name || "Cash";
        }
      }

      if (!accountsMap.revenue || !accountsMap.payment) {
        throw new Error("Missing required GL accounts for card issuance");
      }

      // Create GL entries
      const entries = [
        {
          accountId: accountsMap.payment,
          accountCode: accountsMap.paymentCode,
          debit: cardData.fee_charged,
          credit: 0,
          description: `Card issuance fee for ${cardData.card_number}`,
          metadata: {
            cardNumber: cardData.card_number,
            paymentMethod: cardData.payment_method,
            partnerBank: cardData.partner_bank,
          },
        },
        {
          accountId: accountsMap.revenue,
          accountCode: accountsMap.revenueCode,
          debit: 0,
          credit: cardData.fee_charged,
          description: `Card issuance fee for ${cardData.card_number}`,
          metadata: {
            cardNumber: cardData.card_number,
            paymentMethod: cardData.payment_method,
            partnerBank: cardData.partner_bank,
          },
        },
      ];

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, 'e_zwich', ${
        cardData.id
      }, 'card_issuance', 'Card issuance fee', 'posted', ${processedBy}, ${JSON.stringify(
        {
          cardNumber: cardData.card_number,
          paymentMethod: cardData.payment_method,
        }
      )})
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      await this.updateAccountBalances(entries);

      console.log("🔷 [GL] Card issuance GL entries created successfully");

      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: "GL entries created for card issuance",
        details: {
          sourceTransactionId: cardData.id,
          sourceModule: "e_zwich",
          transactionType: "card_issuance",
          amount: cardData.fee_charged,
          cardNumber: cardData.card_number,
          paymentMethod: cardData.payment_method,
        },
        severity: "medium",
        branchId,
        branchName: "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error("🔷 [GL] Error creating card issuance GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createInventoryPurchaseGLEntries({
    transactionId,
    sourceModule,
    transactionType,
    amount,
    fee,
    customerName,
    reference,
    processedBy,
    branchId,
    branchName,
    metadata,
  }: UnifiedGLTransactionData): Promise<{
    success: boolean;
    glTransactionId?: string;
    error?: string;
  }> {
    try {
      console.log(
        "🔷 [GL] Creating inventory purchase GL entries for transaction:",
        transactionId
      );

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get GL mappings for inventory purchase
      const mappings = await sql`
        SELECT mapping_type, gl_account_id
        FROM gl_mappings
        WHERE transaction_type = 'inventory_purchase'
          AND branch_id = ${branchId}
          AND is_active = true
      `;

      if (mappings.length === 0) {
        throw new Error("No GL mappings found for inventory purchase");
      }

      // Get account codes and names for the mapped accounts
      const accountIds = mappings.map((m: any) => m.gl_account_id);
      const accounts = await sql`
        SELECT id, code, name FROM gl_accounts 
        WHERE id = ANY(${accountIds})
      `;

      // Build accounts mapping
      const accountMap: Record<string, any> = {};
      for (const mapping of mappings) {
        const account = accounts.find(
          (a: any) => a.id === mapping.gl_account_id
        );
        if (mapping.mapping_type === "inventory") {
          accountMap.inventory = mapping.gl_account_id;
          accountMap.inventoryCode = account?.code || "1200";
          accountMap.inventoryName = account?.name || "Inventory";
        } else if (mapping.mapping_type === "payable") {
          accountMap.payable = mapping.gl_account_id;
          accountMap.payableCode = account?.code || "2100";
          accountMap.payableName = account?.name || "Accounts Payable";
        } else if (mapping.mapping_type === "expense") {
          accountMap.expense = mapping.gl_account_id;
          accountMap.expenseCode = account?.code || "6000";
          accountMap.expenseName = account?.name || "Expenses";
        }
      }

      if (!accountMap.inventory || !accountMap.payable) {
        throw new Error("Missing required GL accounts for inventory purchase");
      }

      // Create GL entries
      const entries = [
        {
          accountId: accountMap.inventory,
          accountCode: accountMap.inventoryCode,
          debit: amount,
          credit: 0,
          description: `Inventory purchase: ${reference}`,
          metadata: {
            batchCode: metadata?.batch_code,
            quantity: metadata?.quantity,
            unitCost: metadata?.unit_cost,
            partnerBank: metadata?.partner_bank_name,
            transactionType: "inventory_purchase",
          },
        },
        {
          accountId: accountMap.payable,
          accountCode: accountMap.payableCode,
          debit: 0,
          credit: amount,
          description: `Payable to ${
            customerName || metadata?.partner_bank_name
          } for ${reference}`,
          metadata: {
            batchCode: metadata?.batch_code,
            partnerBankId: metadata?.partner_bank_id,
            partnerBankName: metadata?.partner_bank_name,
            transactionType: "inventory_purchase",
          },
        },
      ];

      // If expense account is mapped, create additional entry
      if (accountMap.expense) {
        entries.push({
          accountId: accountMap.expense,
          accountCode: accountMap.expenseCode,
          debit: amount,
          credit: 0,
          description: `Expense for inventory purchase: ${reference}`,
          metadata: {
            batchCode: metadata?.batch_code,
            quantity: metadata?.quantity,
            unitCost: metadata?.unit_cost,
            partnerBank: metadata?.partner_bank_name,
            transactionType: "inventory_purchase",
          },
        });
        // Offset the expense with a credit to inventory
        entries.push({
          accountId: accountMap.inventory,
          accountCode: accountMap.inventoryCode,
          debit: 0,
          credit: amount,
          description: `Inventory transfer for expense: ${reference}`,
          metadata: {
            batchCode: metadata?.batch_code,
            quantity: metadata?.quantity,
            unitCost: metadata?.unit_cost,
            partnerBank: metadata?.partner_bank_name,
            transactionType: "inventory_purchase",
          },
        });
      }

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${sourceModule}, ${transactionId}, ${transactionType}, ${reference}, 'posted', ${processedBy}, ${JSON.stringify(
        metadata || {}
      )})
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      await this.updateAccountBalances(entries);

      console.log("🔷 [GL] Inventory purchase GL entries created successfully");

      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: "GL entries created for inventory purchase",
        details: {
          sourceTransactionId: transactionId,
          sourceModule,
          transactionType,
          amount,
          customerName,
          reference,
          batchCode: metadata?.batch_code,
          partnerBank: metadata?.partner_bank_name,
        },
        severity: "medium",
        branchId,
        branchName: branchName || "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error(
        "🔷 [GL] Error creating inventory purchase GL entries:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createInventoryAdjustmentGLEntries({
    transactionId,
    sourceModule,
    transactionType,
    amount,
    fee,
    customerName,
    reference,
    processedBy,
    branchId,
    branchName,
    metadata,
  }: UnifiedGLTransactionData): Promise<{
    success: boolean;
    glTransactionId?: string;
    error?: string;
  }> {
    try {
      console.log(
        "🔷 [GL] Creating inventory adjustment GL entries for transaction:",
        transactionId
      );

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get GL mappings for inventory adjustment
      const mappings = await sql`
        SELECT mapping_type, gl_account_id
        FROM gl_mappings
        WHERE transaction_type = 'inventory_adjustment'
          AND branch_id = ${branchId}
          AND is_active = true
      `;

      if (mappings.length === 0) {
        throw new Error("No GL mappings found for inventory adjustment");
      }

      // Get account codes and names for the mapped accounts
      const accountIds = mappings.map((m: any) => m.gl_account_id);
      const accounts = await sql`
        SELECT id, code, name FROM gl_accounts 
        WHERE id = ANY(${accountIds})
      `;

      // Build accounts mapping
      const accountMap: Record<string, any> = {};
      for (const mapping of mappings) {
        const account = accounts.find(
          (a: any) => a.id === mapping.gl_account_id
        );
        if (mapping.mapping_type === "inventory") {
          accountMap.inventory = mapping.gl_account_id;
          accountMap.inventoryCode = account?.code || "1200";
          accountMap.inventoryName = account?.name || "Inventory";
        } else if (mapping.mapping_type === "adjustment") {
          accountMap.adjustment = mapping.gl_account_id;
          accountMap.adjustmentCode = account?.code || "6000";
          accountMap.adjustmentName = account?.name || "Adjustments";
        }
      }

      if (!accountMap.inventory || !accountMap.adjustment) {
        throw new Error(
          "Missing required GL accounts for inventory adjustment"
        );
      }

      // Create GL entries
      const entries = [
        {
          accountId: accountMap.inventory,
          accountCode: accountMap.inventoryCode,
          debit: amount,
          credit: 0,
          description: `Inventory adjustment - ${reference}`,
          metadata: { customerName, adjustmentType: "increase" },
        },
        {
          accountId: accountMap.adjustment,
          accountCode: accountMap.adjustmentCode,
          debit: 0,
          credit: amount,
          description: `Inventory adjustment - ${reference}`,
          metadata: { customerName, adjustmentType: "increase" },
        },
      ];

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${sourceModule}, ${transactionId}, ${transactionType}, ${reference}, 'posted', ${processedBy}, ${JSON.stringify(
        metadata || {}
      )})
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      await this.updateAccountBalances(entries);

      console.log(
        "🔷 [GL] Inventory adjustment GL entries created successfully"
      );

      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: "GL entries created for inventory adjustment",
        details: {
          sourceTransactionId: transactionId,
          sourceModule,
          transactionType,
          amount,
          customerName,
        },
        severity: "medium",
        branchId,
        branchName: branchName || "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error(
        "🔷 [GL] Error creating inventory adjustment GL entries:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createInventoryReversalGLEntries({
    transactionId,
    sourceModule,
    transactionType,
    amount,
    fee,
    customerName,
    reference,
    processedBy,
    branchId,
    branchName,
    metadata,
  }: UnifiedGLTransactionData): Promise<{
    success: boolean;
    glTransactionId?: string;
    error?: string;
  }> {
    try {
      console.log(
        "🔷 [GL] Creating inventory reversal GL entries for transaction:",
        transactionId
      );

      const glTransactionIdResult = await sql`SELECT gen_random_uuid() as id`;
      const glTransactionId = glTransactionIdResult[0].id;

      // Get GL mappings for inventory reversal
      const mappings = await sql`
        SELECT mapping_type, gl_account_id
        FROM gl_mappings
        WHERE transaction_type = 'inventory_reversal'
          AND branch_id = ${branchId}
          AND is_active = true
      `;

      if (mappings.length === 0) {
        throw new Error("No GL mappings found for inventory reversal");
      }

      // Get account codes and names for the mapped accounts
      const accountIds = mappings.map((m: any) => m.gl_account_id);
      const accounts = await sql`
        SELECT id, code, name FROM gl_accounts 
        WHERE id = ANY(${accountIds})
      `;

      // Build accounts mapping
      const accountMap: Record<string, any> = {};
      for (const mapping of mappings) {
        const account = accounts.find(
          (a: any) => a.id === mapping.gl_account_id
        );
        if (mapping.mapping_type === "inventory") {
          accountMap.inventory = mapping.gl_account_id;
          accountMap.inventoryCode = account?.code || "1200";
          accountMap.inventoryName = account?.name || "Inventory";
        } else if (mapping.mapping_type === "reversal") {
          accountMap.reversal = mapping.gl_account_id;
          accountMap.reversalCode = account?.code || "6000";
          accountMap.reversalName = account?.name || "Reversals";
        }
      }

      if (!accountMap.inventory || !accountMap.reversal) {
        throw new Error("Missing required GL accounts for inventory reversal");
      }

      // Create GL entries (reverse the original purchase)
      const entries = [
        {
          accountId: accountMap.reversal,
          accountCode: accountMap.reversalCode,
          debit: amount,
          credit: 0,
          description: `Inventory reversal - ${reference}`,
          metadata: { customerName, reversalType: "deletion" },
        },
        {
          accountId: accountMap.inventory,
          accountCode: accountMap.inventoryCode,
          debit: 0,
          credit: amount,
          description: `Inventory reversal - ${reference}`,
          metadata: { customerName, reversalType: "deletion" },
        },
      ];

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${sourceModule}, ${transactionId}, ${transactionType}, ${reference}, 'posted', ${
        processedBy || "system"
      }, ${JSON.stringify(metadata || {})})
      `;

      // Create journal entries
      for (const entry of entries) {
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
      }

      await this.updateAccountBalances(entries);

      console.log("🔷 [GL] Inventory reversal GL entries created successfully");

      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: "GL entries created for inventory reversal",
        details: {
          sourceTransactionId: transactionId,
          sourceModule,
          transactionType,
          amount,
          customerName,
        },
        severity: "medium",
        branchId,
        branchName: branchName || "Unknown Branch",
        status: "success",
      });

      return { success: true, glTransactionId };
    } catch (error) {
      console.error(
        "🔷 [GL] Error creating inventory reversal GL entries:",
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
