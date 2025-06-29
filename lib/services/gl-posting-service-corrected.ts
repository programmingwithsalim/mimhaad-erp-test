// lib/services/gl-posting-service-corrected.ts

import type { GLEntry, GLTransactionData } from "../../types/gl";

export class GLPostingService {
  // Placeholder for getOrCreateGLAccount and createAndPostTransaction methods
  // These would typically interact with a database or other data source.

  static async getOrCreateGLAccount(
    code: string,
    name: string,
    type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"
  ): Promise<{ id: string; code: string; name: string } | null> {
    // In a real implementation, this would check if the GL account exists
    // and create it if it doesn't.  For this example, we just return a mock object.
    return { id: `gl-account-${code}`, code, name };
  }

  static async createAndPostTransaction(
    glTransactionData: GLTransactionData,
    skipPosting = false
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    // In a real implementation, this would create a GL transaction and post it.
    // For this example, we just return a mock success response.
    console.log("GL Transaction Data:", glTransactionData); // Simulate logging
    return { success: true, glTransactionId: "mock-gl-transaction-id" };
  }

  /**
   * Create MoMo GL entries with proper account mapping
   */
  static async createMoMoGLEntries(params: {
    transactionId: string;
    type: "cash-in" | "cash-out";
    amount: number;
    fee: number;
    provider: string;
    phoneNumber: string;
    customerName: string;
    reference: string;
    processedBy: string;
    branchId?: string;
    branchName?: string;
  }): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      console.log(
        "🔄 [GL] Creating MoMo GL entries for transaction:",
        params.transactionId
      );

      // Get or create required GL accounts
      const cashAccount = await this.getOrCreateGLAccount(
        "1001",
        "Cash in Till",
        "Asset"
      );
      const momoFloatAccount = await this.getOrCreateGLAccount(
        "1002",
        "MoMo Float Account",
        "Asset"
      );
      const feeRevenueAccount = await this.getOrCreateGLAccount(
        "4001",
        "MoMo Fee Revenue",
        "Revenue"
      );

      if (!cashAccount || !momoFloatAccount || !feeRevenueAccount) {
        throw new Error("Failed to get or create required GL accounts");
      }

      console.log("✅ [GL] GL accounts ready:", {
        cash: cashAccount.code,
        momoFloat: momoFloatAccount.code,
        feeRevenue: feeRevenueAccount.code,
      });

      const entries: GLEntry[] = [];

