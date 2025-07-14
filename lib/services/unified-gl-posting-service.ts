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

      // Check if GL entries already exist for this transaction
      const existingTransaction = await sql`
        SELECT id FROM gl_transactions 
        WHERE source_transaction_id = ${data.transactionId} 
        AND source_module = ${data.sourceModule}
        AND source_transaction_type = ${data.transactionType}
      `;

      if (existingTransaction.length > 0) {
        console.log(
          "🔷 [GL] GL entries already exist for " +
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

      console.log("🔍 [DEBUG] Retrieved GL accounts for MoMo transaction:", {
        sourceModule: data.sourceModule,
        transactionType: data.transactionType,
        accounts,
        requiredMappings: ["main", "fee", "revenue", "expense", "asset"],
      });

      const entries = await this.createGLEntriesForTransaction(data, accounts);

      console.log("🔍 [DEBUG] Created GL entries:", {
        sourceModule: data.sourceModule,
        transactionType: data.transactionType,
        amount: data.amount,
        fee: data.fee,
        entriesCount: entries.length,
        entries: entries.map((entry) => ({
          accountId: entry.accountId,
          accountCode: entry.accountCode,
          debit: entry.debit,
          credit: entry.credit,
          description: entry.description,
        })),
      });

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
        console.log("🔍 [DEBUG] Saving GL entry:", {
          accountId: entry.accountId,
          accountCode: entry.accountCode,
          debit: entry.debit,
          credit: entry.credit,
          description: entry.description,
        });
        await sql`
          INSERT INTO gl_journal_entries (id, transaction_id, account_id, account_code, debit, credit, description, metadata)
          VALUES (gen_random_uuid(), ${glTransactionId}, ${entry.accountId}, ${
          entry.accountCode
        }, ${entry.debit}, ${entry.credit}, ${
          entry.description
        }, ${JSON.stringify(entry.metadata || {})})
        `;
        console.log("🔍 [DEBUG] GL entry saved successfully");
      }

      await this.updateAccountBalances(entries);

      console.log(
        "🔷 [GL] GL entries created successfully for " +
          data.sourceModule +
          " transaction: " +
          data.transactionId
      );

      // Helper function to get user's full name
      async function getUserFullName(userId: string): Promise<string> {
        try {
          if (!userId || userId === "unknown" || userId === "System") {
            return "System User";
          }

          const users = await sql`
            SELECT first_name, last_name, email FROM users WHERE id = ${userId}
          `;

          if (users && users.length > 0) {
            const { first_name, last_name, email } = users[0];
            if (first_name && last_name) {
              return `${first_name} ${last_name}`;
            } else if (first_name) {
              return first_name;
            } else if (last_name) {
              return last_name;
            } else if (email) {
              return email;
            }
          }

          return "Unknown User";
        } catch (error) {
          console.error(`Failed to get user name for ID ${userId}:`, error);
          return "Unknown User";
        }
      }

      const userName = await getUserFullName(data.processedBy);
      await AuditLoggerService.log({
        userId: data.processedBy,
        username: userName,
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
    console.log(
      `🔍 [DEBUG] Looking for GL mappings for ${lookupType} in branch ${branchId}`
    );

    const mappings = await sql`
      SELECT mapping_type, gl_account_id
      FROM gl_mappings
      WHERE transaction_type = ${lookupType}
        AND branch_id = ${branchId}
        AND is_active = true
    `;

    console.log(
      `🔍 [DEBUG] Found ${mappings.length} GL mappings for ${lookupType}:`,
      mappings
    );

    // Build a mapping object: { main_account, fee_account, ... }
    const result: Record<string, string> = {};
    for (const row of mappings) {
      result[row.mapping_type] = row.gl_account_id;
    }

    console.log(`🔍 [DEBUG] Processed GL mappings for ${lookupType}:`, result);

    // Auto-fill missing asset mapping with main account (they should be the same)
    if (result.main && !result.asset) {
      result.asset = result.main;
      console.log(
        `🔷 [GL] Auto-filled asset mapping with main account for ${lookupType}`
      );
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
        requiredMappings = ["main", "fee", "revenue", "expense"];
        break;
      case "agency_banking":
        requiredMappings = ["main", "fee", "revenue", "expense"];
        break;
      case "e_zwich":
        requiredMappings = ["main", "fee", "revenue", "expense"];
        break;
      case "power":
        requiredMappings = ["main", "fee", "revenue", "expense"];
        break;
      case "jumia":
        // Only require 'main' for package_receipt and pod_collection
        if (
          data.transactionType === "package_receipt" ||
          data.transactionType === "pod_collection"
        ) {
          requiredMappings = ["main"];
        } else {
          requiredMappings = ["main", "fee", "revenue", "expense"];
        }
        break;
      case "expenses":
        requiredMappings = ["expense", "payment"];
        break;
      case "commissions":
        requiredMappings = ["main", "commission"];
        break;
      // Add more as needed
    }

    // Check for required mappings and add fallbacks
    for (const key of requiredMappings) {
      if (!accounts[key]) {
        throw new Error(
          `Missing GL mapping for ${key} (module: ${data.sourceModule}, type: ${data.transactionType}, branch: ${data.branchId})`
        );
      }
    }

    // Add fallback mappings for asset (same as main)
    if (!accounts.asset && accounts.main) {
      accounts.asset = accounts.main;
    }

    switch (data.sourceModule) {
      case "momo":
        console.log(
          "🔍 [DEBUG] Creating MoMo GL entries for:",
          data.transactionType
        );
        if (
          data.transactionType === "cash-in" ||
          data.transactionType === "deposit"
        ) {
          console.log(
            "🔍 [DEBUG] Creating cash-in/deposit entries - Amount:",
            data.amount,
            "Fee:",
            data.fee
          );
          // Cash-in/Deposit: Customer gives us cash + fee, we lose only the amount from MoMo float
          // Dr. Cash in Till (amount + fee), Cr. MoMo Float (amount only)
          // Dr. Fee Revenue (fee), Cr. Fee Expense (fee)
          entries.push({
            accountId: accounts.fee, // Cash in Till account
            accountCode: accounts.fee, // Use account ID as code if no separate code
            debit: data.amount + data.fee, // Amount + fee goes to cash till
            credit: 0,
            description:
              "MoMo Cash-in - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          console.log(
            "🔍 [DEBUG] Added cash-in entry 1: Dr. Cash Till",
            data.amount + data.fee
          );
          entries.push({
            accountId: accounts.main, // MoMo Float account
            accountCode: accounts.main, // Use account ID as code if no separate code
            debit: 0,
            credit: data.amount, // Only the amount, not the fee
            description:
              "MoMo Cash-in - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          console.log(
            "🔍 [DEBUG] Added cash-in entry 2: Cr. MoMo Float",
            data.amount
          );
          // Fee entries
          if (data.fee > 0) {
            entries.push({
              accountId: accounts.revenue, // Fee Revenue account
              accountCode: accounts.revenue, // Use account ID as code if no separate code
              debit: 0,
              credit: data.fee, // Fee revenue (we earn the fee)
              description:
                "MoMo Fee Revenue - " + (data.customerName || data.reference),
              metadata: {
                transactionId: data.transactionId,
                customerName: data.customerName,
                feeAmount: data.fee,
              },
            });
            console.log(
              "🔍 [DEBUG] Added cash-in fee entry 3: Cr. Fee Revenue",
              data.fee
            );
            // Note: No Fee Expense entry for cash-in transactions
            // We only earn the fee as revenue, no expense is incurred
          }
        } else if (
          data.transactionType === "cash-out" ||
          data.transactionType === "withdrawal"
        ) {
          console.log(
            "🔍 [DEBUG] Creating cash-out/withdrawal entries - Amount:",
            data.amount,
            "Fee:",
            data.fee
          );
          // Cash-out/Withdrawal: Customer withdraws cash, we receive amount + fee to MoMo float
          // Dr. MoMo Float (amount + fee), Cr. Cash in Till (amount), Cr. Fee Revenue (fee)
          entries.push({
            accountId: accounts.main, // MoMo Float account
            accountCode: accounts.main, // Use account ID as code if no separate code
            debit: data.amount + data.fee, // Amount + fee goes to MoMo float
            credit: 0,
            description:
              "MoMo Cash-out - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          console.log(
            "🔍 [DEBUG] Added cash-out entry 1: Dr. MoMo Float",
            data.amount + data.fee
          );
          entries.push({
            accountId: accounts.fee, // Cash in Till account
            accountCode: accounts.fee, // Use account ID as code if no separate code
            debit: 0,
            credit: data.amount, // Only the amount comes from cash till
            description:
              "MoMo Cash-out - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          console.log(
            "🔍 [DEBUG] Added cash-out entry 2: Cr. Cash Till",
            data.amount
          );
          if (data.fee > 0) {
            entries.push({
              accountId: accounts.revenue, // Fee Revenue account
              accountCode: accounts.revenue, // Use account ID as code if no separate code
              debit: 0,
              credit: data.fee, // Fee revenue
              description:
                "MoMo Fee Revenue - " + (data.customerName || data.reference),
              metadata: {
                transactionId: data.transactionId,
                customerName: data.customerName,
                feeAmount: data.fee,
              },
            });
            console.log(
              "🔍 [DEBUG] Added cash-out fee entry 3: Cr. Fee Revenue",
              data.fee
            );
          }
        }
        console.log("🔍 [DEBUG] Total MoMo entries created:", entries.length);
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
          // E-Zwich Withdrawal: Only withdrawal amount debited from cash in till
          // Fee is added to the settlement account, not deducted from cash
          entries.push({
            accountId: accounts.fee, // Cash in Till account
            accountCode: accounts.fee,
            debit: data.amount, // Only the withdrawal amount (not including fee)
            credit: 0,
            description:
              "E-Zwich Withdrawal - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });
          entries.push({
            accountId: accounts.main, // E-Zwich Settlement Account
            accountCode: accounts.main,
            debit: 0,
            credit: data.amount, // Only the withdrawal amount
            description:
              "E-Zwich Withdrawal - " + (data.customerName || data.reference),
            metadata: {
              transactionId: data.transactionId,
              customerName: data.customerName,
            },
          });

          // Add fee to settlement account if there's a fee
          if (data.fee > 0) {
            entries.push({
              accountId: accounts.revenue, // Fee Revenue account
              accountCode: accounts.revenue,
              debit: 0,
              credit: data.fee, // Fee revenue
              description:
                "E-Zwich Withdrawal Fee - " +
                (data.customerName || data.reference),
              metadata: {
                transactionId: data.transactionId,
                customerName: data.customerName,
                feeAmount: data.fee,
              },
            });
            entries.push({
              accountId: accounts.main, // E-Zwich Settlement Account
              accountCode: accounts.main,
              debit: data.fee, // Fee debited to settlement account
              credit: 0,
              description:
                "E-Zwich Withdrawal Fee - " +
                (data.customerName || data.reference),
              metadata: {
                transactionId: data.transactionId,
                customerName: data.customerName,
                feeAmount: data.fee,
              },
            });
          }
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
              batchId: data.metadata?.batchId,
              batchCode: data.metadata?.batchCode,
              cardNumber: data.metadata?.cardNumber,
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
              batchId: data.metadata?.batchId,
              batchCode: data.metadata?.batchCode,
              cardNumber: data.metadata?.cardNumber,
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

      // Create commission payment entries
      const entries = [
        {
          accountId:
            mappings.find((m) => m.mapping_type === "main")?.gl_account_id ||
            mappings[0].gl_account_id,
          accountCode:
            mappings.find((m) => m.mapping_type === "main")?.gl_account_code ||
            mappings[0].gl_account_code,
          debit: 0,
          credit: amount, // Credit main account (decrease receivable)
          description: `Commission Payment - ${reference}`,
          metadata: {
            transactionId,
            paymentMethod: paymentMethod || "cash",
            source: metadata?.source || "Unknown",
            sourceName: metadata?.sourceName || "Unknown Partner",
            month: metadata?.month || "",
            status: metadata?.status || "paid",
            originalTransactionType: transactionType,
          },
        },
        {
          accountId:
            mappings.find((m) => m.mapping_type === "commission")
              ?.gl_account_id || mappings[0].gl_account_id,
          accountCode:
            mappings.find((m) => m.mapping_type === "commission")
              ?.gl_account_code || mappings[0].gl_account_code,
          debit: amount, // Debit commission account (decrease revenue)
          credit: 0,
          description: `Commission Payment - ${reference}`,
          metadata: {
            transactionId,
            paymentMethod: paymentMethod || "cash",
            source: metadata?.source || "Unknown",
            sourceName: metadata?.sourceName || "Unknown Partner",
            month: metadata?.month || "",
            status: metadata?.status || "paid",
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
          "Commission payment GL entries do not balance: Debits " +
            totalDebits +
            ", Credits " +
            totalCredits
        );
      }

      // Create GL transaction record
      await sql`
        INSERT INTO gl_transactions (id, date, source_module, source_transaction_id, source_transaction_type, description, status, created_by, metadata)
        VALUES (${glTransactionId}, CURRENT_DATE, ${sourceModule}, ${transactionId}, 'commission_payment', ${`Commission Payment - ${reference}`}, 'posted', ${processedBy}, ${JSON.stringify(
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
        "🔷 [GL] Commission payment GL entries created successfully for transaction:",
        transactionId
      );

      // Log audit trail
      await AuditLoggerService.log({
        userId: processedBy,
        username: processedBy,
        actionType: "gl_transaction_create",
        entityType: "gl_transaction",
        entityId: glTransactionId,
        description: `Commission payment GL entries created for ${sourceModule} transaction`,
        details: {
          sourceTransactionId: transactionId,
          sourceModule,
          transactionType: "commission_payment",
          amount,
          fee,
          paymentMethod,
          entriesCount: entries.length,
        },
        severity: "low",
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
}
