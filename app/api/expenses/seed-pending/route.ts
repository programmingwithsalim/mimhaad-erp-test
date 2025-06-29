import { NextResponse } from "next/server"
import { createExpense } from "@/lib/expense-database-service"

export async function POST() {
  try {
    console.log("Seeding pending expenses...")

    const sampleExpenses = [
      {
        branch_id: "00000000-0000-0000-0000-000000000001",
        expense_head_id: "e8fc7fe7-4f06-4d99-b932-56ee23a047f5",
        amount: 250.0,
        description: "Office supplies for Q1 operations - pens, papers, folders",
        expense_date: "2024-01-15",
        payment_source: "cash",
        payment_account_id: "acc-cash-001",
        created_by: "00000000-0000-0000-0000-000000000001",
      },
      {
        branch_id: "00000000-0000-0000-0000-000000000001",
        expense_head_id: "e8fc7fe7-4f06-4d99-b932-56ee23a047f6",
        amount: 150.75,
        description: "Electricity bill for main office - January 2024",
        expense_date: "2024-01-16",
        payment_source: "momo",
        payment_account_id: "acc-momo-001",
        created_by: "00000000-0000-0000-0000-000000000001",
      },
      {
        branch_id: "00000000-0000-0000-0000-000000000001",
        expense_head_id: "e8fc7fe7-4f06-4d99-b932-56ee23a047f7",
        amount: 500.0,
        description: "Fuel for company vehicle - weekly refill",
        expense_date: "2024-01-17",
        payment_source: "bank",
        payment_account_id: "acc-bank-001",
        created_by: "00000000-0000-0000-0000-000000000001",
      },
      {
        branch_id: "00000000-0000-0000-0000-000000000001",
        expense_head_id: "e8fc7fe7-4f06-4d99-b932-56ee23a047f5",
        amount: 75.5,
        description: "Internet bill for branch office",
        expense_date: "2024-01-18",
        payment_source: "cash",
        payment_account_id: "acc-cash-002",
        created_by: "00000000-0000-0000-0000-000000000001",
      },
    ]

    const createdExpenses = []
    for (const expense of sampleExpenses) {
      const created = await createExpense(expense)
      if (created) {
        createdExpenses.push(created)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdExpenses.length} pending expenses`,
      expenses: createdExpenses,
    })
  } catch (error) {
    console.error("Error seeding pending expenses:", error)
    return NextResponse.json({ success: false, error: "Failed to seed pending expenses" }, { status: 500 })
  }
}
