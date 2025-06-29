import { auditLogger } from "@/lib/services/audit-logger-service"
import { createPowerSaleGLEntries, createPowerPurchaseGLEntries } from "@/lib/services/power-gl-service"
import {
  createJumiaPODCollectionGLEntries,
  createJumiaSettlementGLEntries,
  createJumiaPackageReceiptGLEntries,
} from "@/lib/services/jumia-gl-service"

export interface TransactionContext {
  userId: string
  branchId: string
  userAgent?: string
  ipAddress?: string
}

export interface PowerTransactionData {
  transactionId: string
  type: "sale" | "purchase"
  amount: number
  provider: "ecg" | "nedco"
  meterNumber?: string
  customerName?: string
  reference: string
}

export interface JumiaTransactionData {
  transactionId: string
  type: "package_receipt" | "pod_collection" | "settlement"
  amount: number
  trackingId?: string
  customerName?: string
  settlementReference?: string
}

export class TransactionService {
  /**
   * Process Power Transaction with GL and Audit
   */
  static async processPowerTransaction(
    data: PowerTransactionData,
    context: TransactionContext,
  ): Promise<{ success: boolean; glEntry?: any; error?: string }> {
    try {
      console.log(`🔄 Processing power ${data.type} transaction:`, data.transactionId)

      // 1. Create GL Entries
      let glEntry
      if (data.type === "sale") {
        glEntry = await createPowerSaleGLEntries(
          data.transactionId,
          data.amount,
          data.provider,
          data.meterNumber || "",
          data.customerName || "Walk-in Customer",
          context.branchId,
          context.userId,
          context.userId,
        )
      } else if (data.type === "purchase") {
        glEntry = await createPowerPurchaseGLEntries(
          data.transactionId,
          data.amount,
          data.provider,
          context.branchId,
          context.userId,
          context.userId,
        )
      }

      // 2. Log Audit Event
      await auditLogger.log({
        action: `power_${data.type}_completed`,
        entity_type: "power_transaction",
        entity_id: data.transactionId,
        user_id: context.userId,
        branch_id: context.branchId,
        description: `Power ${data.type} transaction completed successfully`,
        details: {
          transaction_type: data.type,
          amount: data.amount,
          provider: data.provider,
          meter_number: data.meterNumber,
          customer_name: data.customerName,
          reference: data.reference,
          gl_posted: !!glEntry,
        },
        severity: data.amount > 1000 ? "medium" : "low",
      })

      console.log(`✅ Power ${data.type} transaction processed successfully`)
      return { success: true, glEntry }
    } catch (error) {
      console.error(`❌ Error processing power ${data.type} transaction:`, error)

      // Log audit error
      await auditLogger.log({
        action: `power_${data.type}_failed`,
        entity_type: "power_transaction",
        entity_id: data.transactionId,
        user_id: context.userId,
        branch_id: context.branchId,
        description: `Power ${data.type} transaction failed`,
        details: {
          transaction_type: data.type,
          amount: data.amount,
          provider: data.provider,
          error: error instanceof Error ? error.message : String(error),
        },
        severity: "high",
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Process Jumia Transaction with GL and Audit
   */
  static async processJumiaTransaction(
    data: JumiaTransactionData,
    context: TransactionContext,
  ): Promise<{ success: boolean; glEntry?: any; error?: string }> {
    try {
      console.log(`🔄 Processing Jumia ${data.type} transaction:`, data.transactionId)

      // 1. Create GL Entries based on type
      let glEntry
      if (data.type === "package_receipt") {
        glEntry = await createJumiaPackageReceiptGLEntries(
          data.transactionId,
          data.trackingId || "",
          data.customerName || "Unknown Customer",
          context.branchId,
          context.userId,
          context.userId,
        )
      } else if (data.type === "pod_collection") {
        glEntry = await createJumiaPODCollectionGLEntries(
          data.transactionId,
          data.amount,
          data.trackingId || "",
          data.customerName || "Unknown Customer",
          context.branchId,
          context.userId,
          context.userId,
        )
      } else if (data.type === "settlement") {
        glEntry = await createJumiaSettlementGLEntries(
          data.transactionId,
          data.amount,
          data.settlementReference || data.transactionId,
          context.branchId,
          context.userId,
          context.userId,
        )
      }

      // 2. Log Audit Event
      await auditLogger.log({
        action: `jumia_${data.type}_completed`,
        entity_type: "jumia_transaction",
        entity_id: data.transactionId,
        user_id: context.userId,
        branch_id: context.branchId,
        description: `Jumia ${data.type} transaction completed successfully`,
        details: {
          transaction_type: data.type,
          amount: data.amount,
          tracking_id: data.trackingId,
          customer_name: data.customerName,
          settlement_reference: data.settlementReference,
          gl_posted: !!glEntry,
        },
        severity: data.amount > 1000 ? "medium" : "low",
      })

      console.log(`✅ Jumia ${data.type} transaction processed successfully`)
      return { success: true, glEntry }
    } catch (error) {
      console.error(`❌ Error processing Jumia ${data.type} transaction:`, error)

      // Log audit error
      await auditLogger.log({
        action: `jumia_${data.type}_failed`,
        entity_type: "jumia_transaction",
        entity_id: data.transactionId,
        user_id: context.userId,
        branch_id: context.branchId,
        description: `Jumia ${data.type} transaction failed`,
        details: {
          transaction_type: data.type,
          amount: data.amount,
          tracking_id: data.trackingId,
          error: error instanceof Error ? error.message : String(error),
        },
        severity: "high",
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Log transaction reversal
   */
  static async logTransactionReversal(
    originalTransactionId: string,
    reversalTransactionId: string,
    amount: number,
    reason: string,
    context: TransactionContext,
  ): Promise<void> {
    await auditLogger.log({
      action: "transaction_reversed",
      entity_type: "transaction_reversal",
      entity_id: reversalTransactionId,
      user_id: context.userId,
      branch_id: context.branchId,
      description: `Transaction ${originalTransactionId} reversed`,
      details: {
        original_transaction_id: originalTransactionId,
        reversal_transaction_id: reversalTransactionId,
        amount: amount,
        reason: reason,
      },
      severity: "high",
    })
  }
}
