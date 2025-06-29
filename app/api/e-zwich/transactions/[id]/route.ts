import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { GLPostingService } from "@/lib/services/gl-posting-service-corrected"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const updates = await request.json()

    // Get the original transaction
    const originalTx = await sql`
      SELECT * FROM ezwich_transactions WHERE id = ${id}
    `

    if (originalTx.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const original = originalTx[0]
    const amountDiff = Number(updates.transaction_amount) - Number(original.transaction_amount)
    const feeDiff = Number(updates.fee_amount || 0) - Number(original.fee_amount || 0)

    // Update the transaction
    await sql`
      UPDATE ezwich_transactions 
      SET 
        customer_name = ${updates.customer_name || original.customer_name},
        customer_phone = ${updates.customer_phone || original.customer_phone},
        transaction_amount = ${updates.transaction_amount || original.transaction_amount},
        fee_amount = ${updates.fee_amount || original.fee_amount},
        notes = ${updates.notes || original.notes},
        updated_at = NOW()
      WHERE id = ${id}
    `

    // Update float account balance if amount changed (for withdrawals)
    if (amountDiff !== 0 && original.transaction_type === "withdrawal") {
      // For withdrawals, we need to adjust the E-Zwich settlement account
      if (original.ezwich_settlement_account_id) {
        await sql`
          UPDATE float_accounts 
          SET current_balance = current_balance - ${amountDiff}
          WHERE id = ${original.ezwich_settlement_account_id}
        `
      }
    }

    // Create GL reversal and new entries if amounts changed
    if (amountDiff !== 0 || feeDiff !== 0) {
      try {
        const cashAccount = await sql`SELECT id, code FROM gl_accounts WHERE code = '1001' LIMIT 1`
        const ezwichAccount = await sql`SELECT id, code FROM gl_accounts WHERE code = '2300' LIMIT 1`
        const feeRevenueAccount = await sql`SELECT id, code FROM gl_accounts WHERE code = '4004' LIMIT 1`

        if (cashAccount.length > 0 && ezwichAccount.length > 0) {
          // Create reversal entries
          const reversalEntries = []

          if (original.transaction_type === "withdrawal") {
            // Reverse: Debit E-Zwich liability, Credit cash
            reversalEntries.push({
              accountId: ezwichAccount[0].id,
              accountCode: ezwichAccount[0].code,
              debit: Number(original.transaction_amount),
              credit: 0,
              description: `Reversal - E-Zwich Withdrawal - ${original.card_number}`,
              metadata: { originalTransactionId: id, reversalReason: "edit" },
            })
            reversalEntries.push({
              accountId: cashAccount[0].id,
              accountCode: cashAccount[0].code,
              debit: 0,
              credit: Number(original.transaction_amount),
              description: `Reversal - E-Zwich Withdrawal - ${original.card_number}`,
              metadata: { originalTransactionId: id, reversalReason: "edit" },
            })
          } else if (original.transaction_type === "card_issuance") {
            // Reverse card issuance fee
            reversalEntries.push({
              accountId: feeRevenueAccount[0].id,
              accountCode: feeRevenueAccount[0].code,
              debit: Number(original.transaction_amount),
              credit: 0,
              description: `Reversal - E-Zwich Card Issuance Fee`,
              metadata: { originalTransactionId: id, reversalReason: "edit" },
            })
            reversalEntries.push({
              accountId: cashAccount[0].id,
              accountCode: cashAccount[0].code,
              debit: 0,
              credit: Number(original.transaction_amount),
              description: `Reversal - E-Zwich Card Issuance Fee`,
              metadata: { originalTransactionId: id, reversalReason: "edit" },
            })
          }

          // Reverse fee entries if applicable
          if (Number(original.fee_amount) > 0 && feeRevenueAccount.length > 0) {
            reversalEntries.push({
              accountId: feeRevenueAccount[0].id,
              accountCode: feeRevenueAccount[0].code,
              debit: Number(original.fee_amount),
              credit: 0,
              description: `Reversal - E-Zwich Fee`,
              metadata: { originalTransactionId: id, reversalReason: "edit" },
            })
            reversalEntries.push({
              accountId: cashAccount[0].id,
              accountCode: cashAccount[0].code,
              debit: 0,
              credit: Number(original.fee_amount),
              description: `Reversal - E-Zwich Fee`,
              metadata: { originalTransactionId: id, reversalReason: "edit" },
            })
          }

          // Post reversal entries using the correct method
          if (reversalEntries.length > 0) {
            await GLPostingService.createJournalEntry({
              date: new Date().toISOString().split("T")[0],
              sourceModule: "e_zwich",
              sourceTransactionId: `${id}-reversal-${Date.now()}`,
              sourceTransactionType: "reversal",
              description: `Reversal for edit - E-Zwich ${original.transaction_type}`,
              entries: reversalEntries,
              createdBy: updates.updated_by || "system",
              branchId: original.branch_id,
              metadata: { originalTransactionId: id, reason: "edit" },
            })
          }

          // Create new GL entries with updated amounts
          const newEntries = []

          if (original.transaction_type === "withdrawal") {
            newEntries.push({
              accountId: cashAccount[0].id,
              accountCode: cashAccount[0].code,
              debit: Number(updates.transaction_amount),
              credit: 0,
              description: `Updated - E-Zwich Withdrawal - ${original.card_number}`,
              metadata: { originalTransactionId: id, updateReason: "edit" },
            })
            newEntries.push({
              accountId: ezwichAccount[0].id,
              accountCode: ezwichAccount[0].code,
              debit: 0,
              credit: Number(updates.transaction_amount),
              description: `Updated - E-Zwich Withdrawal - ${original.card_number}`,
              metadata: { originalTransactionId: id, updateReason: "edit" },
            })
          } else if (original.transaction_type === "card_issuance") {
            newEntries.push({
              accountId: cashAccount[0].id,
              accountCode: cashAccount[0].code,
              debit: Number(updates.transaction_amount),
              credit: 0,
              description: `Updated - E-Zwich Card Issuance Fee`,
              metadata: { originalTransactionId: id, updateReason: "edit" },
            })
            newEntries.push({
              accountId: feeRevenueAccount[0].id,
              accountCode: feeRevenueAccount[0].code,
              debit: 0,
              credit: Number(updates.transaction_amount),
              description: `Updated - E-Zwich Card Issuance Fee`,
              metadata: { originalTransactionId: id, updateReason: "edit" },
            })
          }

          // New fee entries if applicable
          if (Number(updates.fee_amount || 0) > 0 && feeRevenueAccount.length > 0) {
            newEntries.push({
              accountId: cashAccount[0].id,
              accountCode: cashAccount[0].code,
              debit: Number(updates.fee_amount),
              credit: 0,
              description: `Updated - E-Zwich Fee`,
              metadata: { originalTransactionId: id, updateReason: "edit" },
            })
            newEntries.push({
              accountId: feeRevenueAccount[0].id,
              accountCode: feeRevenueAccount[0].code,
              debit: 0,
              credit: Number(updates.fee_amount),
              description: `Updated - E-Zwich Fee`,
              metadata: { originalTransactionId: id, updateReason: "edit" },
            })
          }

          // Post new entries using the correct method
          if (newEntries.length > 0) {
            await GLPostingService.createJournalEntry({
              date: new Date().toISOString().split("T")[0],
              sourceModule: "e_zwich",
              sourceTransactionId: `${id}-updated-${Date.now()}`,
              sourceTransactionType: original.transaction_type,
              description: `Updated - E-Zwich ${original.transaction_type}`,
              entries: newEntries,
              createdBy: updates.updated_by || "system",
              branchId: original.branch_id,
              metadata: { originalTransactionId: id, reason: "edit" },
            })
          }
        }
      } catch (glError) {
        console.warn("GL posting failed, but transaction update succeeded:", glError)
        // Continue without failing the transaction update
      }
    }

    // Get updated transaction
    const updatedTx = await sql`
      SELECT * FROM ezwich_transactions WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      transaction: updatedTx[0],
    })
  } catch (error) {
    console.error("Error updating E-Zwich transaction:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update transaction" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get the transaction to delete
    const transaction = await sql`
      SELECT * FROM ezwich_transactions WHERE id = ${id}
    `

    if (transaction.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const tx = transaction[0]

    // Reverse the float account balance (for withdrawals)
    if (tx.transaction_type === "withdrawal" && tx.ezwich_settlement_account_id) {
      await sql`
        UPDATE float_accounts 
        SET current_balance = current_balance + ${Number(tx.transaction_amount)}
        WHERE id = ${tx.ezwich_settlement_account_id}
      `
    }

    // Create reversal GL entries
    try {
      const reversalEntries = []
      const cashAccount = await sql`SELECT id, code FROM gl_accounts WHERE code = '1001' LIMIT 1`
      const ezwichAccount = await sql`SELECT id, code FROM gl_accounts WHERE code = '2300' LIMIT 1`
      const feeRevenueAccount = await sql`SELECT id, code FROM gl_accounts WHERE code = '4004' LIMIT 1`

      if (cashAccount.length > 0 && ezwichAccount.length > 0) {
        if (tx.transaction_type === "withdrawal") {
          // Reverse: Debit E-Zwich liability, Credit cash
          reversalEntries.push({
            accountId: ezwichAccount[0].id,
            accountCode: ezwichAccount[0].code,
            debit: Number(tx.transaction_amount),
            credit: 0,
            description: `Deletion Reversal - E-Zwich Withdrawal - ${tx.card_number}`,
            metadata: { deletedTransactionId: id },
          })
          reversalEntries.push({
            accountId: cashAccount[0].id,
            accountCode: cashAccount[0].code,
            debit: 0,
            credit: Number(tx.transaction_amount),
            description: `Deletion Reversal - E-Zwich Withdrawal - ${tx.card_number}`,
            metadata: { deletedTransactionId: id },
          })
        } else if (tx.transaction_type === "card_issuance") {
          // Reverse card issuance fee
          reversalEntries.push({
            accountId: feeRevenueAccount[0].id,
            accountCode: feeRevenueAccount[0].code,
            debit: Number(tx.transaction_amount),
            credit: 0,
            description: `Deletion Reversal - E-Zwich Card Issuance Fee`,
            metadata: { deletedTransactionId: id },
          })
          reversalEntries.push({
            accountId: cashAccount[0].id,
            accountCode: cashAccount[0].code,
            debit: 0,
            credit: Number(tx.transaction_amount),
            description: `Deletion Reversal - E-Zwich Card Issuance Fee`,
            metadata: { deletedTransactionId: id },
          })
        }

        // Reverse fee entries if applicable
        if (Number(tx.fee_amount) > 0 && feeRevenueAccount.length > 0) {
          reversalEntries.push({
            accountId: feeRevenueAccount[0].id,
            accountCode: feeRevenueAccount[0].code,
            debit: Number(tx.fee_amount),
            credit: 0,
            description: `Deletion Reversal - E-Zwich Fee`,
            metadata: { deletedTransactionId: id },
          })
          reversalEntries.push({
            accountId: cashAccount[0].id,
            accountCode: cashAccount[0].code,
            debit: 0,
            credit: Number(tx.fee_amount),
            description: `Deletion Reversal - E-Zwich Fee`,
            metadata: { deletedTransactionId: id },
          })
        }

        // Post reversal entries using the correct method
        if (reversalEntries.length > 0) {
          await GLPostingService.createJournalEntry({
            date: new Date().toISOString().split("T")[0],
            sourceModule: "e_zwich",
            sourceTransactionId: `${id}-deletion-${Date.now()}`,
            sourceTransactionType: "deletion_reversal",
            description: `Deletion Reversal - E-Zwich ${tx.transaction_type}`,
            entries: reversalEntries,
            createdBy: "system",
            branchId: tx.branch_id,
            metadata: { deletedTransactionId: id },
          })
        }
      }
    } catch (glError) {
      console.warn("GL posting failed, but transaction deletion will proceed:", glError)
      // Continue without failing the transaction deletion
    }

    // Delete the transaction
    await sql`
      DELETE FROM ezwich_transactions WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      message: "Transaction deleted and float balance restored",
    })
  } catch (error) {
    console.error("Error deleting E-Zwich transaction:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete transaction" },
      { status: 500 },
    )
  }
}
