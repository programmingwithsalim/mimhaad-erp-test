import { type NextRequest, NextResponse } from "next/server"
import { withRBAC } from "@/lib/rbac-api-middleware"
import { PERMISSIONS } from "@/lib/rbac-enhanced"

export async function GET(request: NextRequest) {
  const rbacResult = await withRBAC(request, {
    permissions: [PERMISSIONS.VIEW_REPORTS],
    roles: ["admin", "finance", "manager"],
  })

  if (!rbacResult.authorized) {
    return NextResponse.json({ error: "Forbidden", reason: rbacResult.reason }, { status: 403 })
  }

  // Your protected logic here
  return NextResponse.json({
    message: "Access granted",
    user: rbacResult.user,
    data: "Sensitive financial data",
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { amount } = body

  const rbacResult = await withRBAC(request, {
    permissions: [PERMISSIONS.APPROVE_TRANSACTIONS],
    maxTransactionAmount: amount,
  })

  if (!rbacResult.authorized) {
    return NextResponse.json({ error: "Forbidden", reason: rbacResult.reason }, { status: 403 })
  }

  // Process transaction
  return NextResponse.json({
    message: "Transaction approved",
    amount,
    approvedBy: rbacResult.user.id,
  })
}
