import { type NextRequest, NextResponse } from "next/server"
import { checkPermission } from "@/lib/rbac-middleware"

export async function POST(request: NextRequest) {
  try {
    const { permission, transactionAmount } = await request.json()

    const result = await checkPermission(request, permission, transactionAmount)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Permission check API error:", error)
    return NextResponse.json({ authorized: false, reason: "Permission check failed" }, { status: 500 })
  }
}
