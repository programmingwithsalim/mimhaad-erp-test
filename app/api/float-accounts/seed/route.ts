import { NextResponse } from "next/server"
import { seedFloatAccounts } from "@/lib/seed-float-accounts"

export async function POST() {
  try {
    await seedFloatAccounts()
    return NextResponse.json({ success: true, message: "Float accounts seeded successfully" })
  } catch (error) {
    console.error("Error seeding float accounts:", error)
    return NextResponse.json({ success: false, error: "Failed to seed float accounts" }, { status: 500 })
  }
}
