import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Check if float_accounts table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'float_accounts'
      );
    `

    if (!tableCheck[0].exists) {
      return NextResponse.json({
        accounts: [],
        message: "Float accounts table not found. Please initialize the database first.",
      })
    }

    // Fetch accounts with correct column names
    const accounts = await sql`
      SELECT 
        id,
        CONCAT(account_type, COALESCE(' - ' || provider, '')) as name,
        account_type as type,
        provider,
        current_balance
      FROM float_accounts 
      WHERE is_active = true
      ORDER BY account_type, provider
    `

    return NextResponse.json({
      accounts: accounts || [],
    })
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return NextResponse.json(
      {
        accounts: [],
        error: error instanceof Error ? error.message : "Failed to fetch accounts",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, description, reference, source, entries } = body

    // Validate required fields
    if (!date || !description || !entries || entries.length < 2) {
      return NextResponse.json(
        { error: "Missing required fields: date, description, and at least 2 entries" },
        { status: 400 },
      )
    }

    // Validate that debits equal credits
    const totalDebits = entries.reduce(
      (sum: number, entry: any) => sum + (entry.type === "debit" ? entry.amount : 0),
      0,
    )
    const totalCredits = entries.reduce(
      (sum: number, entry: any) => sum + (entry.type === "credit" ? entry.amount : 0),
      0,
    )

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({ error: "Total debits must equal total credits" }, { status: 400 })
    }

    // Check if GL tables exist, create if they don't
    await sql`
      CREATE TABLE IF NOT EXISTS gl_transactions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        reference_number VARCHAR(100) UNIQUE,
        source_module VARCHAR(50) DEFAULT 'manual',
        source_transaction_type VARCHAR(50),
        source_transaction_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'posted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS gl_transaction_entries (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES gl_transactions(id),
        account_id VARCHAR(50) NOT NULL,
        description TEXT,
        debit DECIMAL(15,2) DEFAULT 0,
        credit DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Generate reference number if not provided
    const refNumber = reference || `MJE-${Date.now()}`

    // Insert the main transaction
    const transactionResult = await sql`
      INSERT INTO gl_transactions (
        date, description, reference_number, source_module, 
        source_transaction_type, status
      )
      VALUES (
        ${date}, ${description}, ${refNumber}, ${source || "manual"}, 
        'manual_entry', 'posted'
      )
      RETURNING id, reference_number
    `

    const transactionId = transactionResult[0].id

    // Insert transaction entries
    for (const entry of entries) {
      const debit = entry.type === "debit" ? entry.amount : 0
      const credit = entry.type === "credit" ? entry.amount : 0

      await sql`
        INSERT INTO gl_transaction_entries (
          transaction_id, account_id, description, debit, credit
        )
        VALUES (
          ${transactionId}, ${entry.accountId}, ${entry.description || description}, 
          ${debit}, ${credit}
        )
      `
    }

    return NextResponse.json({
      success: true,
      message: "Journal entry saved successfully",
      journalEntry: {
        id: transactionId,
        reference_number: transactionResult[0].reference_number,
      },
    })
  } catch (error) {
    console.error("Error saving journal entry:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save journal entry",
      },
      { status: 500 },
    )
  }
}
