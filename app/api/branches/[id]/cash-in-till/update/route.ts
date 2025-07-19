"use server"

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string  }> }) {
  try {
    const { id: branchId } = params
    const { amount, description, userId } = await request.json()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(branchId)) {
      return NextResponse.json({ success: false, error: "Invalid branch ID format" }, { status: 400 })
    }

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ success: false, error: "Valid amount is required" }, { status: 400 })
    }

    // Get or create cash in till account
    let cashTill = await sql`
      SELECT * FROM float_accounts 
      WHERE branch_id = ${branchId} 
      AND account_type = 'cash-in-till' 
      AND is_active = true
      LIMIT 1
    `

    if (cashTill.length === 0) {
      // Create cash in till account
      cashTill = await sql`
        INSERT INTO float_accounts (
          branch_id,
          account_name,
          account_type,
          provider,
          current_balance,
          min_threshold,
          max_threshold,
          is_active
        ) VALUES (
          ${branchId},
          'Cash in Till',
          'cash-in-till',
          'Cash',
          ${Number(amount)},
          1000,
          50000,
          true
        )
        RETURNING *
      `
    } else {
      // Update existing cash in till
      const newBalance = Number(cashTill[0].current_balance) + Number(amount)

      cashTill = await sql`
        UPDATE float_accounts 
        SET 
          current_balance = ${newBalance},
          updated_at = NOW()
        WHERE id = ${cashTill[0].id}
        RETURNING *
      `
    }

    // Log the transaction
    await sql`
      INSERT INTO cash_transactions (
        branch_id,
        user_id,
        amount,
        transaction_type,
        description,
        balance_after
      ) VALUES (
        ${branchId},
        ${userId || "system"},
        ${Number(amount)},
        ${Number(amount) > 0 ? "credit" : "debit"},
        ${description || "Balance update"},
        ${cashTill[0].current_balance}
      )
    `

    return NextResponse.json({
      success: true,
      cashTill: cashTill[0],
      message: "Cash in till balance updated successfully",
    })
  } catch (error) {
    console.error("Error updating cash in till:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update cash in till balance",
      },
      { status: 500 },
    )
  }
}
