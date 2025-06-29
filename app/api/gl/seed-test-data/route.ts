import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("=== SEEDING TEST DATA ===")

    const results = {}

    // Add test MoMo transactions
    try {
      const momoResult = await sql`
        INSERT INTO momo_transactions (
          transaction_type, amount, description, reference_number, status, 
          branch_id, user_id, customer_phone, created_at
        ) VALUES 
        ('cash_in', 100.00, 'Test MoMo Cash In', 'MOMO001', 'completed', 
         '1', '1', '0241234567', NOW()),
        ('cash_out', -50.00, 'Test MoMo Cash Out', 'MOMO002', 'completed', 
         '1', '1', '0241234568', NOW()),
        ('transfer', 25.00, 'Test MoMo Transfer', 'MOMO003', 'completed', 
         '1', '1', '0241234569', NOW())
        RETURNING id
      `
      results["momo_transactions"] = { success: true, inserted: momoResult.length }
      console.log("MoMo transactions inserted:", momoResult.length)
    } catch (error) {
      console.log("Error inserting MoMo transactions:", error.message)
      results["momo_transactions"] = { success: false, error: error.message }
    }

    // Add test Agency Banking transactions
    try {
      const agencyResult = await sql`
        INSERT INTO agency_banking_transactions (
          transaction_type, amount, description, reference_number, status,
          branch_id, user_id, customer_account_number, partner_bank_name, created_at
        ) VALUES 
        ('deposit', 200.00, 'Test Agency Deposit', 'AGENCY001', 'completed',
         '1', '1', '1234567890', 'Test Bank', NOW()),
        ('withdrawal', -150.00, 'Test Agency Withdrawal', 'AGENCY002', 'completed',
         '1', '1', '1234567891', 'Test Bank', NOW())
        RETURNING id
      `
      results["agency_banking_transactions"] = { success: true, inserted: agencyResult.length }
      console.log("Agency Banking transactions inserted:", agencyResult.length)
    } catch (error) {
      console.log("Error inserting Agency Banking transactions:", error.message)
      results["agency_banking_transactions"] = { success: false, error: error.message }
    }

    // Add test Expenses
    try {
      const expenseResult = await sql`
        INSERT INTO expenses (
          amount, description, expense_head, status,
          branch_id, user_id, created_at
        ) VALUES 
        (75.00, 'Test Office Supplies', 'Office Supplies', 'approved',
         '1', '1', NOW()),
        (120.00, 'Test Utilities', 'Utilities', 'approved',
         '1', '1', NOW())
        RETURNING id
      `
      results["expenses"] = { success: true, inserted: expenseResult.length }
      console.log("Expenses inserted:", expenseResult.length)
    } catch (error) {
      console.log("Error inserting expenses:", error.message)
      results["expenses"] = { success: false, error: error.message }
    }

    // Add test Commissions
    try {
      const commissionResult = await sql`
        INSERT INTO commissions (
          amount, description, partner_name, status,
          branch_id, user_id, created_at
        ) VALUES 
        (15.00, 'Test MoMo Commission', 'MTN', 'approved',
         '1', '1', NOW()),
        (10.00, 'Test Agency Commission', 'Test Bank', 'approved',
         '1', '1', NOW())
        RETURNING id
      `
      results["commissions"] = { success: true, inserted: commissionResult.length }
      console.log("Commissions inserted:", commissionResult.length)
    } catch (error) {
      console.log("Error inserting commissions:", error.message)
      results["commissions"] = { success: false, error: error.message }
    }

    console.log("=== SEEDING COMPLETE ===")
    console.log("Results:", results)

    return NextResponse.json({
      success: true,
      message: "Test data seeded successfully",
      results,
    })
  } catch (error) {
    console.error("Error seeding test data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 },
    )
  }
}