      // Main transaction entries
      if (params.type === "cash-in") {
        // Customer gives cash, we give them MoMo credit
        // Dr. Cash in Till, Cr. MoMo Float
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: params.amount,
          credit: 0,
          description: `MoMo Cash-In - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        });

        entries.push({
          accountId: momoFloatAccount.id,
          accountCode: momoFloatAccount.code,
          debit: 0,
          credit: params.amount,
          description: `MoMo Cash-In - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        });
      } else if (params.type === "cash-out") {
        // Customer withdraws cash, we debit their MoMo balance
        // Dr. MoMo Float, Cr. Cash in Till
        entries.push({
          accountId: momoFloatAccount.id,
          accountCode: momoFloatAccount.code,
          debit: params.amount,
          credit: 0,
          description: `MoMo Cash-Out - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        });

        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: 0,
          credit: params.amount,
          description: `MoMo Cash-Out - ${params.provider} - ${params.phoneNumber}`,
          metadata: {
            transactionId: params.transactionId,
            provider: params.provider,
            phoneNumber: params.phoneNumber,
            customerName: params.customerName,
          },
        });
      }

      // Fee entries
      if (params.fee > 0) {
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: params.fee,
          credit: 0,
          description: `MoMo Transaction Fee - ${params.provider}`,
          metadata: {
            transactionId: params.transactionId,
            feeAmount: params.fee,
            provider: params.provider,
          },
        });

        entries.push({
          accountId: feeRevenueAccount.id,
          accountCode: feeRevenueAccount.code,
          debit: 0,
          credit: params.fee,
          description: `MoMo Fee Revenue - ${params.provider}`,
          metadata: {
            transactionId: params.transactionId,
            feeAmount: params.fee,
            provider: params.provider,
          },
        });
      }

      console.log(`✅ [GL] Created ${entries.length} GL entries`);

      // Validate entries balance
      const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredits = entries.reduce(
        (sum, entry) => sum + entry.credit,
        0
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          `GL entries don't balance: Debits ${totalDebits}, Credits ${totalCredits}`
        );
      }

      console.log("✅ [GL] Entries balanced:", { totalDebits, totalCredits });

      const glTransactionData: GLTransactionData = {
        date: new Date().toISOString().split("T")[0],
        sourceModule: "momo",
        sourceTransactionId: params.transactionId,
        sourceTransactionType: params.type,
        description: `MoMo ${params.type} - ${params.provider} - ${params.phoneNumber}`,
        entries,
        createdBy: params.processedBy,
        branchId: params.branchId,
        branchName: params.branchName,
        metadata: {
          provider: params.provider,
          phoneNumber: params.phoneNumber,
          customerName: params.customerName,
          reference: params.reference,
          amount: params.amount,
          fee: params.fee,
        },
      };

      return await this.createAndPostTransaction(glTransactionData, true);
    } catch (error) {
      console.error("❌ [GL] Error creating MoMo GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async createEZwichGLEntries(params: {
    transactionId: string;
    type: "withdrawal" | "card_issuance";
    amount: number;
    fee: number;
    cardNumber: string;
    customerName: string;
    processedBy: string;
    branchId: string;
  }): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      const cashAccount = await this.getOrCreateGLAccount(
        "1001",
        "Cash",
        "Asset"
      );
      const ezwichSettlementAccount = await this.getOrCreateGLAccount(
        "1005",
        "E-Zwich Settlement",
        "Asset"
      );
      const feeRevenueAccount = await this.getOrCreateGLAccount(
        "4003",
        "Transaction Fee Income",
        "Revenue"
      );

      if (!cashAccount || !ezwichSettlementAccount || !feeRevenueAccount) {
        throw new Error("Failed to get or create required GL accounts");
      }

      const entries: GLEntry[] = [];

      if (params.type === "withdrawal") {
        // E-Zwich withdrawal: Debit E-Zwich Settlement, Credit Cash
        entries.push({
          accountId: ezwichSettlementAccount.id,
          accountCode: ezwichSettlementAccount.code,
          debit: params.amount,
          credit: 0,
          description: `E-Zwich withdrawal - ${params.customerName} - ${params.cardNumber}`,
          metadata: {
            transactionId: params.transactionId,
            cardNumber: params.cardNumber,
          },
        });

        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: 0,
          credit: params.amount,
          description: `E-Zwich withdrawal - ${params.customerName} - ${params.cardNumber}`,
          metadata: {
            transactionId: params.transactionId,
            cardNumber: params.cardNumber,
          },
        });

        // Fee entry if applicable
        if (params.fee > 0) {
          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: params.fee,
            credit: 0,
            description: `E-Zwich withdrawal fee - ${params.customerName}`,
            metadata: {
              transactionId: params.transactionId,
              feeAmount: params.fee,
            },
          });

          entries.push({
            accountId: feeRevenueAccount.id,
            accountCode: feeRevenueAccount.code,
            debit: 0,
            credit: params.fee,
            description: `E-Zwich withdrawal fee revenue - ${params.customerName}`,
            metadata: {
              transactionId: params.transactionId,
              feeAmount: params.fee,
            },
          });
        }
      } else if (params.type === "card_issuance") {
        // E-Zwich card issuance: Debit Cash, Credit Fee Revenue
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: params.fee,
          credit: 0,
          description: `E-Zwich card issuance fee - ${params.customerName} - ${params.cardNumber}`,
          metadata: {
            transactionId: params.transactionId,
            cardNumber: params.cardNumber,
          },
        });

        entries.push({
          accountId: feeRevenueAccount.id,
          accountCode: feeRevenueAccount.code,
          debit: 0,
          credit: params.fee,
          description: `E-Zwich card issuance fee revenue - ${params.customerName}`,
          metadata: {
            transactionId: params.transactionId,
            cardNumber: params.cardNumber,
          },
        });
      }

      const glTransactionData: GLTransactionData = {
        date: new Date().toISOString().split("T")[0],
        sourceModule: "e-zwich",
        sourceTransactionId: params.transactionId,
        sourceTransactionType: params.type,
        description: `E-Zwich ${params.type} - ${params.customerName} - ${params.cardNumber}`,
        entries,
        createdBy: params.processedBy,
        branchId: params.branchId,
        metadata: {
          transactionId: params.transactionId,
          cardNumber: params.cardNumber,
          customerName: params.customerName,
          amount: params.amount,
          fee: params.fee,
        },
      };

      return await this.createAndPostTransaction(glTransactionData, true);
    } catch (error) {
      console.error("Error creating E-Zwich GL entries:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
