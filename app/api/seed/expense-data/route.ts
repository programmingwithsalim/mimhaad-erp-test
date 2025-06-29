import { NextResponse } from "next/server"
import { seedExpenseData } from "@/lib/seed-data"

export async function GET() {
  try {
    const success = await seedExpenseData()

    if (success) {
      return NextResponse.json({ message: "Expense data seeded successfully" })
    } else {
      return NextResponse.json({ error: "Failed to seed expense data" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in GET /api/seed/expense-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
