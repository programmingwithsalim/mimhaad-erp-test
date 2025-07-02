import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import { AuditLoggerService } from "./audit-logger-service";

const sql = neon(process.env.DATABASE_URL!);

export interface UnifiedGLTransactionData {
  transactionId: string;
  sourceModule: "momo" | "agency_banking" | "e_zwich" | "power" | "jumia";
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
        data.branchId
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
        branchName: data.branchName,
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
    branchId: string
  ): Promise<Record<string, any>> {
    // For MoMo, always use 'momo_float' as the transaction_type for mapping lookup
    let lookupType = transactionType;
    if (sourceModule === "momo") {
      lookupType = "momo_float";
    }
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
        if (data.transactionType === "pod_collection") {
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
    const totalAmount = data.amount + data.fee;
    const date = new Date(data.date).toLocaleString();

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
    <span>${data.transactionId}</span>
  </div>
  <div class='row'>
    <span>Type:</span>
    <span>${data.transactionType}</span>
  </div>
  ${
    data.amount
      ? `<div class='row'><span>Amount:</span><span>GHS ${data.amount.toFixed(
          2
        )}</span></div>`
      : ""
  }
  <div class='row'>
    <span>Reference:</span>
    <span>${data.reference}</span>
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
}
