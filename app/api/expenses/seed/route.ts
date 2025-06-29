import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Seeding sample expense data...")

    // Check if we have branches and users
    const branches = await sql`SELECT id FROM branches LIMIT 1`
    const users = await sql`SELECT id FROM users LIMIT 1`

    if (branches.length === 0) {
      return NextResponse.json(
        { success: false, error: "No branches found. Please create branches first." },
        { status: 400 },
      )
    }

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: "No users found. Please create users first." }, { status: 400 })
    }

    const branchId = branches[0].id
    const userId = users[0].id

    // Get expense heads
    const expenseHeads = await sql`SELECT id, name FROM expense_heads ORDER BY name`

    if (expenseHeads.length === 0) {
      return NextResponse.json(
        { success: false, error: "No expense heads found. Please initialize expense heads first." },
        { status: 400 },
      )
    }

    // Sample expenses data
    const sampleExpenses = [
      {
        reference_number: "EXP-2024-001",
        expense_head: "Office Supplies",
        amount: 250.0,
        description: "Monthly stationery and printing supplies",
        expense_date: "2024-01-15",
        payment_source: "cash",
        status: "pending",
      },
      {
        reference_number: "EXP-2024-002",
        expense_head: "Utilities",
        amount: 450.0,
        description: "January electricity bill",
        expense_date: "2024-01-20",
        payment_source: "bank_transfer",
        status: "approved",
      },
      {
        reference_number: "EXP-2024-003",
        expense_head: "Power Purchase",
        amount: 5000.0,
        description: "Bulk electricity credit purchase",
        expense_date: "2024-01-25",
        payment_source: "bank_transfer",
        status: "paid",
      },
      {
        reference_number: "EXP-2024-004",
        expense_head: "Marketing",
        amount: 800.0,
        description: "Social media advertising campaign",
        expense_date: "2024-02-01",
        payment_source: "mobile_money",
        status: "pending",
      },
      {
        reference_number: "EXP-2024-005",
        expense_head: "Travel & Transport",
        amount: 150.0,
        description: "Fuel for branch visits",
        expense_date: "2024-02-05",
        payment_source: "cash",
        status: "approved",
      },
      {
        reference_number: "EXP-2024-006",
        expense_head: "Equipment Maintenance",
        amount: 300.0,
        description: "POS terminal repair and maintenance",
        expense_date: "2024-02-10",
        payment_source: "bank_transfer",
        status: "rejected",
      },
    ]

    let insertedCount = 0

    for (const expense of sampleExpenses) {
      // Find the expense head ID
      const expenseHead = expenseHeads.find((eh) => eh.name === expense.expense_head)
      if (!expenseHead) {
        console.log(`Expense head not found: ${expense.expense_head}`)
        continue
      }

      // Check if expense already exists
      const existing = await sql`
        SELECT id FROM expenses WHERE reference_number = ${expense.reference_number}
      `

      if (existing.length > 0) {
        console.log(`Expense already exists: ${expense.reference_number}`)
        continue
      }

      // Insert the expense
      await sql`
        INSERT INTO expenses (
          reference_number, branch_id, expense_head_id, amount, description,
          expense_date, payment_source, status, created_by
        ) VALUES (
          ${expense.reference_number},
          ${branchId},
          ${expenseHead.id},
          ${expense.amount},
          ${expense.description},
          ${expense.expense_date},
          ${expense.payment_source},
          ${expense.status},
          ${userId}
        )
      `

      insertedCount++
      console.log(`Inserted expense: ${expense.reference_number}`)
    }

    // Update approved and paid expenses with workflow data
    await sql`
      UPDATE expenses 
      SET approved_by = created_by, approved_at = CURRENT_TIMESTAMP 
      WHERE status IN ('approved', 'paid') AND approved_by IS NULL
    `

    await sql`
      UPDATE expenses 
      SET paid_by = created_by, paid_at = CURRENT_TIMESTAMP 
      WHERE status = 'paid' AND paid_by IS NULL
    `

    console.log("Sample expense data seeded successfully!")

    return NextResponse.json({
      success: true,
      message: "Sample expense data seeded successfully",
      inserted_count: insertedCount,
      total_expenses: sampleExpenses.length,
    })
  } catch (error) {
    console.error("Error seeding expense data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed expense data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
