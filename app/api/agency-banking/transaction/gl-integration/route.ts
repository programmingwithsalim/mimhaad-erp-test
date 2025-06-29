import { NextResponse } from "next/server"
import { createAgencyBankingTransaction, completeAgencyBankingTransaction } from "@/lib/agency-banking-service"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Create the transaction
    const transaction = await createAgencyBankingTransaction({
      type: data.transactionType,
      amount: Number.parseFloat(data.amount),
      fee: data.fee ? Number.parseFloat(data.fee) : 0,
      customerName: data.customerName,
      accountNumber: data.accountNumber,
      partnerBank: data.partnerBank,
      partnerBankCode: data.partnerBankCode,
      reference: data.reference,
      branchId: data.branchId,
      userId: data.userId,
      cashTillAffected: data.cashTillAffected || 0,
      floatAffected: data.floatAffected || 0,
      metadata: data.metadata,
    })

    if (!transaction) {
      return NextResponse.json({ error: "Failed to create Agency Banking transaction" }, { status: 500 })
    }

    // Complete the transaction (this will generate GL entries)
    const completedTransaction = await completeAgencyBankingTransaction(transaction.id)

    if (!completedTransaction) {
      return NextResponse.json({ error: "Failed to complete Agency Banking transaction" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Transaction processed successfully with GL entries",
      transaction: completedTransaction,
    })
  } catch (error) {
    console.error("Error processing Agency Banking transaction with GL integration:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Agency Banking transaction" },
      { status: 500 },
    )
  }
}
