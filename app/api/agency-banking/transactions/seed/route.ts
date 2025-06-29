import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { readJsonFile } from "@/lib/file-utils"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_banking_transactions'
      ) as exists
    `

    if (!tableExists[0]?.exists) {
      return NextResponse.json({ error: "agency_banking_transactions table does not exist" }, { status: 400 })
    }

    // Read sample data
    const data = await readJsonFile("data/agency-banking-transactions.json")
    const transactions = data.transactions || []

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No sample transactions found" }, { status: 400 })
    }

    // Clear existing data
    await sql`DELETE FROM agency_banking_transactions`

    // Insert sample transactions
    let insertedCount = 0
    for (const tx of transactions) {
      try {
        await sql`
          INSERT INTO agency_banking_transactions (
            type,
            amount,
            fee,
            customer_name,
            account_number,
            partner_bank,
            partner_bank_code,
            float_account_id,
            reference,
            branch_id,
            user_id,
            status,
            date,
            created_at
          ) VALUES (
            ${tx.type},
            ${tx.amount},
            ${tx.fee},
            ${tx.customerName},
            ${tx.accountNumber},
            ${tx.partnerBank},
            ${tx.partnerBankCode},
            ${tx.partnerBankId},
            ${tx.reference},
            ${tx.branchId},
            ${tx.userId},
            ${tx.status},
            ${tx.date},
            ${tx.createdAt}
          )
        `
        insertedCount++
      } catch (error) {
        console.error(`Error inserting transaction ${tx.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedCount} agency banking transactions`,
      insertedCount,
    })
  } catch (error) {
    console.error("Error seeding agency banking transactions:", error)
    return NextResponse.json(
      { error: "Failed to seed transactions", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
