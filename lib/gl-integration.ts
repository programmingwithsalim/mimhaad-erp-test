import type { GLTransaction, GLTransactionEntry } from "../types/gl"
import { GLDatabase } from "./gl-database"

export async function createGLEntriesForMoMoTransaction(transactionData: {
  id: string // This should be the actual transaction ID
  type: "cash-in" | "cash-out"
  amount: number
  fee: number
  phoneNumber: string
  customerName: string
  reference: string
  provider: string
  date: string
  processedBy: string
}): Promise<void> {
  try {
    console.log("Creating GL entries for MoMo transaction:", transactionData.id)

    // Check if GL entries already exist for this transaction
    const existingEntries = await GLDatabase.getGLTransactionsBySourceId(transactionData.id)
    if (existingEntries.length > 0) {
      console.log(`GL entries already exist for transaction ${transactionData.id}`)
      return
    }

    // Get the required GL accounts by code and extract their UUIDs
    const debitAccount = await GLDatabase.getGLAccountByCode("1001") // Cash account
    const creditAccount = await GLDatabase.getGLAccountByCode("2001") // Customer Liability account
    const feeRevenueAccount = await GLDatabase.getGLAccountByCode("4001") // MoMo Commission Revenue

    if (!debitAccount || !creditAccount || !feeRevenueAccount) {
      console.error("Required GL accounts not found:", {
        debitAccount: debitAccount?.code,
        creditAccount: creditAccount?.code,
        feeRevenueAccount: feeRevenueAccount?.code,
      })
      throw new Error("Required GL accounts not found")
    }

    console.log(
      `Found GL accounts - Debit: ${debitAccount.code} (${debitAccount.id}), Credit: ${creditAccount.code} (${creditAccount.id})`,
    )

    // Create journal entries with proper UUID account IDs
    const entries: GLTransactionEntry[] = []

    if (transactionData.type === "cash-in") {
      // Cash In: Debit Cash, Credit Customer Liability
      entries.push({
        accountId: debitAccount.id, // Use actual UUID
        accountCode: debitAccount.code,
        debit: transactionData.amount,
        credit: 0,
        description: `MoMo Cash In - ${transactionData.provider} - ${transactionData.phoneNumber}`,
        metadata: {
          transactionId: transactionData.id,
          provider: transactionData.provider,
          phoneNumber: transactionData.phoneNumber,
          customerName: transactionData.customerName,
          reference: transactionData.reference,
        },
      })

      entries.push({
        accountId: creditAccount.id, // Use actual UUID
        accountCode: creditAccount.code,
        debit: 0,
        credit: transactionData.amount,
        description: `MoMo Cash In - ${transactionData.provider} - ${transactionData.phoneNumber}`,
        metadata: {
          transactionId: transactionData.id,
          provider: transactionData.provider,
          phoneNumber: transactionData.phoneNumber,
          customerName: transactionData.customerName,
          reference: transactionData.reference,
        },
      })
    } else {
      // Cash Out: Debit Customer Liability, Credit Cash
      entries.push({
        accountId: creditAccount.id, // Use actual UUID
        accountCode: creditAccount.code,
        debit: transactionData.amount,
        credit: 0,
        description: `MoMo Cash Out - ${transactionData.provider} - ${transactionData.phoneNumber}`,
        metadata: {
          transactionId: transactionData.id,
          provider: transactionData.provider,
          phoneNumber: transactionData.phoneNumber,
          customerName: transactionData.customerName,
          reference: transactionData.reference,
        },
      })

      entries.push({
        accountId: debitAccount.id, // Use actual UUID
        accountCode: debitAccount.code,
        debit: 0,
        credit: transactionData.amount,
        description: `MoMo Cash Out - ${transactionData.provider} - ${transactionData.phoneNumber}`,
        metadata: {
          transactionId: transactionData.id,
          provider: transactionData.provider,
          phoneNumber: transactionData.phoneNumber,
          customerName: transactionData.customerName,
          reference: transactionData.reference,
        },
      })
    }

    console.log(`Created ${entries.length} main GL entries`)

    // Add fee entries if there's a fee
    if (transactionData.fee > 0) {
      console.log(`Adding fee entries for amount: ${transactionData.fee}`)

      // Debit Cash for fee (we collect the fee)
      entries.push({
        accountId: debitAccount.id, // Use actual UUID
        accountCode: debitAccount.code,
        debit: transactionData.fee,
        credit: 0,
        description: `MoMo Transaction Fee - ${transactionData.provider} - ${transactionData.phoneNumber}`,
        metadata: {
          transactionId: transactionData.id,
          provider: transactionData.provider,
          phoneNumber: transactionData.phoneNumber,
          customerName: transactionData.customerName,
          reference: transactionData.reference,
          feeAmount: transactionData.fee,
        },
      })

      // Credit Fee Revenue
      entries.push({
        accountId: feeRevenueAccount.id, // Use actual UUID
        accountCode: feeRevenueAccount.code,
        debit: 0,
        credit: transactionData.fee,
        description: `MoMo Transaction Fee Revenue - ${transactionData.provider} - ${transactionData.phoneNumber}`,
        metadata: {
          transactionId: transactionData.id,
          provider: transactionData.provider,
          phoneNumber: transactionData.phoneNumber,
          customerName: transactionData.customerName,
          reference: transactionData.reference,
          feeAmount: transactionData.fee,
        },
      })

      console.log(`Added fee entries, total entries: ${entries.length}`)
    }

    // Create the GL transaction with proper source transaction ID
    console.log(`Creating GL transaction with ${entries.length} entries`)

    const glTransaction: Omit<GLTransaction, "id" | "createdAt"> = {
      date: transactionData.date,
      sourceModule: "momo",
      sourceTransactionId: transactionData.id, // This is the key fix - use the actual transaction ID
      sourceTransactionType: transactionData.type,
      description: `MoMo ${transactionData.type} transaction - ${transactionData.provider} - ${transactionData.phoneNumber}`,
      entries,
      status: "pending",
      createdBy: transactionData.processedBy,
      metadata: {
        provider: transactionData.provider,
        amount: transactionData.amount,
        fee: transactionData.fee,
        phoneNumber: transactionData.phoneNumber,
        customerName: transactionData.customerName,
        reference: transactionData.reference,
      },
    }

    console.log("GL Transaction data before creation:", {
      sourceTransactionId: glTransaction.sourceTransactionId,
      entriesCount: glTransaction.entries.length,
      accountIds: glTransaction.entries.map((e) => ({ code: e.accountCode, id: e.accountId })),
    })

    const createdTransaction = await GLDatabase.createGLTransaction(glTransaction)

    // Auto-post the transaction
    await GLDatabase.postGLTransaction(createdTransaction.id, transactionData.processedBy)

    console.log(`GL transaction created and posted: ${createdTransaction.id}`)

    // Log the sync
    await GLDatabase.addSyncLogEntry({
      module: "momo",
      operation: "create",
      status: "success",
      details: `Created GL entries for MoMo transaction ${transactionData.id}`,
    })
  } catch (error) {
    console.error("Error creating GL entries for MoMo transaction:", error)

    // Log the error
    await GLDatabase.addSyncLogEntry({
      module: "momo",
      operation: "create",
      status: "failed",
      details: `Failed to create GL entries for MoMo transaction ${transactionData.id}`,
      error: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}
