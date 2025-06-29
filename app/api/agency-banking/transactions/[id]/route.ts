import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const updates = await request.json()

    // Get the original transaction
    const originalTx = await sql`
      SELECT * FROM agency_banking_transactions WHERE id = ${id}
    `

    if (originalTx.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const original = originalTx[0]

    // Calculate effects for agency banking transactions
    const calculateEffects = (type: string, amount: number, fee = 0) => {
      let cashTillAffected = 0
      let floatAffected = 0

      switch (type) {
        case "deposit":
          // Customer deposits: We gain cash, lose agency float
          cashTillAffected = amount
          floatAffected = -amount
          break
        case "withdrawal":
          // Customer withdraws: We lose cash, gain agency float
          cashTillAffected = -amount
          floatAffected = amount
          break
        case "interbank":
          // Interbank transfer: We gain cash (amount + fee), lose agency float (amount)
          cashTillAffected = amount + fee
          floatAffected = -amount
          break
        case "commission":
          // Commission: We gain cash, no float change
          cashTillAffected = amount
          floatAffected = 0
          break
      }

      return { cashTillAffected, floatAffected }
    }

    // Calculate old and new effects
    const oldEffects = calculateEffects(original.type, Number(original.amount), Number(original.fee || 0))
    const newEffects = calculateEffects(
      updates.type || original.type,
      Number(updates.amount || original.amount),
      Number(updates.fee || original.fee || 0),
    )

    // Calculate the net change needed
    const cashTillChange = newEffects.cashTillAffected - oldEffects.cashTillAffected
    const floatChange = newEffects.floatAffected - oldEffects.floatAffected

    console.log(`💰 Agency Banking Transaction Edit:`)
    console.log(`  Transaction ID: ${id}`)
    console.log(`  Old Effects: Cash=${oldEffects.cashTillAffected}, Float=${oldEffects.floatAffected}`)
    console.log(`  New Effects: Cash=${newEffects.cashTillAffected}, Float=${newEffects.floatAffected}`)
    console.log(`  Net Change: Cash=${cashTillChange}, Float=${floatChange}`)

    // Update cash till balance if there's a change
    if (cashTillChange !== 0) {
      const cashTillAccount = await sql`
        SELECT id, current_balance FROM float_accounts
        WHERE account_type = 'cash-in-till'
        AND branch_id = ${original.branch_id}
        AND is_active = true
        LIMIT 1
      `

      if (cashTillAccount.length > 0) {
        const newCashBalance = Number(cashTillAccount[0].current_balance) + cashTillChange
        await sql`
          UPDATE float_accounts
          SET current_balance = ${newCashBalance},
              updated_at = NOW()
          WHERE id = ${cashTillAccount[0].id}
        `
        console.log(`✅ Updated cash till: ${cashTillAccount[0].current_balance} → ${newCashBalance}`)
      } else {
        console.warn(`⚠️ No cash till account found for branch ${original.branch_id}`)
      }
    }

    // Update partner bank float balance if there's a change
    if (floatChange !== 0) {
      const partnerAccount = await sql`
        SELECT id, current_balance, provider FROM float_accounts
        WHERE id = ${original.partner_bank_id}
      `

      if (partnerAccount.length > 0) {
        const newFloatBalance = Number(partnerAccount[0].current_balance) + floatChange
        await sql`
          UPDATE float_accounts
          SET current_balance = ${newFloatBalance},
              updated_at = NOW()
          WHERE id = ${original.partner_bank_id}
        `
        console.log(
          `✅ Updated ${partnerAccount[0].provider} float: ${partnerAccount[0].current_balance} → ${newFloatBalance}`,
        )
      } else {
        console.warn(`⚠️ No partner bank account found with ID ${original.partner_bank_id}`)
      }
    }

    // Update the transaction record
    await sql`
      UPDATE agency_banking_transactions
      SET
        customer_name = ${updates.customer_name || original.customer_name},
        account_number = ${updates.account_number || original.account_number},
        amount = ${updates.amount || original.amount},
        fee = ${updates.fee || original.fee},
        reference = ${updates.reference || original.reference},
        cash_till_affected = ${newEffects.cashTillAffected},
        float_affected = ${newEffects.floatAffected},
        updated_at = NOW()
      WHERE id = ${id}
    `

    // Get updated transaction
    const updatedTx = await sql`
      SELECT * FROM agency_banking_transactions WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      transaction: updatedTx[0],
      changes: {
        cashTillChange,
        floatChange,
      },
    })
  } catch (error) {
    console.error("Error updating agency banking transaction:", error)
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
      SELECT * FROM agency_banking_transactions WHERE id = ${id}
    `

    if (transaction.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const tx = transaction[0]

    // Calculate reversal effects (opposite of original transaction)
    const calculateReversalEffects = (type: string, amount: number, fee = 0) => {
      let cashTillReversal = 0
      let floatReversal = 0

      switch (type) {
        case "deposit":
          // Reverse deposit: lose cash, gain agency float
          cashTillReversal = -amount
          floatReversal = amount
          break
        case "withdrawal":
          // Reverse withdrawal: gain cash, lose agency float
          cashTillReversal = amount
          floatReversal = -amount
          break
        case "interbank":
          // Reverse interbank: lose cash (amount + fee), gain agency float (amount)
          cashTillReversal = -(amount + fee)
          floatReversal = amount
          break
        case "commission":
          // Reverse commission: lose cash, no float change
          cashTillReversal = -amount
          floatReversal = 0
          break
      }

      return { cashTillReversal, floatReversal }
    }

    const reversalEffects = calculateReversalEffects(tx.type, Number(tx.amount), Number(tx.fee || 0))

    console.log(`🗑️ Agency Banking Transaction Delete:`)
    console.log(`  Transaction ID: ${id}`)
    console.log(`  Type: ${tx.type}`)
    console.log(`  Amount: ${tx.amount}`)
    console.log(`  Fee: ${tx.fee}`)
    console.log(`  Reversal Effects: Cash=${reversalEffects.cashTillReversal}, Float=${reversalEffects.floatReversal}`)

    // Reverse cash till balance
    if (reversalEffects.cashTillReversal !== 0) {
      const cashTillAccount = await sql`
        SELECT id, current_balance FROM float_accounts
        WHERE account_type = 'cash-in-till'
        AND branch_id = ${tx.branch_id}
        AND is_active = true
        LIMIT 1
      `

      if (cashTillAccount.length > 0) {
        const newCashBalance = Number(cashTillAccount[0].current_balance) + reversalEffects.cashTillReversal
        await sql`
          UPDATE float_accounts
          SET current_balance = ${newCashBalance},
              updated_at = NOW()
          WHERE id = ${cashTillAccount[0].id}
        `
        console.log(`✅ Reversed cash till: ${cashTillAccount[0].current_balance} → ${newCashBalance}`)
      }
    }

    // Reverse partner bank float balance
    if (reversalEffects.floatReversal !== 0) {
      const partnerAccount = await sql`
        SELECT id, current_balance, provider FROM float_accounts
        WHERE id = ${tx.partner_bank_id}
      `

      if (partnerAccount.length > 0) {
        const newFloatBalance = Number(partnerAccount[0].current_balance) + reversalEffects.floatReversal
        await sql`
          UPDATE float_accounts
          SET current_balance = ${newFloatBalance},
              updated_at = NOW()
          WHERE id = ${tx.partner_bank_id}
        `
        console.log(
          `✅ Reversed ${partnerAccount[0].provider} float: ${partnerAccount[0].current_balance} → ${newFloatBalance}`,
        )
      }
    }

    // Delete the transaction
    await sql`
      DELETE FROM agency_banking_transactions WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      message: "Transaction deleted and balances restored",
      reversalEffects,
    })
  } catch (error) {
    console.error("Error deleting agency banking transaction:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete transaction" },
      { status: 500 },
    )
  }
}
