// lib/services/gl-posting-service-corrected.ts

import type { GLEntry, GLTransactionData } from "../../types/gl"

export class GLPostingService {
  // Placeholder for getOrCreateGLAccount and createAndPostTransaction methods
  // These would typically interact with a database or other data source.

  static async getOrCreateGLAccount(
    code: string,
    name: string,
    type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense",
  ): Promise<{ id: string; code: string; name: string } | null> {
    // In a real implementation, this would check if the GL account exists
    // and create it if it doesn't.  For this example, we just return a mock object.
    return { id: `gl-account-${code}`, code, name }
  }

  static async createAndPostTransaction(
    glTransactionData: GLTransactionData,
    skipPosting = false,
  ): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    // In a real implementation, this would create a GL transaction and post it.
    // For this example, we just return a mock success response.
    console.log("GL Transaction Data:", glTransactionData) // Simulate logging
    return { success: true, glTransactionId: "mock-gl-transaction-id" }
  }

  static async createEZwichGLEntries(params: {
    transactionId: string
    type: "withdrawal" | "card_issuance"
    amount: number
    fee: number
    cardNumber: string
    customerName: string
    processedBy: string
    branchId: string
  }): Promise<{ success: boolean; glTransactionId?: string; error?: string }> {
    try {
      const cashAccount = await this.getOrCreateGLAccount("1001", "Cash", "Asset")
      const ezwichSettlementAccount = await this.getOrCreateGLAccount("1005", "E-Zwich Settlement", "Asset")
      const feeRevenueAccount = await this.getOrCreateGLAccount("4003", "Transaction Fee Income", "Revenue")

      if (!cashAccount || !ezwichSettlementAccount || !feeRevenueAccount) {
        throw new Error("Failed to get or create required GL accounts")
      }

      const entries: GLEntry[] = []

      if (params.type === "withdrawal") {
        // E-Zwich withdrawal: Debit E-Zwich Settlement, Credit Cash
        entries.push({
          accountId: ezwichSettlementAccount.id,
          accountCode: ezwichSettlementAccount.code,
          debit: params.amount,
          credit: 0,
          description: `E-Zwich withdrawal - ${params.customerName} - ${params.cardNumber}`,
          metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
        })

        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: 0,
          credit: params.amount,
          description: `E-Zwich withdrawal - ${params.customerName} - ${params.cardNumber}`,
          metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
        })

        // Fee entry if applicable
        if (params.fee > 0) {
          entries.push({
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            debit: params.fee,
            credit: 0,
            description: `E-Zwich withdrawal fee - ${params.customerName}`,
            metadata: { transactionId: params.transactionId, feeAmount: params.fee },
          })

          entries.push({
            accountId: feeRevenueAccount.id,
            accountCode: feeRevenueAccount.code,
            debit: 0,
            credit: params.fee,
            description: `E-Zwich withdrawal fee revenue - ${params.customerName}`,
            metadata: { transactionId: params.transactionId, feeAmount: params.fee },
          })
        }
      } else if (params.type === "card_issuance") {
        // E-Zwich card issuance: Debit Cash, Credit Fee Revenue
        entries.push({
          accountId: cashAccount.id,
          accountCode: cashAccount.code,
          debit: params.fee,
          credit: 0,
          description: `E-Zwich card issuance fee - ${params.customerName} - ${params.cardNumber}`,
          metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
        })

        entries.push({
          accountId: feeRevenueAccount.id,
          accountCode: feeRevenueAccount.code,
          debit: 0,
          credit: params.fee,
          description: `E-Zwich card issuance fee revenue - ${params.customerName}`,
          metadata: { transactionId: params.transactionId, cardNumber: params.cardNumber },
        })
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
      }

      return await this.createAndPostTransaction(glTransactionData, true)
    } catch (error) {
      console.error("Error creating E-Zwich GL entries:", error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}
